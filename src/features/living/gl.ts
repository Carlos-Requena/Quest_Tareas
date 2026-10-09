// La malla viva: un shader de WebGL que deforma la imagen de un personaje por zonas para que
// parezca que respira, se mece y le da el viento. No genera fotogramas nuevos: mueve los
// píxeles de la imagen que ya hay, con desplazamientos pequeños y suaves.
//
// Las zonas salen de la altura y de la distancia al eje de la imagen (los personajes están de
// pie, centrados y con los pies abajo): los pies no se mueven; el pecho sube y se ensancha;
// lo de arriba se mece desde la cadera; y el viento solo ondea lo que sobresale a los lados
// (mechones, capa, falda), no la cara ni el cuerpo.
//
// Es un recurso imperativo (un contexto de WebGL por personaje en pantalla): `createStage`
// devuelve un objeto con su `destroy`. Si el navegador no sabe hacerlo, devuelve `undefined`
// y el componente pinta la imagen con la animación de CSS.

/** Margen del lienzo alrededor de la imagen (fracción de su ancho o alto): lo que el viento saca por los lados. */
export const PAD = { x: 0.08, top: 0.04 } as const;

export interface StageParams {
  /** Amplitudes (LEVEL_AMOUNT de model.ts). */
  breath: number;
  sway: number;
  wind: number;
}

export interface Stage {
  /** El lienzo, nuevo para cada malla (uno con el contexto ya devuelto no sirve otra vez): el componente lo pone en su sitio. */
  canvas: HTMLCanvasElement;
  /** Tamaño de la imagen en pantalla (CSS px) y densidad de píxeles. */
  resize(width: number, height: number, dpr: number): void;
  setParams(p: StageParams): void;
  destroy(): void;
}

const VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2(a_pos.x * 0.5 + 0.5, 0.5 - a_pos.y * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

// v_uv: del lienzo, con y hacia abajo. uv: de la imagen. h: altura (0 los pies, 1 lo alto).
// (dx, dy) es cuánto se mueve el contenido; se muestrea en uv - (dx, dy).
const FRAG = `
precision mediump float;
varying vec2 v_uv;
uniform sampler2D u_tex;
uniform float u_t;
uniform vec3 u_amp;
uniform float u_aspect;
uniform vec2 u_pad;
void main() {
  vec2 uv = vec2(v_uv.x * (1.0 + 2.0 * u_pad.x) - u_pad.x, v_uv.y * (1.0 + u_pad.y) - u_pad.y);
  float h = clamp(1.0 - uv.y, 0.0, 1.0);
  float x = uv.x - 0.5;
  float ax = 1.0 / max(u_aspect, 0.25);

  // Respiración: lo de encima de las rodillas sube un poco y el pecho se ensancha.
  float b = 0.5 - 0.5 * cos(u_t * 1.15);
  float rise = smoothstep(0.15, 0.72, h);
  float chest = exp(-pow((h - 0.63) / 0.14, 2.0));
  float dy = -u_amp.x * 0.0075 * b * rise;
  float dx = u_amp.x * 0.028 * b * chest * x;

  // Balanceo: lo de encima de la cadera se mece, más cuanto más arriba.
  float bend = pow(max(h - 0.3, 0.0) / 0.7, 1.6);
  dx += u_amp.y * 0.0085 * ax * sin(u_t * 0.52) * bend;
  dy += u_amp.y * 0.0015 * abs(sin(u_t * 0.52)) * bend;

  // Viento: solo lo que sobresale a los lados, arriba (pelo) y abajo (capa, falda); los pies, quietos.
  float side = smoothstep(0.11, 0.40, abs(x));
  float top = smoothstep(0.50, 0.92, h);
  float low = smoothstep(0.07, 0.20, h) * (1.0 - smoothstep(0.32, 0.52, h));
  float w = side * max(top, low);
  float gust = 0.6 + 0.4 * sin(u_t * 0.41);
  float wave = 0.6 * sin(u_t * 2.3 - h * 10.0 + x * 4.0) + 0.4 * sin(u_t * 3.7 - h * 17.0 + 1.3);
  dx += u_amp.z * 0.0085 * ax * gust * w * wave;
  dy += u_amp.z * 0.0035 * gust * w * cos(u_t * 1.9 - h * 8.0);

  vec2 src = uv - vec2(dx, dy);
  if (src.x < 0.0 || src.x > 1.0 || src.y < 0.0 || src.y > 1.0) {
    gl_FragColor = vec4(0.0);
  } else {
    gl_FragColor = texture2D(u_tex, src);
  }
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

/** ¿Sabe este navegador hacer WebGL? (se mira una vez). */
let supported: boolean | undefined;
export function glSupported(): boolean {
  if (supported === undefined) {
    try {
      supported = !!document.createElement("canvas").getContext("webgl");
    } catch {
      supported = false;
    }
  }
  return supported;
}

/**
 * Pone en marcha la malla viva con la imagen `img` (ya cargada, del mismo origen o de un
 * blob), en un lienzo nuevo. `onLost` avisa si el navegador retira el contexto (demasiados a la vez,
 * la GPU se reinicia): el componente vuelve a la imagen.
 */
export function createStage(img: HTMLImageElement, params: StageParams, onLost: () => void): Stage | undefined {
  const canvas = document.createElement("canvas");
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
  if (!gl) return undefined;
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  const prog = gl.createProgram();
  if (!vs || !fs || !prog) return undefined;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return undefined;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "a_pos");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  // Alfa premultiplicado al subirla: así los bordes transparentes no sacan un halo oscuro.
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  try {
    const source = document.createElement("canvas");
    source.width = img.naturalWidth;
    source.height = img.naturalHeight;
    const context = source.getContext("2d");
    if (!context) return undefined;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(img, 0, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  } catch {
    return undefined;
  }

  const u = {
    t: gl.getUniformLocation(prog, "u_t"),
    amp: gl.getUniformLocation(prog, "u_amp"),
    aspect: gl.getUniformLocation(prog, "u_aspect"),
    pad: gl.getUniformLocation(prog, "u_pad"),
  };
  gl.uniform2f(u.pad, PAD.x, PAD.top);
  gl.clearColor(0, 0, 0, 0);

  let amp = params;
  // Cada personaje arranca en otro punto del ciclo: dos en pantalla no respiran a la vez.
  const offset = Math.random() * 100;
  let raf = 0;
  let alive = true;

  const frame = (now: number) => {
    raf = 0;
    if (!alive) return;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform1f(u.t, now / 1000 + offset);
    gl.uniform3f(u.amp, amp.breath, amp.sway, amp.wind);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // Quieto del todo: un fotograma basta.
    if (amp.breath || amp.sway || amp.wind) raf = requestAnimationFrame(frame);
  };
  const kick = () => {
    if (alive && !raf) raf = requestAnimationFrame(frame);
  };

  const lost = (e: Event) => {
    e.preventDefault();
    alive = false;
    cancelAnimationFrame(raf);
    onLost();
  };
  canvas.addEventListener("webglcontextlost", lost);

  return {
    canvas,
    resize(width, height, dpr) {
      // Con un tope de píxeles: conserva nitidez en personajes altos sin disparar la memoria.
      const w = width * (1 + 2 * PAD.x);
      const h = height * (1 + PAD.top);
      const scale = Math.min(dpr, Math.sqrt(12_000_000 / Math.max(1, w * h)));
      // WebKit puede usar temporalmente el tamaño interno del lienzo como tamaño CSS después
      // de cambiar de personaje. Fijar ambos tamaños evita que la capa WebGL se vea ampliada.
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      gl.uniform1f(u.aspect, width / Math.max(1, height));
      kick();
    },
    setParams(p) {
      amp = p;
      kick();
    },
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener("webglcontextlost", lost);
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      // Libera el contexto para que los cambios de personaje no acumulen contextos WebGL.
      // El listener ya está retirado, así que esta pérdida intencionada no avisa al componente.
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      canvas.remove();
    },
  };
}
