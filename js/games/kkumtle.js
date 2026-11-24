// 보드게임: 꿈틀 포격전 (2~4명) — 차례대로 걷고, 각도·힘을 맞춰 포탄을 쏘는 턴제 포격전
// 게임 상태(지형 구멍·체력·차례)는 방 문서로, 차례인 사람의 움직임·조준은 실시간 채널로 보여줘요.
import { GARNET } from '../profile.js';
import { soundEvent } from '../sound.js';
import { chatFormHtml, bindChat } from './sit.js';
import { MW, MH, WATER, G, WORM_H, WEAPONS, ground, solid, settle, walkStep, airStep, simulate, rng } from './kkumtle-sim.js';

const TURN_MS = 45000;
const TEAM = ['#ff4f6e', '#3d7bff', '#3ddc84', '#ffb02e'];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const rewardsFor = (n) => (n === 2 ? [1] : [2, 1]);

function aliveTeams(state) { return state.order.filter((u) => state.worms.some((w) => w.owner === u && !w.dead)); }
function nextTurn(state, now) {
  const alive = aliveTeams(state);
  if (alive.length <= 1) return { ...state, phase: 'done', turn: null };
  let i = state.order.indexOf(state.turn?.uid);
  let uid;
  for (let k = 1; k <= state.order.length; k++) { const u = state.order[(i + k) % state.order.length]; if (alive.includes(u)) { uid = u; break; } }
  const mine = state.worms.filter((w) => w.owner === uid && !w.dead);
  const idx = ((state.wi?.[uid] ?? -1) + 1) % mine.length;
  const wind = Math.round((Math.random() * 2 - 1) * 10) / 10;
  return { ...state, turn: { uid, wid: mine[idx].id, wind, deadline: now + TURN_MS, n: (state.turn?.n || 0) + 1 }, wi: { ...state.wi, [uid]: idx } };
}
function finalResult(state, players) {
  const alive = aliveTeams(state);
  const hpOf = (u) => state.worms.filter((w) => w.owner === u).reduce((s, w) => s + (w.dead ? 0 : w.hp), 0);
  const rw = rewardsFor(state.order.length);
  const rows = state.order.map((u) => ({ uid: u, hp: hpOf(u), out: state.outAt?.[u] || (alive.includes(u) ? 1e15 : 0) }))
    .sort((a, b) => b.out - a.out || b.hp - a.hp);
  const ranking = rows.map((r, i) => ({ uid: r.uid, score: `체력 ${r.hp}`, place: i + 1, garnets: rw[i] || 0 }));
  const win = alive.length === 1 ? alive[0] : null;
  return {
    message: win ? `${players[win]?.name || '?'}님 팀 승리! 💥` : '모두 쓰러졌어요! 무승부',
    winners: win ? [win] : [],
    ranking: win ? ranking : ranking.map((r) => ({ ...r, place: 1, garnets: 0 })),
    rewards: win ? Object.fromEntries(ranking.map((r) => [r.uid, r.garnets])) : {},
  };
}

export default {
  id: 'kkumtle',
  name: '꿈틀 포격전',
  emoji: '💥',
  category: 'board',
  minPlayers: 2,
  maxPlayers: 4,
  duration: '10~20분',
  rewards: [2, 1],
  rewardLabel: '1등 최대 +2',
  description: '바람을 읽고 각도와 힘을 맞춰라! 땅이 부서지는 턴제 포격전',
  options: [{ key: 'worms', label: '팀당 캐릭터', choices: [1, 2, 3], default: 2 }],
  rules: [
    '각자 꿈틀이 팀을 맡아요. 차례가 되면 45초 안에 움직이고 한 번 쏠 수 있어요.',
    '◀ ▶ 로 걷고, ⤴ 로 점프해요. ▲ ▼ 로 조준 각도를 맞춰요.',
    '발사 버튼을 꾹 누르면 힘이 차오르고, 손을 떼면 발사! (PC: 방향키 · Enter 점프 · Space 꾹 눌러 발사 · 1/2 무기)',
    '🚀 바주카: 닿으면 바로 폭발, 바람의 영향을 받아요. 💣 수류탄: 통통 튀다가 3초 뒤 폭발, 바람 영향 없음.',
    '폭발하면 땅이 부서지고, 가까울수록 큰 피해를 입고 멀리 날아가요. 바다에 빠지면 바로 탈락!',
    '마지막까지 꿈틀이가 남은 팀이 승리해요.',
    '가넷: 2명 → 1등 1개 / 3~4명 → 1등 2개, 2등 1개',
  ],

  setup(players, room) {
    const order = players.map((p) => p.uid);
    const per = Math.min(3, Math.max(1, Number(room?.options?.worms) || 2));
    const seed = (Math.random() * 1e9) | 0;
    const gy = ground(seed), r = rng(seed ^ 0x5bd1e995);
    const n = order.length * per, slots = [];
    for (let i = 0; i < n; i++) slots.push(Math.round(200 + ((MW - 400) * (i + 0.5)) / n + (r() - 0.5) * 60));
    for (let i = slots.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [slots[i], slots[j]] = [slots[j], slots[i]]; }
    const worms = [];
    order.forEach((u, t) => { for (let k = 0; k < per; k++) { const x = slots[t * per + k]; worms.push({ id: `${t}-${k}`, owner: u, x, y: settle(gy, [], x, 0), hp: 100, dead: false }); } });
    const base = { order, seed, craters: [], worms, phase: 'play', turn: null, wi: {}, shot: null, outAt: {} };
    return nextTurn(base, Date.now());
  },

  move(state, move, uid, players) {
    const now = Date.now();
    if (state.phase !== 'play') throw new Error('__noop');
    if (move?.type === 'tick') {
      if (now < state.turn.deadline + 1500) throw new Error('__noop');
      return { state: nextTurn(state, now) };
    }
    if (move?.type === 'surrender') {
      if (!state.order.includes(uid)) throw new Error('__noop');
      const worms = state.worms.map((w) => (w.owner === uid ? { ...w, dead: true, hp: 0 } : w));
      let s = { ...state, worms, outAt: { ...state.outAt, [uid]: now } };
      s = state.turn.uid === uid ? nextTurn(s, now) : aliveTeams(s).length <= 1 ? { ...s, phase: 'done' } : s;
      return s.phase === 'done' ? { state: s, result: finalResult(s, players) } : { state: s };
    }
    if (state.turn?.uid !== uid) throw new Error('내 차례가 아니에요');
    if (move?.type === 'fire' || move?.type === 'end') {
      const r = move.result || {};
      if (!Array.isArray(r.worms) || r.worms.length !== state.worms.length) throw new Error('잘못된 결과예요');
      const worms = state.worms.map((w, i) => {
        const n = r.worms[i] || {};
        return { ...w, x: Math.max(0, Math.min(MW, Math.round(+n.x || w.x))), y: Math.round(+n.y || w.y), hp: Math.max(0, Math.min(w.hp, Math.round(+n.hp))), dead: w.dead || !!n.dead, drown: !!n.drown };
      });
      const craters = r.boom ? [...state.craters, r.boom.map((v) => Math.round(+v))].slice(-160) : state.craters;
      const outAt = { ...state.outAt };
      for (const u of state.order) if (!outAt[u] && !worms.some((w) => w.owner === u && !w.dead)) outAt[u] = now;
      let s = { ...state, worms, craters, outAt, shot: move.type === 'fire' ? { id: now, by: uid, wid: state.turn.wid, weapon: move.weapon, path: (r.path || []).slice(0, 900), boom: r.boom || null, splash: !!r.splash, hits: r.hits || [] } : state.shot };
      s = nextTurn(s, now);
      if (s.phase === 'done') return { state: s, result: finalResult(s, players) };
      return { state: s };
    }
    throw new Error('알 수 없는 동작이에요');
  },

  render(el, ctx) {
    if (typeof document === 'undefined') return;
    const { state, room, finished } = ctx;
    const code = `${room?.code || 'local'}:${room?.startedAt || 0}`;
    if (!ctl || ctl.code !== code) { teardown(); ctl = build(code, ctx); }
    ctl.ctx = ctx;
    if (ctl.root.parentNode !== el) { el.innerHTML = ''; el.appendChild(ctl.root); }
    onState(ctl);
    void finished;
  },
};

// ───────────────── 화면 ─────────────────
let ctl = null;
function teardown() {
  if (!ctl) return;
  cancelAnimationFrame(ctl.raf); ctl.unwatch?.(); ctl.live?.close?.(ctl.ctx?.me);
  window.removeEventListener('keydown', ctl.onKey); window.removeEventListener('keyup', ctl.onKey);
  ctl = null;
}

function build(code, ctx) {
  const root = document.createElement('div');
  root.className = 'kt';
  root.innerHTML = `
    <div class="kt-head"><span class="kt-turn" data-turn></span><span class="kt-wind" data-wind></span><span class="kt-time" data-time></span></div>
    <div class="kt-view"><canvas></canvas><div class="kt-teams" data-teams></div><div class="kt-msg" data-msg></div></div>
    <div class="kt-ctrl" data-ctrl>
      <div class="kt-grp"><button data-hold="left">◀</button><button data-act="jump">⤴</button><button data-hold="right">▶</button></div>
      <div class="kt-grp"><button data-hold="up">▲</button><span class="kt-ang" data-ang>45°</span><button data-hold="down">▼</button></div>
      <div class="kt-grp"><button class="kt-wpn" data-act="weapon"></button><button class="kt-fire" data-fire>🔥 꾹 눌러 발사<i data-pow></i></button></div>
    </div>
    <div class="kt-foot"><button class="btn ghost sm" data-surr>🏳️ 항복</button></div>
    ${chatFormHtml()}`;
  const c = {
    code, root, ctx, cv: root.querySelector('canvas'), raf: 0, last: performance.now(),
    me: null, cam: null, hold: {}, charge: -1, weapon: 'bazooka', angle: Math.PI / 4, facing: 1,
    terrain: null, terrainKey: '', anim: null, shotSeen: null, others: {}, live: null, lastSend: 0, lastTick: 0, msg: '', msgUntil: 0, turnSeen: 0, fired: false,
  };
  ctl = c;
  if (typeof location !== 'undefined' && location.search.includes('test')) window.__kt = c;
  // 버튼
  root.querySelectorAll('[data-hold]').forEach((b) => {
    const k = b.dataset.hold;
    const on = (e) => { e.preventDefault(); c.hold[k] = true; }, off = () => { c.hold[k] = false; };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
  });
  root.querySelector('[data-act="jump"]').onclick = () => jump(c);
  root.querySelector('[data-act="weapon"]').onclick = () => { c.weapon = c.weapon === 'bazooka' ? 'grenade' : 'bazooka'; };
  const $f = root.querySelector('[data-fire]');
  $f.addEventListener('pointerdown', (e) => { e.preventDefault(); if (canAct(c)) c.charge = 0; });
  const rel = () => { if (c.charge >= 0) fire(c); };
  $f.addEventListener('pointerup', rel); $f.addEventListener('pointerleave', rel); $f.addEventListener('pointercancel', rel);
  root.querySelector('[data-surr]').onclick = () => { if (confirm('정말 항복할까요? 내 꿈틀이가 모두 탈락해요.')) c.ctx.sendMove({ type: 'surrender' }); };
  c.onKey = (e) => {
    if (e.target?.tagName === 'INPUT') return;
    const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    const down = e.type === 'keydown';
    if (map[e.key]) { e.preventDefault(); c.hold[map[e.key]] = down; }
    if (e.key === 'Enter' && down) { e.preventDefault(); jump(c); }
    if (e.key === ' ') { e.preventDefault(); if (down && c.charge < 0 && !e.repeat && canAct(c)) c.charge = 0; if (!down && c.charge >= 0) fire(c); }
    if (down && (e.key === '1' || e.key === '2')) c.weapon = e.key === '1' ? 'bazooka' : 'grenade';
  };
  window.addEventListener('keydown', c.onKey); window.addEventListener('keyup', c.onKey);
  import('../backend/index.js').then(async ({ backend }) => {
    if (ctl !== c) return;
    const live = backend.live ? await backend.live(ctx.room?.code || 'local') : null;
    if (!live || ctl !== c) return;
    c.live = live; live.onLeave?.(ctx.me);
    c.unwatch = live.watch((all) => { c.others = all || {}; });
  });
  c.raf = requestAnimationFrame(frame);
  return c;
}
const myTurn = (c) => { const { state, me, finished } = c.ctx; return !finished && state.phase === 'play' && state.turn?.uid === me; };
const canAct = (c) => myTurn(c) && !c.anim && !c.fired && c.me && !c.me.air;
function jump(c) { if (!canAct(c)) return; c.me.air = true; c.me.vx = c.facing * 120; c.me.vy = -230; }

// 방 문서가 바뀌었을 때
function onState(c) {
  const { state, me, room } = c.ctx;
  bindChat(c.root);
  // 새 발사 기록 → 애니메이션
  if (state.shot && state.shot.id !== c.shotSeen) {
    const first = c.shotSeen === null;
    c.shotSeen = state.shot.id;
    if (!first && Date.now() - state.shot.id < 15000) startAnim(c, state.shot);
  }
  if (c.shotSeen === null) c.shotSeen = state.shot?.id || 0;
  // 내 차례 시작
  if (state.turn && state.turn.n !== c.turnSeen) {
    c.turnSeen = state.turn.n; c.fired = false; c.charge = -1;
    const w = state.worms.find((x) => x.id === state.turn.wid);
    c.me = state.turn.uid === me && w ? { ...w, air: false } : null;
    if (c.me) { c.facing = w.x < MW / 2 ? 1 : -1; if (room) soundEvent(room.code, `kt:turn:${state.turn.n}`, 'ok'); }
  }
  if (state.phase === 'done' || c.ctx.finished) c.me = null;
  const surr = c.root.querySelector('[data-surr]');
  surr.hidden = !state.order.includes(me) || state.phase !== 'play' || !state.worms.some((w) => w.owner === me && !w.dead);
}

function startAnim(c, shot) {
  c.anim = { shot, t0: performance.now(), dur: (shot.path.length / 2) * (2 / 60) * 1000, boomAt: 0 };
}

// 실제로 쏘기: 내 화면에서 시뮬레이션해서 결과를 보내요
function fire(c) {
  const power = Math.max(0.08, Math.min(1, c.charge));
  c.charge = -1;
  if (!canAct(c)) return;
  c.fired = true;
  const { state, sendMove } = c.ctx;
  const worms = state.worms.map((w) => (w.id === c.me.id ? { ...w, x: Math.round(c.me.x), y: Math.round(c.me.y) } : w));
  const r = simulate({ seed: state.seed, craters: state.craters, worms, shooter: c.me.id, weapon: c.weapon, angle: c.angle, power, facing: c.facing, wind: state.turn.wind });
  sendMove({ type: 'fire', weapon: c.weapon, result: r }, { onError: () => { c.fired = false; } });
}
function endTurnFall(c, drowned) { // 걷다가 바다에 빠짐
  if (c.fired) return; c.fired = true;
  const { state, sendMove } = c.ctx;
  const worms = state.worms.map((w) => (w.id === c.me.id ? { ...w, x: Math.round(c.me.x), y: Math.round(c.me.y), hp: drowned ? 0 : w.hp, dead: drowned || w.dead, drown: drowned } : w));
  sendMove({ type: 'end', result: { worms } });
}

function frame(now) {
  const c = ctl; if (!c) return;
  c.raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - c.last) / 1000); c.last = now;
  const { state, me, sendMove } = c.ctx;
  const gy = ground(state.seed);
  // 내 차례: 걷기·조준·점프
  if (c.me && myTurn(c) && !c.fired) {
    const m = c.me;
    if (c.hold.up) c.angle = Math.min(Math.PI / 2 * 0.98, c.angle + dt * 1.2);
    if (c.hold.down) c.angle = Math.max(-Math.PI / 2 * 0.9, c.angle - dt * 1.2);
    if (m.air) {
      const sub = 4; for (let i = 0; i < sub; i++) airStep(gy, state.craters, m, dt / sub);
      if (m.y > WATER) { m.dead = true; endTurnFall(c, true); }
    } else if (c.charge < 0) {
      const dir = (c.hold.right ? 1 : 0) - (c.hold.left ? 1 : 0);
      if (dir) { c.facing = dir; walkStep(gy, state.craters, m, dir * 70 * dt); }
      if (m.air) { m.vx = 0; m.vy = 0; }
    }
    if (c.charge >= 0) { c.charge = Math.min(1, c.charge + dt / 1.6); if (c.charge >= 1) fire(c); }
    if (c.live && now - c.lastSend > 90) { c.lastSend = now; c.live.send(me, { id: m.id, x: Math.round(m.x), y: Math.round(m.y), f: c.facing, a: Math.round(c.angle * 100) / 100, p: c.charge >= 0 ? Math.round(c.charge * 100) / 100 : -1, w: c.weapon, n: state.turn.n }); }
  }
  // 시간 초과
  if (state.phase === 'play' && state.turn && Date.now() > state.turn.deadline + 1500 && Date.now() - c.lastTick > 2500 && !c.anim) {
    c.lastTick = Date.now();
    if (myTurn(c) && c.me && !c.fired) endTurnFall(c, false); else sendMove({ type: 'tick' }, { silent: true });
  }
  draw(c, dt, now);
  hud(c);
}

// ── 그리기 ──
function terrainCanvas(c, craters) {
  const { state } = c.ctx;
  const key = `${state.seed}:${craters.length}`;
  if (c.terrainKey === key) return c.terrain;
  const gy = ground(state.seed);
  const t = c.terrain || document.createElement('canvas');
  t.width = MW; t.height = MH;
  const x = t.getContext('2d');
  x.clearRect(0, 0, MW, MH);
  const grd = x.createLinearGradient(0, 200, 0, MH);
  grd.addColorStop(0, '#9a6a3e'); grd.addColorStop(1, '#5a3a20');
  x.fillStyle = grd;
  x.beginPath(); x.moveTo(0, MH);
  for (let i = 0; i < MW; i += 2) x.lineTo(i, gy[i]);
  x.lineTo(MW, MH); x.closePath(); x.fill();
  // 흙 무늬
  const r = rng(state.seed);
  x.fillStyle = 'rgba(0,0,0,.12)';
  for (let i = 0; i < 900; i++) { const px = r() * MW, py = r() * MH; if (py > gy[px | 0] + 10) { x.beginPath(); x.arc(px, py, 2 + r() * 5, 0, 7); x.fill(); } }
  // 잔디
  x.strokeStyle = '#4fbf4a'; x.lineWidth = 10; x.lineJoin = 'round';
  x.beginPath(); for (let i = 0; i < MW; i += 2) i ? x.lineTo(i, gy[i] + 4) : x.moveTo(i, gy[i] + 4); x.stroke();
  x.strokeStyle = '#7fe06a'; x.lineWidth = 3;
  x.beginPath(); for (let i = 0; i < MW; i += 2) i ? x.lineTo(i, gy[i]) : x.moveTo(i, gy[i]); x.stroke();
  // 구멍
  x.globalCompositeOperation = 'destination-out';
  for (const cr of craters) { x.beginPath(); x.arc(cr[0], cr[1], cr[2], 0, 7); x.fill(); }
  x.globalCompositeOperation = 'source-atop';
  x.strokeStyle = 'rgba(40,20,8,.55)'; x.lineWidth = 6;
  for (const cr of craters) { x.beginPath(); x.arc(cr[0], cr[1], cr[2] + 2, 0, 7); x.stroke(); }
  x.globalCompositeOperation = 'source-over';
  c.terrain = t; c.terrainKey = key;
  return t;
}
function wormDraw(x, w, col, face, name, hp, active, angle, charge, weapon) {
  const X = w.x, Y = w.y;
  x.save(); x.translate(X, Y);
  // 몸통 (꿈틀이)
  x.fillStyle = '#ffb5c5'; x.strokeStyle = '#c4607a'; x.lineWidth = 1.5;
  x.beginPath(); x.ellipse(0, -7, 8, 8, 0, 0, 7); x.fill(); x.stroke();
  x.beginPath(); x.ellipse(-face * 7, -2, 7, 3.5, 0, 0, 7); x.fill(); x.stroke();
  // 머리띠
  x.fillStyle = col; x.fillRect(-8, -14, 16, 3.5);
  x.beginPath(); x.moveTo(-face * 8, -13); x.lineTo(-face * 14, -16); x.lineTo(-face * 13, -10); x.fill();
  // 눈
  x.fillStyle = '#fff'; x.beginPath(); x.arc(face * 2.5, -9, 3, 0, 7); x.arc(face * 6, -9, 2.6, 0, 7); x.fill();
  x.fillStyle = '#222'; x.beginPath(); x.arc(face * 3.4, -9, 1.4, 0, 7); x.arc(face * 6.6, -9, 1.2, 0, 7); x.fill();
  // 조준
  if (active) {
    const dx = Math.cos(angle) * face, dy = -Math.sin(angle);
    x.strokeStyle = 'rgba(255,255,255,.85)'; x.setLineDash([4, 4]); x.lineWidth = 2;
    x.beginPath(); x.moveTo(dx * 14, -9 + dy * 14); x.lineTo(dx * 70, -9 + dy * 70); x.stroke(); x.setLineDash([]);
    x.strokeStyle = '#ff3b3b'; x.lineWidth = 2; x.beginPath(); x.arc(dx * 74, -9 + dy * 74, 6, 0, 7); x.moveTo(dx * 74 - 9, -9 + dy * 74); x.lineTo(dx * 74 + 9, -9 + dy * 74); x.moveTo(dx * 74, -9 + dy * 74 - 9); x.lineTo(dx * 74, -9 + dy * 74 + 9); x.stroke();
    x.font = '14px sans-serif'; x.textAlign = 'center'; x.fillText(WEAPONS[weapon].icon, dx * 12, -4 + dy * 12);
    if (charge >= 0) { x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(-20, 6, 40, 6); x.fillStyle = `hsl(${120 - charge * 120},90%,55%)`; x.fillRect(-20, 6, 40 * charge, 6); }
  }
  // 이름 · 체력
  x.textAlign = 'center'; x.font = 'bold 11px sans-serif';
  x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,.7)'; x.fillStyle = col;
  x.strokeText(name, 0, -34); x.fillText(name, 0, -34);
  x.fillStyle = '#fff'; x.strokeText(String(hp), 0, -22); x.fillText(String(hp), 0, -22);
  if (active) { const b = Math.sin(performance.now() / 150) * 3; x.fillStyle = '#ffd84d'; x.beginPath(); x.moveTo(-6, -52 + b); x.lineTo(6, -52 + b); x.lineTo(0, -44 + b); x.fill(); }
  x.restore();
}
function draw(c, dt, now) {
  const cv = c.cv, { state, players, me } = c.ctx;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const x = cv.getContext('2d');
  // 애니메이션 진행
  let proj = null, boom = null, showPrev = false;
  const A = c.anim;
  if (A) {
    const t = now - A.t0, s = A.shot;
    if (t < A.dur) {
      const k = Math.min(s.path.length / 2 - 1, Math.floor(t / (2000 / 60)));
      proj = [s.path[k * 2], s.path[k * 2 + 1]]; showPrev = true;
    } else if (t < A.dur + 700) {
      const e = s.path.length; boom = s.boom ? { x: s.boom[0], y: s.boom[1], r: s.boom[2], k: (t - A.dur) / 700 } : null;
      if (s.splash && t - A.dur < 60) soundEvent(c.ctx.room?.code || 'x', `kt:spl:${s.id}`, 'no');
      if (s.boom && !A.sfx) { A.sfx = true; boomSfx(); }
      showPrev = t - A.dur < 250; void e;
    } else c.anim = null;
  }
  const craters = showPrev && A?.shot.boom ? state.craters.slice(0, -1) : state.craters;
  // 카메라: 포탄 → 차례인 캐릭터
  const live = state.turn && c.others?.[state.turn.uid]?.n === state.turn.n ? c.others[state.turn.uid] : null;
  const act = c.me && myTurn(c) ? c.me : state.worms.find((w) => w.id === state.turn?.wid);
  const actPos = c.me && myTurn(c) ? c.me : live && act ? { ...act, x: live.x, y: live.y } : act;
  const focus = proj ? { x: proj[0], y: proj[1] } : boom ? { x: boom.x, y: boom.y } : actPos || { x: MW / 2, y: 400 };
  const scale = Math.max(H / 340, W / MW);
  const vw = W / scale, vh = H / scale;
  const want = { x: Math.max(vw / 2, Math.min(MW - vw / 2, focus.x)), y: Math.max(vh / 2, Math.min(MH - vh / 2 + 20, focus.y - 40)) };
  c.cam = c.cam ? { x: c.cam.x + (want.x - c.cam.x) * Math.min(1, dt * 4), y: c.cam.y + (want.y - c.cam.y) * Math.min(1, dt * 4) } : want;
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sky = x.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#6fb6ff'); sky.addColorStop(1, '#d6ecff');
  x.fillStyle = sky; x.fillRect(0, 0, W, H);
  x.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (W / 2 - c.cam.x * scale), dpr * (H / 2 - c.cam.y * scale));
  // 먼 산
  x.fillStyle = 'rgba(90,130,170,.35)';
  x.beginPath(); x.moveTo(0, MH); for (let i = 0; i <= MW; i += 40) x.lineTo(i, 330 + Math.sin(i * 0.004) * 60 + Math.sin(i * 0.011) * 25); x.lineTo(MW, MH); x.fill();
  // 바람 구름
  const wind = state.turn?.wind || 0;
  x.fillStyle = 'rgba(255,255,255,.8)';
  for (let i = 0; i < 6; i++) { const cx = ((i * 330 + now * 0.02 * wind * 3) % (MW + 300) + MW + 300) % (MW + 300) - 150; x.beginPath(); x.ellipse(cx, 90 + (i % 3) * 40, 60, 18, 0, 0, 7); x.ellipse(cx + 30, 80 + (i % 3) * 40, 40, 20, 0, 0, 7); x.fill(); }
  x.drawImage(terrainCanvas(c, craters), 0, 0);
  // 바다
  const wy = WATER + Math.sin(now / 500) * 3;
  x.fillStyle = 'rgba(30,110,200,.85)'; x.fillRect(-400, wy, MW + 800, MH - wy + 200);
  x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 3; x.beginPath();
  for (let i = -400; i < MW + 400; i += 20) x.lineTo(i, wy + Math.sin(i * 0.05 + now / 300) * 4); x.stroke();
  // 캐릭터
  const prevW = showPrev && A?.prev ? A.prev : null;
  if (A && !A.prev) A.prev = c.prevWorms || state.worms;
  const list = showPrev && A?.prev ? A.prev : state.worms;
  for (const w0 of list) {
    if (w0.dead) continue;
    let w = w0;
    const isAct = state.turn?.wid === w.id && !c.anim;
    if (isAct && actPos) w = { ...w, x: actPos.x, y: actPos.y };
    const team = state.order.indexOf(w.owner);
    const nm = esc(players[w.owner]?.name || '?').slice(0, 8);
    const face = isAct ? (c.me && myTurn(c) ? c.facing : live?.f || 1) : w.x < MW / 2 ? 1 : -1;
    const ang = isAct ? (c.me && myTurn(c) ? c.angle : live?.a ?? 0.7) : 0;
    const ch = isAct ? (c.me && myTurn(c) ? c.charge : live?.p ?? -1) : -1;
    const wp = isAct ? (c.me && myTurn(c) ? c.weapon : live?.w || 'bazooka') : 'bazooka';
    wormDraw(x, w, TEAM[team % TEAM.length], face, nm, w.hp, isAct && state.phase === 'play', ang, ch, wp);
  }
  if (!c.anim) c.prevWorms = state.worms;
  void prevW;
  // 포탄
  if (proj) {
    x.font = '16px sans-serif'; x.textAlign = 'center';
    if (A.shot.weapon === 'grenade') { x.fillStyle = '#2d3a2a'; x.beginPath(); x.arc(proj[0], proj[1], 5, 0, 7); x.fill(); x.fillStyle = '#ffd84d'; x.fillRect(proj[0] - 1, proj[1] - 8, 2, 4); }
    else { x.fillStyle = '#ddd'; x.beginPath(); x.arc(proj[0], proj[1], 4, 0, 7); x.fill(); x.fillStyle = 'rgba(255,160,40,.7)'; x.beginPath(); x.arc(proj[0], proj[1], 7, 0, 7); x.fill(); }
  }
  if (boom) {
    const k = boom.k;
    x.fillStyle = `rgba(255,${180 - k * 120},40,${1 - k})`; x.beginPath(); x.arc(boom.x, boom.y, boom.r * (0.6 + k * 0.8), 0, 7); x.fill();
    x.fillStyle = `rgba(255,255,200,${0.9 - k})`; x.beginPath(); x.arc(boom.x, boom.y, boom.r * 0.5 * (1 - k), 0, 7); x.fill();
    x.font = 'bold 20px sans-serif'; x.textAlign = 'center';
    for (const h of A.shot.hits || []) { const w = state.worms.find((q) => q.id === h.id); if (!w) continue; x.lineWidth = 4; x.strokeStyle = '#000'; x.fillStyle = '#ff4f4f'; x.strokeText(`-${h.dmg}`, w.x, w.y - 50 - k * 30); x.fillText(`-${h.dmg}`, w.x, w.y - 50 - k * 30); }
  }
}
let actx = null;
function boomSfx() {
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime, b = actx.createBuffer(1, actx.sampleRate * 0.6, actx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
    const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
    s.buffer = b; f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = 0.5;
    s.connect(f); f.connect(g); g.connect(actx.destination); s.start(t);
  } catch {}
}

function hud(c) {
  const { state, players, me } = c.ctx;
  const R = c.root;
  const t = state.turn;
  const set = (sel, html) => { const e = R.querySelector(sel); if (e && e.dataset.v !== html) { e.innerHTML = html; e.dataset.v = html; } };
  if (state.phase === 'done' || c.ctx.finished) { set('[data-turn]', '💥 게임 끝!'); set('[data-time]', ''); }
  else if (t) {
    const col = TEAM[state.order.indexOf(t.uid) % TEAM.length];
    set('[data-turn]', t.uid === me ? '<b>내 차례!</b>' : `<b style="color:${col}">${esc(players[t.uid]?.name || '?')}</b>님 차례`);
    const left = Math.max(0, Math.ceil((t.deadline - Date.now()) / 1000));
    set('[data-time]', `⏱ ${left}`);
    const w = t.wind, n = Math.round(Math.abs(w) * 5);
    set('[data-wind]', `바람 ${w < 0 ? '◀'.repeat(n) : ''}<b>${Math.abs(w).toFixed(1)}</b>${w > 0 ? '▶'.repeat(n) : ''}`);
  }
  set('[data-teams]', state.order.map((u, i) => { const hp = state.worms.filter((w) => w.owner === u && !w.dead).reduce((s, w) => s + w.hp, 0); const max = state.worms.filter((w) => w.owner === u).length * 100; return `<div class="${u === me ? 'me' : ''}"><span style="color:${TEAM[i]}">${esc(players[u]?.name || '?')}</span><i><b style="width:${(hp / max) * 100}%;background:${TEAM[i]}"></b></i></div>`; }).join(''));
  const mine = myTurn(c) && !c.fired;
  R.querySelector('[data-ctrl]').classList.toggle('off', !mine);
  set('[data-ang]', `${Math.round((c.angle * 180) / Math.PI)}°`);
  const wp = WEAPONS[c.weapon]; set('.kt-wpn', `${wp.icon}<small>${wp.name}</small>`);
  const $p = R.querySelector('[data-pow]'); $p.style.width = `${Math.max(0, c.charge) * 100}%`;
  const msg = c.anim ? '' : mine ? '' : state.phase === 'play' && t?.uid !== me ? '' : '';
  set('[data-msg]', msg);
}
