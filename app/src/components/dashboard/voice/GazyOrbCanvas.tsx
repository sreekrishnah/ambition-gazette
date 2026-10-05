"use client";

import React, { useRef, useEffect } from "react";
import { VoiceState } from "./useVoiceSession";

interface GazyOrbCanvasProps {
  state: VoiceState;
  audioLevel: number;
  className?: string;
}

interface OrbitalParticle {
  angle: number;
  speed: number;
  ringIndex: number;
  size: number;
}

interface AmbientDust {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

// WebGL Vertex Shader
const VERT_SHADER = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

// WebGL Fragment Shader: Inigo Quilez Domain-Warped Volumetric Nebula Fluid with Inner White Glow
const FRAG_SHADER = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;
uniform vec3 u_color;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p *= 2.04;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 center = vec2(0.5);
  vec2 pos = (uv - center) * 2.0;
  float dist = length(pos);

  // Razor-sharp static circular boundary clipping
  float edge = smoothstep(1.0, 0.98, dist);
  if (edge <= 0.0) {
    discard;
  }

  float t = u_time * 0.22;

  // Fluid drift vectors
  vec2 drift = vec2(
    sin(t) + 0.6 * sin(t * 1.6 + 1.2),
    cos(t * 0.75) + 0.6 * cos(t * 1.3 + 2.1)
  );

  // Subtle fluid rotation inside sphere
  float angle = t * 0.06;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 p = rot * pos * 1.35 + drift * 0.65;

  // Domain warping for organic curling cloud wisps
  vec2 q = vec2(fbm(p + drift), fbm(p + vec2(3.2, 1.5) - drift));
  vec2 r = vec2(fbm(p + 2.0 * q + vec2(1.7, 9.2)), fbm(p + 2.0 * q + vec2(8.3, 2.8)));
  float f = fbm(p + 1.4 * r);

  // 3D Spherical volume mapping
  float z = sqrt(max(0.0, 1.0 - dist * dist));

  // Warm Amber / Gold / Cream / Caramel Palette
  vec3 deepAmber = vec3(0.35, 0.12, 0.02);
  vec3 richCaramel = vec3(0.68, 0.26, 0.04);
  vec3 warmGold = vec3(0.92, 0.55, 0.08);
  vec3 brightHoney = vec3(0.98, 0.78, 0.32);
  vec3 luminousCream = vec3(1.0, 0.95, 0.84);

  // Multi-tier cloud wisp mixing
  vec3 col = deepAmber;
  col = mix(col, richCaramel, smoothstep(0.12, 0.36, f));
  col = mix(col, warmGold, smoothstep(0.34, 0.58, f));
  col = mix(col, brightHoney, smoothstep(0.56, 0.78, f));
  col = mix(col, luminousCream, smoothstep(0.76, 0.96, f));

  // Soft spherical specular sheen
  vec2 lightDir = normalize(vec2(-0.35, 0.45));
  float spec = pow(max(0.0, dot(normalize(vec3(pos, z)), vec3(lightDir, 0.65))), 3.8);
  col += vec3(1.0, 0.98, 0.92) * spec * 0.22;

  // Luminous inner white glow outline
  float innerWhiteRim = pow(dist, 4.0);
  col = mix(col, vec3(1.0, 1.0, 1.0), innerWhiteRim * 0.72);

  gl_FragColor = vec4(col * edge, edge);
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function GazyOrbCanvas({ state, audioLevel, className = "" }: GazyOrbCanvasProps) {
  const webglRef = useRef<HTMLCanvasElement | null>(null);
  const backCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frontCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const stateRef = useRef(state);
  const audioLevelRef = useRef(audioLevel);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    audioLevelRef.current = audioLevel;
  }, [audioLevel]);

  // WebGL Fluid Nebula Animation (Runs inside reduced ~138px sphere)
  useEffect(() => {
    const canvas = webglRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", { antialias: true, alpha: true, preserveDrawingBuffer: false });
    if (!gl) return;

    const program = gl.createProgram();
    const vert = compileShader(gl, gl.VERTEX_SHADER, VERT_SHADER);
    const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SHADER);
    if (!program || !vert || !frag) return;

    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return;
    }
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, "u_resolution");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uColor = gl.getUniformLocation(program, "u_color");

    gl.uniform3f(uColor, 0.94, 0.58, 0.1);

    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const spherePx = Math.round(138 * dpr);
    canvas.width = spherePx;
    canvas.height = spherePx;
    gl.viewport(0, 0, spherePx, spherePx);
    gl.uniform2f(uResolution, spherePx, spherePx);

    let animationId = 0;
    let accumulatedTime = 0;
    let lastNow = performance.now();

    const render = (now: number) => {
      const dt = (now - lastNow) / 1000;
      lastNow = now;

      const speedMult =
        stateRef.current === "processing" || stateRef.current === "connecting"
          ? 1.6
          : stateRef.current === "speaking"
          ? 1.3
          : stateRef.current === "listening"
          ? 1.0 + audioLevelRef.current * 0.35
          : 0.75;

      accumulatedTime += dt * speedMult;

      gl.uniform1f(uTime, accumulatedTime);
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
      gl.deleteProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      gl.deleteBuffer(buffer);
    };
  }, []);

  // 2D Split-Canvas for Proportional Orbital Rings with True 3D Multi-Directional Variation
  useEffect(() => {
    const backCanvas = backCanvasRef.current;
    const frontCanvas = frontCanvasRef.current;
    if (!backCanvas || !frontCanvas) return;

    const backCtx = backCanvas.getContext("2d");
    const frontCtx = frontCanvas.getContext("2d");
    if (!backCtx || !frontCtx) return;

    let animId = 0;
    let ringTime = 0;

    const width = 250;
    const height = 250;
    const cx = width / 2;
    const cy = height / 2;

    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;

    backCanvas.width = width * dpr;
    backCanvas.height = height * dpr;

    frontCanvas.width = width * dpr;
    frontCanvas.height = height * dpr;

    interface RingDef {
      rx: number;
      ry: number;
      rot: number;
      speed: number;
      strokeWidth: number;
      frontAlpha: number;
      backAlpha: number;
    }

    // Even, symmetrical orbital rings synced to the 138px sphere (R = 69px) with clear size variation
    const rings: RingDef[] = [
      // 0. Primary Main Orbit: graceful diagonal tilt across lower-center (rx: 88px)
      {
        rx: 88,
        ry: 38,
        rot: -0.42,
        speed: 0.0026,
        strokeWidth: 1.1,
        frontAlpha: 0.88,
        backAlpha: 0.35,
      },
      // 1. Symmetrical Counter Orbit: balanced mirror tilt crossing Ring 0 (rx: 96px)
      {
        rx: 96,
        ry: 42,
        rot: 0.42,
        speed: -0.0024,
        strokeWidth: 1.0,
        frontAlpha: 0.82,
        backAlpha: 0.30,
      },
      // 2. Steep Diagonal Orbit: inner hugging celestial orbit (rx: 82px)
      {
        rx: 82,
        ry: 34,
        rot: -0.82,
        speed: 0.0032,
        strokeWidth: 0.85,
        frontAlpha: 0.70,
        backAlpha: 0.25,
      },
      // 3. Outer Framing Celestial Halo: wide framing orbit encircling the composition (rx: 108px)
      {
        rx: 108,
        ry: 50,
        rot: 0.16,
        speed: -0.0018,
        strokeWidth: 0.75,
        frontAlpha: 0.55,
        backAlpha: 0.20,
      },
    ];

    // Spaced-out particles distributed across different quadrants (avoids clumping)
    const orbitalParticles: OrbitalParticle[] = [
      // Ring 0 (Main orbit) - lower-right node & back node
      { angle: 0.5, speed: 0.005, ringIndex: 0, size: 2.2 },
      { angle: 3.6, speed: 0.005, ringIndex: 0, size: 1.5 },
      // Ring 1 (Counter orbit) - lower-left node & back node
      { angle: 2.6, speed: -0.0045, ringIndex: 1, size: 2.0 },
      { angle: 5.7, speed: -0.0045, ringIndex: 1, size: 1.6 },
      // Ring 2 (Steep diagonal) - bottom node & top back node
      { angle: 1.55, speed: 0.006, ringIndex: 2, size: 1.8 },
      { angle: 4.6, speed: 0.006, ringIndex: 2, size: 1.3 },
      // Ring 3 (Outer halo) - far-right sparkling node & far-left back node
      { angle: 0.25, speed: -0.003, ringIndex: 3, size: 2.1 },
      { angle: 3.3, speed: -0.003, ringIndex: 3, size: 1.4 },
    ];

    const ambientDust: AmbientDust[] = Array.from({ length: 24 }, () => ({
      x: (Math.random() - 0.5) * 170,
      y: (Math.random() - 0.5) * 170,
      z: (Math.random() - 0.5) * 120,
      vx: (Math.random() - 0.5) * 0.07,
      vy: (Math.random() - 0.5) * 0.07 - 0.015,
      size: 0.5 + Math.random() * 0.75,
      alpha: 0.15 + Math.random() * 0.3,
    }));

    const renderRings = () => {
      ringTime += 0.016;

      backCtx.save();
      backCtx.scale(dpr, dpr);
      backCtx.clearRect(0, 0, width, height);

      frontCtx.save();
      frontCtx.scale(dpr, dpr);
      frontCtx.clearRect(0, 0, width, height);

      // 1. Back Arcs (rendered behind the orb on Back Canvas, z < 0)
      rings.forEach((ring) => {
        const ringRot = ring.rot + ringTime * ring.speed;
        backCtx.save();
        backCtx.translate(cx, cy);
        backCtx.rotate(ringRot);

        backCtx.beginPath();
        backCtx.ellipse(0, 0, ring.rx, ring.ry, 0, Math.PI, Math.PI * 2);
        backCtx.strokeStyle = `rgba(254, 243, 199, ${ring.backAlpha})`;
        backCtx.lineWidth = ring.strokeWidth * 0.85;
        backCtx.stroke();

        backCtx.restore();
      });

      // 2. Back Dust on Back Canvas
      ambientDust.forEach((dust) => {
        if (dust.z < 0) {
          dust.x += dust.vx;
          dust.y += dust.vy;
          if (dust.y < -85) dust.y = 85;
          if (dust.y > 85) dust.y = -85;
          if (dust.x < -85) dust.x = 85;
          if (dust.x > 85) dust.x = -85;

          backCtx.beginPath();
          backCtx.arc(cx + dust.x, cy + dust.y, dust.size * 0.7, 0, Math.PI * 2);
          backCtx.fillStyle = `rgba(254, 240, 199, ${dust.alpha * 0.5})`;
          backCtx.fill();
        }
      });

      // 3. Back Particles on Back Canvas (z < 0)
      orbitalParticles.forEach((p) => {
        const ring = rings[p.ringIndex];
        const ringRot = ring.rot + ringTime * ring.speed;
        p.angle += p.speed;

        const isFront = Math.sin(p.angle) >= 0;

        if (!isFront) {
          const localX = Math.cos(p.angle) * ring.rx;
          const localY = Math.sin(p.angle) * ring.ry;
          const cosR = Math.cos(ringRot);
          const sinR = Math.sin(ringRot);
          const worldX = cx + localX * cosR - localY * sinR;
          const worldY = cy + localX * sinR + localY * cosR;

          backCtx.beginPath();
          backCtx.arc(worldX, worldY, p.size * 0.7, 0, Math.PI * 2);
          backCtx.fillStyle = "rgba(254, 243, 199, 0.45)";
          backCtx.fill();
        }
      });

      // 4. Front Arcs (rendered in front of the orb on Front Canvas, z > 0)
      rings.forEach((ring) => {
        const ringRot = ring.rot + ringTime * ring.speed;
        frontCtx.save();
        frontCtx.translate(cx, cy);
        frontCtx.rotate(ringRot);

        frontCtx.beginPath();
        frontCtx.ellipse(0, 0, ring.rx, ring.ry, 0, 0, Math.PI);
        frontCtx.strokeStyle = `rgba(254, 243, 199, ${ring.frontAlpha})`;
        frontCtx.lineWidth = ring.strokeWidth;
        frontCtx.stroke();

        frontCtx.restore();
      });

      // 5. Front Particles with Flares on Front Canvas (z > 0)
      orbitalParticles.forEach((p) => {
        const ring = rings[p.ringIndex];
        const ringRot = ring.rot + ringTime * ring.speed;

        const isFront = Math.sin(p.angle) >= 0;

        if (isFront) {
          const localX = Math.cos(p.angle) * ring.rx;
          const localY = Math.sin(p.angle) * ring.ry;
          const cosR = Math.cos(ringRot);
          const sinR = Math.sin(ringRot);
          const worldX = cx + localX * cosR - localY * sinR;
          const worldY = cy + localX * sinR + localY * cosR;

          const flareGrad = frontCtx.createRadialGradient(worldX, worldY, 0.5, worldX, worldY, p.size * 3.2);
          flareGrad.addColorStop(0, "rgba(255, 255, 255, 1)");
          flareGrad.addColorStop(0.35, "rgba(254, 240, 138, 0.9)");
          flareGrad.addColorStop(0.7, "rgba(245, 158, 11, 0.4)");
          flareGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

          frontCtx.fillStyle = flareGrad;
          frontCtx.beginPath();
          frontCtx.arc(worldX, worldY, p.size * 3.2, 0, Math.PI * 2);
          frontCtx.fill();

          if (p.size >= 2.0) {
            frontCtx.strokeStyle = "rgba(255, 255, 255, 0.75)";
            frontCtx.lineWidth = 0.75;
            frontCtx.beginPath();
            frontCtx.moveTo(worldX - p.size * 1.8, worldY);
            frontCtx.lineTo(worldX + p.size * 1.8, worldY);
            frontCtx.moveTo(worldX, worldY - p.size * 1.8);
            frontCtx.lineTo(worldX, worldY + p.size * 1.8);
            frontCtx.stroke();
          }

          frontCtx.beginPath();
          frontCtx.arc(worldX, worldY, p.size * 0.85, 0, Math.PI * 2);
          frontCtx.fillStyle = "#FFFFFF";
          frontCtx.fill();
        }
      });

      // 6. Front Dust on Front Canvas
      ambientDust.forEach((dust) => {
        if (dust.z >= 0) {
          dust.x += dust.vx;
          dust.y += dust.vy;
          if (dust.y < -85) dust.y = 85;
          if (dust.y > 85) dust.y = -85;
          if (dust.x < -85) dust.x = 85;
          if (dust.x > 85) dust.x = -85;

          frontCtx.beginPath();
          frontCtx.arc(cx + dust.x, cy + dust.y, dust.size, 0, Math.PI * 2);
          frontCtx.fillStyle = `rgba(255, 251, 235, ${dust.alpha * 0.7})`;
          frontCtx.fill();
        }
      });

      backCtx.restore();
      frontCtx.restore();

      animId = requestAnimationFrame(renderRings);
    };

    animId = requestAnimationFrame(renderRings);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      className={`relative w-[210px] h-[210px] min-[380px]:w-[240px] min-[380px]:h-[240px] sm:w-[250px] sm:h-[250px] flex items-center justify-center select-none pointer-events-none ${className}`}
    >
      {/* 1. BACK CANVAS: Orbital ring arcs and particles passing BEHIND the orb (z < 0) */}
      <canvas
        ref={backCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* 2. THE WEBGL FLUID SPHERE: Reduced diameter with luminous inner white glow */}
      <div
        className="relative w-[116px] h-[116px] min-[380px]:w-[130px] min-[380px]:h-[130px] sm:w-[138px] sm:h-[138px] rounded-full overflow-hidden shrink-0 z-20"
        style={{
          boxShadow:
            "inset 0 0 14px 2px rgba(255, 255, 255, 0.72), inset 0 0 3px 0.8px rgba(255, 255, 255, 0.95)",
        }}
      >
        <canvas ref={webglRef} className="w-full h-full block" />
      </div>

      {/* 3. FRONT CANVAS: Orbital ring arcs and particles passing IN FRONT OF the orb (z > 0) */}
      <canvas
        ref={frontCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-30"
      />
    </div>
  );
}
