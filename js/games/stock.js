// 더 지니어스: 폭풍의 증권시장 (4~8명)
// 로비에서 자유롭게 돌아다니며 채팅·정보 거래 → 번호표를 뽑고, 내 번호가 불리면 '증권거래소' 문으로 들어가 20초 동안 사고팔기
// 주가는 게임 시각 5분(실제 20초)마다 바뀌고, 그 변동 정보는 라운드 전에 이웃끼리 3개씩 나눠 받아요 (각자 6개).
// 게임 상태(주가·지갑·번호표·창구)는 방 문서로, 캐릭터 위치는 실시간 채널(backend.live)로 주고받아요.
import { GARNET } from '../profile.js';
import { soundEvent } from '../sound.js';
import { personHtml } from './face.js';
import { bigFlash } from './turn-alert.js';

export const COMPANIES = [
  { name: '태양전자', emoji: '☀️', color: '#ffb02e' },
  { name: '한강건설', emoji: '🏗️', color: '#3d7bff' },
  { name: '은하제약', emoji: '💊', color: '#b26bff' },
  { name: '청해해운', emoji: '🚢', color: '#2ee6d6' },
  { name: '별빛통신', emoji: '📡', color: '#ff4f6e' },
];
const START_CASH = 10000;
const START_PRICE = 2000;
const MAX_HOLD = 7;
const TICKS = 12;            // 라운드당 주가 변동 횟수 (게임 시각 5분 × 12 = 60분)
const TICK_MS = 20000;       // 게임 시각 5분 = 실제 20초
const INFO_MS = 60000;       // 정보 확인 최대 60초
const WINDOWS = 2;           // 거래소 창구 수
const CALL_MS = 10000;       // 번호가 불리면 10초 안에 입장
const STAY_MS = 20000;       // 거래소에 머무는 시간
const W = 1000, H = 700, R = 50;
const DOOR = { x: 500, y: 92 };
const KIOSK = { x: 110, y: 560 };
const NEAR = 95;
const SPEED = 260;
const SEND_MS = 100;
const COLORS = ['#ff4f6e', '#3d7bff', '#3ddc84', '#ffb02e', '#b26bff', '#2ee6d6', '#ff8ad8', '#e8cf8a'];
export const rewardsFor = (n) => (n <= 5 ? [3, 2, 1] : [5, 4, 4, 3, 2, 1]);
export const supplyFor = (n) => Math.max(10, 2 * n - 1); // 8명 = 15주 (원작과 같음)

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const won = (n) => `${Number(n).toLocaleString('ko-KR')}원`;
const clockOf = (round, tick) => (tick >= TICKS ? `${round + 1}:00` : `${round}:${String(tick * 5).padStart(2, '0')}`);

// ── 라운드 정보 만들기: 사람 수 × 3개, 이웃 둘이 3개씩 함께 받음 ──
export function makeEvents(prices, n) {
  const cells = shuffle(Array.from({ length: TICKS * COMPANIES.length }, (_, i) => ({ t: Math.floor(i / COMPANIES.length) + 1, c: i % COMPANIES.length }))).slice(0, 3 * n);
  const deltas = [100, 200, 300, 300, 400, 400, 500, 500, 600, 700, 800, 1000];
  const evs = cells.map((x) => ({ ...x, d: deltas[Math.floor(Math.random() * deltas.length)] * (Math.random() < 0.5 ? -1 : 1) }));
  // 주가가 200원 아래로 떨어지지 않게 시간 순서대로 확인하며 부호 조정
  const p = [...prices];
  [...evs].sort((a, b) => a.t - b.t).forEach((e) => { if (p[e.c] + e.d < 200) e.d = Math.abs(e.d); p[e.c] += e.d; });
  return shuffle(evs);
}
function dealInfo(state, round, now) {
  const n = state.order.length;
  const events = makeEvents(state.prices, n);
  const seats = state.seats; // 제비뽑기 순서 (게임 시작 때 정함)
  const info = events.map((e, i) => { const k = Math.floor(i / 3); return { ...e, pair: [seats[k], seats[(k + 1) % n]] }; });
  return { ...state, round, phase: 'info', info, tick: 0, nextAt: 0, deadline: now + INFO_MS, ready: {}, queue: [], windows: Array(WINDOWS).fill(null), notes: [] };
}

// 시간이 지나면 처리할 것들: 주가 변동, 창구 시간 초과, 다음 번호 부르기
export function advance(state, now, players) {
  let s = state;
  if (s.phase === 'info' && now >= s.deadline) s = startMarket(s, now);
  if (s.phase === 'market') {
    const prices = [...s.prices];
    const hist = s.hist.map((h) => [...h]);
    let tick = s.tick, nextAt = s.nextAt, changed = false;
    while (tick < TICKS && now >= nextAt) {
      tick += 1; nextAt += TICK_MS; changed = true;
      s.info.filter((e) => e.t === tick).forEach((e) => { prices[e.c] = Math.max(100, prices[e.c] + e.d); });
      prices.forEach((p, c) => hist[c].push(p));
    }
    if (changed) s = { ...s, prices, hist, tick, nextAt };
    if (s.tick >= TICKS) return endRound(s, now, players);
    // 창구: 호출 시간 초과(부재) · 거래 시간 초과
    let windows = s.windows.map((w) => {
      if (!w) return null;
      if (now > w.until) return null;
      return w;
    });
    const skipped = s.windows.filter((w, i) => w && !windows[i] && w.st === 'call').map((w) => w.no);
    let queue = [...s.queue];
    windows = windows.map((w) => {
      if (w || !queue.length) return w;
      const q = queue.shift();
      return { uid: q.uid, no: q.no, st: 'call', until: now + CALL_MS, at: now };
    });
    const notes = skipped.length ? [...s.notes, ...skipped.map((no) => ({ at: now, text: `${no}번 고객님이 오지 않아 다음 번호로 넘어갔어요` }))].slice(-5) : s.notes;
    s = { ...s, windows, queue, notes };
  }
  return { state: s };
}
function startMarket(s, now) {
  return { ...s, phase: 'market', tick: 0, nextAt: now + TICK_MS, ready: {}, deadline: 0 };
}
function endRound(s, now, players) {
  const done = { ...s, windows: Array(WINDOWS).fill(null), queue: [], history: [...s.history, { round: s.round, info: s.info }] };
  if (s.round >= 2) {
    // 정산: 보유 주식을 마지막 주가로 현금화
    const finalCash = {};
    s.order.forEach((u) => { finalCash[u] = s.cash[u] + s.hold[u].reduce((a, q, c) => a + q * s.prices[c], 0); });
    const end = { ...done, phase: 'done', finalCash };
    return { state: end, result: finalResult(end, players) };
  }
  return { state: dealInfo(done, s.round + 1, now) };
}
function finalResult(state, players) {
  const rewards = rewardsFor(state.order.length);
  const ranking = state.order
    .map((uid) => ({ uid, score: state.finalCash[uid] }))
    .sort((a, b) => b.score - a.score)
    .map((r, _, all) => { const place = 1 + all.filter((o) => o.score > r.score).length; return { ...r, place, garnets: rewards[place - 1] || 0 }; });
  const top = ranking.filter((r) => r.place === 1).map((r) => players[r.uid]?.name || '?');
  return {
    message: `${top.join(', ')}님 1등! 📈`,
    winners: ranking.filter((r) => r.place === 1).map((r) => r.uid),
    ranking,
    rewards: Object.fromEntries(ranking.map((r) => [r.uid, r.garnets])),
  };
}
const totalOf = (s, u) => s.cash[u] + s.hold[u].reduce((a, q, c) => a + q * s.prices[c], 0);
const myWindow = (s, u) => s.windows.findIndex((w) => w && w.uid === u);

// ── 화면 ──
let ctl = null;
function teardown() {
  if (!ctl) return;
  cancelAnimationFrame(ctl.raf);
  ctl.unwatch?.();
  ctl.live?.close?.(ctl.ctx.me);
  ctl.say?.remove();
  ['keydown', 'keyup'].forEach((t) => window.removeEventListener(t, ctl.onKey));
  window.removeEventListener('pointermove', ctl.onPMove);
  window.removeEventListener('pointerup', ctl.onPUp);
  window.removeEventListener('pointercancel', ctl.onPUp);
  ctl = null;
}

function build(code) {
  const root = document.createElement('div');
  root.className = 'sx';
  root.innerHTML = `
    <div class="sx-top"><span class="sx-round"></span><span class="sx-phase"></span><span class="sx-next"></span></div>
    <div class="sx-stage">
      <div class="sx-arena">
        <div class="sx-floor"></div>
        <div class="sx-door" style="left:${DOOR.x / 10}%;top:${DOOR.y / 7}%"><b>증권거래소</b><span class="sx-door-in"></span><i></i></div>
        <div class="sx-kiosk" style="left:${KIOSK.x / 10}%;top:${KIOSK.y / 7}%"><b>번호표</b><span class="sx-kiosk-no"></span></div>
        <div class="sx-clock"><div class="sx-dial"><i class="h"></i><i class="m"></i></div><b class="sx-time"></b><small class="sx-tick"></small></div>
        <div class="sx-board"></div>
        <div class="sx-chars"></div>
        <div class="sx-center"></div>
      </div>
      <div class="sx-exch"></div>
    </div>
    <div class="sx-queue"></div>
    <div class="sx-ctrl">
      <div class="am-joy sx-joy"><i></i></div>
      <button class="am-act sx-act" data-act><b>상호작용</b><small></small></button>
    </div>
    <div class="sx-hint">조이스틱(또는 방향키·WASD)으로 움직이고, 번호표 기계·거래소 문 앞에서 상호작용(스페이스)을 눌러요</div>
    <div class="sx-panel"></div>
    <div class="sx-log"></div>`;
  const say = document.createElement('form');
  say.className = 'am-say sx-say';
  say.innerHTML = '<input maxlength="60" placeholder="채팅 입력 (말풍선으로 떠요)" autocomplete="off" enterkeyhint="send" /><button>보내기</button>';
  document.body.appendChild(say);
  const c = {
    code, root, say, raf: 0, sig: '', exSig: '', $: (q) => root.querySelector(q),
    pos: null, posKey: '', disp: {}, others: {}, lastSend: 0, lastSent: '', joy: { x: 0, y: 0, id: null }, keys: new Set(),
    lastT: performance.now(), lastTick: 0, chars: {}, live: null, unwatch: null, gone: 0, chatSeen: {}, started: false, calledSeen: '', shake: 0,
  };
  const moveJoy = (e) => {
    const r = c.joyEl.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2 - 14, len = Math.hypot(dx, dy);
    if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
    c.joy.x = dx / max; c.joy.y = dy / max;
    c.root.querySelector('.sx-joy i').style.transform = `translate(${dx}px, ${dy}px)`;
  };
  c.$('.sx-joy').addEventListener('pointerdown', (e) => { c.joy.id = e.pointerId; c.joyEl = c.$('.sx-joy'); moveJoy(e); e.preventDefault(); });
  c.onPMove = (e) => { if (e.pointerId === c.joy.id) moveJoy(e); };
  c.onPUp = (e) => { if (e.pointerId !== c.joy.id) return; c.joy = { x: 0, y: 0, id: null }; c.root.querySelector('.sx-joy i').style.transform = ''; };
  c.onKey = (e) => {
    if (e.target.closest?.('input, textarea')) return;
    const k = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' }[e.code];
    if (k) { e.type === 'keydown' ? c.keys.add(k) : c.keys.delete(k); e.preventDefault(); }
    if (e.type === 'keydown' && (e.code === 'Space' || e.code === 'KeyE') && !e.repeat) { e.preventDefault(); interact(); }
  };
  window.addEventListener('pointermove', c.onPMove);
  window.addEventListener('pointerup', c.onPUp);
  window.addEventListener('pointercancel', c.onPUp);
  window.addEventListener('keydown', c.onKey);
  window.addEventListener('keyup', c.onKey);
  c.$('[data-act]').addEventListener('click', () => interact());
  say.addEventListener('submit', (e) => {
    e.preventDefault();
    const $i = say.querySelector('input');
    const text = $i.value.trim();
    if (!text) return;
    $i.value = '';
    c.ctx.sendMove({ type: 'chat', text });
  });
  // 거래소 버튼 · 정보 확인 버튼
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-buy],[data-sell],[data-sellall],[data-exout],[data-infook]');
    if (!b || b.disabled) return;
    const s = c.ctx.sendMove;
    if (b.dataset.buy != null) s({ type: 'trade', c: Number(b.dataset.buy), q: Number(b.dataset.q || 1) });
    else if (b.dataset.sell != null) s({ type: 'trade', c: Number(b.dataset.sell), q: -Number(b.dataset.q || 1) });
    else if (b.dataset.sellall != null) s({ type: 'trade', c: Number(b.dataset.sellall), q: -99 });
    else if (b.dataset.exout != null) s({ type: 'leave' });
    else if (b.dataset.infook != null) s({ type: 'ready' });
  });
  return c;
}

function nearWhat() {
  const { state, me } = ctl.ctx;
  if (!ctl.pos || myWindow(state, me) >= 0 && state.windows[myWindow(state, me)].st === 'in') return null;
  const wi = myWindow(state, me);
  if (wi >= 0 && state.windows[wi].st === 'call' && dist(ctl.pos, DOOR) < NEAR + 20) return 'door';
  if (dist(ctl.pos, KIOSK) < NEAR) return 'kiosk';
  if (dist(ctl.pos, DOOR) < NEAR + 20) return 'door-closed';
  return null;
}
function interact() {
  if (!ctl) return;
  const { state, me, sendMove } = ctl.ctx;
  if (state.phase !== 'market' || !state.order.includes(me)) { ctl.shake = Date.now(); return; }
  const w = nearWhat();
  if (w === 'door') sendMove({ type: 'enter' });
  else if (w === 'kiosk') sendMove({ type: 'ticket' });
  else ctl.shake = Date.now();
}

function frame() {
  if (!ctl) return;
  ctl.raf = requestAnimationFrame(frame);
  const c = ctl;
  if (!c.root.isConnected) {
    if (!c.gone) c.gone = Date.now(); else if (Date.now() - c.gone > 4000) { teardown(); return; }
    if (Date.now() - c.gone > 600) c.say.style.display = 'none';
    return;
  }
  c.gone = 0;
  const { state, me, players, sendMove } = c.ctx;
  const now = Date.now(), t = performance.now();
  const dt = Math.min(0.05, (t - c.lastT) / 1000);
  c.lastT = t;
  const iAmIn = state.order.includes(me);
  const wi = myWindow(state, me);
  const inside = wi >= 0 && state.windows[wi].st === 'in';
  c.say.style.display = iAmIn && state.phase !== 'done' ? '' : 'none';

  if (!c.pos && state.spawn?.[me]) c.pos = { ...state.spawn[me] };
  // 이동 (거래소 안에서는 멈춤)
  if (iAmIn && c.pos && !inside && state.phase !== 'done') {
    let vx = c.joy.x + (c.keys.has('r') ? 1 : 0) - (c.keys.has('l') ? 1 : 0);
    let vy = c.joy.y + (c.keys.has('d') ? 1 : 0) - (c.keys.has('u') ? 1 : 0);
    const len = Math.hypot(vx, vy);
    if (len > 1) { vx /= len; vy /= len; }
    c.pos.x = Math.max(R, Math.min(W - R, c.pos.x + vx * SPEED * dt));
    c.pos.y = Math.max(DOOR.y + 40, Math.min(H - R, c.pos.y + vy * SPEED * dt));
  }
  if (iAmIn && c.pos && c.live) {
    const key = `${Math.round(c.pos.x)},${Math.round(c.pos.y)},${inside ? 1 : 0}`;
    if ((key !== c.lastSent && t - c.lastSend > SEND_MS) || t - c.lastSend > 1500) {
      c.lastSend = t; c.lastSent = key;
      c.live.send(me, { x: Math.round(c.pos.x), y: Math.round(c.pos.y) });
    }
  }
  state.order.forEach((u) => {
    if (u === me) { if (c.pos) c.disp[u] = { ...c.pos }; return; }
    const tgt = c.others[u] || state.spawn?.[u];
    if (!tgt) return;
    const d = c.disp[u];
    if (!d || dist(d, tgt) > 300) c.disp[u] = { x: tgt.x, y: tgt.y };
    else { const k = Math.min(1, dt * 12); d.x += (tgt.x - d.x) * k; d.y += (tgt.y - d.y) * k; }
  });

  // 캐릭터 · 말풍선
  const chatAt = {};
  (state.chat || []).forEach((m) => {
    const k = `${m.u}:${m.at}`;
    if (!c.chatSeen[k]) c.chatSeen[k] = c.started && now - m.at < 8000 ? now : 1;
    if (now - c.chatSeen[k] < 6000) chatAt[m.u] = m.text;
  });
  c.started = true;
  const $chars = c.$('.sx-chars');
  state.order.forEach((u, i) => {
    let el = c.chars[u];
    if (!el || !el.isConnected) {
      el = document.createElement('div');
      el.className = 'am-ch sx-ch';
      el.innerHTML = '<span class="am-bub"></span><span class="am-svg"></span><span class="am-nm"></span>';
      $chars.appendChild(el);
      c.chars[u] = el;
    }
    const p = c.disp[u];
    const inEx = state.windows.some((w) => w && w.uid === u && w.st === 'in');
    el.style.display = p && !inEx ? '' : 'none';
    if (!p) return;
    el.style.left = `${(p.x / W) * 100}%`;
    el.style.top = `${(p.y / H) * 100}%`;
    el.style.zIndex = String(Math.round(p.y));
    const look = `${COLORS[i % COLORS.length]}|${players[u]?.photo || ''}`;
    if (el.dataset.look !== look) { el.dataset.look = look; el.querySelector('.am-svg').innerHTML = personHtml(COLORS[i % COLORS.length], players[u]); }
    const nm = players[u]?.name || '나간 사람';
    if (el.dataset.nm !== nm) { el.dataset.nm = nm; el.querySelector('.am-nm').textContent = nm; }
    el.classList.toggle('me', u === me);
    const bub = chatAt[u] ? esc(chatAt[u]) : '';
    const $b = el.querySelector('.am-bub');
    if ($b.dataset.v !== bub) { $b.dataset.v = bub; $b.innerHTML = bub; }
  });

  // 시계
  const tickLeft = state.phase === 'market' ? Math.max(0, state.nextAt - now) : 0;
  const frac = state.phase === 'market' ? state.tick + (1 - tickLeft / TICK_MS) : state.round === 1 && state.phase === 'info' ? 0 : state.tick;
  const mins = (state.phase === 'info' ? 0 : frac * 5);
  c.$('.sx-dial .m').style.transform = `rotate(${(mins / 60) * 360}deg)`;
  c.$('.sx-dial .h').style.transform = `rotate(${(((state.round - 1) + (state.phase === 'info' ? 0 : frac / TICKS)) / 12) * 360 + 30}deg)`;
  const tt = state.phase === 'done' ? '3:00' : state.phase === 'info' ? `${state.round}:00` : clockOf(state.round, state.tick);
  const $tm = c.$('.sx-time');
  if ($tm.textContent !== tt) $tm.textContent = tt;
  const nx = state.phase === 'market' ? `다음 변동까지 ${Math.ceil(tickLeft / 1000)}초` : state.phase === 'info' ? `시계 정지 · 정보 확인 ${Math.max(0, Math.ceil((state.deadline - now) / 1000))}초` : '장 마감';
  const $tk = c.$('.sx-tick');
  if ($tk.textContent !== nx) $tk.textContent = nx;
  c.$('.sx-next').textContent = state.phase === 'market' ? `⏱ ${Math.ceil(tickLeft / 1000)}초` : '';

  // 문 위 · 번호표 기계 표시
  const doorTxt = state.windows.map((w, i) => w ? `${w.st === 'call' ? '🔔' : '💱'}${w.no}번 ${esc(players[w.uid]?.name || '')}` : '').filter(Boolean).join(' · ') || '창구 비어 있음';
  const $di = c.$('.sx-door-in');
  if ($di.dataset.v !== doorTxt) { $di.dataset.v = doorTxt; $di.innerHTML = doorTxt; }
  c.$('.sx-door').classList.toggle('open', state.windows.some((w) => w && w.st === 'in'));
  c.$('.sx-door').classList.toggle('mine', wi >= 0 && state.windows[wi].st === 'call');
  const kio = state.phase === 'market' ? `다음 ${state.nextNo}번` : '';
  const $ki = c.$('.sx-kiosk-no');
  if ($ki.textContent !== kio) $ki.textContent = kio;

  // 상호작용 버튼
  const near = nearWhat();
  let label = '', hot = false;
  const myQ = state.queue.find((q) => q.uid === me);
  if (state.phase === 'market' && iAmIn) {
    if (near === 'door') { label = '거래소 입장!'; hot = true; }
    else if (near === 'kiosk') { label = wi >= 0 || myQ ? '이미 번호표가 있어요' : '번호표 뽑기'; hot = !(wi >= 0 || myQ); }
    else if (near === 'door-closed') label = '번호가 불리면 입장';
  }
  const $act = c.$('[data-act]');
  $act.classList.toggle('hot', hot);
  $act.classList.toggle('shake', now - c.shake < 300);
  const $al = $act.querySelector('small');
  if ($al.textContent !== label) $al.textContent = label;
  c.$('.sx-joy').classList.toggle('off', inside || state.phase === 'done');

  // 내 번호가 불리면 알림
  if (wi >= 0 && state.windows[wi].st === 'call') {
    const k = `${state.round}:${state.windows[wi].no}`;
    if (c.calledSeen !== k) { c.calledSeen = k; bigFlash(`🔔 ${state.windows[wi].no}번 고객님!<small>10초 안에 증권거래소 문으로 오세요</small>`, 2400, 'turn'); soundEvent(c.ctx.room?.code, `sx:call:${k}`, 'ok'); }
  }
  // 거래소 화면 남은 시간
  if (inside) {
    const left = Math.max(0, state.windows[wi].until - now);
    const $l = c.$('[data-stay]');
    if ($l) { $l.textContent = Math.ceil(left / 1000); $l.closest('.sx-ex-stay')?.classList.toggle('hurry', left < 5000); }
    const $nx = c.$('[data-exnext]');
    if ($nx) $nx.textContent = state.phase === 'market' ? `${clockOf(state.round, state.tick + 1)} 변동까지 ${Math.ceil(tickLeft / 1000)}초` : '';
  }
  // 가운데 안내
  let center = '';
  if (state.phase === 'info') center = `<b>${state.round}라운드 정보 확인</b><small>시계가 멈췄어요 · 아래 내 정보 카드를 확인하고 '확인'을 눌러 주세요</small>`;
  else if (state.phase === 'market' && state.tick === 0 && now < state.nextAt - TICK_MS + 2500) center = `<b>${state.round}라운드 개장!</b><small>번호표를 뽑고 거래소에서 사고팔아요</small>`;
  else if (state.phase === 'done') center = '<b>장 마감</b><small>모든 주식을 마지막 주가로 현금화했어요</small>';
  const $c = c.$('.sx-center');
  if ($c.dataset.v !== center) { $c.dataset.v = center; $c.innerHTML = center; $c.classList.toggle('on', !!center); }

  // 시간 진행 신호 (변동·창구 시간 초과·정보 확인 시간)
  const dues = [];
  if (state.phase === 'market') { dues.push(state.nextAt); state.windows.forEach((w) => w && dues.push(w.until)); }
  if (state.phase === 'info') dues.push(state.deadline);
  const due = dues.length ? Math.min(...dues) : 0;
  if (due && now > due + 300 + Math.max(0, state.order.indexOf(me)) * 250 && now - c.lastTick > 1500) {
    c.lastTick = now;
    sendMove({ type: 'tick' }, { silent: true });
  }
}

function spark(arr, color) {
  const pts = arr.slice(-25);
  if (pts.length < 2) return '';
  const mn = Math.min(...pts), mx = Math.max(...pts), span = mx - mn || 1;
  const d = pts.map((p, i) => `${(i / (pts.length - 1)) * 100},${28 - ((p - mn) / span) * 24}`).join(' ');
  return `<svg viewBox="0 0 100 30" preserveAspectRatio="none"><polyline points="${d}" fill="none" stroke="${color}" stroke-width="2.2" vector-effect="non-scaling-stroke"/></svg>`;
}
const chg = (s, c) => { const h = s.hist[c]; const d = h.length > 1 ? h[h.length - 1] - h[h.length - 2] : 0; return d; };
const arrow = (d) => (d > 0 ? `<em class="up">▲${d}</em>` : d < 0 ? `<em class="down">▼${-d}</em>` : '<em>-</em>');

function paint() {
  const { state, me, players, room, finished } = ctl.ctx;
  const nm = (u) => esc(players[u]?.name || '나간 사람');
  const iAmIn = state.order.includes(me);
  const wi = myWindow(state, me);
  const inside = wi >= 0 && state.windows[wi].st === 'in';
  ctl.$('.sx-round').innerHTML = `ROUND <b>${state.round}</b> / 2`;
  ctl.$('.sx-phase').textContent = { info: '정보 확인 · 시계 정지', market: '장 운영 중', done: '장 마감' }[state.phase] || '';
  ctl.root.classList.toggle('inside', inside);
  ctl.root.classList.toggle('done', state.phase === 'done' || !!finished);

  // 로비 전광판 (현재가)
  ctl.$('.sx-board').innerHTML = COMPANIES.map((co, c) => `<span style="--cc:${co.color}"><i>${co.emoji}</i><b>${co.name}</b><strong>${state.prices[c].toLocaleString()}</strong>${arrow(chg(state, c))}</span>`).join('');

  // 번호표 대기판
  const myQ = state.queue.find((q) => q.uid === me);
  ctl.$('.sx-queue').innerHTML = state.phase === 'market'
    ? `${state.windows.map((w, i) => `<div class="${w && w.uid === me ? 'me' : ''}"><small>창구${i + 1}</small>${w ? `<b>${w.no}</b>${nm(w.uid)}${w.st === 'call' ? ' 🔔' : ' 💱'}` : '<b>-</b>비어 있음'}</div>`).join('')}
       <div class="wait"><small>대기</small>${state.queue.length ? state.queue.map((q) => `<span class="${q.uid === me ? 'me' : ''}">${q.no}</span>`).join('') : '없음'}</div>
       ${myQ ? `<div class="mine">내 번호 <b>${myQ.no}</b> · 앞에 ${state.queue.indexOf(myQ)}명</div>` : ''}`
    : '';

  // 거래소 화면 (들어간 사람만)
  if (inside) {
    const holdSum = state.hold[me].reduce((a, b) => a + b, 0);
    ctl.$('.sx-exch').innerHTML = `
      <div class="sx-ex-head"><b>🏦 증권거래소 · 창구${wi + 1}</b><span class="sx-ex-stay">남은 시간 <b data-stay>20</b>초</span></div>
      <div class="sx-ex-clock">🕐 ${clockOf(state.round, state.tick)} · <span data-exnext></span></div>
      <div class="sx-ex-list">${COMPANIES.map((co, c) => {
        const left = state.stock[c], mine = state.hold[me][c], price = state.prices[c];
        const canBuy = left > 0 && mine < MAX_HOLD && state.cash[me] >= price;
        return `<div class="sx-ex-row" style="--cc:${co.color}">
          <div class="sx-ex-co"><i>${co.emoji}</i><b>${co.name}</b><small>남은 주식 ${left}주</small></div>
          <div class="sx-ex-spark">${spark(state.hist[c], co.color)}</div>
          <div class="sx-ex-price"><strong>${price.toLocaleString()}</strong>${arrow(chg(state, c))}</div>
          <div class="sx-ex-mine">보유 <b>${mine}</b>/${MAX_HOLD}</div>
          <div class="sx-ex-btns">
            <button class="buy" data-buy="${c}" ${canBuy ? '' : 'disabled'}>사기</button>
            <button class="sell" data-sell="${c}" ${mine ? '' : 'disabled'}>팔기</button>
            <button class="sell all" data-sellall="${c}" ${mine > 1 ? '' : 'disabled'}>전부</button>
          </div></div>`;
      }).join('')}</div>
      <div class="sx-ex-foot"><span>현금 <b>${won(state.cash[me])}</b> · 주식 ${holdSum}주 · 총자산 <b>${won(totalOf(state, me))}</b></span><button class="sx-ex-leave" data-exout>거래소 나가기</button></div>`;
  } else ctl.$('.sx-exch').innerHTML = '';

  // 아래 패널: 지갑 · 내 정보 카드 · 결과
  let html = '';
  if (state.phase === 'done' || finished) {
    const ranking = room?.result?.ranking || finalResult(state, players).ranking;
    html = `<div class="dm-title" style="color:var(--gold)">📈 최종 순위</div>
      <ol class="nb-final">${ranking.map((r) => `<li class="${r.uid === me ? 'me' : ''}">
        <span class="nb-place">${r.place <= 3 ? ['🥇', '🥈', '🥉'][r.place - 1] : r.place + '등'}</span>
        <span class="nb-name">${nm(r.uid)}<small class="ud-break">${COMPANIES.map((co, c) => state.hold[r.uid][c] ? `${co.emoji}${state.hold[r.uid][c]}` : '').join(' ') || '주식 없음'} + 현금 ${won(state.cash[r.uid])}</small></span>
        <span class="nb-score">${won(r.score)}</span>
        <span class="nb-reward">${r.garnets ? `${GARNET}+${r.garnets}` : ''}</span></li>`).join('')}</ol>
      ${state.history.map((h) => `<details class="sx-allinfo"><summary>${h.round}라운드 전체 정보 ${h.info.length}개 보기</summary>
        <div>${[...h.info].sort((a, b) => a.t - b.t || a.c - b.c).map((e) => `<span style="--cc:${COMPANIES[e.c].color}">${clockOf(h.round, e.t)} ${COMPANIES[e.c].emoji}${COMPANIES[e.c].name} <b class="${e.d > 0 ? 'up' : 'down'}">${e.d > 0 ? '+' : ''}${e.d}</b> <small>${e.pair.map(nm).join('·')}</small></span>`).join('')}</div></details>`).join('')}`;
  } else if (iAmIn) {
    const mine = state.info.filter((e) => e.pair.includes(me)).sort((a, b) => a.t - b.t);
    const holdTxt = COMPANIES.map((co, c) => state.hold[me][c] ? `${co.emoji}${co.name} ${state.hold[me][c]}주` : '').filter(Boolean).join(' · ') || '보유 주식 없음';
    html = `
      <div class="sx-wallet"><div><small>현금</small><b>${won(state.cash[me])}</b></div><div><small>보유 주식</small><span>${holdTxt}</span></div><div><small>총자산</small><b class="gold">${won(totalOf(state, me))}</b></div></div>
      <div class="sx-info"><div class="sx-info-t">🔒 ${state.round}라운드 내 정보 카드 ${mine.length}장 <small>다른 사람에게 말할지, 숨길지, 거짓말할지는 자유!</small></div>
        <div class="sx-cards">${mine.map((e) => {
          const co = COMPANIES[e.c], partner = e.pair.find((u) => u !== me);
          const past = state.phase === 'market' && e.t <= state.tick;
          return `<div class="sx-card ${past ? 'past' : ''}" style="--cc:${co.color}"><small>${clockOf(state.round, e.t)}</small><b>${co.emoji} ${co.name}</b><strong class="${e.d > 0 ? 'up' : 'down'}">${e.d > 0 ? '▲ +' : '▼ '}${e.d}</strong><em>${nm(partner)}님도 알아요</em></div>`;
        }).join('')}</div>
        ${state.phase === 'info' ? `<button class="sx-ok" data-infook ${state.ready[me] ? 'disabled' : ''}>${state.ready[me] ? `다른 사람 기다리는 중… (${Object.keys(state.ready).length}/${state.order.length})` : '확인했어요 →'}</button>` : ''}
      </div>
      ${state.notes.length && state.phase === 'market' ? `<div class="sx-notes">${state.notes.slice(-2).map((n) => `<span>📢 ${esc(n.text)}</span>`).join('')}</div>` : ''}`;
  }
  ctl.$('.sx-panel').innerHTML = html;
  ctl.$('.sx-log').innerHTML = (state.chat || []).slice(-30).map((m) => `<div><b style="color:${COLORS[state.order.indexOf(m.u) % COLORS.length]}">${nm(m.u)}</b> ${esc(m.text)}</div>`).join('');
  ctl.$('.sx-log').style.display = (state.chat || []).length ? '' : 'none';
  ctl.$('.sx-log').scrollTop = ctl.$('.sx-log').scrollHeight;
}

export default {
  id: 'stock',
  name: '폭풍의 증권시장',
  emoji: '📈',
  category: 'genius',
  minPlayers: 4,
  maxPlayers: 8,
  duration: '12~15분',
  ownChat: true,
  rewards: [5, 4, 4, 3, 2, 1],
  rewardLabel: '1등 최대 +5',
  description: '정보를 쥔 자가 시장을 지배한다! 번호표 뽑고 거래소로',
  rules: [
    `모두 현금 ${won(START_CASH)}으로 시작해요. 시장에는 ${COMPANIES.map((c) => c.emoji + c.name).join(', ')} 5개 회사 주식이 있고, 모두 주당 ${won(START_PRICE)}에서 시작해요. (회사마다 8명 기준 15주, 사람 수에 따라 달라져요)`,
    '게임은 2라운드예요. 1라운드는 게임 시각 1:00~2:00, 2라운드는 2:00~3:00이고, 게임 시각 5분(실제 20초)마다 주가가 바뀌어요.',
    '라운드 전에 주가 변동 정보(시각 · 회사 · 등락)가 사람 수 × 3개 준비돼요. 제비뽑기 순서로 이웃한 두 사람이 3개씩 함께 받아서, 각자 정보 6개를 알게 돼요. 정보는 모두 진짜예요!',
    '로비에서 자유롭게 돌아다니며 채팅해요. 정보를 나눌지, 숨길지, 거짓말할지는 자유예요.',
    '거래는 증권거래소에서만! 번호표 기계에서 번호표를 뽑고, 내 번호가 불리면 10초 안에 거래소 문으로 가서 입장해요 (늦으면 다음 번호로 넘어가요).',
    '거래소 창구는 2개, 한 번에 20초 동안 머물 수 있어요. 다시 거래하려면 번호표를 새로 뽑아요. 남은 주식 수는 거래소 안에서만 보여요.',
    `한 회사 주식은 최대 ${MAX_HOLD}주까지 가질 수 있고, 플레이어끼리 주식·돈은 주고받을 수 없어요. 다른 사람의 현금·주식은 비공개예요.`,
    '2라운드가 끝나면 보유 주식을 마지막 주가로 현금화해서, 현금이 많은 순서로 순위를 정해요.',
    '가넷: 4~5명 → 1등 3, 2등 2, 3등 1 / 6~8명 → 1등 5, 2등 4, 3등 4, 4등 3, 5등 2, 6등 1',
  ],

  setup(players, room) {
    const order = players.map((p) => p.uid);
    const n = order.length;
    const spawn = {};
    order.forEach((u, i) => { spawn[u] = { x: 230 + (i % 4) * 180, y: 470 + Math.floor(i / 4) * 110 }; });
    const base = {
      order, seats: shuffle(order), round: 1, phase: 'info', ready: {}, deadline: 0,
      prices: COMPANIES.map(() => START_PRICE), hist: COMPANIES.map(() => [START_PRICE]), stock: COMPANIES.map(() => supplyFor(n)),
      cash: Object.fromEntries(order.map((u) => [u, START_CASH])), hold: Object.fromEntries(order.map((u) => [u, COMPANIES.map(() => 0)])),
      tick: 0, nextAt: 0, queue: [], nextNo: 1, windows: Array(WINDOWS).fill(null), notes: [], info: [], history: [], chat: [], spawn,
    };
    return dealInfo(base, 1, Date.now());
  },

  move(state, move, uid, players) {
    const now = Date.now();
    const t = move?.type;
    if (t !== 'tick' && !state.order.includes(uid)) throw new Error('참가자가 아니에요');
    // 먼저 시간 흐름 반영
    const adv = advance(state, now, players);
    if (adv.result) return adv;
    let s = adv.state;

    if (t === 'tick') {
      if (s === state) throw new Error('__noop');
      return { state: s };
    }
    if (t === 'chat') {
      const text = String(move.text || '').trim().slice(0, 60);
      if (!text) throw new Error('__noop');
      return { state: { ...s, chat: [...(s.chat || []), { u: uid, text, at: now }].slice(-30) } };
    }
    if (t === 'ready') {
      if (s.phase !== 'info') throw new Error('__noop');
      const ready = { ...s.ready, [uid]: true };
      if (s.order.every((u) => ready[u])) return { state: startMarket({ ...s, ready }, now) };
      return { state: { ...s, ready } };
    }
    if (t === 'ticket') {
      if (s.phase !== 'market') throw new Error('지금은 번호표를 뽑을 수 없어요');
      if (s.queue.some((q) => q.uid === uid) || myWindow(s, uid) >= 0) throw new Error('이미 번호표가 있어요');
      const queue = [...s.queue, { uid, no: s.nextNo }];
      return advance({ ...s, queue, nextNo: s.nextNo + 1 }, now, players);
    }
    if (t === 'enter') {
      const wi = myWindow(s, uid);
      if (wi < 0 || s.windows[wi].st !== 'call') throw new Error('아직 내 번호가 불리지 않았어요');
      const windows = s.windows.map((w, i) => (i === wi ? { ...w, st: 'in', until: now + STAY_MS } : w));
      return { state: { ...s, windows } };
    }
    if (t === 'leave') {
      const wi = myWindow(s, uid);
      if (wi < 0) throw new Error('__noop');
      const windows = s.windows.map((w, i) => (i === wi ? null : w));
      return advance({ ...s, windows }, now, players);
    }
    if (t === 'trade') {
      if (s.phase !== 'market') throw new Error('장이 열려 있지 않아요');
      const wi = myWindow(s, uid);
      if (wi < 0 || s.windows[wi].st !== 'in') throw new Error('거래소 안에서만 사고팔 수 있어요');
      const c = Number(move.c);
      if (!(c >= 0 && c < COMPANIES.length)) throw new Error('__noop');
      const price = s.prices[c];
      const hold = { ...s.hold, [uid]: [...s.hold[uid]] };
      const stock = [...s.stock];
      const cash = { ...s.cash };
      let q = Math.trunc(Number(move.q) || 0);
      if (q > 0) {
        if (stock[c] < q) throw new Error('남은 주식이 없어요');
        if (hold[uid][c] + q > MAX_HOLD) throw new Error(`한 회사 주식은 최대 ${MAX_HOLD}주까지 가질 수 있어요`);
        if (cash[uid] < price * q) throw new Error('현금이 부족해요');
        stock[c] -= q; hold[uid][c] += q; cash[uid] -= price * q;
      } else if (q < 0) {
        q = Math.max(q, -hold[uid][c]);
        if (!q) throw new Error('팔 주식이 없어요');
        stock[c] -= q; hold[uid][c] += q; cash[uid] -= price * q;
      } else throw new Error('__noop');
      return { state: { ...s, stock, hold, cash } };
    }
    throw new Error('알 수 없는 동작이에요');
  },

  render(el, ctx) {
    const code = ctx.room?.code || 'local';
    if (!ctl || ctl.code !== code) {
      teardown();
      ctl = build(code);
      ctl.ctx = ctx;
      ctl.raf = requestAnimationFrame(frame);
      import('../backend/index.js').then(async ({ backend }) => {
        const c = ctl;
        if (!c || c.code !== code) return;
        const live = backend.live ? await backend.live(code) : null;
        if (!live) return;
        c.live = live;
        live.onLeave(ctx.me);
        c.unwatch = live.watch((all) => { c.others = all || {}; });
      });
    }
    ctl.ctx = ctx;
    if (typeof location !== 'undefined' && location.search.includes('test')) window.__sx = ctl; // 테스트 모드 점검용
    if (ctl.root.parentNode !== el) { el.innerHTML = ''; el.appendChild(ctl.root); }
    const { state, me, finished } = ctx;
    const sig = JSON.stringify([state.phase, state.round, state.tick, state.prices, state.stock, state.cash[me], state.hold[me], state.queue, state.windows, state.ready, (state.chat || []).length, state.notes.length, finished]);
    if (sig !== ctl.sig) { ctl.sig = sig; paint(); }
  },
};
