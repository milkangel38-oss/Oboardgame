// 드론 레이스용 작은 WebGL 그리기 도구 (외부 라이브러리 없이 상자·바닥·안개만으로 3D 장면을 그려요)
// 좌표: y 가 위, 단위는 미터

// ── 수학 ──
export const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t],
};
// 쿼터니언 [x, y, z, w]
export const quat = {
  id: () => [0, 0, 0, 1],
  mul: (a, b) => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ],
  axis: (ax, ang) => { const s = Math.sin(ang / 2); return [ax[0] * s, ax[1] * s, ax[2] * s, Math.cos(ang / 2)]; },
  norm: (q) => { const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1; return [q[0] / l, q[1] / l, q[2] / l, q[3] / l]; },
  rot: (q, v) => { // q * v * q^-1
    const [x, y, z, w] = q;
    const ix = w * v[0] + y * v[2] - z * v[1], iy = w * v[1] + z * v[0] - x * v[2], iz = w * v[2] + x * v[1] - y * v[0], iw = -x * v[0] - y * v[1] - z * v[2];
    return [ix * w + iw * -x + iy * -z - iz * -y, iy * w + iw * -y + iz * -x - ix * -z, iz * w + iw * -z + ix * -y - iy * -x];
  },
  slerp: (a, b, t) => {
    let d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
    if (d < 0) { b = b.map((x) => -x); d = -d; }
    if (d > 0.9995) return quat.norm(a.map((x, i) => x + (b[i] - x) * t));
    const th = Math.acos(d), s = Math.sin(th);
    const wa = Math.sin((1 - t) * th) / s, wb = Math.sin(t * th) / s;
    return a.map((x, i) => x * wa + b[i] * wb);
  },
};
export const m4 = {
  persp(fov, asp, n, f) { const t = 1 / Math.tan(fov / 2); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0]; },
  // 카메라: 위치 + 회전(쿼터니언) → 뷰 행렬
  view(pos, q) {
    const r = quat.rot(q, [1, 0, 0]), u = quat.rot(q, [0, 1, 0]), b = quat.rot(q, [0, 0, 1]);
    return [r[0], u[0], b[0], 0, r[1], u[1], b[1], 0, r[2], u[2], b[2], 0, -v3.dot(r, pos), -v3.dot(u, pos), -v3.dot(b, pos), 1];
  },
  lookAt(eye, at, up = [0, 1, 0]) {
    const b = v3.norm(v3.sub(eye, at)), r = v3.norm(v3.cross(up, b)), u = v3.cross(b, r);
    return [r[0], u[0], b[0], 0, r[1], u[1], b[1], 0, r[2], u[2], b[2], 0, -v3.dot(r, eye), -v3.dot(u, eye), -v3.dot(b, eye), 1];
  },
  trs(t, q, s) {
    const [x, y, z, w] = q, x2 = x + x, y2 = y + y, z2 = z + z;
    const xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
    return [(1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0, (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0, (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0, t[0], t[1], t[2], 1];
  },
  mul(a, b) {
    const o = new Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    return o;
  },
};

const VS = `attribute vec3 aP; attribute vec3 aN; uniform mat4 uM, uV, uP; varying vec3 vN; varying vec3 vW;
void main(){ vec4 w = uM * vec4(aP,1.0); vW = w.xyz; vN = mat3(uM) * aN; gl_Position = uP * uV * w; }`;
const FS = `precision mediump float; varying vec3 vN; varying vec3 vW;
uniform vec3 uC, uCam, uFog, uL; uniform float uE, uGround;
void main(){
  vec3 c = uC;
  if (uGround > 0.5) {
    vec2 g = vW.xz;
    float chk = mod(floor(g.x / 10.0) + floor(g.y / 10.0), 2.0);
    c = mix(vec3(0.30,0.52,0.24), vec3(0.34,0.57,0.27), chk);
    vec2 f = abs(fract(g / 5.0) - 0.5);
    float line = 1.0 - smoothstep(0.0, 0.03, min(f.x, f.y));
    c = mix(c, vec3(0.42,0.66,0.34), line * 0.6);
  }
  vec3 n = normalize(vN);
  float d = max(dot(n, normalize(uL)), 0.0);
  vec3 col = c * (0.48 + 0.62 * d) + c * uE;
  float dist = length(vW - uCam);
  float fog = clamp((dist - 40.0) / 220.0, 0.0, 1.0);
  gl_FragColor = vec4(mix(col, uFog, fog), 1.0);
}`;

function cube() {
  const P = [], N = [];
  const F = [[[1, 0, 0], [0, 1, 0], [0, 0, 1]], [[-1, 0, 0], [0, 1, 0], [0, 0, -1]], [[0, 1, 0], [0, 0, 1], [1, 0, 0]], [[0, -1, 0], [0, 0, -1], [1, 0, 0]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]]];
  for (const [n, a, b] of F) {
    const c = n.map((x) => x * 0.5);
    const q = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]];
    for (const [s, t] of q) { P.push(c[0] + (a[0] * s + b[0] * t) * 0.5, c[1] + (a[1] * s + b[1] * t) * 0.5, c[2] + (a[2] * s + b[2] * t) * 0.5); N.push(...n); }
  }
  // 앞면 방향이 꼬이지 않게 두 번째 축을 계산 (위 표는 모두 오른손 방향)
  return { P: new Float32Array(P), N: new Float32Array(N), n: P.length / 3 };
}
function plane(size) {
  const s = size / 2;
  const P = [-s, 0, -s, -s, 0, s, s, 0, s, -s, 0, -s, s, 0, s, s, 0, -s];
  return { P: new Float32Array(P), N: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]), n: 6 };
}

export function createGL(canvas) {
  const gl = canvas.getContext('webgl', { antialias: true, alpha: false }) || canvas.getContext('experimental-webgl');
  if (!gl) return null;
  const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr);
  gl.useProgram(pr);
  const L = (n) => gl.getUniformLocation(pr, n);
  const U = { M: L('uM'), V: L('uV'), P: L('uP'), C: L('uC'), Cam: L('uCam'), Fog: L('uFog'), Lt: L('uL'), E: L('uE'), G: L('uGround') };
  const aP = gl.getAttribLocation(pr, 'aP'), aN = gl.getAttribLocation(pr, 'aN');
  const mk = (m) => { const bp = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bp); gl.bufferData(gl.ARRAY_BUFFER, m.P, gl.STATIC_DRAW); const bn = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bn); gl.bufferData(gl.ARRAY_BUFFER, m.N, gl.STATIC_DRAW); return { bp, bn, n: m.n }; };
  const meshes = { cube: mk(cube()), ground: mk(plane(1200)) };
  gl.enable(gl.DEPTH_TEST);
  gl.disable(gl.CULL_FACE);
  const FOG = [0.62, 0.78, 0.93];
  let cur = null;
  const bind = (m) => {
    if (cur === m) return; cur = m;
    gl.bindBuffer(gl.ARRAY_BUFFER, m.bp); gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.bn); gl.enableVertexAttribArray(aN); gl.vertexAttribPointer(aN, 3, gl.FLOAT, false, 0, 0);
  };
  return {
    gl,
    begin(view, proj, camPos) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      gl.clearColor(FOG[0], FOG[1], FOG[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.uniformMatrix4fv(U.V, false, view); gl.uniformMatrix4fv(U.P, false, proj);
      gl.uniform3fv(U.Cam, camPos); gl.uniform3fv(U.Fog, FOG); gl.uniform3fv(U.Lt, [0.45, 0.85, 0.3]);
      cur = null;
    },
    aspect: () => (canvas.clientWidth || 1) / (canvas.clientHeight || 1),
    ground() { bind(meshes.ground); gl.uniformMatrix4fv(U.M, false, m4.trs([0, 0, 0], [0, 0, 0, 1], [1, 1, 1])); gl.uniform1f(U.G, 1); gl.uniform1f(U.E, 0); gl.uniform3fv(U.C, [0.3, 0.5, 0.25]); gl.drawArrays(gl.TRIANGLES, 0, meshes.ground.n); gl.uniform1f(U.G, 0); },
    // 상자 하나: 위치, 회전, 크기, 색, 발광
    box(t, q, s, c, e = 0) { bind(meshes.cube); gl.uniformMatrix4fv(U.M, false, m4.trs(t, q, s)); gl.uniform3fv(U.C, c); gl.uniform1f(U.E, e); gl.drawArrays(gl.TRIANGLES, 0, meshes.cube.n); },
    boxM(M, c, e = 0) { bind(meshes.cube); gl.uniformMatrix4fv(U.M, false, M); gl.uniform3fv(U.C, c); gl.uniform1f(U.E, e); gl.drawArrays(gl.TRIANGLES, 0, meshes.cube.n); },
  };
}
