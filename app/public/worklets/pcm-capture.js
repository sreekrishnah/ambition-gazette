// Captures mono audio, resamples it to targetRate, conditions it for speech recognition and posts
// PCM16 little-endian frames to the main thread.

// Conditioning exists because some microphones arrive about 13 dB too quiet with a loud low-frequency rumble
// even when the browser's own gain control and noise suppression are on. Recognition then fails on speech
// that is audible to a person. Measured on a real recording: speech near -33 dBFS, 85% of the energy below 200 Hz.
const HIGH_PASS_HZ = 110; // below the lowest speaking pitch, removes rumble and desk thumps
const TARGET_RMS = 0.1; // about -20 dBFS, a normal speech level for recognizers
const MIN_GAIN = 0.5;
const MAX_GAIN = 8; // +18 dB
const INITIAL_GAIN = 3; // starting boost so the first words of a quiet microphone are not lost
// The gain follows the loudest recent level (speech), never the current level, so a room's steady noise
// between phrases cannot be mistaken for speech and boosted. An adaptive gain that followed the current
// level raised noise 16x and buried the voice. The floor stops it chasing noise during long silences.
const SPEECH_FLOOR = TARGET_RMS / MAX_GAIN;
const SPEECH_LEVEL_DECAY_DB_PER_S = 0.6;
const LIMIT_KNEE = 0.8;
const LIMIT_CEILING = 0.95; // output never reaches full scale, so hot microphones do not clip

function softLimit(v) {
  const a = Math.abs(v);
  if (a <= LIMIT_KNEE) return v;
  const room = LIMIT_CEILING - LIMIT_KNEE;
  return Math.sign(v) * (LIMIT_KNEE + room * Math.tanh((a - LIMIT_KNEE) / room));
}

class MicConditioner {
  constructor(rate) {
    // Second-order Butterworth high-pass.
    const q = Math.SQRT1_2;
    const w = (2 * Math.PI * HIGH_PASS_HZ) / rate;
    const cos = Math.cos(w);
    const alpha = Math.sin(w) / (2 * q);
    const a0 = 1 + alpha;
    this.b0 = (1 + cos) / 2 / a0;
    this.b1 = -(1 + cos) / a0;
    this.b2 = this.b0;
    this.a1 = (-2 * cos) / a0;
    this.a2 = (1 - alpha) / a0;
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;

    this.meanSquare = 0;
    this.levelCoef = 1 / (0.03 * rate); // 30 ms level window
    this.gain = INITIAL_GAIN;
    this.speechLevel = TARGET_RMS / INITIAL_GAIN;
    // Gain is recomputed every 16 samples; these coefficients are per recomputation.
    const updatesPerSecond = rate / 16;
    this.levelRise = 1 - Math.exp(-1 / (0.03 * updatesPerSecond)); // the speech level follows loud input within 30 ms
    this.levelDecay = Math.pow(10, -SPEECH_LEVEL_DECAY_DB_PER_S / 20 / updatesPerSecond);
    this.gainFall = 1 - Math.exp(-1 / (0.02 * updatesPerSecond)); // gain falls within 20 ms when speech is loud
    this.gainRise = 1 - Math.exp(-1 / (0.4 * updatesPerSecond)); // and rises over 0.4 s
    this.count = 0;
  }

  process(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;

    this.meanSquare += (y * y - this.meanSquare) * this.levelCoef;
    if ((++this.count & 15) === 0) this.updateGain();
    return softLimit(y * this.gain);
  }

  updateGain() {
    const rms = Math.sqrt(this.meanSquare);
    if (rms > this.speechLevel) this.speechLevel += (rms - this.speechLevel) * this.levelRise;
    else this.speechLevel = Math.max(SPEECH_FLOOR, this.speechLevel * this.levelDecay);
    const desired = Math.min(MAX_GAIN, Math.max(MIN_GAIN, TARGET_RMS / this.speechLevel));
    this.gain += (desired - this.gain) * (desired < this.gain ? this.gainFall : this.gainRise);
  }
}

class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this.targetRate = opts.targetRate || 16000;
    this.frameSamples = Math.round((this.targetRate * (opts.frameMs || 60)) / 1000);
    this.ratio = sampleRate / this.targetRate;
    this.conditioner = opts.condition === false ? null : new MicConditioner(this.targetRate);
    // Read position in the current block; index -1 refers to the last sample of the previous block.
    this.pos = 0;
    this.prev = 0;
    this.out = new Int16Array(this.frameSamples);
    this.filled = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel || channel.length === 0) return true;

    const len = channel.length;
    while (this.pos < len - 1) {
      const i = Math.floor(this.pos);
      const frac = this.pos - i;
      const a = i < 0 ? this.prev : channel[i];
      const b = channel[i + 1];
      let sample = Math.max(-1, Math.min(1, a + (b - a) * frac));
      if (this.conditioner) sample = this.conditioner.process(sample);
      this.out[this.filled++] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      this.pos += this.ratio;

      if (this.filled === this.frameSamples) {
        this.port.postMessage(this.out.buffer, [this.out.buffer]);
        this.out = new Int16Array(this.frameSamples);
        this.filled = 0;
      }
    }

    this.prev = channel[len - 1];
    this.pos -= len;
    return true;
  }
}

registerProcessor("pcm-capture", PcmCaptureProcessor);
