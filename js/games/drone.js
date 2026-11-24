// 미니게임: 드론 레이스 (1~8명) — Mode 2 조종기처럼 왼쪽 스틱(스로틀·요), 오른쪽 스틱(피치·롤)으로 게이트를 통과하는 3D 레이스
// 게임 상태(준비·출발·기록)는 방 문서로, 드론 위치는 실시간 채널(backend.live)로 주고받아요.
import { GARNET } from '../profile.js';
import { soundEvent } from '../sound.js';
import { createGL, m4, quat, v3 } from './drone-gl.js';
import { COURSE, GATE, FRAME, DEFAULT_SET, gateBasis, startPad, newDrone, step, crossed, headingOf, attitude, bfRate } from './drone-sim.js';

const COUNT_MS = 4000;
const LIMIT_MS = 4 * 60 * 1000;
const COLORS = [[1, 0.31, 0.43], [0.24, 0.48, 1], [0.24, 0.86, 0.52], [1, 0.69, 0.18], [0.7, 0.42, 1], [0.18, 0.9, 0.84], [1, 0.54, 0.85], [0.91, 0.81, 0.54]];
const CSS = (c) => `rgb(${c.map((x) => Math.round(x * 255)).join(',')})`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const N = COURSE.gates.length;
export const rewardsFor = (n) => (n <= 1 ? [] : n === 2 ? [1] : n <= 4 ? [2, 1] : [3, 2, 1]);
const fmt = (ms) => { const s = Math.max(0, ms) / 1000; return `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`; };

export function finalResult(state, players) {
  const total = state.laps * N + 1;
  const rw = rewardsFor(state.order.length);
  const rows = state.order.map((uid) => ({ uid, t: state.fin[uid] ?? null, prog: state.prog[uid] || 0 }));
  rows.sort((a, b) => (a.t != null && b.t != null ? a.t - b.t : a.t != null ? -1 : b.t != null ? 1 : b.prog - a.prog));
  const ranking = rows.map((r, i) => ({ uid: r.uid, score: r.t != null ? fmt(r.t) : `${r.prog}/${total} 게이트`, place: i + 1, garnets: r.t != null ? rw[i] || 0 : 0 }));
  const top = ranking[0];
  return {
    message: rows[0].t != null ? `${players[top.uid]?.name || '?'}님 우승! 🏁 ${fmt(rows[0].t)}` : '아무도 완주하지 못했어요',
    winners: rows[0].t != null ? [top.uid] : [],
    ranking,
    rewards: Object.fromEntries(ranking.map((r) => [r.uid, r.garnets])),
  };
}

// ── 설정 (기기마다 저장) ──
const SKEY = 'drone-set-v1';
function loadSet() { try { return { ...DEFAULT_SET, map: { thr: [1, true], yaw: [0, false], pitch: [3, true], roll: [2, false] }, ...JSON.parse(localStorage.getItem(SKEY) || '{}') }; } catch { return { ...DEFAULT_SET }; } }
function saveSet(s) { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch {} }

let ctl = null;

export default {
  id: 'drone',
  name: '드론 레이스',
  emoji: '🚁',
  category: 'mini',
  minPlayers: 1,
  maxPlayers: 8,
  duration: '5~10분',
  rewards: [3, 2, 1],
  rewardLabel: '1등 최대 +3',
  description: '진짜 조종기처럼! Mode 2 스틱으로 게이트를 통과하는 3D 드론 레이스',
  options: [{ key: 'laps', label: '바퀴 수', choices: [1, 2, 3], default: 2 }],
  rules: [
    '조종은 Mode 2: 왼쪽 스틱 위아래 = 스로틀(상승), 좌우 = 요(제자리 회전) · 오른쪽 스틱 위아래 = 피치(앞뒤), 좌우 = 롤(좌우).',
    '왼쪽 스로틀 스틱은 실제 조종기처럼 손을 떼도 그 자리에 남아요. 나머지는 가운데로 돌아와요.',
    '앵글 모드(기본): 스틱을 놓으면 수평으로 돌아와요. 아크로 모드: 기울인 자세가 그대로 유지돼요. (⚙ 설정에서 변경)',
    '감도는 베타플라이트 방식(RC Rate · Super Rate · Expo)이에요. 설정에서 내 손에 맞게 바꿀 수 있어요.',
    'PC는 키보드(W/S 스로틀 · A/D 요 · 방향키 피치/롤), 게임패드, USB로 연결한 실제 RC 조종기로도 날릴 수 있어요.',
    '시작 전에는 자유 연습! 모두 준비하면 카운트다운 후 출발해요. 초록색으로 빛나는 다음 게이트를 순서대로 통과하세요.',
    '기둥·게이트에 부딪히거나 세게 떨어지면 추락! 잠시 뒤 마지막으로 통과한 게이트에서 다시 시작해요.',
    `정한 바퀴를 돌고 출발 게이트를 다시 지나면 완주! 제한 시간 ${LIMIT_MS / 60000}분.`,
    '가넷(완주한 사람만): 2명 → 1등 1개 / 3~4명 → 1등 2개, 2등 1개 / 5~8명 → 1등 3개, 2등 2개, 3등 1개',
  ],

  setup(players, room) {
    const order = players.map((p) => p.uid);
    const laps = Math.min(3, Math.max(1, Number(room?.options?.laps) || 2));
    return { order, laps, phase: 'practice', ready: {}, startAt: 0, endAt: 0, fin: {}, prog: {}, host: room?.hostId || order[0] };
  },

  move(state, move, uid, players) {
    const now = Date.now();
    const t = move?.type;
    if (!state.order.includes(uid) && t !== 'tick') throw new Error('참가자가 아니에요');
    const go = (s) => ({ ...s, phase: 'count', startAt: now + COUNT_MS, endAt: now + COUNT_MS + LIMIT_MS, fin: {}, prog: {} });
    if (t === 'ready') {
      if (state.phase !== 'practice') throw new Error('__noop');
      const ready = { ...state.ready, [uid]: !state.ready[uid] };
      const s = { ...state, ready };
      return { state: state.order.every((u) => ready[u]) ? go(s) : s };
    }
    if (t === 'force') {
      if (state.phase !== 'practice' || (uid !== state.host && players[state.host])) throw new Error('방장만 바로 출발할 수 있어요');
      return { state: go(state) };
    }
    if (t === 'prog') {
      if (!['count', 'race'].includes(state.phase) || now < state.startAt) throw new Error('__noop');
      const n = Math.min(state.laps * N + 1, Math.max(0, Number(move.n) | 0));
      if (n <= (state.prog[uid] || 0)) throw new Error('__noop');
      let s = { ...state, phase: 'race', prog: { ...state.prog, [uid]: n } };
      if (n >= state.laps * N + 1 && state.fin[uid] == null) {
        const tm = Math.max(1000, Math.min(now - state.startAt, Number(move.t) || now - state.startAt));
        s = { ...s, fin: { ...s.fin, [uid]: tm } };
        if (s.order.every((u) => s.fin[u] != null || !players[u])) { const d = { ...s, phase: 'done' }; return { state: d, result: finalResult(d, players) }; }
      }
      return { state: s };
    }
    if (t === 'tick') {
      if (['count', 'race'].includes(state.phase) && now >= state.endAt) { const d = { ...state, phase: 'done' }; return { state: d, result: finalResult(d, players) }; }
      if (state.phase === 'count' && now >= state.startAt) return { state: { ...state, phase: 'race' } };
      throw new Error('__noop');
    }
    throw new Error('알 수 없는 동작이에요');
  },

  render(el, ctx) {
    if (typeof document === 'undefined') return;
    const { state, room, finished } = ctx;
    const code = `${room?.code || 'local'}:${room?.startedAt || 0}`;
    if (finished || state.phase === 'done') {
      teardown();
      const res = room?.result || finalResult(state, ctx.players);
      el.innerHTML = `<div class="dn-end"><h3>🏁 레이스 결과</h3><ol>${res.ranking.map((r) => `<li class="${r.uid === ctx.me ? 'me' : ''}"><b>${r.place}</b><span>${esc(ctx.players[r.uid]?.name || '?')}</span><em>${esc(r.score)}</em><i>${r.garnets ? `${GARNET}+${r.garnets}` : ''}</i></li>`).join('')}</ol></div>`;
      return;
    }
    if (!ctl || ctl.code !== code) { teardown(); ctl = build(code, ctx); }
    ctl.ctx = ctx;
    el.innerHTML = `<div class="dn-holder"><p>🚁 드론 레이스 화면이 열려 있어요.</p><button class="btn primary" data-open>화면 다시 열기</button></div>`;
    el.querySelector('[data-open]').onclick = () => { if (!ctl.root.isConnected) document.body.appendChild(ctl.root); };
    ctl.holder = el;
    hud();
  },
};

// ───────────────── 화면 · 조종 ─────────────────
function teardown() {
  if (!ctl) return;
  cancelAnimationFrame(ctl.raf);
  ctl.unwatch?.(); ctl.live?.close?.(ctl.ctx?.me);
  window.removeEventListener('keydown', ctl.onKey); window.removeEventListener('keyup', ctl.onKey);
  ctl.root.remove();
  document.documentElement.classList.remove('dn-on');
  ctl = null;
}

function build(code, ctx) {
  const root = document.createElement('div');
  root.className = 'dn';
  root.innerHTML = `
    <canvas class="dn-cv"></canvas>
    <div class="dn-top">
      <div class="dn-time" data-time>연습 비행</div>
      <div class="dn-info" data-info></div>
      <div class="dn-btns"><button data-view title="시점 바꾸기">🎥</button><button data-reset title="다시 시작 위치로">↺</button><button data-set title="설정">⚙</button></div>
    </div>
    <div class="dn-arrow" data-arrow><i>▲</i></div>
    <div class="dn-center" data-center></div>
    <div class="dn-board" data-board></div>
    <div class="dn-stats" data-stats></div>
    <div class="dn-stick l" data-stick="l"><div class="dn-pad"><i class="dn-knob"></i></div><small>스로틀 · 요</small></div>
    <div class="dn-stick r" data-stick="r"><div class="dn-pad"><i class="dn-knob"></i></div><small>피치 · 롤</small></div>
    <div class="dn-ready" data-readybox></div>
    <div class="dn-rot">📱 가로로 돌리면 더 크게 조종할 수 있어요</div>
    <div class="dn-setp" data-setp hidden></div>`;
  document.body.appendChild(root);
  document.documentElement.classList.add('dn-on');
  const c = {
    code, root, ctx, raf: 0, last: performance.now(), acc: 0,
    set: loadSet(),
    gl: createGL(root.querySelector('canvas')),
    stick: { thr: 0, yaw: 0, pitch: 0, roll: 0 },
    keys: {}, touch: {},
    drone: null, prog: 0, phaseSeen: '', camP: null, others: {}, disp: {}, live: null, lastSend: 0, lastTick: 0,
    msg: '', msgUntil: 0, sentFin: false, gpIndex: -1,
  };
  ctl = c;
  if (typeof location !== 'undefined' && location.search.includes('test')) window.__dn = c;
  if (!c.gl) root.querySelector('[data-center]').innerHTML = '<b>이 기기에서는 3D 화면(WebGL)을 쓸 수 없어요 😢</b>';
  spawn(c, true);
  // 시점·리셋·설정
  root.querySelector('[data-view]').onclick = () => { c.set.view = c.set.view === 'fpv' ? 'chase' : 'fpv'; saveSet(c.set); flash(c, c.set.view === 'fpv' ? '🎥 FPV 시점' : '🎥 3인칭 시점'); };
  root.querySelector('[data-reset]').onclick = () => { if (c.drone.crashed <= 0) respawn(c); };
  root.querySelector('[data-set]').onclick = () => openSet(c);
  // 터치 스틱
  root.querySelectorAll('[data-stick]').forEach(($s) => {
    const side = $s.dataset.stick, $pad = $s.querySelector('.dn-pad'), $k = $s.querySelector('.dn-knob');
    const upd = (e) => {
      const r = $pad.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      const y = Math.max(-1, Math.min(1, -(((e.clientY - r.top) / r.height) * 2 - 1)));
      if (side === 'l') { c.touch.yaw = x; c.touch.thr = (y + 1) / 2; } else { c.touch.roll = x; c.touch.pitch = y; }
      c.set.input = 'touch';
    };
    $pad.addEventListener('pointerdown', (e) => { e.preventDefault(); $pad.setPointerCapture(e.pointerId); $s.classList.add('on'); upd(e); });
    $pad.addEventListener('pointermove', (e) => { if ($pad.hasPointerCapture(e.pointerId)) upd(e); });
    const end = () => { $s.classList.remove('on'); if (side === 'l') c.touch.yaw = 0; else { c.touch.roll = 0; c.touch.pitch = 0; } };
    $pad.addEventListener('pointerup', end); $pad.addEventListener('pointercancel', end);
    c[`$k${side}`] = $k;
  });
  c.touch = { thr: 0, yaw: 0, pitch: 0, roll: 0 };
  c.onKey = (e) => {
    if (e.target?.tagName === 'INPUT' || e.target?.tagName === 'SELECT') return;
    const k = e.key.toLowerCase();
    if (['w', 's', 'a', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) { e.preventDefault(); c.keys[k] = e.type === 'keydown'; c.set.input = 'key'; }
    if (e.type === 'keydown' && k === 'v') root.querySelector('[data-view]').click();
    if (e.type === 'keydown' && k === 'r') root.querySelector('[data-reset]').click();
  };
  window.addEventListener('keydown', c.onKey); window.addEventListener('keyup', c.onKey);
  // 실시간 위치 채널
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

function spawn(c, pad) {
  const i = Math.max(0, c.ctx.state.order.indexOf(c.ctx.me));
  c.drone = newDrone(startPad(i), COURSE.start.yaw);
  if (pad) { c.prog = 0; c.sentFin = false; }
}
function respawn(c) {
  if (c.prog === 0) { spawn(c, false); c.drone.landed = true; return; }
  const g = COURSE.gates[(c.prog - 1) % N], { f } = gateBasis(g);
  c.drone = newDrone([g.x + f[0] * 1.2, g.y, g.z + f[2] * 1.2], g.yaw);
  c.drone.landed = false;
}
function flash(c, m, ms = 1400) { c.msg = m; c.msgUntil = performance.now() + ms; }

// 입력 → 스틱 값
function readInput(c, dt) {
  const s = c.stick;
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  if (pads.length) {
    const gp = pads[0], m = c.set.map || {};
    const ax = (k) => { const [i, inv] = m[k] || [0, false]; const v = gp.axes[i] ?? 0; return inv ? -v : v; };
    const moved = gp.axes.some((v) => Math.abs(v) > 0.15);
    if (moved && c.set.input !== 'pad') { c.set.input = 'pad'; }
    if (c.set.input === 'pad') {
      const dz = (v) => (Math.abs(v) < 0.03 ? 0 : v);
      s.thr = Math.max(0, Math.min(1, (ax('thr') + 1) / 2));
      s.yaw = dz(ax('yaw')); s.pitch = dz(ax('pitch')); s.roll = dz(ax('roll'));
      c.gp = gp;
      return;
    }
  }
  if (c.set.input === 'key') {
    const K = c.keys;
    if (K.w) s.thr = Math.min(1, s.thr + dt * 0.7);
    if (K.s) s.thr = Math.max(0, s.thr - dt * 0.9);
    if (K[' ']) s.thr = 0;
    const ease = (cur, want) => cur + (want - cur) * Math.min(1, dt * 7);
    s.yaw = ease(s.yaw, (K.d ? 1 : 0) - (K.a ? 1 : 0));
    s.pitch = ease(s.pitch, (K.arrowup ? 1 : 0) - (K.arrowdown ? 1 : 0));
    s.roll = ease(s.roll, (K.arrowright ? 1 : 0) - (K.arrowleft ? 1 : 0));
    c.touch.thr = s.thr;
    return;
  }
  Object.assign(s, c.touch);
}

function frame(now) {
  const c = ctl;
  if (!c) return;
  c.raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - c.last) / 1000); c.last = now;
  const { state, me, room, sendMove } = c.ctx;
  const t = Date.now();
  // 단계가 바뀌면 출발 위치로
  if (c.phaseSeen !== state.phase) {
    if (state.phase === 'count' || (state.phase === 'race' && c.phaseSeen === '')) spawn(c, true);
    c.phaseSeen = state.phase;
  }
  readInput(c, dt);
  const racing = ['count', 'race'].includes(state.phase);
  const armed = !racing || t >= state.startAt;
  const iFin = state.fin?.[me] != null;
  // 물리 (240Hz)
  c.acc += dt;
  while (c.acc >= 1 / 240) {
    c.acc -= 1 / 240;
    const before = [...c.drone.p];
    const wasCrash = c.drone.crashed > 0;
    const r = step(c.drone, c.stick, c.set, 1 / 240, armed);
    if (r === 'crash' && !wasCrash) { flash(c, '💥 추락!', 1500); soundEvent(room?.code || 'x', `dn:crash:${t}`, 'no'); }
    if (wasCrash && c.drone.crashed <= 0) respawn(c);
    // 게이트 통과
    if (r === 'ok' && (!racing || armed)) {
      const g = COURSE.gates[c.prog % N];
      if (crossed(g, before, c.drone.p)) {
        c.prog++;
        const total = state.laps * N + 1;
        if (racing && state.order.includes(me) && !iFin) {
          if (c.prog >= total) { flash(c, `🏁 완주! ${fmt(t - state.startAt)}`, 3000); soundEvent(room?.code || 'x', `dn:fin:${t}`, 'ok'); }
          else if (c.prog % N === 1 && c.prog > 1) flash(c, `🔁 ${Math.floor(c.prog / N) + 1}바퀴째!`);
          sendMove({ type: 'prog', n: c.prog, t: t - state.startAt }, { silent: true });
        } else if (!racing && c.prog % N === 0) flash(c, '✨ 연습 한 바퀴 완료!');
      }
    }
  }
  // 실시간 위치 보내기
  if (c.live && t - c.lastSend > 80) {
    c.lastSend = t;
    const d = c.drone;
    c.live.send(me, { p: d.p.map((x) => Math.round(x * 100) / 100), q: d.q.map((x) => Math.round(x * 1000) / 1000), g: c.prog, x: d.crashed > 0 ? 1 : 0, th: Math.round(c.stick.thr * 100) / 100 });
  }
  // 시간 지나면 진행 신호
  if (racing && ((state.phase === 'count' && t >= state.startAt) || t >= state.endAt) && t - c.lastTick > 2000) { c.lastTick = t; sendMove({ type: 'tick' }, { silent: true }); }
  draw(c, dt);
  hudFast(c, t);
}

// ── 그리기 ──
const Y = (a) => quat.axis([0, 1, 0], a);
function drawDrone(R, p, q, col, prop, me) {
  const s = 1.7;
  const M = (off, size) => m4.trs(v3.add(p, quat.rot(q, v3.mul(off, s))), q, size.map((x) => x * s));
  R.boxM(M([0, 0, 0], [0.16, 0.05, 0.24]), col, 0.15);
  R.boxM(M([0, 0.04, -0.06], [0.1, 0.04, 0.1]), [0.12, 0.12, 0.15]);
  R.boxM(M([0, 0.03, -0.12], [0.05, 0.04, 0.03]), me ? [1, 0.85, 0.2] : [0.95, 0.95, 1], 0.6); // 카메라 / 앞
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const arm = m4.trs(v3.add(p, quat.rot(q, v3.mul([x * 0.1, 0, z * 0.1], s))), quat.mul(q, Y(Math.atan2(x, z))), [0.03 * s, 0.025 * s, 0.2 * s]);
    R.boxM(arm, [0.15, 0.15, 0.18]);
    const pc = v3.add(p, quat.rot(q, v3.mul([x * 0.17, 0.035, z * 0.17], s)));
    R.boxM(m4.trs(pc, quat.mul(q, Y(prop * (x * z))), [0.2 * s, 0.006 * s, 0.025 * s]), col, 0.35);
    R.boxM(m4.trs(pc, q, [0.03 * s, 0.03 * s, 0.03 * s]), [0.1, 0.1, 0.1]);
  }
}
function drawWorld(c, R) {
  R.ground();
  const nextI = c.prog % N, after = (c.prog + 1) % N;
  COURSE.gates.forEach((g, i) => {
    const q = Y(g.yaw), { f, r } = gateBasis(g), h = GATE / 2, F = FRAME;
    const col = i === nextI ? [0.2, 1, 0.45] : i === after ? [1, 0.6, 0.15] : [0.95, 0.42, 0.18];
    const e = i === nextI ? 0.8 : i === after ? 0.3 : 0.05;
    const at = (lx, ly) => [g.x + r[0] * lx, g.y + ly, g.z + r[2] * lx];
    R.box(at(0, h + F / 2), q, [GATE + 2 * F, F, F], col, e);
    R.box(at(0, -h - F / 2), q, [GATE + 2 * F, F, F], col, e);
    R.box(at(-h - F / 2, 0), q, [F, GATE, F], col, e);
    R.box(at(h + F / 2, 0), q, [F, GATE, F], col, e);
    const legH = g.y - h - F;
    if (legH > 0.05) for (const s of [-1, 1]) R.box([...at(s * h, 0)].map((v, k) => (k === 1 ? legH / 2 : v)), q, [0.08, legH, 0.08], [0.25, 0.25, 0.28]);
    if (i === nextI) R.box(at(0, h + 0.7), q, [0.35, 0.35, 0.35], [0.2, 1, 0.45], 1); // 다음 게이트 표시
  });
  for (const p of COURSE.pillars) for (let k = 0; k < 3; k++) R.box([p.x, (k + 0.5) * (p.h / 3), p.z], [0, 0, 0, 1], [p.r * 2, p.h / 3, p.r * 2], k % 2 ? [0.95, 0.95, 0.95] : [0.9, 0.15, 0.2], 0.05);
  // 출발 패드 · 출발선
  for (let i = 0; i < 8; i++) { const p = startPad(i); R.box([p[0], 0.01, p[2]], [0, 0, 0, 1], [1.1, 0.02, 1.1], [0.2, 0.2, 0.24]); }
  R.box([0, 0.015, -1.2], [0, 0, 0, 1], [7, 0.02, 0.3], [1, 1, 1], 0.3);
  // 주변 나무
  for (let i = 0; i < 46; i++) {
    const a = i * 2.39996, rad = 105 + ((i * 37) % 40);
    const x = Math.cos(a) * rad + 25, z = Math.sin(a) * rad - 20, hgt = 6 + ((i * 13) % 7);
    R.box([x, 1.2, z], [0, 0, 0, 1], [0.6, 2.4, 0.6], [0.4, 0.27, 0.15]);
    R.box([x, 2.4 + hgt / 2, z], Y(i), [3.2, hgt, 3.2], [0.16 + (i % 3) * 0.03, 0.42, 0.2]);
  }
}
function draw(c, dt) {
  const R = c.gl; if (!R) return;
  const d = c.drone, me = c.ctx.me;
  let view, camPos;
  const fpv = c.set.view === 'fpv';
  if (fpv) {
    const qc = quat.mul(d.q, quat.axis([1, 0, 0], c.set.camTilt * Math.PI / 180));
    camPos = v3.add(d.p, quat.rot(d.q, [0, 0.06, -0.12]));
    view = m4.view(camPos, qc);
  } else {
    const h = headingOf(d.q), fw = [-Math.sin(h), 0, -Math.cos(h)];
    const want = v3.add(d.p, [-fw[0] * 3.4, 1.3, -fw[2] * 3.4]);
    c.camP = c.camP ? v3.lerp(c.camP, want, Math.min(1, dt * 6)) : want;
    if (c.camP[1] < 0.3) c.camP[1] = 0.3;
    camPos = c.camP;
    view = m4.lookAt(camPos, v3.add(d.p, [fw[0] * 1.5, 0.3, fw[2] * 1.5]));
  }
  const proj = m4.persp((fpv ? 100 : 70) * Math.PI / 180, R.aspect(), 0.05, 600);
  R.begin(view, proj, camPos);
  drawWorld(c, R);
  const order = c.ctx.state.order;
  const myCol = COLORS[Math.max(0, order.indexOf(me)) % COLORS.length];
  if (!fpv && d.crashed <= 0) drawDrone(R, d.p, d.q, myCol, d.prop, true);
  if (d.crashed > 0 && !fpv) drawDrone(R, d.p, quat.mul(d.q, quat.axis([0, 0, 1], 2.6)), [0.4, 0.4, 0.4], 0, true);
  // 다른 사람 드론 (부드럽게 따라가기)
  for (const [u, o] of Object.entries(c.others || {})) {
    if (u === me || !o?.p || !order.includes(u)) continue;
    const cur = c.disp[u] || { p: o.p, q: o.q };
    cur.p = v3.lerp(cur.p, o.p, Math.min(1, dt * 12)); cur.q = quat.slerp(cur.q, o.q, Math.min(1, dt * 12));
    c.disp[u] = cur;
    if (o.x) continue;
    drawDrone(R, cur.p, cur.q, COLORS[order.indexOf(u) % COLORS.length], performance.now() / 20, false);
  }
}

// ── 화면 정보 ──
function hud() {
  const c = ctl; if (!c) return;
  const { state, me, players, sendMove, room } = c.ctx;
  const $r = c.root.querySelector('[data-readybox]');
  if (state.phase === 'practice') {
    const isHost = room?.hostId === me;
    const n = Object.values(state.ready).filter(Boolean).length;
    $r.innerHTML = `<div class="dn-rbox"><b>🛩 자유 연습 중</b><small>모두 준비하면 출발해요 · ${n}/${state.order.length}</small>
      <button class="btn ${state.ready[me] ? '' : 'primary'}" data-rdy>${state.ready[me] ? '준비 취소' : '준비 완료!'}</button>
      ${isHost && state.order.length > 1 ? '<button class="btn ghost sm" data-force>바로 출발</button>' : ''}</div>`;
    $r.querySelector('[data-rdy]').onclick = () => sendMove({ type: 'ready' });
    const $f = $r.querySelector('[data-force]'); if ($f) $f.onclick = () => sendMove({ type: 'force' });
  } else $r.innerHTML = '';
  const total = state.laps * N + 1;
  const rows = state.order.map((u) => ({ u, g: state.fin[u] != null ? 999 : Math.max(state.prog[u] || 0, c.others?.[u]?.g || 0), t: state.fin[u] }))
    .sort((a, b) => (a.t != null && b.t != null ? a.t - b.t : b.g - a.g));
  c.root.querySelector('[data-board]').innerHTML = state.phase === 'practice' ? '' : rows.map((r, i) => `<div class="${r.u === me ? 'me' : ''}"><b>${i + 1}</b><i style="background:${CSS(COLORS[state.order.indexOf(r.u) % COLORS.length])}"></i><span>${esc(players[r.u]?.name || '?')}</span><em>${r.t != null ? fmt(r.t) : `${Math.min(r.g, total)}/${total}`}</em></div>`).join('');
}
function hudFast(c, t) {
  const { state } = c.ctx;
  const d = c.drone;
  const total = state.laps * N + 1;
  const $time = c.root.querySelector('[data-time]'), $c = c.root.querySelector('[data-center]');
  let center = '';
  if (state.phase === 'practice') $time.textContent = '연습 비행';
  else if (t < state.startAt) { $time.textContent = '0:00.00'; const s = Math.ceil((state.startAt - t) / 1000); center = `<b class="dn-count">${s <= 3 ? s : '준비'}</b>`; }
  else { const mine = state.fin?.[c.ctx.me]; $time.textContent = mine != null ? `🏁 ${fmt(mine)}` : fmt(t - state.startAt); if (t - state.startAt < 900) center = '<b class="dn-count go">GO!</b>'; }
  if (performance.now() < c.msgUntil) center = `<b class="dn-msg">${c.msg}</b>`;
  if ($c.dataset.v !== center) { $c.innerHTML = center; $c.dataset.v = center; }
  const lap = Math.min(state.laps, Math.floor(c.prog / N) + 1);
  const sp = Math.round(v3.len(d.v) * 3.6);
  const info = state.phase === 'practice' ? `게이트 ${c.prog % N + 1}/${N}` : `${lap}/${state.laps}바퀴 · 게이트 ${Math.min(c.prog, total)}/${total}`;
  const $i = c.root.querySelector('[data-info]'); if ($i.textContent !== info) $i.textContent = info;
  const a = attitude(d.q);
  c.root.querySelector('[data-stats]').innerHTML = `<span>${sp}<small>km/h</small></span><span>${d.p[1].toFixed(1)}<small>m</small></span><span class="dn-thr"><i style="height:${Math.round(c.stick.thr * 100)}%"></i></span><span class="dn-mode ${c.set.mode}">${c.set.mode === 'acro' ? 'ACRO' : 'ANGLE'}</span>`;
  // 다음 게이트 방향 화살표
  const g = COURSE.gates[c.prog % N];
  const h = headingOf(d.q), to = Math.atan2(-(g.x - d.p[0]), -(g.z - d.p[2]));
  let ang = h - to; while (ang > Math.PI) ang -= 2 * Math.PI; while (ang < -Math.PI) ang += 2 * Math.PI;
  const dist = Math.hypot(g.x - d.p[0], g.z - d.p[2]);
  const $a = c.root.querySelector('[data-arrow]');
  $a.style.transform = `translateX(-50%) rotate(${ang}rad)`;
  $a.style.opacity = c.prog >= total && state.phase !== 'practice' ? 0 : 1;
  $a.title = `${dist.toFixed(0)}m`;
  // 스틱 손잡이
  const s = c.stick;
  if (c.$kl) c.$kl.style.transform = `translate(${s.yaw * 100}%, ${-(s.thr * 2 - 1) * 100}%)`;
  if (c.$kr) c.$kr.style.transform = `translate(${s.roll * 100}%, ${-s.pitch * 100}%)`;
  void a;
}

// ── 설정 창 ──
function openSet(c) {
  const $p = c.root.querySelector('[data-setp]');
  const S = c.set;
  const sl = (k, label, min, max, st) => `<label class="dn-sl"><span>${label} <b data-v="${k}">${S[k]}</b></span><input type="range" min="${min}" max="${max}" step="${st}" value="${S[k]}" data-k="${k}"></label>`;
  const axSel = (k, label) => `<label class="dn-ax"><span>${label}</span><select data-ax="${k}">${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<option value="${i}" ${S.map[k][0] === i ? 'selected' : ''}>축 ${i}</option>`).join('')}</select><label><input type="checkbox" data-inv="${k}" ${S.map[k][1] ? 'checked' : ''}> 반전</label><em data-live="${k}">0.00</em></label>`;
  $p.hidden = false;
  $p.innerHTML = `<div class="dn-setbox">
    <div class="dn-seth"><b>⚙ 조종 설정</b><button data-close>✕</button></div>
    <div class="dn-seg"><span>비행 모드</span><button data-mode="angle" class="${S.mode === 'angle' ? 'on' : ''}">앵글 (수평 복귀)</button><button data-mode="acro" class="${S.mode === 'acro' ? 'on' : ''}">아크로 (실전)</button></div>
    <div class="dn-seg"><span>시점</span><button data-vw="chase" class="${S.view !== 'fpv' ? 'on' : ''}">3인칭</button><button data-vw="fpv" class="${S.view === 'fpv' ? 'on' : ''}">FPV</button></div>
    <div class="dn-sub">롤 · 피치 감도 (베타플라이트 방식)</div>
    ${sl('rc', 'RC Rate', 0.5, 2.5, 0.05)}${sl('sup', 'Super Rate', 0, 0.95, 0.01)}${sl('expo', 'Expo', 0, 1, 0.01)}
    <div class="dn-rate">최대 회전 <b data-maxr></b>°/초</div>
    <div class="dn-sub">요 감도</div>
    ${sl('yrc', 'RC Rate', 0.5, 2.5, 0.05)}${sl('ysup', 'Super Rate', 0, 0.95, 0.01)}${sl('yexpo', 'Expo', 0, 1, 0.01)}
    <div class="dn-sub">기체</div>
    ${sl('tw', '추력비 (무게 대비 힘)', 1.8, 6, 0.1)}${sl('thrExpo', '스로틀 Expo', 0, 0.8, 0.05)}${sl('angleMax', '앵글 모드 최대 기울기(°)', 25, 80, 1)}${sl('camTilt', 'FPV 카메라 각도(°)', 0, 50, 1)}
    <div class="dn-sub">게임패드 · RC 조종기 (USB) 축 설정</div>
    <p class="dn-help">조종기를 연결하고 스틱을 움직여 보세요. 움직이는 축 번호를 골라 맞추면 돼요. (RC 조종기는 보통 롤 0 · 피치 1 · 스로틀 2 · 요 3)</p>
    ${axSel('thr', '스로틀')}${axSel('yaw', '요')}${axSel('pitch', '피치')}${axSel('roll', '롤')}
    <div class="dn-presets"><button data-pre="pad">게임패드 기본</button><button data-pre="rc">RC 조종기 (AETR)</button></div>
    <button class="btn ghost sm" data-def>기본값으로</button>
  </div>`;
  const maxR = () => { const el = $p.querySelector('[data-maxr]'); if (el) el.textContent = Math.round(bfRate(1, { rc: S.rc, sup: S.sup, expo: S.expo })); };
  maxR();
  $p.querySelector('[data-close]').onclick = () => { $p.hidden = true; clearInterval(c.axIv); };
  $p.querySelectorAll('[data-mode]').forEach((b) => (b.onclick = () => { S.mode = b.dataset.mode; saveSet(S); openSet(c); }));
  $p.querySelectorAll('[data-vw]').forEach((b) => (b.onclick = () => { S.view = b.dataset.vw; saveSet(S); openSet(c); }));
  $p.querySelectorAll('[data-k]').forEach((inp) => (inp.oninput = () => { S[inp.dataset.k] = Number(inp.value); $p.querySelector(`[data-v="${inp.dataset.k}"]`).textContent = inp.value; saveSet(S); maxR(); }));
  $p.querySelectorAll('[data-ax]').forEach((s) => (s.onchange = () => { S.map[s.dataset.ax][0] = Number(s.value); saveSet(S); }));
  $p.querySelectorAll('[data-inv]').forEach((s) => (s.onchange = () => { S.map[s.dataset.inv][1] = s.checked; saveSet(S); }));
  $p.querySelectorAll('[data-pre]').forEach((b) => (b.onclick = () => {
    S.map = b.dataset.pre === 'rc' ? { roll: [0, false], pitch: [1, false], thr: [2, false], yaw: [3, false] } : { thr: [1, true], yaw: [0, false], pitch: [3, true], roll: [2, false] };
    S.input = 'pad'; saveSet(S); openSet(c);
  }));
  $p.querySelector('[data-def]').onclick = () => { const map = S.map; Object.assign(S, DEFAULT_SET, { map }); saveSet(S); openSet(c); };
  clearInterval(c.axIv);
  c.axIv = setInterval(() => {
    if ($p.hidden) return clearInterval(c.axIv);
    const gp = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
    for (const k of ['thr', 'yaw', 'pitch', 'roll']) { const e = $p.querySelector(`[data-live="${k}"]`); if (!e) continue; const [i, inv] = S.map[k]; const v = gp ? (gp.axes[i] ?? 0) * (inv ? -1 : 1) : 0; e.textContent = gp ? v.toFixed(2) : '연결 안 됨'; }
  }, 120);
}
