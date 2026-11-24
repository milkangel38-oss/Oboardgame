// 드론 비행 물리 + 코스 (화면과 분리해서 테스트할 수 있게)
import { v3, quat } from './drone-gl.js';

export const G = 9.81;
const DEG = Math.PI / 180;

// 베타플라이트 방식 감도: RC Rate · Super Rate · Expo → 초당 회전 각도(도)
export function bfRate(x, { rc = 1.0, sup = 0.7, expo = 0.0 } = {}) {
  const ax = Math.abs(x);
  let rcRate = rc; if (rcRate > 2) rcRate += 14.54 * (rcRate - 2);
  const xe = expo ? x * ax ** 3 * expo + x * (1 - expo) : x;
  let r = 200 * rcRate * xe;
  if (sup) r *= 1 / Math.min(1, Math.max(0.01, 1 - ax * sup));
  return Math.max(-1998, Math.min(1998, r));
}

export const DEFAULT_SET = { mode: 'angle', rc: 1.0, sup: 0.7, expo: 0.2, yrc: 1.0, ysup: 0.6, yexpo: 0.1, tw: 3.2, angleMax: 55, camTilt: 20, view: 'chase', input: 'touch', thrExpo: 0.25 };

// 코스: 게이트(정사각 2m), 기둥(슬라럼), 깃발
// 게이트 yaw: 통과하는 방향을 바라보는 각도 (라디안). y 는 게이트 가운데 높이
export const GATE = 2.0, FRAME = 0.16;
export const COURSE = {
  gates: [
    { x: 0, y: 2.2, z: -16, yaw: 0 },
    { x: 8, y: 3.0, z: -42, yaw: -0.35 },
    { x: 28, y: 5.5, z: -60, yaw: -1.1 },
    { x: 52, y: 2.0, z: -58, yaw: -1.9 },
    { x: 64, y: 8.5, z: -34, yaw: -2.9 },  // 높은 게이트
    { x: 60, y: 1.6, z: -10, yaw: -3.2 },  // 다이브 → 낮은 게이트
    { x: 44, y: 2.4, z: 14, yaw: 2.4 },
    { x: 20, y: 4.0, z: 24, yaw: 1.7 },
    { x: -6, y: 2.2, z: 18, yaw: 0.9 },
    { x: -14, y: 3.0, z: 0, yaw: 0.1 },
  ],
  pillars: [[14, -50], [18, -46], [22, -54], [40, -62], [62, -46], [54, 0], [34, 20], [8, 26], [-12, 10]].map(([x, z]) => ({ x, z, r: 0.6, h: 9 })),
  start: { x: 0, z: 0, yaw: 0 },
};

export function gateBasis(g) { // 게이트 앞쪽(통과 방향), 오른쪽
  const f = [-Math.sin(g.yaw), 0, -Math.cos(g.yaw)];
  const r = [Math.cos(g.yaw), 0, -Math.sin(g.yaw)];
  return { f, r };
}
export function startPad(i) {
  const s = COURSE.start, col = i % 4, row = Math.floor(i / 4);
  return [s.x + (col - 1.5) * 1.6, 0.06, s.z + row * 2];
}

export function newDrone(pos, yaw = 0) {
  return { p: [...pos], v: [0, 0, 0], q: quat.axis([0, 1, 0], yaw), w: [0, 0, 0], thr: 0, crashed: 0, landed: true, prop: 0 };
}

const R = 0.14; // 드론 충돌 반지름
// 충돌 검사: 기둥 / 게이트 틀 / 게이트 다리
export function hitObstacle(p) {
  for (const c of COURSE.pillars) {
    if (p[1] < c.h + R && Math.hypot(p[0] - c.x, p[2] - c.z) < c.r + R) return true;
  }
  for (const g of COURSE.gates) {
    const { f, r } = gateBasis(g);
    const d = v3.sub(p, [g.x, g.y, g.z]);
    const lx = v3.dot(d, r), lz = v3.dot(d, f), ly = d[1];
    if (Math.abs(lz) > FRAME / 2 + R) continue;
    const h = GATE / 2, o = h + FRAME;
    if (Math.abs(lx) > o + R) continue;
    const inX = Math.abs(lx) < h - R, inY = Math.abs(ly) < h - R;
    if (ly > -o - R && ly < o + R && !(inX && inY)) return true;      // 틀
    if (ly < -o && Math.abs(Math.abs(lx) - h) < FRAME / 2 + 0.12 + R) return true; // 다리
  }
  return false;
}
// 게이트 통과 판정: 이전 위치 → 지금 위치가 게이트 면을 지나갔는지
export function crossed(g, a, b) {
  const { f, r } = gateBasis(g);
  const da = v3.dot(v3.sub(a, [g.x, g.y, g.z]), f), db = v3.dot(v3.sub(b, [g.x, g.y, g.z]), f);
  if (Math.sign(da) === Math.sign(db) || da === db) return false;
  const t = da / (da - db), m = v3.lerp(a, b, t), d = v3.sub(m, [g.x, g.y, g.z]);
  return Math.abs(v3.dot(d, r)) < GATE / 2 && Math.abs(d[1]) < GATE / 2;
}

// 자세 (기울기): 앞이 들리면 +pitch, 오른쪽으로 기울면 +roll
export function attitude(q) {
  const f = quat.rot(q, [0, 0, -1]), r = quat.rot(q, [1, 0, 0]), u = quat.rot(q, [0, 1, 0]);
  return { pitch: Math.asin(Math.max(-1, Math.min(1, f[1]))), roll: Math.asin(Math.max(-1, Math.min(1, -r[1]))), up: u, f };
}

// 한 걸음 (dt초): stick = { thr 0~1, yaw, pitch, roll -1~1 }, armed: 출발 전엔 false
export function step(d, stick, set, dt, armed = true) {
  if (d.crashed > 0) { d.crashed -= dt; return 'crash'; }
  const T = armed ? set.tw * G * thrCurve(stick.thr, set.thrExpo) : 0;
  d.thr = stick.thr;
  // 목표 회전 속도 (몸체 기준, 라디안/초): x = 기수 들기, y = 왼쪽으로 돌기, z = 왼쪽 날개 내리기
  const rate = { rc: set.rc, sup: set.sup, expo: set.expo };
  const yawR = -bfRate(stick.yaw, { rc: set.yrc, sup: set.ysup, expo: set.yexpo }) * DEG;
  let tx, tz;
  if (set.mode === 'acro') {
    tx = -bfRate(stick.pitch, rate) * DEG;
    tz = -bfRate(stick.roll, rate) * DEG;
  } else {
    const a = attitude(d.q), max = set.angleMax * DEG;
    tx = 9 * (-stick.pitch * max - a.pitch);
    tz = -9 * (stick.roll * max - a.roll);
    tx = Math.max(-9, Math.min(9, tx)); tz = Math.max(-9, Math.min(9, tz));
  }
  const k = 1 - Math.exp(-dt / 0.035); // 모터 반응
  if (!armed && d.landed) { d.w = [0, 0, 0]; } else {
    d.w = [d.w[0] + (tx - d.w[0]) * k, d.w[1] + (yawR - d.w[1]) * k, d.w[2] + (tz - d.w[2]) * k];
    const wl = Math.hypot(...d.w);
    if (wl > 1e-6) d.q = quat.norm(quat.mul(d.q, quat.axis(v3.mul(d.w, 1 / wl), wl * dt)));
  }
  // 힘: 추력 + 중력 + 공기 저항
  const up = quat.rot(d.q, [0, 1, 0]);
  const sp = v3.len(d.v);
  const acc = [up[0] * T, up[1] * T - G, up[2] * T];
  const drag = 0.09 + 0.026 * sp;
  acc[0] -= d.v[0] * drag; acc[1] -= d.v[1] * drag; acc[2] -= d.v[2] * drag;
  if (d.landed && acc[1] <= 0) { d.v = [0, 0, 0]; d.prop += T * dt * 4; return 'ok'; }
  d.landed = false;
  const prev = [...d.p];
  d.v = v3.add(d.v, v3.mul(acc, dt));
  d.p = v3.add(d.p, v3.mul(d.v, dt));
  d.prop += (T + 4) * dt * 3;
  // 땅
  if (d.p[1] < 0.06) {
    const a = attitude(d.q);
    const hard = d.v[1] < -4.5 || Math.hypot(d.v[0], d.v[2]) > 6 || Math.abs(a.pitch) > 0.9 || Math.abs(a.roll) > 0.9;
    d.p[1] = 0.06;
    if (hard) return crash(d);
    d.v = [0, 0, 0]; d.landed = true;
    // 땅에 닿으면 수평으로 (기수 방향은 유지)
    const yaw = Math.atan2(-a.f[0], -a.f[2]);
    d.q = quat.axis([0, 1, 0], yaw); d.w = [0, 0, 0];
  }
  if (d.p[1] > 60) { d.p[1] = 60; d.v[1] = Math.min(0, d.v[1]); }
  if (hitObstacle(d.p)) { d.p = prev; return crash(d); }
  return 'ok';
}
function thrCurve(t, ex) { t = Math.max(0, Math.min(1, t)); return t * (1 - ex) + t * t * t * ex; }
function crash(d) { d.crashed = 1.6; d.v = [0, 0, 0]; d.w = [0, 0, 0]; return 'crash'; }
export function headingOf(q) { const f = quat.rot(q, [0, 0, -1]); return Math.atan2(-f[0], -f[2]); }
