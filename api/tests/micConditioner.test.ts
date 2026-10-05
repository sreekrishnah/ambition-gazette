import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

// Runs the browser worklet's real source, so the test covers what ships.
const RATE = 16000;
const source = fs.readFileSync(path.join(__dirname, '..', '..', 'app', 'public', 'worklets', 'pcm-capture.js'), 'utf8');

function runWorklet(input: Float32Array): Int16Array {
  const frames: Buffer[] = [];
  class Base {
    port = { postMessage: (buffer: ArrayBuffer) => frames.push(Buffer.from(buffer)) };
  }
  let Processor: new (options: unknown) => { process(inputs: Float32Array[][]): boolean } = null as never;
  const factory = new Function('AudioWorkletProcessor', 'registerProcessor', 'sampleRate', `${source}\nreturn PcmCaptureProcessor;`);
  Processor = factory(Base, () => undefined, RATE);
  const node = new Processor({ processorOptions: { targetRate: RATE, frameMs: 20 } });
  for (let i = 0; i + 128 <= input.length; i += 128) node.process([[input.subarray(i, i + 128)]]);
  const pcm = Buffer.concat(frames);
  return new Int16Array(pcm.buffer, pcm.byteOffset, Math.floor(pcm.length / 2));
}

function tone(hz: number, amplitude: number, seconds: number): Float32Array {
  const out = new Float32Array(Math.floor(RATE * seconds));
  for (let i = 0; i < out.length; i++) out[i] = amplitude * Math.sin((2 * Math.PI * hz * i) / RATE);
  return out;
}

const rms = (a: Int16Array, from = 0, to = a.length) => {
  let s = 0;
  for (let i = from; i < to; i++) s += a[i] * a[i];
  return Math.sqrt(s / Math.max(1, to - from)) / 32768;
};

describe('microphone conditioning in the capture worklet', () => {
  it('raises a quiet voice-band signal to a usable level', () => {
    const out = runWorklet(tone(400, 0.03, 4));
    const settled = rms(out, RATE * 2);
    expect(settled).toBeGreaterThan(0.06);
    expect(settled).toBeLessThan(0.16);
  });

  it('attenuates low-frequency rumble even though the gain is raised', () => {
    const input = tone(50, 0.05, 3);
    const inputRms = 0.05 / Math.SQRT2;
    // The high-pass removes most of the rumble before the gain, so the output ends up below the input level.
    expect(rms(runWorklet(input), RATE)).toBeLessThan(inputRms * 0.85);
  });

  it('does not boost steady background noise between phrases', () => {
    const speech = tone(400, 0.05, 2);
    const noise = tone(900, 0.004, 6);
    const joined = new Float32Array(speech.length + noise.length);
    joined.set(speech, 0);
    joined.set(noise, speech.length);
    const out = runWorklet(joined);
    // Noise at 0.004 amplitude may be raised by the speech gain, but never up to speech level.
    const lateNoise = rms(out, RATE * 6);
    expect(lateNoise).toBeLessThan(0.03);
  });

  it('never reaches full scale, even for a very hot microphone', () => {
    const out = runWorklet(tone(400, 1, 2));
    expect(Math.max(...Array.from(out).map(Math.abs))).toBeLessThan(32767);
  });
});
