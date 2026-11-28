// 미니게임 (혼자): 동글동글 합체 (우주 진화) — 같은 천체끼리 부딪히면 합쳐져 한 단계 큰 천체가 돼요. 별가루 → … → 블랙홀
// 기본 50번 떨어뜨릴 수 있고, 목표 점수를 넘으면 30번 더! 모두 멈춘 뒤에 다음 캐릭터를 떨어뜨려요.
// 최고 점수는 내 프로필(best.merge)에 저장되고 랭킹에 올라가요. 게임 진행은 내 기기에서만 해요.
import { soundEvent, sfxDrop, sfxMerge, sfxBonus } from '../sound.js';

export const CHARS = [
  { name: '별가루', body: '#fff3a8', dark: '#f0c840', r: 15 },
  { name: '운석', body: '#a89a8c', dark: '#6e6258', r: 20 },
  { name: '달', body: '#f2eedc', dark: '#c8c0a0', r: 26 },
  { name: '화성', body: '#e8643c', dark: '#b03e1e', r: 33 },
  { name: '금성', body: '#f4c878', dark: '#d09a40', r: 40 },
  { name: '지구', body: '#3a8ee8', dark: '#1e5ea8', r: 48 },
  { name: '해왕성', body: '#4a6cf0', dark: '#2a3ea8', r: 57 },
  { name: '토성', body: '#ecd49a', dark: '#bc9e5a', r: 66 },
  { name: '목성', body: '#e8a86a', dark: '#b8703a', r: 76 },
  { name: '태양', body: '#ffcc33', dark: '#ff8a1a', r: 88 },
  { name: '블랙홀', body: '#1a1030', dark: '#b06cff', r: 102 },
];
const MAX = CHARS.length - 1;
export const SPAWN = [36, 29, 19, 11, 5]; // 떨어뜨리는 확률(%): 별가루·운석·달·화성·금성
export const pointsFor = (lv) => lv * (lv + 1); // 새로 만든 단계 lv의 점수 (2, 6, 12, 20 …)
const MAX_BONUS = 300;
export const LIMIT = 50;        // 기본 떨어뜨리기 횟수
export const BONUS_DROPS = 30;  // 목표 점수를 넘으면 추가 횟수
export const BONUS_AT = [450, 1000]; // 목표 점수: 넘을 때마다 +30번 (1차는 시뮬레이션 평균 근처)
// 목표를 넘었으면 횟수를 늘리고 true (한 번에 하나씩)
export function checkBonus(w) {
  const goal = BONUS_AT[w.bonus];
  if (goal == null || w.score < goal) return false;
  w.bonus += 1;
  w.left += BONUS_DROPS;
  return true;
}
export const W = 420, H = 600, DROP_Y = 46;
const G = 1500;

export function pickSpawn(rand = Math.random) {
  let x = rand() * 100;
  for (let i = 0; i < SPAWN.length; i++) { if (x < SPAWN[i]) return i; x -= SPAWN[i]; }
  return 0;
}

// ── 천체 그림 (코드로 그린 실사풍 이미지, img/planets) ──
// p{n}-s: 굴러갈 때 도는 표면 · p{n}-o: 고정 조명·대기·앞쪽 고리 · p{n}-u: 뒤쪽 고리 · p{n}: 아이콘용 완성본
export const PLANET_K = 1.6; // 덮개 그림은 표면 지름의 1.6배
const UNDER = new Set([7, 10]); // 뒤쪽 고리가 있는 천체 (토성·블랙홀)
export const planetIcon = (lv) => `img/planets/p${lv}.webp`;

// ── 물리 (커질 때는 반지름이 서서히 자라며 옆 캐릭터를 미끄러지듯 밀어내고, 구를 때는 회전) ──
export function newWorld() {
  return { bodies: [], score: 0, next: pickSpawn(), cur: pickSpawn(), dropX: W / 2, left: LIMIT, bonus: 0, lastDrop: -1e9, over: false, overT: 0, id: 1, best: 0, made: Array(CHARS.length).fill(0), fx: [], shake: null, banner: null, reason: '' };
}
export function step(w, dt, now, onMerge) {
  const B = w.bodies;
  for (const b of B) { b.px = b.x; b.py = b.y; }
  for (const b of B) {
    if (b.r < b.tr) b.r = Math.min(b.tr, b.r + (b.tr - b.r) * Math.min(1, dt * 9) + 4 * dt);
    b.vy += G * dt; b.vx *= 0.999;
    b.x += b.vx * dt; b.y += b.vy * dt;
    b.touch = false;
  }
  for (let it = 0; it < 4; it++) {
    for (const b of B) {
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx) > 60 ? Math.abs(b.vx) * 0.25 : 0; b.touch = true; }
      if (b.x + b.r > W) { b.x = W - b.r; b.vx = Math.abs(b.vx) > 60 ? -Math.abs(b.vx) * 0.25 : 0; b.touch = true; }
      if (b.y + b.r > H) { b.y = H - b.r; if (b.vy > 0) b.vy *= -0.12; if (it === 0) b.vx *= 0.993; b.touch = true; }
    }
    for (let i = 0; i < B.length; i++) {
      for (let j = i + 1; j < B.length; j++) {
        const a = B[i], b = B[j];
        if (a.dead || b.dead) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, min = a.r + b.r;
        if (d >= min) continue;
        if (a.lv === b.lv && a.r >= a.tr - 0.5 && b.r >= b.tr - 0.5) { a.dead = b.dead = true; onMerge(a, b); continue; }
        a.touch = b.touch = true;
        const nx = dx / d, ny = dy / d, over = min - d;
        const ma = a.r * a.r, mb = b.r * b.r, tot = ma + mb;
        a.x -= nx * over * (mb / tot); a.y -= ny * over * (mb / tot);
        b.x += nx * over * (ma / tot); b.y += ny * over * (ma / tot);
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) {
          const imp = (-(1 + 0.1) * rv) / (1 / ma + 1 / mb);
          a.vx -= (imp / ma) * nx; a.vy -= (imp / ma) * ny;
          b.vx += (imp / mb) * nx; b.vy += (imp / mb) * ny;
          const tx = -ny, ty = nx, tv = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
          const fr = tv * 0.05; // 마찰을 조금만 → 미끄러지듯 밀려나요
          a.vx += (fr * mb / tot) * tx; a.vy += (fr * mb / tot) * ty;
          b.vx -= (fr * ma / tot) * tx; b.vy -= (fr * ma / tot) * ty;
        }
      }
    }
    if (B.some((b) => b.dead)) { const keep = B.filter((b) => !b.dead); B.length = 0; B.push(...keep); }
  }
  for (const b of B) {
    b.x = Math.max(b.r, Math.min(W - b.r, b.x));
    if (b.y + b.r > H) { b.y = H - b.r; if (b.vy > 0) b.vy = 0; }
    // 회전: 무언가에 닿아 있으면 굴러가는 속도에 맞춰 돌고, 공중에서는 돌던 대로
    // 실제로 움직인 속도 (쌓인 채 쉬는 캐릭터는 중력과 밀어내기가 상쇄돼 0에 가까워요 → 화면 주사율과 상관없이 멈춤 판정)
    const mvx = b.px == null ? b.vx : (b.x - b.px) / dt;
    b.sp = b.px == null ? Math.hypot(b.vx, b.vy) : Math.hypot(b.x - b.px, b.y - b.py) / dt;
    // 회전도 '실제로 굴러간 거리'로: 끼어서 못 움직이는 캐릭터는 속도 값이 남아 있어도 돌지 않아요
    if (b.touch) { b.fall = false; b.w += (mvx / b.r - b.w) * 0.5; } else b.w *= 0.998;
    if (b.sp < 8) b.w *= 0.85;
    // 구름 저항: 닿은 채 느릿느릿 기어가는 움직임은 금방 멈춰요 (밀려날 때의 빠른 미끄러짐은 그대로)
    if (b.touch && b.sp < 40) { const k = Math.exp(-7 * dt); b.vx *= k; if (b.vy < 0) b.vy *= k; }
    // 거의 멈췄으면 딱 멈춰요 (위에서 눌려 아주 조금씩 밀리는 움직임·회전을 없애요)
    if (b.touch && b.sp < 10 && Math.abs(b.vx) < 25) { b.vx = 0; b.w = 0; }
    b.a += b.w * dt;
  }
}
// 모두 멈췄나? (속도가 거의 0이고 자라는 중인 캐릭터도 없음)
export const settled = (w) => w.bodies.every((b) => !b.fall && (b.sp ?? Math.hypot(b.vx, b.vy)) < 22 && b.r >= b.tr - 0.5);
const STALL_MS = 3000; // 그래도 계속 꿈틀대면 3초 뒤엔 멈춘 것으로 쳐요 (게임이 멈추지 않게)
const calmNow = (w, now) => settled(w) || now - w.lastDrop > STALL_MS;

export function dropAt(w, x, now) {
  const r = CHARS[w.cur].r;
  const cx = Math.max(r, Math.min(W - r, x));
  w.bodies.push({ id: w.id++, lv: w.cur, r, tr: r, x: cx, y: DROP_Y, vx: 0, vy: 0, a: 0, w: 0, born: now, fall: true });
  w.cur = w.next;
  w.next = pickSpawn();
  w.left -= 1;
  w.lastDrop = now;
}
export function mergeOnce(w, a, b, now) {
  const lv = a.lv + 1;
  const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
  if (a.lv >= MAX) { w.score += MAX_BONUS; w.fx.push({ kind: 'text', x, y, t: now, text: `+${MAX_BONUS}`, big: true }); return { lv: MAX + 1, x, y }; }
  const nb = { id: w.id++, lv, r: Math.max(a.r, b.r), tr: CHARS[lv].r, x, y, vx: (a.vx + b.vx) / 2, vy: Math.min(0, (a.vy + b.vy) / 2) - 40, a: (a.a + b.a) / 2, w: 0, born: now, pop: now };
  w.bodies.push(nb);
  const pts = pointsFor(lv);
  w.score += pts;
  w.made[lv] += 1;
  w.fx.push({ kind: 'text', x, y: y - nb.tr * 0.4, t: now, text: `+${pts}`, big: lv >= 6 });
  return nb;
}

// ── 화면 ──
let ctl = null;
function teardown() { if (!ctl) return; cancelAnimationFrame(ctl.raf); window.removeEventListener('keydown', ctl.onKey); ctl = null; }
const dataUrl = planetIcon;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

function build() {
  const root = document.createElement('div');
  root.className = 'mg';
  root.innerHTML = `
    <div class="mg-top">
      <div class="mg-score"><small>점수</small><b data-score>0</b></div>
      <div class="mg-next"><small>다음</small><img data-next alt=""></div>
      <div class="mg-left"><small>남은 횟수</small><b data-left>${LIMIT}</b></div>
      <div class="mg-best"><small>내 최고</small><b data-best>-</b></div>
    </div>
    <div class="mg-goal" data-goal>${goalText(0)}</div>
    <div class="mg-box"><canvas></canvas><div class="mg-banner" hidden></div><div class="mg-over" hidden></div></div>
    <div class="mg-chain">${CHARS.map((c, i) => `<img src="${dataUrl(i)}" title="${c.name}" alt="${c.name}" style="width:${20 + i * 3.4}px">`).join('<i>›</i>')}</div>
    <div class="mg-hint">화면을 누른 채로 좌우로 움직이고, 손을 떼면 떨어져요 · 모두 멈춰야 다음 천체를 떨어뜨릴 수 있어요 (PC: 마우스 · ←→ + 스페이스)</div>
    <div class="mg-rank"><div class="mg-rank-t">🏆 랭킹 TOP 10</div><ol data-rank><li class="muted">불러오는 중…</li></ol></div>`;
  const c = { root, $: (q) => root.querySelector(q), canvas: root.querySelector('canvas'), w: newWorld(), raf: 0, last: performance.now(), sprites: [], aim: false, shownScore: 0 };
  const img = (src) => { const im = new Image(); im.decoding = 'async'; im.src = src; return im; };
  c.sprites = CHARS.map((_, i) => ({ s: img(`img/planets/p${i}-s.webp`), o: img(`img/planets/p${i}-o.webp`), u: UNDER.has(i) ? img(`img/planets/p${i}-u.webp`) : null }));
  const cv = c.canvas;
  const toX = (e) => { const r = cv.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * W; };
  cv.addEventListener('pointerdown', (e) => { if (c.w.over) return; c.aim = true; c.w.dropX = toX(e); cv.setPointerCapture?.(e.pointerId); e.preventDefault(); });
  cv.addEventListener('pointermove', (e) => { if (c.w.over) return; if (c.aim || e.pointerType === 'mouse') c.w.dropX = toX(e); });
  cv.addEventListener('pointerup', (e) => { if (!c.aim) return; c.aim = false; c.w.dropX = toX(e); tryDrop(c); });
  cv.addEventListener('pointercancel', () => { c.aim = false; });
  c.onKey = (e) => {
    if (!c.root.isConnected || e.target.closest?.('input, textarea')) return;
    if (e.code === 'ArrowLeft') { c.w.dropX -= 18; e.preventDefault(); }
    if (e.code === 'ArrowRight') { c.w.dropX += 18; e.preventDefault(); }
    if (e.code === 'Space' && !e.repeat) { e.preventDefault(); tryDrop(c); }
  };
  window.addEventListener('keydown', c.onKey);
  root.addEventListener('click', (e) => { if (e.target.closest('[data-again]')) restart(c); });
  return c;
}
const goalText = (k) => (k < BONUS_AT.length ? `🎯 ${BONUS_AT[k].toLocaleString()}점을 넘으면 <b>+${BONUS_DROPS}번</b> 더! <small>(${k + 1}/${BONUS_AT.length})</small>` : `🎉 보너스 목표 모두 달성! (+${BONUS_DROPS * BONUS_AT.length}번)`);
const canDrop = (w, now) => !w.over && w.left > 0 && now - w.lastDrop > 300 && calmNow(w, now);
function tryDrop(c) {
  const now = performance.now();
  if (!canDrop(c.w, now)) return;
  dropAt(c.w, c.w.dropX, now);
  sfxDrop();
}
function restart(c) {
  const best = c.w.best;
  c.w = newWorld();
  c.w.best = best;
  c.$('.mg-over').hidden = true;
  c.$('.mg-banner').hidden = true;
}
async function loadRank(c) {
  try {
    const { backend } = await import('../backend/index.js');
    const list = await backend.topScores('merge', 10);
    const me = c.ctx.me;
    c.$('[data-rank]').innerHTML = list.length ? list.map((r, i) => `<li class="${r.uid === me ? 'me' : ''}"><span>${i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}`}</span><b>${esc(r.name)}</b><em>${(Number(r.score) || 0).toLocaleString()}</em></li>`).join('') : '<li class="muted">아직 기록이 없어요. 첫 기록의 주인공이 되어 보세요!</li>';
  } catch {
    c.$('[data-rank]').innerHTML = '<li class="muted">랭킹을 불러오지 못했어요</li>';
  }
}
async function gameOver(c, reason) {
  const w = c.w;
  w.over = true;
  w.reason = reason;
  const score = w.score;
  let best = w.best, isNew = false;
  try {
    const { backend } = await import('../backend/index.js');
    const prev = w.best;
    best = await Promise.race([backend.saveBest(c.ctx.me, 'merge', score), new Promise((_, no) => setTimeout(() => no(new Error('느린 연결')), 4000))]); // 연결이 느려도 결과 화면은 바로
    isNew = score > prev && score === best;
    w.best = best;
  } catch { best = Math.max(best, score); }
  soundEvent(c.ctx.room?.code, `mg:over:${Date.now()}`, isNew ? 'ok' : 'no');
  const top = w.made.reduce((m, n, i) => (n ? i : m), 0);
  c.$('.mg-over').innerHTML = `<div><b>${reason === 'full' ? '상자가 가득 찼어요!' : '모두 떨어뜨렸어요!'}</b><strong>${score.toLocaleString()}점</strong>${isNew ? '<em>🎉 최고 기록 경신!</em>' : `<small>내 최고 ${best.toLocaleString()}점</small>`}
    ${w.bonus ? `<small>🎯 보너스 +${BONUS_DROPS * w.bonus}번 달성! (${w.bonus}/${BONUS_AT.length})</small>` : ''}
    <span>가장 크게 만든 천체: <img src="${dataUrl(top)}" alt=""> ${CHARS[top].name}</span>
    <button class="mg-again" data-again>다시 하기 ↻</button></div>`;
  c.$('.mg-over').hidden = false;
  c.$('[data-best]').textContent = best.toLocaleString();
  loadRank(c);
}
function burst(w, x, y, lv, now) {
  const n = 8 + Math.min(lv, 10) * 3;
  const col = CHARS[Math.min(lv, MAX)].body;
  for (let k = 0; k < n; k++) {
    const ang = (k / n) * Math.PI * 2 + Math.random() * 0.4, sp = 120 + Math.random() * (140 + lv * 30);
    w.fx.push({ kind: 'p', x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 60, t: now, life: 500 + Math.random() * 300, col: k % 3 ? col : '#ffffff', star: k % 4 === 0, size: 3 + Math.random() * (2 + lv * 0.5) });
  }
  w.fx.push({ kind: 'ring', x, y, t: now, r: (CHARS[Math.min(lv, MAX)]?.r || 100), col });
  if (lv >= 6) w.shake = { t: now, mag: 3 + (lv - 6) * 2 };
}

function frame() {
  if (!ctl) return;
  ctl.raf = requestAnimationFrame(frame);
  const c = ctl;
  if (!c.root.isConnected) { if (!c.gone) c.gone = Date.now(); else if (Date.now() - c.gone > 3000) teardown(); return; }
  c.gone = 0;
  const now = performance.now();
  const dt = Math.min(0.05, (now - c.last) / 1000);
  c.last = now;
  const w = c.w;
  if (!w.over) {
    const sub = 4, h = dt / sub;
    for (let k = 0; k < sub; k++) step(w, h, now, (a, b) => { const nb = mergeOnce(w, a, b, now); burst(w, nb.x, nb.y, nb.lv, now); sfxMerge(nb.lv); });
    // 목표 점수 → 횟수 +30 (한 번)
    if (checkBonus(w)) { w.banner = { t: now, text: `🎯 ${BONUS_AT[w.bonus - 1].toLocaleString()}점 달성!<br><b>+${BONUS_DROPS}번</b> 더 떨어뜨릴 수 있어요` }; sfxBonus(); }
    const calm = calmNow(w, now) && now - w.lastDrop > 300;
    // 상자 위로 넘친 채 멈추면 끝 / 다 떨어뜨리고 모두 멈추면 끝
    const full = calm && w.bodies.some((b) => b.y - b.r < 0);
    w.overT = full ? (w.overT || now) : 0;
    if (w.overT && now - w.overT > 1200) gameOver(c, 'full');
    else if (w.left <= 0 && calm && now - w.lastDrop > 800) gameOver(c, 'limit');
  }
  // 그리기
  const cv = c.canvas;
  const cssW = cv.clientWidth || 360, dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(cssW * dpr)) { cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssW * dpr * (H / W)); }
  const k = cv.width / W;
  const g = cv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height);
  let sx = 0, sy = 0;
  if (w.shake && now - w.shake.t < 300) { const m = w.shake.mag * (1 - (now - w.shake.t) / 300); sx = (Math.random() - 0.5) * 2 * m; sy = (Math.random() - 0.5) * 2 * m; }
  g.setTransform(k, 0, 0, k, sx * k, sy * k);
  // 떨어뜨릴 캐릭터 + 조준선
  if (!w.over && w.left > 0) {
    const r = CHARS[w.cur].r;
    w.dropX = Math.max(r, Math.min(W - r, w.dropX));
    const ready = canDrop(w, now);
    g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w.dropX, DROP_Y + r); g.lineTo(w.dropX, H); g.stroke();
    g.globalAlpha = ready ? 1 : 0.35;
    drawChar(g, c, w.cur, w.dropX, DROP_Y, r, 1, 0);
    g.globalAlpha = 1;
    if (!ready) { g.fillStyle = 'rgba(255,255,255,.7)'; g.font = '700 14px sans-serif'; g.textAlign = 'center'; g.fillText('멈출 때까지 기다려요…', w.dropX, DROP_Y + r + 20); }
  }
  for (const b of w.bodies) {
    const s = b.pop && now - b.pop < 260 ? 1 + Math.sin(((now - b.pop) / 260) * Math.PI) * 0.12 : 1; // 합체할 때 뿅
    drawChar(g, c, b.lv, b.x, b.y, b.r, s, b.a);
  }
  // 효과
  w.fx = w.fx.filter((f) => now - f.t < (f.life || 900));
  for (const f of w.fx) {
    const e = now - f.t;
    if (f.kind === 'p') {
      const tt = e / 1000, a = 1 - e / f.life;
      const px = f.x + f.vx * tt, py = f.y + f.vy * tt + 400 * tt * tt;
      g.globalAlpha = Math.max(0, a); g.fillStyle = f.col;
      if (f.star) drawStar(g, px, py, f.size * 1.6, now / 200); else { g.beginPath(); g.arc(px, py, f.size, 0, Math.PI * 2); g.fill(); }
    } else if (f.kind === 'ring') {
      const p = e / 500; if (p > 1) continue;
      g.globalAlpha = 1 - p; g.strokeStyle = f.col; g.lineWidth = 6 * (1 - p) + 1;
      g.beginPath(); g.arc(f.x, f.y, f.r * (0.6 + p * 0.9), 0, Math.PI * 2); g.stroke();
    } else if (f.kind === 'text') {
      const a = 1 - e / 900;
      const sc = e < 120 ? 0.6 + (e / 120) * 0.6 : 1.2 - Math.min(0.2, (e - 120) / 600);
      g.globalAlpha = Math.max(0, a); g.textAlign = 'center';
      g.font = `900 ${Math.round((f.big ? 32 : 22) * sc)}px sans-serif`;
      g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 5; g.fillStyle = f.big ? '#ffd84d' : '#ffffff';
      g.strokeText(f.text, f.x, f.y - e / 18); g.fillText(f.text, f.x, f.y - e / 18);
    }
    g.globalAlpha = 1;
  }
  // 점수판 (숫자가 차르르 올라가고 통통 튀어요)
  if (c.shownScore !== w.score) {
    c.shownScore += Math.max(1, Math.ceil((w.score - c.shownScore) * 0.2));
    if (c.shownScore > w.score) c.shownScore = w.score;
    const $s = c.$('[data-score]');
    $s.textContent = c.shownScore.toLocaleString();
    $s.classList.remove('bump'); void $s.offsetWidth; $s.classList.add('bump');
  }
  const $l = c.$('[data-left]');
  if ($l.textContent !== String(w.left)) { $l.textContent = String(w.left); $l.classList.toggle('low', w.left <= 5); }
  const $g = c.$('[data-goal]');
  if ($g.dataset.lv !== String(w.bonus)) { $g.dataset.lv = String(w.bonus); $g.innerHTML = goalText(w.bonus); $g.classList.toggle('done', w.bonus >= BONUS_AT.length); }
  const $n = c.$('[data-next]');
  if ($n.dataset.lv !== String(w.next)) { $n.dataset.lv = String(w.next); $n.src = dataUrl(w.next); }
  const $b = c.$('.mg-banner');
  if (w.banner && now - w.banner.t < 2200) { if ($b.hidden) { $b.innerHTML = w.banner.text; $b.hidden = false; } }
  else if (!$b.hidden) $b.hidden = true;
}
function drawStar(g, x, y, r, rot) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}
function drawChar(g, c, lv, x, y, r, s, ang) {
  const sp = c.sprites[lv];
  const ok = (im) => im && im.complete && im.naturalWidth;
  if (!ok(sp.s)) { g.fillStyle = CHARS[lv].body; g.beginPath(); g.arc(x, y, r * s, 0, Math.PI * 2); g.fill(); return; }
  const d = r * 2 * s, D = d * PLANET_K;
  if (ok(sp.u)) g.drawImage(sp.u, x - D / 2, y - D / 2, D, D); // 뒤쪽 고리
  g.save(); g.translate(x, y); g.rotate(ang || 0);
  g.drawImage(sp.s, -d / 2, -d / 2, d, d); // 굴러가며 도는 표면
  g.restore();
  if (ok(sp.o)) g.drawImage(sp.o, x - D / 2, y - D / 2, D, D); // 고정된 조명·대기·앞쪽 고리
}

export default {
  id: 'merge',
  name: '동글동글 합체',
  emoji: '🪐',
  category: 'mini',
  minPlayers: 1,
  maxPlayers: 1,
  solo: true,
  bgm: 'happy',
  duration: '5~10분',
  rewards: [],
  rewardLabel: '🏆 랭킹전',
  description: '별가루에서 블랙홀까지! 같은 천체끼리 합쳐 우주를 키우는 혼자 하는 랭킹전',
  rules: [
    `천체를 ${LIMIT}번 떨어뜨릴 수 있어요. 같은 천체끼리 닿으면 합쳐져 한 단계 큰 천체가 돼요.`,
    '떨어뜨린 뒤 모두 멈춰야 다음 천체를 떨어뜨릴 수 있어요.',
    `천체는 11단계: ${CHARS.map((c) => c.name).join(' → ')}`,
    `떨어지는 건 작은 5가지뿐이에요 (별가루 ${SPAWN[0]}% · 운석 ${SPAWN[1]}% · 달 ${SPAWN[2]}% · 화성 ${SPAWN[3]}% · 금성 ${SPAWN[4]}%). 큰 천체는 합쳐서만 만들 수 있어요.`,
    '합칠 때마다 점수! 큰 천체를 만들수록 점수가 커져요 (운석 2점 · 달 6점 · … · 블랙홀 110점). 블랙홀 둘을 합치면 +300점 보너스!',
    `점수가 ${BONUS_AT.map((n) => n.toLocaleString() + '점').join(', ')}을 넘을 때마다 ${BONUS_DROPS}번씩 더 떨어뜨릴 수 있어요.`,
    '다 떨어뜨리거나, 천체가 상자 밖으로 넘친 채 멈추면 게임 끝.',
    '최고 점수는 내 프로필에 저장되고 랭킹에 올라가요. 혼자 하는 게임이라 인장·전적은 없어요.',
  ],

  setup() { return { solo: true }; },
  move() { throw new Error('__noop'); },

  render(el, ctx) {
    const code = ctx.room?.code || 'local';
    if (!ctl || ctl.code !== code) {
      teardown();
      ctl = build();
      ctl.code = code;
      ctl.ctx = ctx;
      ctl.raf = requestAnimationFrame(frame);
      import('../backend/index.js').then(({ backend }) => (backend.getBest ? backend.getBest(ctx.me, 'merge') : backend.saveBest(ctx.me, 'merge', 0)).then((b) => { if (ctl) { ctl.w.best = b; ctl.$('[data-best]').textContent = b ? b.toLocaleString() : '-'; } }).catch(() => {}));
      loadRank(ctl);
    }
    ctl.ctx = ctx;
    if (typeof location !== 'undefined' && location.search.includes('test')) window.__mg = ctl; // 테스트 모드 점검용
    if (ctl.root.parentNode !== el) { el.innerHTML = ''; el.appendChild(ctl.root); }
  },
};
