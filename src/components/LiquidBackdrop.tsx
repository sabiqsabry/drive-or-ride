import { useEffect, useRef } from 'react'
import { currentTheme, onThemeChange } from '../lib/theme'

/**
 * Liquid Glass backdrop.
 *
 * Adapted from dashersw/liquid-glass-js (MIT). That library refracts a one-off html2canvas
 * snapshot of the page per element; here the background is procedural, so a single
 * full-screen WebGL pass draws it *and* refracts it under every `.glass` element in
 * real time - no snapshots, and the glass stays correct while things animate or scroll.
 *
 * Per pixel inside a glass shape: a rounded-rect SDF gives distance-to-edge and the
 * outward normal; the backdrop is sampled displaced along that normal with
 * exponential edge + rim falloff (the library's edge/rim intensity model), saturated,
 * tinted with a vertical gradient, and lit with a specular rim.
 */
const MAX = 16

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_dpr;
uniform float u_dark;
uniform vec3 u_bg;
uniform vec4 u_rects[${MAX}];
uniform float u_radius[${MAX}];
uniform int u_count;

float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

// Flat background: the glass reads through its tint, rim light and shadow.
vec3 backdrop(vec2 p){ return u_bg; }

float sdRound(vec2 p, vec2 b, float r){
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

void main(){
  vec2 p = gl_FragCoord.xy;
  vec3 col = backdrop(p);
  float shadow = 0.0;
  float hitDist = -1.0;
  vec2 n = vec2(0.0);
  vec4 R = vec4(0.0);

  for (int i = 0; i < ${MAX}; i++) {
    if (i >= u_count) break;
    vec4 rc = u_rects[i];
    vec2 b = rc.zw * 0.5;
    vec2 c = rc.xy + b;
    float r = min(u_radius[i], min(b.x, b.y));
    float d = sdRound(p - c, b, r);
    float ds = sdRound(p - c + vec2(0.0, 14.0 * u_dpr), b, r);
    shadow = max(shadow, (1.0 - smoothstep(-24.0 * u_dpr, 36.0 * u_dpr, ds)) * (u_dark > 0.5 ? 0.22 : 0.09));
    if (d < 0.5 * u_dpr) {
      // Topmost (last in DOM order) glass wins.
      hitDist = -d;
      R = rc;
      vec2 e = vec2(1.0, 0.0);
      vec2 grad = vec2(
        sdRound(p - c + e.xy, b, r) - sdRound(p - c - e.xy, b, r),
        sdRound(p - c + e.yx, b, r) - sdRound(p - c - e.yx, b, r));
      // The SDF gradient vanishes on the shape's medial axis; any normal works there.
      n = dot(grad, grad) > 1e-4 ? normalize(grad) : vec2(0.0, 1.0);
    }
  }

  if (hitDist > -0.5 * u_dpr) {
    float dd = max(hitDist, 0.0) / u_dpr;           // CSS px from the edge
    float edge = exp(-dd / 16.0);
    float rim = exp(-dd / 2.2);
    vec2 offs = n * (edge * 46.0 + rim * 12.0) * u_dpr;
    vec3 g = (backdrop(p + offs) * 2.0 + backdrop(p + offs * 1.25 + vec2(6.0, 0.0)) + backdrop(p + offs * 0.8 - vec2(0.0, 6.0))) / 4.0;
    float l = dot(g, vec3(0.299, 0.587, 0.114));
    g = mix(vec3(l), g, 1.45);
    float vy = clamp((p.y - R.y) / R.w, 0.0, 1.0);
    vec3 tint = u_dark > 0.5 ? mix(vec3(0.09, 0.10, 0.14), vec3(0.17, 0.18, 0.23), vy)
                             : mix(vec3(0.90, 0.92, 0.96), vec3(1.0), vy);
    g = mix(g, tint, u_dark > 0.5 ? 0.5 : 0.42);
    float spec = pow(max(dot(n, normalize(vec2(-0.55, 0.83))), 0.0), 1.4) * rim;
    float spec2 = pow(max(dot(n, normalize(vec2(0.55, -0.83))), 0.0), 2.0) * rim;
    g += (spec * 0.8 + spec2 * 0.3) * (u_dark > 0.5 ? 0.45 : 1.0);
    g -= edge * 0.035;
    float aa = smoothstep(-0.5 * u_dpr, 0.75 * u_dpr, hitDist);
    col = mix(col * (1.0 - shadow), g, aa);
  } else {
    col *= 1.0 - shadow;
  }
  col += (hash(p + u_time) - 0.5) / 255.0;          // dither against banding
  gl_FragColor = vec4(col, 1.0);
}`

const hexToRgb = (v: string): [number, number, number] => {
  const h = v.trim().replace('#', '')
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export function LiquidBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const gl = canvas?.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' })
    if (!canvas || !gl) return

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? 'shader')
      return s
    }
    let prog: WebGLProgram
    try {
      prog = gl.createProgram()!
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT))
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG))
      gl.linkProgram(prog)
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link')
    } catch (e) {
      console.warn('Liquid glass disabled:', e)
      return
    }
    gl.useProgram(prog)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'p')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const u = (n: string) => gl.getUniformLocation(prog, n)
    const U = {
      res: u('u_res'), time: u('u_time'), dpr: u('u_dpr'), dark: u('u_dark'),
      bg: u('u_bg'),
      rects: u('u_rects'), radius: u('u_radius'), count: u('u_count'),
    }

    const root = document.documentElement
    const motionMq = matchMedia('(prefers-reduced-motion: reduce)')
    const applyTheme = () => {
      const cs = getComputedStyle(root)
      gl.uniform3fv(U.bg, hexToRgb(cs.getPropertyValue('--bg')))
      gl.uniform1f(U.dark, currentTheme() === 'dark' ? 1 : 0)
    }
    applyTheme()
    const stopTheme = onThemeChange(applyTheme)
    root.classList.add('liquid')

    const radii = new WeakMap<Element, number>()
    const rects = new Float32Array(MAX * 4)
    const rad = new Float32Array(MAX)
    let raf = 0
    const start = performance.now()

    const frame = () => {
      const dpr = Math.min(devicePixelRatio || 1, 1.5)
      const w = innerWidth
      const h = innerHeight
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr)
        canvas.height = Math.round(h * dpr)
        gl.viewport(0, 0, canvas.width, canvas.height)
      }
      let count = 0
      for (const el of document.querySelectorAll('.glass:not(.suggest)')) {
        if (count >= MAX) break
        const r = el.getBoundingClientRect()
        if (r.bottom < -60 || r.top > h + 60 || r.width === 0) continue
        let radius = radii.get(el)
        if (radius === undefined) {
          radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0
          radii.set(el, radius)
        }
        rects.set([r.left * dpr, (h - r.bottom) * dpr, r.width * dpr, r.height * dpr], count * 4)
        rad[count] = radius * dpr
        count++
      }
      gl.uniform2f(U.res, canvas.width, canvas.height)
      gl.uniform1f(U.dpr, dpr)
      gl.uniform1f(U.time, motionMq.matches ? 0 : (performance.now() - start) / 1000)
      gl.uniform4fv(U.rects, rects)
      gl.uniform1fv(U.radius, rad)
      gl.uniform1i(U.count, count)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      stopTheme()
      root.classList.remove('liquid')
    }
  }, [])

  return <canvas ref={ref} className="liquid-canvas" aria-hidden />
}
