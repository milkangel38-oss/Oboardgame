// 꿈틀 포격전: 맵(지형 비트맵) · 기본 물리
export const MW = 1800, MH = 900, WATER = 850;
export const G = 520;
export const WH = 18; // 꿈틀이 키 (발 기준)

export const MAPS = {
  city: { name: '도시', emoji: '🏙️', sky: ['#7fb2e6', '#e3f0ff'], dirt: ['#7c7f8c', '#4c4f5a'], top: '#b4bccb', water: '#2f5f99', desc: '빌딩 사이를 넘나드는 도심 전투' },
  mountain: { name: '산', emoji: '⛰️', sky: ['#6fb6ff', '#d6ecff'], dirt: ['#9a6a3e', '#5a3a20'], top: '#5fcf5a', water: '#2a74c8', desc: '높은 봉우리와 깊은 골짜기' },
  sky: { name: '하늘', emoji: '☁️', sky: ['#9ccfff', '#fff1d6'], dirt: ['#b08a5a', '#7a5a38'], top: '#8de07a', water: '#4a8fd8', desc: '구름 위에 떠 있는 섬들 — 떨어지면 끝!' },
  sea: { name: '바다', emoji: '🌊', sky: ['#5fc0ff', '#e0f6ff'], dirt: ['#d8b878', '#a8864a'], top: '#f2dc9c', water: '#1c8fcf', desc: '바다 위 작은 모래섬들' },
  snow: { name: '설산', emoji: '🏔️', sky: ['#a8c8e8', '#f0f6ff'], dirt: ['#8aa0b8', '#5a6e86'], top: '#ffffff', water: '#3a6a9a', desc: '미끄러질 듯한 눈 덮인 언덕' },
  abroad: { name: '해외 (사막 유적)', emoji: '🐫', sky: ['#ffb36b', '#ffe6b8'], dirt: ['#d9a75e', '#a8763a'], top: '#f0cc86', water: '#2f8fb0', desc: '모래 언덕과 피라미드' },
};

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// 지형 만들기: 1 = 땅
export function makeMask(map, seed) {
  const m = new Uint8Array(MW * MH), r = rng(seed);
  const col = (x, top, bot = MH) => { for (let y = Math.max(0, top | 0); y < Math.min(MH, bot); y++) m[y * MW + x] = 1; };
  const hm = (base, amps) => { const ws = amps.map((a, i) => ({ a: a * (0.6 + r() * 0.8), f: (0.002 + r() * 0.002) * (i + 1), p: r() * 6.28 })); return (x) => ws.reduce((s, w) => s + Math.sin(x * w.f + w.p) * w.a, base); };
  const edge = (x) => Math.min(x, MW - 1 - x);
  if (map === 'mountain' || map === 'snow') {
    const h = hm(map === 'mountain' ? 520 : 560, map === 'mountain' ? [150, 60, 25, 8] : [80, 40, 15, 5]);
    for (let x = 0; x < MW; x++) col(x, h(x) + (edge(x) < 140 ? (140 - edge(x)) * 2.5 : 0));
    if (map === 'snow') for (let i = 0; i < 4; i++) { const cx = 250 + r() * 1300, cy = 420 + r() * 120; blob(m, cx, cy, 70 + r() * 50, 22 + r() * 14, r); }
  } else if (map === 'city') {
    const g = 700;
    for (let x = 0; x < MW; x++) if (edge(x) > 90) col(x, g);
    let x = 120;
    while (x < MW - 200) {
      const w = 90 + r() * 110, top = g - (120 + r() * 300);
      for (let i = 0; i < w; i++) col(Math.round(x + i), top, g);
      if (r() < 0.5) for (let i = 10; i < w - 10; i++) col(Math.round(x + i), top - 30, top); // 옥상 구조물
      x += w + 30 + r() * 90;
    }
    // 하늘에 떠 있는 얇은 바닥 (빌딩 사이 골이 깊어서 건너다닐 발판)
    const empty = (x0, y0, w, h) => { for (let y = Math.max(0, y0); y < Math.min(MH, y0 + h); y += 3) for (let x = Math.max(0, x0); x < Math.min(MW, x0 + w); x += 3) if (m[y * MW + x]) return false; return true; };
    let made = 0;
    for (let tries = 0; made < 18 && tries < 600; tries++) {
      const w = Math.round(70 + r() * 90), x0 = Math.round(60 + r() * (MW - 120 - w)), y0 = Math.round(150 + r() * 430);
      if (!empty(x0 - 26, y0 - 40, w + 52, 40 + 10 + 30)) continue;
      for (let i = 0; i < w; i++) col(x0 + i, y0, y0 + 10);
      made++;
    }
  } else if (map === 'sky') {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const cx = 160 + (i + 0.5) * ((MW - 320) / n) + (r() - 0.5) * 60, cy = 280 + r() * 360, w = 110 + r() * 70;
      for (let x = Math.round(cx - w); x < cx + w; x++) {
        const t = (x - cx) / w, top = cy - Math.sqrt(Math.max(0, 1 - t * t)) * (20 + r() * 4), bot = cy + Math.sqrt(Math.max(0, 1 - t * t)) * (90 + Math.sin(x * 0.07) * 18);
        col(x, top, bot);
      }
    }
  } else if (map === 'sea') {
    const n = 5;
    for (let i = 0; i < n; i++) {
      const cx = 180 + (i + 0.5) * ((MW - 360) / n) + (r() - 0.5) * 80, w = 120 + r() * 70, hgt = 140 + r() * 160;
      for (let x = Math.round(cx - w); x < cx + w; x++) { const t = (x - cx) / w; col(x, WATER - Math.max(0, 1 - t * t) ** 0.8 * hgt - Math.sin(x * 0.05) * 6); }
    }
  } else { // abroad: 모래 언덕 + 피라미드
    const h = hm(640, [60, 30, 10]);
    for (let x = 0; x < MW; x++) col(x, h(x) + (edge(x) < 140 ? (140 - edge(x)) * 2.5 : 0));
    for (let i = 0; i < 3; i++) {
      const cx = 350 + i * 520 + (r() - 0.5) * 120, w = 150 + r() * 60, top = h(cx) - w * 1.1;
      for (let x = Math.round(cx - w); x < cx + w; x++) col(x, top + Math.abs(x - cx) * 1.1, h(x) + 2);
    }
  }
  return m;
}
function blob(m, cx, cy, rx, ry, r) { // 동굴
  for (let y = Math.round(cy - ry); y < cy + ry; y++) for (let x = Math.round(cx - rx); x < cx + rx; x++) {
    const dx = (x - cx) / rx, dy = (y - cy) / ry;
    if (dx * dx + dy * dy < 1 && x >= 0 && x < MW && y >= 0 && y < MH) m[y * MW + x] = 0;
  }
  void r;
}

// 도시 맵: 좌우로 움직이는 바닥 (부서지지 않아요). 모두 같은 시계(Date.now)로 움직여서 화면이 같아요.
export function movers(map, seed, m) {
  if (map !== 'city') return [];
  const r = rng(seed ^ 0x5bd1e995), out = [];
  const empty = (x0, y0, w, h) => { for (let y = Math.max(0, y0); y < Math.min(MH, y0 + h); y += 3) for (let x = Math.max(0, x0); x < Math.min(MW, x0 + w); x += 3) if (m[y * MW + x]) return false; return true; };
  for (let tries = 0; out.length < 5 && tries < 800; tries++) {
    const w = Math.round(80 + r() * 50), amp = Math.round(50 + r() * 90), x0 = Math.round(80 + amp + r() * (MW - 160 - 2 * amp - w)), y = Math.round(170 + r() * 400);
    if (!empty(x0 - amp - 20, y - 46, w + 2 * amp + 40, 46 + 10 + 34)) continue;
    if (out.some((o) => Math.abs(o.y - y) < 60 && x0 - amp < o.x0 + o.w + o.amp + 20 && x0 + w + amp + 20 > o.x0 - o.amp)) continue;
    out.push({ x0, y, w, h: 10, amp, per: 6 + r() * 5, ph: r() * 6.28, cx: null });
  }
  return out;
}
export const moverX = (o, ms) => Math.round(o.x0 + Math.sin((ms / 1000 / o.per) * Math.PI * 2 + o.ph) * o.amp);
export const solid = (m, x, y) => { x |= 0; y |= 0; return x >= 0 && x < MW && y >= 0 && y < MH && m[y * MW + x] === 1; };
export function carve(m, cx, cy, r) {
  const r2 = r * r;
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(MH - 1, cy + r); y++)
    for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(MW - 1, cx + r); x++)
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r2) m[y * MW + x] = 0;
}
// 시작 자리: 땅 위, 물 위
export function surfaceAt(m, x, fromY = 0) {
  for (let y = Math.max(1, fromY); y < WATER - 10; y++) if (m[y * MW + x] && !m[(y - 1) * MW + x] && !m[(y - WH) * MW + x]) return y - 1;
  return -1;
}
export function spawnPoints(m, n, seed) {
  const r = rng(seed ^ 0x9e3779b9), pts = [];
  for (let tries = 0; pts.length < n && tries < 4000; tries++) {
    const x = Math.round(80 + r() * (MW - 160));
    const tops = [];
    for (let y = 30; y < WATER - 20; y++) if (m[y * MW + x] && !m[(y - 1) * MW + x]) tops.push(y - 1);
    if (!tops.length) continue;
    const y = tops[Math.floor(r() * tops.length)];
    if (y - WH < 10) continue;
    let ok = true; for (let k = 2; k < WH; k++) if (m[(y - k) * MW + x]) ok = false;
    if (!ok || pts.some((p) => Math.abs(p.x - x) < 70)) continue;
    pts.push({ x, y });
  }
  while (pts.length < n) pts.push({ x: 100 + pts.length * 80, y: 100 });
  return pts;
}

// 걷기 · 공중 이동
export function walkStep(m, w, dx) {
  const nx = Math.max(4, Math.min(MW - 4, w.x + dx));
  for (let up = 0; up <= 8; up++) {
    const ny = w.y - up;
    if (!solid(m, nx, ny) && !solid(m, nx, ny - WH + 4)) { w.x = nx; w.y = ny; break; }
  }
  if (!solid(m, w.x, w.y + 1) && !solid(m, w.x, w.y + 2)) { w.air = true; w.vx = 0; w.vy = 0; }
  else while (!solid(m, w.x, w.y + 1)) w.y++;
}
// 땅에 닿으면 착지 속도를 돌려줘요 (아니면 0)
export function airStep(m, w, dt, drag = 0) {
  w.vy += G * dt; if (drag) { w.vx *= 1 - drag * dt; }
  // 땅 속에 박혀 있으면 위로 빼내요 (천장에 걸려 공중에 멈추는 버그 방지)
  if (solid(m, w.x, w.y - WH / 2)) { let k = 0; while (k < 4 && solid(m, w.x, w.y - WH / 2)) { w.y -= 1; k++; } w.stuck = (w.stuck || 0) + 1; if (w.stuck > 90) { w.y += w.vy * dt; w.stuck = 0; } }
  // 가로 · 세로를 따로 움직여요
  const nx = Math.max(2, Math.min(MW - 2, w.x + w.vx * dt));
  if (!solid(m, nx, w.y - WH / 2) && !solid(m, nx, w.y - WH + 3)) w.x = nx; else w.vx *= -0.3;
  const ny = w.y + w.vy * dt;
  if (w.vy < 0) { if (solid(m, w.x, ny - WH + 3)) w.vy = 0; else w.y = ny; return 0; }
  if (solid(m, w.x, ny)) {
    let y = ny; while (y > 0 && solid(m, w.x, y)) y--;
    const v = w.vy; w.y = y; w.vx = 0; w.vy = 0; w.air = false; w.stuck = 0; return v || 1;
  }
  w.y = ny;
  return 0;
}
