"use client";

/**
 * Background animado WebGL com efeito "smokey" nas cores do sistema.
 * Reage ao hover do mouse. Cor default magenta do tema (#d946ef).
 */

import { useEffect, useRef, useState } from "react";

const VERTEX_SRC = `
  attribute vec4 a_position;
  void main() {
    gl_Position = a_position;
  }
`;

const FRAGMENT_SRC = `
precision mediump float;

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 u_color;
uniform vec3 u_color2;

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 centeredUV = (2.0 * fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);

    float time = iTime * 0.4;

    vec2 mouse = iMouse / iResolution;
    vec2 rippleCenter = 2.0 * mouse - 1.0;

    vec2 distortion = centeredUV;
    for (float i = 1.0; i < 8.0; i++) {
        distortion.x += 0.5 / i * cos(i * 2.0 * distortion.y + time + rippleCenter.x * 3.1415);
        distortion.y += 0.5 / i * cos(i * 2.0 * distortion.x + time + rippleCenter.y * 3.1415);
    }

    float wave = abs(sin(distortion.x + distortion.y + time));
    float glow = smoothstep(0.9, 0.2, wave);
    float mix1 = smoothstep(-0.5, 0.8, distortion.x);
    vec3 col = mix(u_color, u_color2, mix1);

    fragColor = vec4(col * glow, 1.0);
}

void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
}
`;

interface Props {
  /** Cor primária do efeito (hex). Default: #d946ef (magenta tema). */
  color?: string;
  /** Cor secundária do efeito (hex). Default: #f472b6 (accent tema). */
  color2?: string;
  className?: string;
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.substring(1, 3), 16) / 255;
  const g = parseInt(hex.substring(3, 5), 16) / 255;
  const b = parseInt(hex.substring(5, 7), 16) / 255;
  return [r, g, b];
}

export function SmokeyBackground({
  color = "#d946ef",
  color2 = "#f472b6",
  className = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [hovering, setHovering] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      return sh;
    };
    const vs = compile(gl.VERTEX_SHADER, VERTEX_SRC);
    const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SRC);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "iResolution");
    const uTime = gl.getUniformLocation(program, "iTime");
    const uMouse = gl.getUniformLocation(program, "iMouse");
    const uColor = gl.getUniformLocation(program, "u_color");
    const uColor2 = gl.getUniformLocation(program, "u_color2");

    const [r, g, b] = hexToRgb(color);
    const [r2, g2, b2] = hexToRgb(color2);
    gl.uniform3f(uColor, r, g, b);
    gl.uniform3f(uColor2, r2, g2, b2);

    const start = Date.now();
    let raf = 0;

    const render = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);

      gl.uniform2f(uRes, w, h);
      gl.uniform1f(uTime, (Date.now() - start) / 1000);
      gl.uniform2f(uMouse, hovering ? mouse.x : w / 2, hovering ? h - mouse.y : h / 2);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(render);
    };
    render();

    const move = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect();
      setMouse({ x: e.clientX - r.left, y: e.clientY - r.top });
    };
    const enter = () => setHovering(true);
    const leave = () => setHovering(false);

    canvas.addEventListener("mousemove", move);
    canvas.addEventListener("mouseenter", enter);
    canvas.addEventListener("mouseleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("mousemove", move);
      canvas.removeEventListener("mouseenter", enter);
      canvas.removeEventListener("mouseleave", leave);
    };
  }, [color, color2, hovering, mouse]);

  return (
    <div className={`absolute inset-0 w-full h-full overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute inset-0 backdrop-blur-sm" />
      <div className="absolute inset-0 bg-[var(--background)]/60" />
    </div>
  );
}
