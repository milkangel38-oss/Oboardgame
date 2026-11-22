// 더 지니어스: 폭풍의 증권시장 (4~8명)
// 로비에서 자유롭게 돌아다니며 채팅·정보 거래 → 번호표를 뽑고, 내 번호가 불리면 '증권거래소' 문으로 들어가 20초 동안 사고팔기
// 주가는 게임 시각 5분(실제 20초)마다 바뀌고, 그 변동 정보는 라운드 전에 이웃끼리 3개씩 나눠 받아요 (각자 6개).
// 게임 상태(주가·지갑·번호표·창구)는 방 문서로, 캐릭터 위치는 실시간 채널(backend.live)로 주고받아요.
import { GARNET } from '../profile.js';
import { soundEvent } from '../sound.js';
import { walkerHtml } from './face.js';
const logo = (c) => `<img class="sx-logo" src="img/stock/co${c}.webp" alt="" draggable="false">`;
import { bigFlash } from './turn-alert.js';
import { ding } from '../sound.js';

import { CALL_MS, COMPANIES, DOOR, H, KIOSK, MAX_HOLD, NEAR, R, SEND_MS, SPEED, START_CASH, START_PRICE, STAY_MS, TALK, TICKS, TICK_MS, W, WINDOWS, XCALL_MS, XCHG, XSTAY_MS, advance, clockOf, dist, finalResult, freeEnvs, myWindow, rewardsFor, shuffle, supplyFor, totalOf, won } from './stock-core.js';
export { COMPANIES, rewardsFor, supplyFor, makeEvents, advance } from './stock-core.js';
import { dealing } from './server-deal.js';

const COLORS = ['#ff4f6e', '#3d7bff', '#3ddc84', '#ffb02e', '#b26bff', '#2ee6d6', '#ff8ad8', '#e8cf8a'];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// 공개 상태 + 내 비밀 → 화면용 상태 (내 지갑·받은 정보·내 대화·거래소 안에서만 남은 주식 수)
function view(pub, sec, me) {
  if (!sec || (sec.round != null && sec.round !== pub.round && pub.phase !== 'done')) sec = sec && pub.phase !== 'done' ? { ...sec, info: [], xchat: null, xpick: null, stock: null } : sec;
  if (!sec) return { ...pub, cash: { [me]: 0, ...(pub.cash || {}) }, hold: { [me]: COMPANIES.map(() => 0), ...(pub.hold || {}) }, info: pub.info || [], dms: {}, stock: pub.stock || COMPANIES.map(() => 0) }; // 내 비밀을 받기 전
  const cash = { ...(pub.cash || {}) }, hold = { ...(pub.hold || {}) };
  if (sec.cash != null) cash[me] = sec.cash;
  if (sec.hold) hold[me] = sec.hold;
  if (cash[me] == null) cash[me] = 0;
  if (!hold[me]) hold[me] = COMPANIES.map(() => 0);
  const fresh = pub.xchg && sec.xk === pub.xchg.k; // 지난 차례 대화·선택이 잠깐 보이지 않게
  const xchg = pub.xchg ? { ...pub.xchg, chat: fresh ? sec.xchat || [] : [], pick: fresh ? sec.xpick || {} : {} } : pub.xchg;
  return { ...pub, cash, hold, info: pub.phase === 'done' ? pub.info : sec.info || [], dms: sec.dms || {}, xchg, stock: sec.stock || pub.stock || COMPANIES.map(() => 0) };
}

// ── 화면 ──
let ctl = null;
function teardown() {
  if (!ctl) return;
  cancelAnimationFrame(ctl.raf);
  ctl.unwatch?.();
  ctl.live?.close?.(ctl.ctx.me);
  ctl.say?.remove();
  ctl.dm?.remove();
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
    <div class="sx-ticker"></div>
    <div class="sx-stage">
      <div class="sx-arena">
        <div class="sx-floor"></div>
        <div class="sx-door" style="left:${DOOR.x / 10}%;top:${DOOR.y / 7}%"><b>증권거래소</b><span class="sx-door-in"></span><i></i></div>
        <div class="sx-kiosk" style="left:${KIOSK.x / 10}%;top:${KIOSK.y / 7}%"><b>번호표</b><span class="sx-kiosk-no"></span></div>
        <div class="sx-xc" style="left:${XCHG.x / 10}%;top:${XCHG.y / 7}%"><b>정보교환소</b><i>📨</i><span class="sx-xc-in"></span></div>
        <div class="sx-clock"><div class="sx-dial"><i class="h"></i><i class="m"></i></div><b class="sx-time"></b><small class="sx-tick"></small></div>
        <div class="sx-chars"></div>
        <div class="sx-center"></div>
      </div>
      <div class="sx-exch"></div>
    </div>
    <div class="sx-queue"></div>
    <div class="sx-ctrl">
      <div class="am-joy sx-joy"><i></i></div>
      <div class="sx-btns"><button class="sx-talk" data-talk hidden>💬 대화하기<small></small></button>
      <button class="am-act sx-act" data-act><b>상호작용</b><small></small></button></div>
    </div>
    <div class="sx-hint">조이스틱(또는 방향키·WASD)으로 움직이고, 번호표 기계·거래소 문 앞에서 상호작용(스페이스)을 눌러요</div>
    <div class="sx-panel"></div>
    <div class="sx-log"></div>`;
  const say = document.createElement('form');
  say.className = 'am-say sx-say';
  say.innerHTML = '<input maxlength="60" placeholder="채팅 입력 (말풍선으로 떠요)" autocomplete="off" enterkeyhint="send" /><button>보내기</button>';
  document.body.appendChild(say);
  const dm = document.createElement('div');
  dm.className = 'sx-dm';
  dm.hidden = true;
  dm.innerHTML = '<div class="sx-dm-h"><b></b><button type="button" data-dmclose aria-label="닫기">✕</button></div><div class="sx-dm-log"></div><form><input maxlength="80" placeholder="둘만 보이는 비밀 대화" autocomplete="off" enterkeyhint="send" /><button>전송</button></form>';
  document.body.appendChild(dm);
  const c = {
    code, root, say, raf: 0, sig: '', exSig: '', $: (q) => root.querySelector(q),
    pos: null, posKey: '', disp: {}, others: {}, lastSend: 0, lastSent: '', joy: { x: 0, y: 0, id: null }, keys: new Set(),
    lastT: performance.now(), lastTick: 0, chars: {}, live: null, unwatch: null, gone: 0, chatSeen: {}, started: false, calledSeen: '', shake: 0, dm, dmWith: null, dmSeen: null, dmSig: '', near: null,
  };
  const moveJoy = (e) => {
    const r = c.joyEl.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2 - 14, len = Math.hypot(dx, dy);
    if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
    c.joy.x = dx / max; c.joy.y = dy / max;
    c.root.querySelector('.sx-joy i').style.transform = `translate(${dx}px, ${dy}px)`;
  };
  // 알림이 1초 이상 보인 뒤에 행동해야 닫혀요 (걷던 중에 뜬 알림이 바로 사라지지 않게)
  const seen = () => { if (c.centerKind && Date.now() - (c.centerShownAt || 0) > 1000) c.hideKind = c.centerKind; };
  c.$('.sx-arena').addEventListener('pointerdown', seen);
  c.$('.sx-joy').addEventListener('pointerdown', seen);
  c.$('.sx-joy').addEventListener('pointerdown', (e) => { c.joy.id = e.pointerId; c.joyEl = c.$('.sx-joy'); moveJoy(e); e.preventDefault(); });
  c.onPMove = (e) => { if (e.pointerId === c.joy.id) moveJoy(e); };
  c.onPUp = (e) => { if (e.pointerId !== c.joy.id) return; c.joy = { x: 0, y: 0, id: null }; c.root.querySelector('.sx-joy i').style.transform = ''; };
  c.onKey = (e) => {
    if (e.target.closest?.('input, textarea')) return;
    const k = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' }[e.code];
    if (k) { e.type === 'keydown' ? c.keys.add(k) : c.keys.delete(k); e.preventDefault(); if (e.type === 'keydown' && !e.repeat) seen(); }
    if (e.type === 'keydown' && (e.code === 'Space' || e.code === 'KeyE') && !e.repeat) { e.preventDefault(); interact(); }
  };
  window.addEventListener('pointermove', c.onPMove);
  window.addEventListener('pointerup', c.onPUp);
  window.addEventListener('pointercancel', c.onPUp);
  window.addEventListener('keydown', c.onKey);
  window.addEventListener('keyup', c.onKey);
  c.$('[data-act]').addEventListener('click', () => { seen(); interact(); });
  c.$('[data-talk]').addEventListener('click', () => { if (c.near) openDm(c.near, true); });
  dm.querySelector('[data-dmclose]').addEventListener('click', () => { c.dmWith = null; dm.hidden = true; });
  dm.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const $i = dm.querySelector('input');
    const text = $i.value.trim();
    if (!text || !c.dmWith) return;
    $i.value = '';
    c.ctx.sendMove({ type: 'dm', to: c.dmWith, text });
  });
  say.addEventListener('submit', (e) => {
    e.preventDefault();
    const $i = say.querySelector('input');
    const text = $i.value.trim();
    if (!text) return;
    $i.value = '';
    const st = c.ctx.state;
    const inXc = st.phase === 'info' && !!st.xchg?.in?.[c.ctx.me];
    c.ctx.sendMove({ type: inXc ? 'xchat' : 'chat', text });
  });
  // 거래소 버튼 · 정보 확인 버튼
  root.addEventListener('click', (e) => {
    if (e.target.closest('[data-xout]')) { c.ctx.sendMove({ type: 'xleave' }); return; }
    const ev = e.target.closest('[data-env]');
    if (ev && !ev.disabled) { c.ctx.sendMove({ type: 'xpick', env: Number(ev.dataset.env) }); return; }
    const b = e.target.closest('[data-buy],[data-sell],[data-sellall],[data-exout]');
    if (!b || b.disabled) return;
    const s = c.ctx.sendMove;
    if (b.dataset.buy != null) s({ type: 'trade', c: Number(b.dataset.buy), q: Number(b.dataset.q || 1) });
    else if (b.dataset.sell != null) s({ type: 'trade', c: Number(b.dataset.sell), q: -Number(b.dataset.q || 1) });
    else if (b.dataset.sellall != null) s({ type: 'trade', c: Number(b.dataset.sellall), q: -99 });
    else if (b.dataset.exout != null) s({ type: 'leave' });
  });
  return c;
}

const dmKey = (a, b) => [a, b].sort().join('|');
const seatNo = (s, u) => s.seats.indexOf(u) + 1;
function openDm(u, focus) {
  ctl.dmWith = u;
  ctl.dm.hidden = false;
  ctl.dmSig = '';
  paintDm();
  if (focus) setTimeout(() => ctl?.dm.querySelector('input').focus({ preventScroll: true }), 30);
}
function paintDm() {
  const c = ctl;
  if (!c.dmWith) return;
  const { state, me, players } = c.ctx;
  const msgs = state.dms?.[dmKey(me, c.dmWith)] || [];
  const sig = `${c.dmWith}:${msgs.length}`;
  if (sig === c.dmSig) return;
  c.dmSig = sig;
  c.dm.querySelector('.sx-dm-h b').textContent = `🔒 ${players[c.dmWith]?.name || ''}님과 비밀 대화`;
  const $l = c.dm.querySelector('.sx-dm-log');
  $l.innerHTML = msgs.length ? msgs.map((m) => `<div class="${m.u === me ? 'me' : ''}"><span>${esc(m.text)}</span></div>`).join('') : '<p>둘만 볼 수 있는 대화예요. 다른 사람에게는 보이지 않아요.</p>';
  $l.scrollTop = $l.scrollHeight;
}
// 새 비밀 대화가 오면 창을 열거나 알려 주기
function checkDms() {
  const c = ctl;
  const { state, me, players } = c.ctx;
  const mine = Object.entries(state.dms || {}).filter(([k]) => k.split('|').includes(me));
  if (!c.dmSeen) { c.dmSeen = Object.fromEntries(mine.map(([k, v]) => [k, v.length])); return; }
  mine.forEach(([k, v]) => {
    const prev = c.dmSeen[k] || 0;
    c.dmSeen[k] = v.length;
    if (v.length <= prev) return;
    const last = v[v.length - 1];
    if (last.u === me) return;
    if (!c.dmWith) openDm(last.u, false);
    else if (c.dmWith !== last.u) bigFlash(`💬 ${esc(players[last.u]?.name || '')}님의 비밀 대화<small>${esc(last.text)}</small>`, 2200, 'sx-note');
    soundEvent(c.ctx.room?.code, `sx:dm:${k}:${v.length}`, 'ok');
  });
  paintDm();
}

function nearWhat() {
  const { state, me } = ctl.ctx;
  if (state.phase === 'info' && state.xchg && ctl.pos && dist(ctl.pos, XCHG) < NEAR + 10) return state.xchg.pair.includes(me) && !state.xchg.in[me] ? 'xchg' : state.xchg.in[me] ? null : 'xchg-closed';
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
  const w = nearWhat();
  const nm0 = (u) => esc(ctl.ctx.players[u]?.name || '');
  if (w === 'xchg') { sendMove({ type: 'xenter' }); return; }
  if (w === 'xchg-closed') { const x = state.xchg; bigFlash(`📨 지금은 ${nm0(x.pair[0])}님 · ${nm0(x.pair[1])}님 차례예요<small>내 차례가 되면 알려 드릴게요</small>`, 1800, 'sx-note'); return; }
  if (state.phase !== 'market' || !state.order.includes(me)) { ctl.shake = Date.now(); return; }
  if (w === 'door') sendMove({ type: 'enter' });
  else if (w === 'kiosk') sendMove({ type: 'ticket' });
  else if (w === 'door-closed') {
    const inW = state.windows.find((x) => x && x.st === 'in' && x.uid !== me);
    const called = state.windows.find((x) => x && x.st === 'call' && x.uid !== me);
    const nm = (u) => esc(ctl.ctx.players[u]?.name || '');
    bigFlash(inW ? `🚪 ${nm(inW.uid)}님이 거래 중입니다<small>번호표를 뽑고 내 번호가 불릴 때까지 기다려 주세요</small>`
      : called ? `🚪 ${called.no}번 ${nm(called.uid)}님 입장 차례예요<small>번호표를 뽑고 기다려 주세요</small>`
      : '🎫 번호표를 먼저 뽑아 주세요<small>왼쪽 아래 번호표 기계에서 뽑을 수 있어요</small>', 1800, 'sx-note');
  } else ctl.shake = Date.now();
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
  const inXc = state.phase === 'info' && !!state.xchg?.in?.[me];
  const x = state.phase === 'info' ? state.xchg : null;
  const inside = (wi >= 0 && state.windows[wi].st === 'in') || inXc;
  c.say.style.display = iAmIn && state.phase !== 'done' ? '' : 'none';
  const $si = c.say.querySelector('input');
  const ph = inXc ? `🔒 ${players[state.xchg.pair.find((u) => u !== me)]?.name || ''}님과 정보교환소 대화 (둘만 보여요)` : '채팅 입력 (말풍선으로 떠요)';
  if ($si.placeholder !== ph) { $si.placeholder = ph; c.say.classList.toggle('xc', inXc); }

  if (!c.pos && state.spawn?.[me]) c.pos = { ...state.spawn[me] };
  // 이동 (거래소 안에서는 멈춤)
  if (iAmIn && c.pos && !inside && state.phase !== 'done') {
    let vx = c.joy.x + (c.keys.has('r') ? 1 : 0) - (c.keys.has('l') ? 1 : 0);
    let vy = c.joy.y + (c.keys.has('d') ? 1 : 0) - (c.keys.has('u') ? 1 : 0);
    const len = Math.hypot(vx, vy);
    if (len > 1) { vx /= len; vy /= len; }
    c.pos.x = Math.max(R, Math.min(W - R, c.pos.x + vx * SPEED * dt));
    c.pos.y = Math.max(DOOR.y + 62, Math.min(H - R, c.pos.y + vy * SPEED * dt));
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
    const inEx = state.windows.some((w) => w && w.uid === u && w.st === 'in') || (state.phase === 'info' && !!state.xchg?.in?.[u]);
    el.style.display = p && !inEx ? '' : 'none';
    if (!p) return;
    // 걷는 모션: 움직이면 다리·팔을 흔들고, 왼쪽으로 가면 몸을 돌려요
    const lp = c.lastP?.[u];
    c.lastP ||= {}; c.walkAt ||= {};
    if (lp) {
      const dx = p.x - lp.x, dy = p.y - lp.y;
      if (Math.abs(dx) + Math.abs(dy) > 0.6) { c.walkAt[u] = now; if (Math.abs(dx) > 0.3) el.classList.toggle('left', dx < 0); }
    }
    c.lastP[u] = { x: p.x, y: p.y };
    el.classList.toggle('walking', now - (c.walkAt[u] || 0) < 160);
    el.style.left = `${(p.x / W) * 100}%`;
    el.style.top = `${(p.y / H) * 100}%`;
    el.style.zIndex = String(Math.round(p.y));
    const look = `${COLORS[i % COLORS.length]}|${players[u]?.photo || ''}`;
    if (el.dataset.look !== look) { el.dataset.look = look; el.querySelector('.am-svg').innerHTML = walkerHtml(COLORS[i % COLORS.length], players[u]); }
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
  const nx = state.phase === 'market' ? `다음 변동까지 ${Math.ceil(tickLeft / 1000)}초` : state.phase === 'info' ? '시계 정지 · 정보교환 중' : '장 마감';
  const $tk = c.$('.sx-tick');
  if ($tk.textContent !== nx) $tk.textContent = nx;
  c.$('.sx-next').textContent = state.phase === 'market' ? `⏱ ${Math.ceil(tickLeft / 1000)}초` : '';

  // 문 위 · 번호표 기계 표시
  const doorTxt = state.windows.map((w) => w ? (w.st === 'call' ? `🔔 ${w.no}번 ${esc(players[w.uid]?.name || '')}님 호출 중` : `💱 ${esc(players[w.uid]?.name || '')}님이 거래 중입니다`) : '').filter(Boolean).join(' · ') || '비어 있음';
  const $di = c.$('.sx-door-in');
  if ($di.dataset.v !== doorTxt) { $di.dataset.v = doorTxt; $di.innerHTML = doorTxt; }
  c.$('.sx-door').classList.toggle('open', state.windows.some((w) => w && w.st === 'in'));
  c.$('.sx-door').classList.toggle('mine', wi >= 0 && state.windows[wi].st === 'call');
  const xcTxt = x ? `${x.pair.map((u) => `${esc(players[u]?.name || '')}${x.in[u] ? ' ✔' : ''}`).join('<br>')}` : '';
  const $xi = c.$('.sx-xc-in');
  if ($xi.dataset.v !== xcTxt) { $xi.dataset.v = xcTxt; $xi.innerHTML = xcTxt; }
  c.$('.sx-xc').classList.toggle('mine', !!(x && x.pair.includes(me) && !x.in[me]));
  c.$('.sx-xc').classList.toggle('on', !!x);
  const kio = state.phase === 'market' ? `다음 ${state.nextNo}번` : '';
  const $ki = c.$('.sx-kiosk-no');
  if ($ki.textContent !== kio) $ki.textContent = kio;

  // 상호작용 버튼
  const near = nearWhat();
  let label = '', hot = false;
  const myQ = state.queue.find((q) => q.uid === me);
  if (near === 'xchg') { label = '정보교환소 입장!'; hot = true; }
  else if (near === 'xchg-closed') label = '다른 사람 차례';
  if (state.phase === 'market' && iAmIn) {
    if (near === 'door') { label = '거래소 입장!'; hot = true; }
    else if (near === 'kiosk') { label = wi >= 0 || myQ ? '이미 번호표가 있어요' : '번호표 뽑기'; hot = !(wi >= 0 || myQ); }
    else if (near === 'door-closed') { const inW = state.windows.find((w) => w && w.st === 'in'); label = inW ? `${players[inW.uid]?.name || ''}님 거래 중` : '번호가 불리면 입장'; }
  }
  let nearU = null, nd = TALK;
  if (iAmIn && c.pos && !inside && state.phase !== 'done') state.order.forEach((u) => { if (u === me || !c.disp[u] || state.windows.some((w) => w && w.uid === u && w.st === 'in')) return; const d = dist(c.pos, c.disp[u]); if (d < nd) { nd = d; nearU = u; } });
  c.near = nearU;
  const $tb = c.$('[data-talk]');
  $tb.hidden = !nearU;
  if (nearU) { const t2 = players[nearU]?.name || ''; if ($tb.dataset.u !== nearU) { $tb.dataset.u = nearU; $tb.querySelector('small').textContent = t2; } }
  const $act = c.$('[data-act]');
  $act.classList.toggle('hot', hot);
  $act.classList.toggle('shake', now - c.shake < 300);
  const $al = $act.querySelector('small');
  if ($al.textContent !== label) $al.textContent = label;
  c.$('.sx-joy').classList.toggle('off', inside || state.phase === 'done');

  // 내 번호가 불리면 알림
  if (wi >= 0 && state.windows[wi].st === 'call') {
    const k = `${state.round}:${state.windows[wi].no}`;
    if (c.calledSeen !== k) { c.calledSeen = k; ding(); setTimeout(ding, 550); bigFlash(`<span class="sx-call-no">📢 ${state.windows[wi].no}번 고객님!!</span><b>지금 당장 증권거래소로 오세요!</b><small>${CALL_MS / 1000}초 안에 안 오면 다음 번호로 넘어가요</small>`, 3500, 'sx-call'); soundEvent(c.ctx.room?.code, `sx:call:${k}`, 'ok'); }
  }
  // 정보교환소 차례 알림 (띵동!)
  if (x && x.pair.includes(me) && !x.in[me]) {
    const k = `x:${state.round}:${x.k}`;
    if (c.calledSeen !== k) { c.calledSeen = k; ding(); setTimeout(ding, 550); bigFlash(`<span class="sx-call-no">📨 ${esc(players[me]?.name || '')}님 차례!!</span><b>정보교환소로 입장하세요!</b><small>${esc(players[x.pair.find((u) => u !== me)]?.name || '')}님과 함께 봉투 1개를 골라요</small>`, 3500, 'sx-call'); }
  }
  if (inXc) {
    const $xl = c.$('[data-xleft]');
    if ($xl) $xl.textContent = Math.max(0, Math.ceil(((x.until || x.callUntil) - now) / 1000));
  }
  // 거래소 화면 남은 시간
  if (inside && !inXc) {
    const left = Math.max(0, state.windows[wi].until - now);
    const $l = c.$('[data-stay]');
    if ($l) { $l.textContent = Math.ceil(left / 1000); $l.closest('.sx-ex-stay')?.classList.toggle('hurry', left < 5000); }
    const $nx = c.$('[data-exnext]');
    if ($nx) $nx.textContent = state.phase === 'market' ? `${clockOf(state.round, state.tick + 1)} 변동까지 ${Math.ceil(tickLeft / 1000)}초` : '';
  }
  // 가운데 안내
  let center = '', kind = '';
  if (wi >= 0 && state.windows[wi].st === 'call' && state.phase === 'market' && near !== 'door') kind = `call${state.windows[wi].no}`, center = `<b class="call">📢 ${state.windows[wi].no}번! 거래소로!</b><small>${Math.max(0, Math.ceil((state.windows[wi].until - now) / 1000))}초 안에 위쪽 증권거래소 문으로 가서 입장하세요</small>`;
  else if (state.phase === 'info' && x && x.pair.includes(me) && !x.in[me]) kind = `xme${x.k}`, center = `<b class="call">📨 ${esc(players[me]?.name || '')}님 차례! 정보교환소로!</b><small>왼쪽 정보교환소 앞에서 상호작용을 눌러 입장하세요</small>`;
  else if (state.phase === 'info' && x) kind = `x${x.k}`, center = `<b>📨 정보교환 ${x.k + 1} / ${state.order.length}</b><small>${esc(players[x.pair[0]]?.name || '')}님 · ${esc(players[x.pair[1]]?.name || '')}님 차례예요. 정보교환소로 입장해 주세요</small>`;
  else if (state.phase === 'market' && state.tick === 0 && now < state.nextAt - TICK_MS + 3000) kind = `open${state.round}`, center = `<b>${state.round}라운드 개장!</b><small>번호표를 뽑고 거래소에서 사고팔아요</small>`;
  else if (state.phase === 'done') center = '<b>장 마감</b><small>모든 주식을 마지막 주가로 현금화했어요</small>';
  // 알림을 본 뒤 내가 움직이거나 버튼을 누르면 바로 사라져요 (같은 알림은 다시 안 떠요)
  if (kind !== c.centerKind) c.centerShownAt = Date.now();
  c.centerKind = kind;
  if (kind && c.hideKind === kind && state.phase !== 'done') center = '';
  const $c = c.$('.sx-center');
  if ($c.dataset.v !== center) { $c.dataset.v = center; $c.innerHTML = center; $c.classList.toggle('on', !!center); }

  // 시간 진행 신호 (변동·창구 시간 초과·정보 확인 시간)
  const dues = [];
  if (state.phase === 'market') { dues.push(state.nextAt); state.windows.forEach((w) => w && dues.push(w.until)); }
  if (state.phase === 'info' && state.xchg && state.xchg.hard) dues.push(state.xchg.until || state.xchg.callUntil);
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
  ctl.root.classList.toggle('inside', inside || !!(state.phase === 'info' && state.xchg?.in?.[me]));
  ctl.root.classList.toggle('done', state.phase === 'done' || !!finished);

  // 로비 전광판 (현재가)
  ctl.$('.sx-ticker').innerHTML = COMPANIES.map((co, c) => `<div style="--cc:${co.color}"><b><i>${logo(c)}</i>${co.name}</b><strong>${state.prices[c].toLocaleString()}</strong>${arrow(chg(state, c))}</div>`).join('');

  // 번호표 대기판
  const myQ = state.queue.find((q) => q.uid === me);
  ctl.$('.sx-queue').innerHTML = state.phase === 'market'
    ? `${state.windows.map((w, i) => `<div class="${w && w.uid === me ? 'me' : ''}"><small>창구${i + 1}</small>${w ? `<b>${w.no}</b>${nm(w.uid)}${w.st === 'call' ? ' 🔔' : ' 💱'}` : '<b>-</b>비어 있음'}</div>`).join('')}
       <div class="wait"><small>대기</small>${state.queue.length ? state.queue.map((q) => `<span class="${q.uid === me ? 'me' : ''}">${q.no}</span>`).join('') : '없음'}</div>
       ${myQ ? `<div class="mine">내 번호 <b>${myQ.no}</b> · 앞에 ${state.queue.indexOf(myQ)}명</div>` : ''}`
    : '';

  // 정보교환소 화면 (차례인 두 사람만)
  const x = state.phase === 'info' ? state.xchg : null;
  if (x && x.in[me]) {
    const partner = x.pair.find((u) => u !== me);
    const both = !!x.until;
    ctl.root.classList.add('inside');
    ctl.$('.sx-exch').innerHTML = `
      <div class="sx-ex-head"><b>📨 정보교환소</b><span class="sx-ex-stay">${both ? '시간 제한 없음' : '기다리는 중…'}</span></div>
      <div class="sx-xc-guide">${both
        ? `<b>${nm(partner)}님과 의논해서 봉투 1개를 골라요.</b> 둘이 <u>같은 봉투</u>를 누르면 그 봉투의 정보 3장을 함께 받아요. 천천히 의논해도 괜찮아요.`
        : `<b>${nm(partner)}님이 들어오길 기다리는 중…</b> 둘 다 들어오면 봉투를 고를 수 있어요.`}</div>
      <div class="sx-envs">${Array.from({ length: state.order.length }, (_, i) => i).map((i) => {
        const taken = state.taken.includes(i);
        const mineP = x.pick[me] === i, theirs = x.pick[partner] === i;
        return `<button class="sx-env ${taken ? 'taken' : ''} ${mineP ? 'mine' : ''} ${theirs ? 'theirs' : ''}" data-env="${i}" ${taken || !both ? 'disabled' : ''}>
          <span class="sx-env-i">✉️</span><b>봉투 ${i + 1}</b><small>${taken ? '가져감' : mineP && theirs ? '둘 다 선택!' : mineP ? '내 선택' : theirs ? `${nm(partner)}님 선택` : '정보 3장'}</small></button>`;
      }).join('')}</div>
      <div class="sx-xc-chat">
        <div class="sx-xc-chat-t">🔒 ${nm(partner)}님과 둘만의 대화방 <small>아래 채팅창에 쓰면 여기로 와요 · 한 명이 나가면 대화가 사라져요</small></div>
        <div class="sx-xc-log">${(x.chat || []).length ? x.chat.map((m) => `<div class="${m.u === me ? 'me' : ''}"><span>${esc(m.text)}</span></div>`).join('') : `<p>${both ? '어떤 봉투를 고를지, 정보를 어떻게 나눌지 이야기해 보세요' : `${nm(partner)}님이 들어오면 대화할 수 있어요`}</p>`}</div>
        <button class="sx-ex-leave" data-xout>정보교환소 나가기</button>
      </div>`;
    const $xl = ctl.$('.sx-xc-log');
    $xl.scrollTop = $xl.scrollHeight;
  } else
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
          <div class="sx-ex-co">${logo(c)}<b>${co.name}</b><small>남은 주식 ${left}주</small></div>
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
        <span class="nb-name">${nm(r.uid)}<small class="ud-break">${COMPANIES.map((co, c) => state.hold[r.uid][c] ? `${logo(c)}${state.hold[r.uid][c]}` : '').join(' ') || '주식 없음'} + 현금 ${won(state.cash[r.uid])}</small></span>
        <span class="nb-score">${won(r.score)}</span>
        <span class="nb-reward">${r.garnets ? `${GARNET}+${r.garnets}` : ''}</span></li>`).join('')}</ol>
      ${state.history.map((h) => `<details class="sx-allinfo"><summary>${h.round}라운드 전체 정보 ${h.info.length}개 보기</summary>
        <div>${[...h.info].sort((a, b) => a.t - b.t || a.c - b.c).map((e) => `<span style="--cc:${COMPANIES[e.c].color}">${clockOf(h.round, e.t)} ${logo(e.c)}${COMPANIES[e.c].name} <b class="${e.d > 0 ? 'up' : 'down'}">${e.d > 0 ? '+' : ''}${e.d}</b> <small>${e.pair.map(nm).join('·')}</small></span>`).join('')}</div></details>`).join('')}`;
  } else if (iAmIn) {
    const mine = state.info.filter((e) => e.pair && e.pair.includes(me)).sort((a, b) => a.t - b.t);
    const n = state.order.length;
    const order = state.phase === 'info' && state.xchg ? `<div class="sx-xorder"><div class="sx-info-t">📨 정보교환 순서 <small>내 순서는 <b>${seatNo(state, me)}번</b> · 두 명씩 차례로 정보교환소에 들어가 봉투를 골라요</small></div>
      <ol>${Array.from({ length: n }, (_, k) => [state.seats[k], state.seats[(k + 1) % n]]).map((pr, k) => `<li class="${k < state.xchg.k ? 'done' : k === state.xchg.k ? 'now' : ''} ${pr.includes(me) ? 'me' : ''}">${k < state.xchg.k ? '✔' : k === state.xchg.k ? '▶ 지금' : `${k + 1}차`} · ${pr.map((u) => `${seatNo(state, u)}번 ${nm(u)}`).join(' + ')}</li>`).join('')}</ol></div>` : '';
    const holdTxt = COMPANIES.map((co, c) => state.hold[me][c] ? `${logo(c)}${co.name} ${state.hold[me][c]}주` : '').filter(Boolean).join(' · ') || '보유 주식 없음';
    html = `
      <div class="sx-wallet"><div><small>현금</small><b>${won(state.cash[me])}</b></div><div><small>보유 주식</small><span>${holdTxt}</span></div><div><small>총자산</small><b class="gold">${won(totalOf(state, me))}</b></div></div>
      ${order}
      <div class="sx-info"><div class="sx-info-t">🔒 ${state.round}라운드 내 정보 카드 ${mine.length}장 <small>${mine.length ? '다른 사람에게 말할지, 숨길지, 거짓말할지는 자유!' : '정보교환소에서 봉투를 고르면 여기에 저장돼요'}</small></div>
        <div class="sx-cards">${mine.map((e) => {
          const co = COMPANIES[e.c], partner = e.pair.find((u) => u !== me);
          const past = state.phase === 'market' && e.t <= state.tick;
          return `<div class="sx-card ${past ? 'past' : ''}" style="--cc:${co.color}"><small>${clockOf(state.round, e.t)}</small><b>${logo(e.c)} ${co.name}</b><strong class="${e.d > 0 ? 'up' : 'down'}">${e.d > 0 ? '▲ +' : '▼ '}${e.d}</strong><em>${nm(partner)}님도 알아요</em></div>`;
        }).join('')}</div>
      </div>
      ${state.notes.length ? `<div class="sx-notes">${state.notes.slice(-2).map((n) => `<span>📢 ${esc(n.text)}</span>`).join('')}</div>` : ''}`;
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
  duration: '25~35분',
  ownChat: true,
  rewards: [5, 4, 4, 3, 2, 1],
  rewardLabel: '1등 최대 +5',
  description: '정보를 쥔 자가 시장을 지배한다! 번호표 뽑고 거래소로',
  rules: [
    `모두 현금 ${won(START_CASH)}으로 시작해요. 시장에는 ${COMPANIES.map((c) => c.emoji + c.name).join(', ')} 5개 회사 주식이 있고, 모두 주당 ${won(START_PRICE)}에서 시작해요. (회사마다 8명 기준 15주, 사람 수에 따라 달라져요)`,
    '게임은 2라운드예요. 1라운드는 게임 시각 1:00~2:00, 2라운드는 2:00~3:00이고, 게임 시각 5분(실제 1분)마다 주가가 바뀌어요.',
    '라운드 전 시계가 멈춘 동안 정보교환을 해요. 처음에 무작위로 순서를 정하고, 1·2번 → 2·3번 → 3·4번 … → 마지막 번호·1번 순서로 두 명씩 정보교환소에 들어가요.',
    '정보교환소에는 주가 변동 정보(시각 · 회사 · 등락) 3장씩 든 봉투가 놓여 있어요. 둘이 의논해서 같은 봉투를 고르면 그 정보 3장을 함께 받아요 (시간 제한 없음). 그래서 각자 정보 6장을 갖게 돼요. 정보는 모두 진짜예요!',
    '로비에서 자유롭게 돌아다니며 채팅해요. 다른 사람 옆에 가서 💬 대화하기를 누르면 둘만의 비밀 대화를 할 수 있어요. 정보를 나눌지, 숨길지, 거짓말할지는 자유예요.',
    '거래는 증권거래소에서만! 번호표 기계에서 번호표를 뽑고, 내 번호가 불리면 10초 안에 거래소 문으로 가서 입장해요 (늦으면 다음 번호로 넘어가요).',
    '거래소 창구는 1개라 한 번에 한 명만 들어가고, 30초 동안 머물 수 있어요. 다시 거래하려면 번호표를 새로 뽑아요. 남은 주식 수는 거래소 안에서만 보여요.',
    `한 회사 주식은 최대 ${MAX_HOLD}주까지 가질 수 있고, 플레이어끼리 주식·돈은 주고받을 수 없어요. 다른 사람의 현금·주식은 비공개예요.`,
    '2라운드가 끝나면 보유 주식을 마지막 주가로 현금화해서, 현금이 많은 순서로 순위를 정해요.',
    '가넷: 4~5명 → 1등 3, 2등 2, 3등 1 / 6~8명 → 1등 5, 2등 4, 3등 4, 4등 3, 5등 2, 6등 1',
  ],

  // 정보·지갑·남은 주식·대화는 서버가 맡아요 (방 문서엔 공개 정보만, 내 것은 secret으로 받아요)
  serverMoves: true,
  setup(players) {
    return { phase: 'deal', order: players.map((p) => p.uid) };
  },
  move() { throw new Error('폭풍의 증권시장은 서버가 진행해요'); },

  render(el, ctx0) {
    if (ctx0.state.phase === 'deal') { teardown(); dealing(el, ctx0, '📈 시장을 여는 중…'); return; }
    const ctx = { ...ctx0, state: view(ctx0.state, ctx0.secret, ctx0.me) };
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
    checkDms();
    const g = state.lastGot;
    if (g && g.pair.includes(me) && ctl.gotSeen !== `${state.round}:${g.env}`) {
      const first = ctl.gotSeen === undefined;
      ctl.gotSeen = `${state.round}:${g.env}`;
      if (!first && Date.now() - g.at < 8000) bigFlash(`✉️ 봉투 ${g.env + 1}번을 열었어요!<small>정보 3장이 내 정보 카드에 저장됐어요</small>`, 2400, 'sx-note');
    }
    const sig = JSON.stringify([state.info.length, ctx0.secret?.nonce, ctx0.secret?.round, state.xchg, state.taken, state.phase, state.round, state.tick, state.prices, state.stock, state.cash[me], state.hold[me], state.queue, state.windows, state.ready, (state.chat || []).length, state.notes.length, finished]);
    if (sig !== ctl.sig) { ctl.sig = sig; paint(); }
  },
};
