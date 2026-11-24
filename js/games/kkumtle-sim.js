// 꿈틀 포격전: 지형 · 물리 · 포탄 시뮬레이션 (화면과 분리)
export const MW = 1600, MH = 760, WATER = 720;
export const G = 520;           // 중력 (px/s²)
export const WORM_H = 18;       // 캐릭터 키 (발 기준)
export const WEAPONS = {
  bazooka: { name: '바주카', icon: '🚀', r: 44, dmg: 48, wind: true, speed: 720 },
  grenade: { name: '수류탄', icon: '💣', r: 48, dmg: 52, wind: false, speed: 560, fuse: 3 },
};

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// 땅 높이 (x마다 지면 y). 씨앗값이 같으면 모두 같은 지형
const cache = new Map();
export function ground(seed) {
  if (cache.has(seed)) return cache.get(seed);
  const r = rng(seed), h = new Float32Array(MW);
  const waves = Array.from({ length: 5 }, (_, i) => ({ a: (60 - i * 10) * (0.6 + r() * 0.8), f: (0.0025 + r() * 0.002) * (i + 1), p: r() * 6.28 }));
  for (let x = 0; x < MW; x++) {
    let y = 470;
    for (const w of waves) y += Math.sin(x * w.f + w.p) * w.a;
    const edge = Math.min(x, MW - 1 - x); // 양 끝은 바다로 떨어지게
    if (edge < 120) y += (120 - edge) * 2.2;
    h[x] = Math.max(170, Math.min(WATER + 40, y));
  }
  cache.set(seed, h);
  return h;
}
export function solid(gy, craters, x, y) {
  if (x < 0 || x >= MW || y >= MH) return y >= MH;
  if (y < gy[x | 0]) return false;
  for (let i = craters.length - 1; i >= 0; i--) { const c = craters[i]; const dx = x - c[0], dy = y - c[1]; if (dx * dx + dy * dy < c[2] * c[2]) return false; }
  return true;
}
// 발 아래로 떨어뜨려 땅에 세우기
export function settle(gy, craters, x, y) {
  for (let yy = Math.max(0, y); yy < MH; yy++) if (solid(gy, craters, x, yy + 1)) return yy;
  return MH + 50;
}

// 걷기: 한 걸음(dx). 8px까지 오르막 가능, 막히면 제자리
export function walkStep(gy, craters, w, dx) {
  const nx = Math.max(4, Math.min(MW - 4, w.x + dx));
  for (let up = 0; up <= 8; up++) {
    const ny = w.y - up;
    if (!solid(gy, craters, nx, ny - 2) && !solid(gy, craters, nx, ny - WORM_H + 4)) { w.x = nx; w.y = ny; break; }
  }
  // 발밑이 비었으면 아래로
  if (!solid(gy, craters, w.x, w.y + 1)) { w.air = true; }
}
// 공중 이동 (점프·밀려남): 땅에 닿으면 true
export function airStep(gy, craters, w, dt) {
  w.vy += G * dt;
  const nx = w.x + w.vx * dt, ny = w.y + w.vy * dt;
  if (solid(gy, craters, nx, ny - WORM_H / 2)) { w.vx *= -0.3; return false; } // 벽
  if (w.vy > 0 && solid(gy, craters, nx, ny)) { w.x = nx; w.y = settleUp(gy, craters, nx, ny); w.vx = 0; w.vy = 0; w.air = false; return true; }
  if (w.vy < 0 && solid(gy, craters, nx, ny - WORM_H)) { w.vy = 0; }
  w.x = Math.max(2, Math.min(MW - 2, nx)); w.y = ny;
  return false;
}
function settleUp(gy, craters, x, y) { let yy = y; while (yy > 0 && solid(gy, craters, x, yy)) yy--; return yy; }

// 발사 시뮬레이션 → 결과 (포탄 경로, 폭발, 새 구멍, 캐릭터 최종 상태)
export function simulate({ seed, craters, worms, shooter, weapon, angle, power, facing, wind }) {
  const gy = ground(seed), W = WEAPONS[weapon];
  const cr = craters.map((c) => [...c]);
  const ws = worms.map((w) => ({ ...w }));
  const me = ws.find((w) => w.id === shooter);
  const dir = [Math.cos(angle) * facing, -Math.sin(angle)];
  const p = [me.x + dir[0] * 16, me.y - WORM_H / 2 + dir[1] * 16];
  const v = [dir[0] * W.speed * power, dir[1] * W.speed * power];
  const dt = 1 / 60, path = [];
  let boom = null, splash = false, tm = 0;
  for (let i = 0; i < 60 * 12; i++) {
    tm += dt;
    v[1] += G * dt; if (W.wind) v[0] += wind * 110 * dt;
    const nx = p[0] + v[0] * dt, ny = p[1] + v[1] * dt;
    if (i % 2 === 0) path.push(Math.round(p[0]), Math.round(p[1]));
    if (ny > WATER) { splash = true; p[0] = nx; p[1] = WATER; break; }
    if (nx < -300 || nx > MW + 300) { p[0] = nx; p[1] = ny; break; }
    const hitWorm = weapon === 'bazooka' && i > 3 && ws.some((w) => !w.dead && Math.abs(w.x - nx) < 8 && ny > w.y - WORM_H && ny < w.y + 2);
    if (solid(gy, cr, nx, ny) || hitWorm) {
      if (weapon === 'bazooka') { boom = [Math.round(nx), Math.round(ny)]; break; }
      // 수류탄: 튕기기 (부딪힌 면에 따라)
      const hitX = solid(gy, cr, nx, p[1]), hitY = solid(gy, cr, p[0], ny);
      if (hitY || !hitX) v[1] *= -0.42; if (hitX) v[0] *= -0.5; v[0] *= 0.8;
    } else { p[0] = nx; p[1] = ny; }
    if (W.fuse && tm >= W.fuse) { boom = [Math.round(p[0]), Math.round(p[1])]; break; }
  }
  path.push(Math.round(p[0]), Math.round(p[1]));
  const hits = [];
  if (boom) {
    cr.push([boom[0], boom[1], W.r]);
    for (const w of ws) {
      if (w.dead) continue;
      const dx = w.x - boom[0], dy = w.y - WORM_H / 2 - boom[1], d = Math.hypot(dx, dy);
      if (d > W.r + 12) continue;
      const dmg = Math.max(6, Math.round(W.dmg * (1 - d / (W.r + 12))));
      w.hp = Math.max(0, w.hp - dmg);
      const k = dmg * 7, l = d || 1;
      w.vx = (dx / l) * k; w.vy = Math.min(-120, (dy / l) * k - dmg * 4); w.air = true;
      hits.push({ id: w.id, dmg });
    }
  }
  // 밀려난 캐릭터 · 발밑이 사라진 캐릭터 떨어뜨리기
  for (const w of ws) {
    if (w.dead) continue;
    if (!w.air && !solid(gy, cr, w.x, w.y + 1)) { w.air = true; w.vx = 0; w.vy = 0; }
    let n = 0;
    while (w.air && n++ < 60 * 8) { airStep(gy, cr, w, dt); if (w.y > WATER) break; }
    if (w.y > WATER) { w.dead = true; w.drown = true; w.hp = 0; }
    if (w.hp <= 0) w.dead = true;
    w.x = Math.round(w.x); w.y = Math.round(w.y); delete w.vx; delete w.vy; delete w.air;
  }
  return { path, boom: boom ? [...boom, W.r] : null, splash, hits, worms: ws };
}
