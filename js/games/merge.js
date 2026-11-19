// 미니게임 (혼자): 동글동글 합체 — 같은 캐릭터끼리 부딪히면 합쳐져 한 단계 큰 캐릭터가 돼요.
// 위에서 떨어뜨리고, 상자가 넘치면 끝. 최고 점수는 내 프로필(best.merge)에 저장되고 랭킹에 올라가요.
// 게임 진행은 모두 내 기기에서만 (방 문서에는 아무것도 쓰지 않아요).
import { soundEvent, ding } from '../sound.js';

export const CHARS = [
  { name: '콩알', body: '#8bd450', dark: '#5fa82e', r: 15 },
  { name: '병아리', body: '#ffd84d', dark: '#e0b020', r: 20 },
  { name: '햄찌', body: '#f2b880', dark: '#d08a50', r: 26 },
  { name: '토끼', body: '#f7eef4', dark: '#e2c4d6', r: 33 },
  { name: '냥이', body: '#ffb24a', dark: '#e0862a', r: 40 },
  { name: '멍멍이', body: '#d8a06a', dark: '#a8703a', r: 48 },
  { name: '펭귄', body: '#3a4a6e', dark: '#26324e', r: 57 },
  { name: '판다', body: '#ffffff', dark: '#dcdce4', r: 66 },
  { name: '여우', body: '#ff7a3a', dark: '#d8541a', r: 76 },
  { name: '곰돌이', body: '#9a6a44', dark: '#6e4628', r: 88 },
  { name: '유니콘', body: '#f6eeff', dark: '#d8c4f4', r: 102 },
];
const MAX = CHARS.length - 1;
export const SPAWN = [34, 28, 20, 12, 6]; // 떨어뜨리는 캐릭터 확률(%): 콩알·병아리·햄찌·토끼·냥이
export const pointsFor = (lv) => lv * (lv + 1); // 새로 만든 단계 lv의 점수 (2, 6, 12, 20 …)
const MAX_BONUS = 300;
const W = 420, H = 600, TOP = 96; // 상자 크기 · 넘침 선
const G = 1500;

export function pickSpawn(rand = Math.random) {
  let x = rand() * 100;
  for (let i = 0; i < SPAWN.length; i++) { if (x < SPAWN[i]) return i; x -= SPAWN[i]; }
  return 0;
}

// ── 캐릭터 그림 (오리지널, SVG) ──
export function charSvg(lv) {
  const c = CHARS[lv];
  const eye = (x, y, s = 1) => `<ellipse cx="${x}" cy="${y}" rx="${4.2 * s}" ry="${5.4 * s}" fill="#2a1f2e"/><circle cx="${x + 1.4 * s}" cy="${y - 1.8 * s}" r="${1.6 * s}" fill="#fff"/>`;
  const blush = '<ellipse cx="30" cy="60" rx="6" ry="3.6" fill="#ff8aa8" opacity=".55"/><ellipse cx="70" cy="60" rx="6" ry="3.6" fill="#ff8aa8" opacity=".55"/>';
  const mouth = (y = 60) => `<path d="M45 ${y} Q47.5 ${y + 3} 50 ${y} Q52.5 ${y + 3} 55 ${y}" stroke="#2a1f2e" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  const face = (ey = 50, s = 1) => `${eye(38, ey, s)}${eye(62, ey, s)}${blush}${mouth(ey + 10)}`;
  const base = (fill = c.body) => `<circle cx="50" cy="50" r="46" fill="${fill}" stroke="${c.dark}" stroke-width="3"/>`;
  let g = '';
  switch (lv) {
    case 0: g = `${base()}<path d="M50 6 q6 -4 10 2" stroke="#4a8a1e" stroke-width="3" fill="none"/>${face(48, 1.2)}`; break;
    case 1: g = `${base()}<path d="M42 10 l4 -8 l4 8 l4 -8 l4 8" fill="#ffd84d" stroke="${c.dark}" stroke-width="2"/>${eye(38, 46, 1.1)}${eye(62, 46, 1.1)}${blush}<path d="M44 56 L56 56 L50 64Z" fill="#ff9a2a"/>`; break;
    case 2: g = `<circle cx="22" cy="18" r="10" fill="${c.dark}"/><circle cx="78" cy="18" r="10" fill="${c.dark}"/>${base()}<ellipse cx="50" cy="66" rx="24" ry="18" fill="#fff4e4"/>${face(46)}`; break;
    case 3: g = `<ellipse cx="34" cy="10" rx="8" ry="20" fill="${c.body}" stroke="${c.dark}" stroke-width="3"/><ellipse cx="66" cy="10" rx="8" ry="20" fill="${c.body}" stroke="${c.dark}" stroke-width="3"/><ellipse cx="34" cy="12" rx="3.5" ry="13" fill="#ffb8cc"/><ellipse cx="66" cy="12" rx="3.5" ry="13" fill="#ffb8cc"/>${base()}${face(52)}`; break;
    case 4: g = `<path d="M14 30 L22 2 L42 20Z M86 30 L78 2 L58 20Z" fill="${c.body}" stroke="${c.dark}" stroke-width="3" stroke-linejoin="round"/>${base()}<path d="M36 18 l4 8 M50 14 l0 9 M64 18 l-4 8" stroke="${c.dark}" stroke-width="3" stroke-linecap="round"/>${face(52)}<path d="M18 60 h12 M70 60 h12 M20 66 h10 M70 66 h10" stroke="#2a1f2e" stroke-width="1.5" opacity=".5"/>`; break;
    case 5: g = `${base()}<ellipse cx="12" cy="44" rx="11" ry="22" fill="${c.dark}"/><ellipse cx="88" cy="44" rx="11" ry="22" fill="${c.dark}"/><ellipse cx="50" cy="64" rx="18" ry="13" fill="#fff4e4"/>${face(48)}<ellipse cx="50" cy="58" rx="5" ry="3.5" fill="#2a1f2e"/>`; break;
    case 6: g = `${base()}<path d="M50 14 Q24 18 20 50 Q22 86 50 92 Q78 86 80 50 Q76 18 50 14Z" fill="#fff"/>${eye(38, 46)}${eye(62, 46)}${blush}<path d="M44 56 L56 56 L50 63Z" fill="#ffb02e"/>`; break;
    case 7: g = `<circle cx="18" cy="14" r="12" fill="#2a2a34"/><circle cx="82" cy="14" r="12" fill="#2a2a34"/>${base()}<ellipse cx="36" cy="48" rx="10" ry="12" fill="#2a2a34" transform="rotate(-20 36 48)"/><ellipse cx="64" cy="48" rx="10" ry="12" fill="#2a2a34" transform="rotate(20 64 48)"/><circle cx="37" cy="47" r="3.2" fill="#fff"/><circle cx="63" cy="47" r="3.2" fill="#fff"/>${blush}<ellipse cx="50" cy="60" rx="5" ry="3.5" fill="#2a2a34"/>`; break;
    case 8: g = `<path d="M10 34 L16 0 L40 18Z M90 34 L84 0 L60 18Z" fill="${c.body}" stroke="${c.dark}" stroke-width="3" stroke-linejoin="round"/>${base()}<path d="M8 56 Q30 50 50 74 Q70 50 92 56 Q86 88 50 96 Q14 88 8 56Z" fill="#fff"/>${eye(36, 48)}${eye(64, 48)}<ellipse cx="50" cy="64" rx="4.5" ry="3.2" fill="#2a1f2e"/>`; break;
    case 9: g = `<circle cx="16" cy="16" r="13" fill="${c.body}" stroke="${c.dark}" stroke-width="3"/><circle cx="84" cy="16" r="13" fill="${c.body}" stroke="${c.dark}" stroke-width="3"/><circle cx="16" cy="16" r="6" fill="#e8b890"/><circle cx="84" cy="16" r="6" fill="#e8b890"/>${base()}<ellipse cx="50" cy="64" rx="20" ry="15" fill="#e8c4a0"/>${face(46)}<ellipse cx="50" cy="58" rx="6" ry="4" fill="#2a1f2e"/>`; break;
    case 10: g = `${base()}<path d="M50 -2 L44 22 L56 22Z" fill="#ffd84d" stroke="#e0a020" stroke-width="2"/><path d="M14 30 Q6 50 16 70" stroke="#ff8ad8" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M20 22 Q8 46 22 74" stroke="#8ab8ff" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M28 14 Q14 40 28 80" stroke="#9ff0c4" stroke-width="5" fill="none" stroke-linecap="round"/>${face(50, 1.1)}<path d="M74 28 l3 -6 l3 6 l6 1 l-5 4 l1 6 l-5 -3 l-5 3 l1 -6 l-5 -4Z" fill="#ffd84d"/>`; break;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -8 112 112">${g}</svg>`;
}

// ── 물리 ──
export function newWorld() {
  return { bodies: [], score: 0, next: pickSpawn(), cur: pickSpawn(), dropX: W / 2, canDrop: 0, over: false, overT: 0, id: 1, best: 0, made: Array(CHARS.length).fill(0), pops: [] };
}
export function step(w, dt, now, onMerge) {
  const B = w.bodies;
  for (const b of B) { b.vy += G * dt; b.vx *= 0.999; b.x += b.vx * dt; b.y += b.vy * dt; }
  for (let it = 0; it < 4; it++) {
    for (const b of B) {
      if (b.x - b.r < 0) { b.x = b.r; b.vx = Math.abs(b.vx) * 0.3; }
      if (b.x + b.r > W) { b.x = W - b.r; b.vx = -Math.abs(b.vx) * 0.3; }
      if (b.y + b.r > H) { b.y = H - b.r; if (b.vy > 0) b.vy *= -0.15; b.vx *= 0.92; }
    }
    for (let i = 0; i < B.length; i++) {
      for (let j = i + 1; j < B.length; j++) {
        const a = B[i], b = B[j];
        if (a.dead || b.dead) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, min = a.r + b.r;
        if (d >= min) continue;
        if (a.lv === b.lv) { a.dead = b.dead = true; onMerge(a, b); continue; }
        const nx = dx / d, ny = dy / d, over = min - d;
        const ma = a.r * a.r, mb = b.r * b.r, tot = ma + mb;
        a.x -= nx * over * (mb / tot); a.y -= ny * over * (mb / tot);
        b.x += nx * over * (ma / tot); b.y += ny * over * (ma / tot);
        const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (rv < 0) {
          const imp = (-(1 + 0.1) * rv) / (1 / ma + 1 / mb);
          a.vx -= (imp / ma) * nx; a.vy -= (imp / ma) * ny;
          b.vx += (imp / mb) * nx; b.vy += (imp / mb) * ny;
          // 굴러가는 느낌: 접선 방향 마찰
          const tx = -ny, ty = nx, tv = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
          const f = tv * 0.08;
          a.vx += (f * mb / tot) * tx; a.vy += (f * mb / tot) * ty;
          b.vx -= (f * ma / tot) * tx; b.vy -= (f * ma / tot) * ty;
        }
      }
    }
    if (B.some((b) => b.dead)) { const keep = B.filter((b) => !b.dead); B.length = 0; B.push(...keep); }
  }
  for (const b of B) { b.x = Math.max(b.r, Math.min(W - b.r, b.x)); if (b.y + b.r > H) { b.y = H - b.r; if (b.vy > 0) b.vy = 0; } }
}
export function mergeOnce(w, a, b, now) {
  const lv = a.lv + 1;
  if (a.lv >= MAX) { w.score += MAX_BONUS; w.pops.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, t: now, text: `+${MAX_BONUS}`, big: true }); return null; }
  const nb = { id: w.id++, lv, r: CHARS[lv].r, x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, vx: (a.vx + b.vx) / 2, vy: Math.min(0, (a.vy + b.vy) / 2) - 60, born: now, pop: now };
  w.bodies.push(nb);
  w.score += pointsFor(lv);
  w.made[lv] += 1;
  w.pops.push({ x: nb.x, y: nb.y, t: now, text: `+${pointsFor(lv)}`, big: lv >= 7 });
  return nb;
}

// ── 화면 ──
let ctl = null;
function teardown() { if (!ctl) return; cancelAnimationFrame(ctl.raf); window.removeEventListener('keydown', ctl.onKey); ctl = null; }

function build(el, ctx) {
  const root = document.createElement('div');
  root.className = 'mg';
  root.innerHTML = `
    <div class="mg-top"><div class="mg-score"><small>점수</small><b data-score>0</b></div><div class="mg-next"><small>다음</small><img data-next alt=""></div><div class="mg-best"><small>내 최고</small><b data-best>-</b></div></div>
    <div class="mg-box"><canvas></canvas><div class="mg-over" hidden></div></div>
    <div class="mg-chain">${CHARS.map((c, i) => `<img src="${dataUrl(i)}" title="${c.name}" alt="${c.name}" style="width:${14 + i * 2.6}px">`).join('<i>›</i>')}</div>
    <div class="mg-hint">화면을 누른 채로 좌우로 움직이고, 손을 떼면 떨어져요 (PC: 마우스 클릭 · ←→ + 스페이스)</div>
    <div class="mg-rank"><div class="mg-rank-t">🏆 랭킹 TOP 10</div><ol data-rank><li class="muted">불러오는 중…</li></ol></div>`;
  const c = { root, el, $: (q) => root.querySelector(q), canvas: root.querySelector('canvas'), w: newWorld(), raf: 0, last: performance.now(), acc: 0, sprites: [], keys: new Set(), aim: false };
  c.sprites = CHARS.map((_, i) => { const im = new Image(); im.src = dataUrl(i); return im; });
  const cv = c.canvas;
  const toX = (e) => { const r = cv.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * W; };
  cv.addEventListener('pointerdown', (e) => { if (c.w.over) return; c.aim = true; c.w.dropX = toX(e); cv.setPointerCapture?.(e.pointerId); e.preventDefault(); });
  cv.addEventListener('pointermove', (e) => { if (c.w.over) return; if (c.aim || e.pointerType === 'mouse') c.w.dropX = toX(e); });
  cv.addEventListener('pointerup', (e) => { if (!c.aim) return; c.aim = false; c.w.dropX = toX(e); drop(c); });
  cv.addEventListener('pointercancel', () => { c.aim = false; });
  c.onKey = (e) => {
    if (!c.root.isConnected || e.target.closest?.('input, textarea')) return;
    if (e.code === 'ArrowLeft') { c.w.dropX -= 18; e.preventDefault(); }
    if (e.code === 'ArrowRight') { c.w.dropX += 18; e.preventDefault(); }
    if (e.code === 'Space' && !e.repeat) { e.preventDefault(); drop(c); }
  };
  window.addEventListener('keydown', c.onKey);
  root.addEventListener('click', (e) => { if (e.target.closest('[data-again]')) restart(c); });
  return c;
}
const urlCache = {};
function dataUrl(lv) { return (urlCache[lv] ||= `data:image/svg+xml;charset=utf-8,${encodeURIComponent(charSvg(lv))}`); }

function drop(c) {
  const w = c.w, now = performance.now();
  if (w.over || now < w.canDrop) return;
  const r = CHARS[w.cur].r;
  const x = Math.max(r, Math.min(W - r, w.dropX));
  w.bodies.push({ id: w.id++, lv: w.cur, r, x, y: 52, vx: 0, vy: 0, born: now });
  w.cur = w.next;
  w.next = pickSpawn();
  w.canDrop = now + 450;
}
function restart(c) {
  const best = c.w.best;
  c.w = newWorld();
  c.w.best = best;
  c.$('.mg-over').hidden = true;
  c.saved = false;
}
async function loadRank(c) {
  try {
    const { backend } = await import('../backend/index.js');
    const list = await backend.topScores('merge', 10);
    const me = c.ctx.me;
    c.$('[data-rank]').innerHTML = list.length ? list.map((r, i) => `<li class="${r.uid === me ? 'me' : ''}"><span>${i < 3 ? ['🥇', '🥈', '🥉'][i] : `${i + 1}`}</span><b>${esc(r.name)}</b><em>${r.score.toLocaleString()}</em></li>`).join('') : '<li class="muted">아직 기록이 없어요. 첫 기록의 주인공이 되어 보세요!</li>';
  } catch (e) {
    c.$('[data-rank]').innerHTML = '<li class="muted">랭킹을 불러오지 못했어요</li>';
  }
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));

async function gameOver(c) {
  const w = c.w;
  w.over = true;
  const score = w.score;
  let best = w.best, isNew = false;
  try {
    const { backend } = await import('../backend/index.js');
    const prev = w.best;
    best = await backend.saveBest(c.ctx.me, 'merge', score);
    isNew = score > prev && score === best;
    w.best = best;
  } catch { best = Math.max(best, score); }
  soundEvent(c.ctx.room?.code, `mg:over:${Date.now()}`, isNew ? 'ok' : 'no');
  const top = w.made.reduce((m, n, i) => (n ? i : m), 0);
  c.$('.mg-over').innerHTML = `<div><b>게임 끝!</b><strong>${score.toLocaleString()}점</strong>${isNew ? '<em>🎉 최고 기록 경신!</em>' : `<small>내 최고 ${best.toLocaleString()}점</small>`}
    <span>가장 크게 만든 캐릭터: <img src="${dataUrl(top)}" alt=""> ${CHARS[top].name}</span>
    <button class="mg-again" data-again>다시 하기 ↻</button></div>`;
  c.$('.mg-over').hidden = false;
  c.$('[data-best]').textContent = best.toLocaleString();
  loadRank(c);
}

function frame() {
  if (!ctl) return;
  ctl.raf = requestAnimationFrame(frame);
  const c = ctl;
  if (!c.root.isConnected) { if (!c.gone) c.gone = Date.now(); else if (Date.now() - c.gone > 3000) teardown(); return; }
  c.gone = 0;
  const now = performance.now();
  let dt = Math.min(0.05, (now - c.last) / 1000);
  c.last = now;
  const w = c.w;
  if (!w.over) {
    const sub = 4, h = dt / sub;
    for (let k = 0; k < sub; k++) step(w, h, now, (a, b) => { const nb = mergeOnce(w, a, b, now); if (nb && nb.lv >= 6) ding(); });
    // 넘침 검사: 떨어진 지 1초 넘은 캐릭터가 선 위로 1.5초 이상 있으면 끝
    const danger = w.bodies.some((b) => now - b.born > 1000 && b.y - b.r < TOP && Math.abs(b.vy) < 120);
    w.overT = danger ? (w.overT || now) : 0;
    if (w.overT && now - w.overT > 1500) gameOver(c);
  }
  // 그리기
  const cv = c.canvas;
  const cssW = cv.clientWidth || 360, dpr = Math.min(2, window.devicePixelRatio || 1);
  if (cv.width !== Math.round(cssW * dpr)) { cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssW * dpr * (H / W)); }
  const k = cv.width / W;
  const g = cv.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height);
  g.setTransform(k, 0, 0, k, 0, 0);
  // 넘침 선
  const warn = w.overT ? (Math.sin(now / 90) > 0 ? 1 : 0.4) : 0.35;
  g.strokeStyle = w.overT ? `rgba(255,79,110,${warn})` : 'rgba(255,255,255,.35)';
  g.setLineDash([10, 8]); g.lineWidth = 3; g.beginPath(); g.moveTo(0, TOP); g.lineTo(W, TOP); g.stroke(); g.setLineDash([]);
  // 떨어뜨릴 캐릭터 + 조준선
  if (!w.over) {
    const r = CHARS[w.cur].r;
    w.dropX = Math.max(r, Math.min(W - r, w.dropX));
    const ready = now >= w.canDrop;
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 2; g.beginPath(); g.moveTo(w.dropX, 52 + r); g.lineTo(w.dropX, H); g.stroke();
    g.globalAlpha = ready ? 1 : 0.4;
    drawChar(g, c, w.cur, w.dropX, 52, r, 1);
    g.globalAlpha = 1;
  }
  for (const b of w.bodies) {
    const s = b.pop && now - b.pop < 180 ? 0.7 + ((now - b.pop) / 180) * 0.3 : 1;
    drawChar(g, c, b.lv, b.x, b.y, b.r, s);
  }
  // 점수 팝업
  w.pops = w.pops.filter((p) => now - p.t < 900);
  for (const p of w.pops) {
    const a = 1 - (now - p.t) / 900;
    g.globalAlpha = a; g.fillStyle = p.big ? '#ffd84d' : '#fff'; g.font = `900 ${p.big ? 30 : 20}px sans-serif`; g.textAlign = 'center';
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 4; g.strokeText(p.text, p.x, p.y - (now - p.t) / 20); g.fillText(p.text, p.x, p.y - (now - p.t) / 20);
    g.globalAlpha = 1;
  }
  const $s = c.$('[data-score]');
  const st = w.score.toLocaleString();
  if ($s.textContent !== st) $s.textContent = st;
  const $n = c.$('[data-next]');
  if ($n.dataset.lv !== String(w.next)) { $n.dataset.lv = String(w.next); $n.src = dataUrl(w.next); }
}
function drawChar(g, c, lv, x, y, r, s) {
  const im = c.sprites[lv];
  const size = r * 2 * (112 / 92) * s; // 그림의 몸통 원(반지름 46/112) = 물리 반지름
  if (im.complete) g.drawImage(im, x - size / 2, y - size / 2 - r * 0.04, size, size);
  else { g.fillStyle = CHARS[lv].body; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
}

export default {
  id: 'merge',
  name: '동글동글 합체',
  emoji: '🫧',
  category: 'mini',
  minPlayers: 1,
  maxPlayers: 1,
  solo: true,
  duration: '혼자 · 5~15분',
  rewards: [],
  rewardLabel: '🏆 랭킹전',
  description: '같은 친구끼리 합쳐서 더 큰 친구로! 혼자 하는 점수 랭킹전',
  rules: [
    '위에서 캐릭터를 떨어뜨려요. 같은 캐릭터끼리 닿으면 합쳐져 한 단계 큰 캐릭터가 돼요.',
    `캐릭터는 11단계: ${CHARS.map((c) => c.name).join(' → ')}`,
    `떨어지는 건 작은 5가지뿐이에요 (콩알 ${SPAWN[0]}% · 병아리 ${SPAWN[1]}% · 햄찌 ${SPAWN[2]}% · 토끼 ${SPAWN[3]}% · 냥이 ${SPAWN[4]}%). 큰 캐릭터는 합쳐서만 만들 수 있어요.`,
    '합칠 때마다 점수! 큰 캐릭터를 만들수록 점수가 커져요 (병아리 2점 · 햄찌 6점 · … · 유니콘 110점). 유니콘 둘을 합치면 +300점 보너스!',
    '캐릭터가 위쪽 점선을 넘은 채로 1.5초가 지나면 게임 끝.',
    '최고 점수는 내 프로필에 저장되고 랭킹에 올라가요. 혼자 하는 게임이라 가넷·전적은 없어요.',
  ],

  setup() { return { solo: true }; },
  move() { throw new Error('__noop'); },

  render(el, ctx) {
    const code = ctx.room?.code || 'local';
    if (!ctl || ctl.code !== code) {
      teardown();
      ctl = build(el, ctx);
      ctl.code = code;
      ctl.ctx = ctx;
      ctl.raf = requestAnimationFrame(frame);
      import('../backend/index.js').then(({ backend }) => backend.saveBest?.(ctx.me, 'merge', 0).then((b) => { if (ctl) { ctl.w.best = b; ctl.$('[data-best]').textContent = b ? b.toLocaleString() : '-'; } }).catch(() => {}));
      loadRank(ctl);
    }
    ctl.ctx = ctx;
    if (typeof location !== 'undefined' && location.search.includes('test')) window.__mg = ctl; // 테스트 모드 점검용
    if (ctl.root.parentNode !== el) { el.innerHTML = ''; el.appendChild(ctl.root); }
  },
};
