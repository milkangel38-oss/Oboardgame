// 예능: 자객 마피아 (6~8명) — 실시간 이동 + 암전 + 마피아 미션 + 시체발견 회의 투표
// 차례·투표·점수 같은 "게임 상태"는 방 문서(sendMove)로, 캐릭터 위치는 실시간 채널(backend.live)로 주고받아요.
import { GARNET } from '../profile.js';
import { soundEvent } from '../sound.js';
import { personHtml } from './face.js';

import { W, H, R, MEET, SPEED, SLOW, SLOW_MS, INTRO_MS, HUNT_MS, VOTE_MS, RUNOFF_MS, KILL_CD, SEND_MS, REWARDS, dist, missionText, finalResult } from './assassin-core.js';
export { REWARDS, missionText } from './assassin-core.js';
import { dealing } from './server-deal.js';

const COLORS = ['#ff4f6e', '#3d7bff', '#3ddc84', '#ffb02e', '#b26bff', '#2ee6d6', '#ff8ad8', '#e8cf8a'];
// 공개 상태 + 내 비밀 → 화면용 상태 (마피아 본인만 마피아·미션·쓰러진 사람을, 공격받은 사람은 자기만 알아요)
function view(pub, sec, me) {
  if (!sec) return pub;
  const dead = { ...(pub.dead || {}), ...(sec.dead || {}) };
  if (sec.deadMe) dead[me] = sec.deadMe;
  return { ...pub, mafia: sec.mafia ? me : pub.mafia ?? null, mission: sec.mission || pub.mission || null, dead, lastKill: sec.lastKill || pub.lastKill || 0 };
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ── 캐릭터 그림 (오리지널: 두건 쓴 꼬마 자객) ──
export const charSvg = (color, dead = false) => `<svg viewBox="0 0 60 72" aria-hidden="true">
  <ellipse cx="30" cy="68" rx="18" ry="4" fill="rgba(0,0,0,.35)"/>
  <path d="M11 66 Q11 36 30 36 Q49 36 49 66 Z" fill="${dead ? '#6b6f7a' : color}"/>
  <path d="M22 44 L30 52 L38 44" stroke="rgba(0,0,0,.25)" stroke-width="3" fill="none"/>
  <circle cx="30" cy="25" r="16" fill="${dead ? '#b9bcc4' : '#ffe0bd'}"/>
  <path d="M13 27 Q12 6 30 6 Q48 6 47 27 Q44 15 30 15 Q16 15 13 27Z" fill="${dead ? '#55596a' : color}"/>
  <path d="M15 24 Q30 30 45 24 L45 20 Q30 26 15 20Z" fill="rgba(0,0,0,.28)"/>
  ${dead ? '<path d="M21 22 l6 6 M27 22 l-6 6 M33 22 l6 6 M39 22 l-6 6" stroke="#2a2030" stroke-width="2.4"/>'
    : '<circle cx="24" cy="25" r="2.6" fill="#2a2030"/><circle cx="36" cy="25" r="2.6" fill="#2a2030"/><path d="M26 32 Q30 34 34 32" stroke="#c46a5a" stroke-width="1.6" fill="none"/>'}
</svg>`;

// ── 화면 컨트롤러 (방 문서가 바뀔 때마다 render가 다시 불려도, 조이스틱·이동은 끊기지 않게 한 번만 만들어요) ──
let ctl = null;

function teardown() {
  if (!ctl) return;
  cancelAnimationFrame(ctl.raf);
  ctl.unwatch?.();
  ctl.live?.close?.(ctl.ctx.me);
  ctl.say?.remove();
  window.removeEventListener('keydown', ctl.onKey);
  window.removeEventListener('keyup', ctl.onKey);
  window.removeEventListener('pointermove', ctl.onPMove);
  window.removeEventListener('pointerup', ctl.onPUp);
  window.removeEventListener('pointercancel', ctl.onPUp);
  ctl = null;
}

function build(code) {
  const root = document.createElement('div');
  root.className = 'am';
  root.innerHTML = `
    <div class="am-top"><span class="am-round"></span><span class="am-phase"></span><span class="am-timer"></span></div>
    <div class="am-chips"></div>
    <div class="am-arena">
      <div class="am-floor"></div>
      <div class="am-layer am-under"></div>
      <div class="am-dark"></div>
      <div class="am-layer am-over"></div>
      <div class="am-center"></div>
    </div>
    <div class="am-mission"></div>
    <div class="am-ctrl">
      <div class="am-joy"><i></i></div>
      <div class="am-btns">
        <button class="am-act" data-act><b>상호작용</b><small></small></button>
        <div class="am-row">
          <button class="am-b" data-readyb>준비</button>
          <button class="am-b" data-pick>마피아 선택</button>
        </div>
      </div>
    </div>
    <div class="am-hint">조이스틱(또는 방향키·WASD)으로 움직이고, 상호작용 버튼(또는 스페이스)을 눌러요</div>
    <div class="am-chat"><div class="am-log"></div></div>
    <div class="am-panel"></div>`;
  const say = document.createElement('form');
  say.className = 'am-say';
  say.innerHTML = '<input maxlength="60" placeholder="채팅 입력" autocomplete="off" enterkeyhint="send" /><button>보내기</button>';
  document.body.appendChild(say);
  const c = {
    code, root, raf: 0, sig: '',
    $: (q) => root.querySelector(q),
    pos: null, posRound: -1, posPhase: '', disp: {}, others: {}, lastSend: 0, lastSent: '',
    enter: {}, joy: { x: 0, y: 0, id: null }, keys: new Set(), lastTick: 0, lastT: performance.now(),
    chars: {}, live: null, unwatch: null, notice: null, gone: 0, shake: 0, say, chatSeen: {},
  };
  // 조이스틱 (창 전체에서 손가락을 따라가요 → 화면이 다시 그려져도 끊기지 않음)
  const $joy = c.$('.am-joy'), $knob = $joy.querySelector('i');
  $joy.addEventListener('pointerdown', (e) => { c.joy.id = e.pointerId; c.joyEl = $joy; moveJoy(e); e.preventDefault(); });
  const moveJoy = (e) => {
    const r = c.joyEl.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2 - 14, len = Math.hypot(dx, dy);
    if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
    c.joy.x = dx / max; c.joy.y = dy / max;
    c.root.querySelector('.am-joy i').style.transform = `translate(${dx}px, ${dy}px)`;
  };
  c.onPMove = (e) => { if (e.pointerId === c.joy.id) moveJoy(e); };
  c.onPUp = (e) => {
    if (e.pointerId !== c.joy.id) return;
    c.joy = { x: 0, y: 0, id: null };
    c.root.querySelector('.am-joy i').style.transform = '';
  };
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
  c.$('[data-readyb]').addEventListener('click', () => {
    const { state, me } = c.ctx;
    if (state.phase === 'lobby') c.ctx.sendMove({ type: 'ready', on: !state.ready[me] });
  });
  c.$('[data-pick]').addEventListener('click', () => c.ctx.sendMove({ type: 'pickMafia' }));
  say.addEventListener('submit', (e) => {
    e.preventDefault();
    const $i = say.querySelector('input');
    const text = $i.value.trim();
    if (!text) return;
    $i.value = '';
    c.ctx.sendMove({ type: 'chat', text });
  });
  c.$('.am-panel').addEventListener('click', (e) => {
    const v = e.target.closest('[data-vote]');
    if (v && !v.disabled) c.ctx.sendMove({ type: 'vote', target: v.dataset.vote });
    const a = e.target.closest('[data-advise]');
    if (a && !a.disabled) c.ctx.sendMove({ type: 'advise', target: a.dataset.advise });
    if (e.target.closest('[data-next]')) c.ctx.sendMove({ type: 'next' });
  });
  return c;
}

// 지금 내 주변 상황 (만남 판정)
function surroundings(now) {
  const { state, me, players } = ctl.ctx;
  const out = { slow: false, icon: '', target: null, body: null, near: [] };
  if (state.phase !== 'hunt' || state.dead[me] || !ctl.pos) return out;
  const mine = ctl.pos;
  const seen = new Set();
  const touch = (key) => { seen.add(key); if (!ctl.enter[key]) ctl.enter[key] = now; return now - ctl.enter[key] < SLOW_MS; };
  const alive = state.order.filter((u) => u !== me && !state.dead[u] && ctl.disp[u]);
  if (me === state.mafia) {
    let best = null;
    alive.forEach((u) => {
      const d = dist(mine, ctl.disp[u]);
      if (d < MEET) { if (touch('m:' + u)) out.slow = true; if (!best || d < best.d) best = { u, d }; }
    });
    if (best) { out.target = best.u; out.icon = `🗡 ${esc(players[best.u]?.name || '')}`; }
  } else {
    // 시민은 마피아가 누군지, 누가 쓰러졌는지 몰라요 → 누구와 닿아도 똑같이 ✋ + 잠깐 느려짐
    let best = null;
    alive.forEach((u) => {
      const d = dist(mine, ctl.disp[u]);
      if (d >= MEET) return;
      if (touch('t:' + u)) out.slow = true;
      out.icon = '✋';
      if (!best || d < best.d) best = { u, d };
    });
    if (best) out.body = best.u; // 상호작용 → 서버가 쓰러진 사람인지 확인 (맞으면 시체발견!)
  }
  Object.keys(ctl.enter).forEach((k) => { if (!seen.has(k)) delete ctl.enter[k]; });
  return out;
}

function interact() {
  if (!ctl) return;
  const { state, me, sendMove } = ctl.ctx;
  const now = Date.now();
  if (state.phase !== 'hunt' || state.dead[me] || now < state.mafiaAt + INTRO_MS) { ctl.shake = now; return; }
  const s = surroundings(performance.now());
  if (me === state.mafia) {
    if (!s.target) { ctl.shake = now; return; }
    if (now - (state.lastKill || 0) < KILL_CD) { ctl.shake = now; return; }
    const p = ctl.disp[s.target];
    sendMove({ type: 'kill', target: s.target, x: Math.round(p.x), y: Math.round(p.y) });
  } else if (s.body) {
    sendMove({ type: 'shout', body: s.body }, { silent: true, onError: () => { ctl.shake = Date.now(); } }); // 쓰러진 사람이 아니면 흔들림
  } else ctl.shake = now;
}

function canMove(state, me, now) {
  if (state.dead?.[me]) return false;
  if (state.phase === 'lobby') return true;
  return state.phase === 'hunt' && now >= state.mafiaAt + INTRO_MS;
}

function frame() {
  if (!ctl) return;
  ctl.raf = requestAnimationFrame(frame);
  const c = ctl;
  if (!c.root.isConnected) {
    if (!c.gone) c.gone = Date.now(); else if (Date.now() - c.gone > 4000) { teardown(); return; }
    if (Date.now() - c.gone > 600) c.say.style.display = 'none'; // 방을 나간 경우
    return;
  }
  c.gone = 0;
  const { state, me, players, room, sendMove } = c.ctx;
  const now = Date.now(), t = performance.now();
  const dt = Math.min(0.05, (t - c.lastT) / 1000);
  c.lastT = t;
  const isMafia = me === state.mafia;
  const iAmIn = state.order.includes(me);

  // 라운드가 바뀌면 처음 위치로
  if (c.posRound !== state.round && state.spawn?.[me]) { c.pos = { ...state.spawn[me] }; c.posRound = state.round; c.lastSent = ''; }
  if (state.dead?.[me]) c.pos = { ...state.dead[me] };

  // 이동
  const sur = surroundings(t);
  if (iAmIn && c.pos && canMove(state, me, now)) {
    let vx = c.joy.x + (c.keys.has('r') ? 1 : 0) - (c.keys.has('l') ? 1 : 0);
    let vy = c.joy.y + (c.keys.has('d') ? 1 : 0) - (c.keys.has('u') ? 1 : 0);
    const len = Math.hypot(vx, vy);
    if (len > 1) { vx /= len; vy /= len; }
    const sp = SPEED * (sur.slow ? SLOW : 1);
    c.pos.x = Math.max(R, Math.min(W - R, c.pos.x + vx * sp * dt));
    c.pos.y = Math.max(R + 10, Math.min(H - R, c.pos.y + vy * sp * dt));
  }
  // 위치 보내기
  if (iAmIn && c.pos && c.live) {
    const key = `${Math.round(c.pos.x)},${Math.round(c.pos.y)}`;
    if ((key !== c.lastSent && t - c.lastSend > SEND_MS) || t - c.lastSend > 1500) {
      c.lastSend = t; c.lastSent = key;
      c.live.send(me, { x: Math.round(c.pos.x), y: Math.round(c.pos.y), r: state.round });
    }
  }
  // 다른 사람 위치 (부드럽게 따라가기)
  state.order.forEach((u) => {
    if (u === me) { if (c.pos) c.disp[u] = { ...c.pos }; return; }
    const tgt = state.dead?.[u] || (c.others[u]?.r === state.round ? c.others[u] : state.spawn?.[u]);
    if (!tgt) return;
    const d = c.disp[u];
    if (!d || dist(d, tgt) > 250) c.disp[u] = { x: tgt.x, y: tgt.y };
    else { const k = Math.min(1, dt * 12); d.x += (tgt.x - d.x) * k; d.y += (tgt.y - d.y) * k; }
  });

  // 그리기
  const dark = state.phase === 'dark' || state.phase === 'hunt';
  const $under = c.$('.am-under'), $over = c.$('.am-over');
  c.$('.am-dark').classList.toggle('on', dark);
  const chatAt = {};
  (state.chat || []).forEach((m) => {
    const k = `${m.u}:${m.at}`;
    if (!c.chatSeen[k]) c.chatSeen[k] = c.started && now - m.at < 8000 ? now : 1; // 처음 들어왔을 때 옛 채팅은 말풍선 X
    if (now - c.chatSeen[k] < 6000) chatAt[m.u] = m.text;
  });
  c.started = true;
  state.order.forEach((u, i) => {
    let el = c.chars[u];
    if (!el || !el.isConnected) {
      el = document.createElement('div');
      el.className = 'am-ch';
      el.innerHTML = `<span class="am-fx"></span><span class="am-bub"></span><span class="am-svg"></span><span class="am-nm"></span>`;
      c.chars[u] = el;
    }
    const p = c.disp[u];
    const dead = !!state.dead?.[u];
    // 암전 중 보이는 것: 나 자신, (마피아에게만) 해골
    const visible = !dark || u === me || (dead && isMafia);
    const layer = dark ? $over : $under;
    if (el.parentNode !== layer) layer.appendChild(el);
    el.style.display = p && visible ? '' : 'none';
    if (!p) return;
    el.style.left = `${(p.x / W) * 100}%`;
    el.style.top = `${(p.y / H) * 100}%`;
    el.style.zIndex = String(Math.round(p.y));
    const look = `${COLORS[i % COLORS.length]}|${dead}|${players[u]?.photo || ''}`;
    if (el.dataset.look !== look) { el.dataset.look = look; el.querySelector('.am-svg').innerHTML = personHtml(COLORS[i % COLORS.length], players[u], dead); }
    el.querySelector('.am-nm').textContent = players[u]?.name || '나간 사람';
    el.classList.toggle('me', u === me);
    el.classList.toggle('dead', dead);
    // 머리 위 표시
    let fx = '';
    if (dead && (isMafia || !dark)) fx = '💀';
    if (u === me && sur.icon) fx = sur.icon;
    const $fx = el.querySelector('.am-fx');
    if ($fx.dataset.v !== fx) { $fx.dataset.v = fx; $fx.innerHTML = fx; $fx.classList.toggle('knife', fx.startsWith('🗡')); }
    // 말풍선: 시체발견 외침(마피아 제외 모두에게) / 채팅
    let bub = '';
    if (state.phase === 'vote' && state.found?.by === u && now - state.found.at < 5000) bub = '시체발견!';
    else if (!dark && chatAt[u]) bub = esc(chatAt[u]);
    const $b = el.querySelector('.am-bub');
    if ($b.dataset.v !== bub) { $b.dataset.v = bub; $b.innerHTML = bub; $b.classList.toggle('shout', bub === '시체발견!'); }
  });

  // 가운데 안내 문구
  let center = '';
  if (state.phase === 'vote' && state.runoff && now - state.runoffAt < 2500) center = `<b>⚖️ 동점!</b><small>${state.runoff.map((u) => esc(players[u]?.name || '')).join(' vs ')} · 결선 투표를 해요</small>`;
  else if (state.phase === 'vote' && state.found && now - state.found.at < 2500) center = `<b class="red">시체발견!</b><small>${esc(players[state.found.by]?.name || '')}님이 외쳤어요 · 모두 멈추고 불이 켜졌어요</small>`;
  if (c.noLive) center = '<b>실시간 서버 준비 중</b><small>관리자가 Realtime Database를 연결하면 플레이할 수 있어요</small>';
  else if (state.phase === 'dark') center = `<b>불이 꺼졌어요</b><small>${room?.hostId === me ? '마피아 선택 버튼을 눌러 주세요' : '방장이 마피아를 고르길 기다리는 중…'}</small>`;
  if (state.phase === 'hunt' && !c.noLive) {
    const e = now - state.mafiaAt;
    if (isMafia) {
      if (e < 1500) center = '<b>마피아를 고르는 중…</b>';
      else if (e < 4500) center = `<b class="red">당신은 마피아입니다</b><small>🎯 ${esc(missionText(state.mission, players))}</small>`;
      else if (e < INTRO_MS) center = '<b class="red">유저들을 공격하세요</b>';
    } else {
      if (e < 4500) center = '<b>마피아를 고르는 중…</b>';
      else if (e < INTRO_MS) center = '<b>마피아의 공격으로부터 피하세요</b>';
    }
    if (!center && state.dead[me]) center = '<b class="red">공격당했어요</b><small>움직일 수 없고 채팅도 할 수 없어요</small>';
  }
  const $c = c.$('.am-center');
  if ($c.dataset.v !== center) { $c.dataset.v = center; $c.innerHTML = center; $c.classList.toggle('on', !!center); }

  // 타이머
  let left = 0;
  if (state.phase === 'hunt' && now >= state.mafiaAt + INTRO_MS) left = state.deadline - now;
  if (state.phase === 'vote') left = state.deadline - now;
  const $tm = c.$('.am-timer');
  const tt = left > 0 ? `⏱ ${Math.floor(left / 60000)}:${String(Math.floor((left % 60000) / 1000)).padStart(2, '0')}` : '';
  if ($tm.textContent !== tt) $tm.textContent = tt;
  $tm.classList.toggle('hurry', left > 0 && left < 20000);
  if ((state.phase === 'hunt' || state.phase === 'vote') && state.deadline && now > state.deadline + 300 + Math.max(0, state.order.indexOf(me)) * 300 && now - c.lastTick > 2000) {
    c.lastTick = now;
    sendMove({ type: 'tick' }, { silent: true });
  }

  // 버튼
  const $act = c.$('[data-act]');
  let actLabel = '', actOn = false;
  if (state.phase === 'hunt' && !state.dead[me] && now >= state.mafiaAt + INTRO_MS) {
    if (isMafia && sur.target) { actOn = now - (state.lastKill || 0) >= KILL_CD; actLabel = actOn ? `${players[sur.target]?.name || ''} 공격!` : '잠시 후 공격 가능'; }
    else if (!isMafia && sur.body) { actOn = true; actLabel = '살펴보기 (쓰러져 있으면 시체발견!)'; }
  }
  $act.classList.toggle('hot', actOn);
  $act.classList.toggle('mafia', isMafia && state.phase === 'hunt');
  $act.classList.toggle('shake', now - c.shake < 300);
  const $al = $act.querySelector('small');
  if ($al.textContent !== actLabel) $al.textContent = actLabel;
  const $rb = c.$('[data-readyb]');
  $rb.disabled = state.phase !== 'lobby' || !iAmIn;
  $rb.textContent = state.ready?.[me] && state.phase === 'lobby' ? '준비 완료 ✔' : '준비';
  $rb.classList.toggle('on', !!state.ready?.[me] && state.phase === 'lobby');
  c.$('[data-pick]').disabled = !(state.phase === 'dark' && room?.hostId === me);
  c.$('.am-joy').classList.toggle('off', !canMove(state, me, now));

  // 채팅 가능 여부: 암전 중 X, 회의 중 죽은 사람 X
  const canChat = iAmIn && !dark && !(state.phase === 'vote' && state.dead[me]);
  c.say.style.display = state.phase === 'done' || !iAmIn ? 'none' : '';
  const $in = c.say.querySelector('input');
  const ph = canChat ? '채팅 입력' : state.dead?.[me] && !dark ? '공격당해 채팅할 수 없어요 · 프로필을 눌러 조언하세요' : '불이 꺼진 동안은 채팅할 수 없어요';
  if ($in.placeholder !== ph) $in.placeholder = ph;
  if ($in.disabled === canChat) {
    $in.disabled = !canChat; c.say.querySelector('button').disabled = !canChat;
  }
}

// 상태가 바뀔 때만 다시 그리는 부분 (점수·투표·결과·채팅 기록)
function paintPanel() {
  const { state, me, players, room, finished } = ctl.ctx;
  const nm = (u) => esc(players[u]?.name || '나간 사람');
  const color = (u) => COLORS[state.order.indexOf(u) % COLORS.length];
  const isMafia = me === state.mafia;
  const phaseName = { lobby: '준비', dark: '암전', hunt: '암전', vote: '회의 · 투표', result: '라운드 결과', done: '게임 종료' }[state.phase];
  ctl.$('.am-round').innerHTML = `ROUND <b>${state.round}</b> / ${state.rounds}`;
  ctl.$('.am-phase').textContent = phaseName;
  const showDead = ['vote', 'result', 'done'].includes(state.phase) || isMafia;
  ctl.$('.am-chips').innerHTML = state.order.map((u) => `<span class="${u === me ? 'me' : ''} ${showDead && state.dead[u] ? 'dead' : ''}" style="--pc:${color(u)}"><i></i>${nm(u)} <b>${state.scores[u]}</b>${state.phase === 'lobby' && state.ready[u] ? ' ✔' : ''}${state.phase === 'vote' && state.votes[u] ? ' 🗳' : ''}${showDead && state.dead[u] ? ' 💀' : ''}</span>`).join('');
  ctl.$('.am-mission').innerHTML = isMafia && ['hunt', 'vote'].includes(state.phase) && Date.now() >= state.mafiaAt + 1500
    ? `🎯 <b>마피아 미션</b> ${esc(missionText(state.mission, players))}` : '';
  ctl.$('.am-mission').classList.toggle('on', !!ctl.$('.am-mission').innerHTML);

  let html = '';
  const resultHtml = (L) => {
    if (!L) return '';
    const mission = missionText(L.mission, players);
    const order = [...state.order].sort((a, b) => (L.tally[b] || 0) - (L.tally[a] || 0));
    return `<div class="am-res">
      <div class="am-res-t">ROUND ${L.round} 결과${L.runoff ? ' · ⚖️ 결선 투표' : ''}</div>
      <div class="am-reveal ${L.mafiaCaught ? 'caught' : 'escaped'}">
        <span class="am-mini">${personHtml(color(L.mafia), players[L.mafia])}</span>
        <div><small>마피아는</small><b>${nm(L.mafia)}</b><em>${L.mafiaCaught ? '🚨 검거 성공!' : L.caught ? `🗡 탈출 성공 (${nm(L.caught)}님이 대신 지목됨)` : '🗡 탈출 성공 (최다 득표 동점·투표 없음)'}</em></div>
      </div>
      <div class="am-mis ${L.missionOk ? 'ok' : 'fail'}">🎯 미션: ${esc(mission)} → <b>${L.missionOk ? '성공' : '실패'}</b></div>
      <div class="am-tally">${order.map((u) => `<div style="--pc:${color(u)}"><span>${nm(u)}${L.dead.includes(u) ? ' 💀' : ''}</span><i style="width:${Math.min(100, (L.tally[u] || 0) * 25)}%"></i><b>${L.tally[u] || 0}표</b><small>${Object.entries(L.votes).filter(([, t]) => t === u).map(([v]) => nm(v)).join(', ')}</small></div>`).join('')}</div>
      <div class="am-pts">${state.order.map((u) => {
        const items = L.breakdown[u] || [];
        const sum = items.reduce((a, [, p]) => a + p, 0);
        return `<div class="${u === me ? 'me' : ''}"><span style="color:${color(u)}">${nm(u)}${u === L.mafia ? ' 🗡' : ''}</span><small>${items.map(([l, p]) => `${l} ${p > 0 ? '+' : ''}${p}`).join(' · ')}</small><b class="${sum >= 0 ? 'plus' : 'minus'}">${sum > 0 ? '+' : ''}${sum}</b></div>`;
      }).join('')}</div>
    </div>`;
  };

  if (state.phase === 'lobby') {
    const waiting = state.order.filter((u) => !state.ready[u]).length;
    html = `<div class="am-tip">맵 안에서 자유롭게 움직여 보세요. 모두 <b>준비</b>를 누르면 불이 꺼져요 ${waiting ? `(남은 사람 ${waiting}명)` : ''}</div>`;
  } else if (state.phase === 'vote') {
    const iVote = state.votes[me];
    const canVote = state.order.includes(me) && !state.dead[me];
    const ro = state.runoff;
    const iAdvise = state.dead[me] && !ro ? (state.advice || {})[me] : null;
    const adviceTo = {};
    if (!ro) Object.entries(state.advice || {}).forEach(([d, tg]) => (adviceTo[tg] = [...(adviceTo[tg] || []), d]));
    const counts = {};
    Object.values(state.votes).forEach((t) => (counts[t] = (counts[t] || 0) + 1));
    html = ro ? `<div class="am-tip runoff">⚖️ <b>동점이에요!</b> ${ro.map(nm).join(' vs ')} 두 사람 중 한 명에게 <b>마지막으로 한 번 더</b> 투표하세요. (1분 · 조언 없음 · 또 동점이면 지목 없음)</div>` : `<div class="am-tip">🔦 불이 켜졌어요! ${state.meeting === 'time' ? '시간이 다 되어 회의가 열렸어요.' : state.meeting === 'auto' ? '살아남은 시민이 1명뿐이라 회의가 열렸어요.' : '시체가 발견됐어요.'} 채팅으로 이야기하고 <b>마피아라고 생각하는 사람의 프로필</b>을 눌러 투표하세요.</div>
      ${state.dead[me] && !ro ? `<div class="am-tip adv">💀 공격당해 채팅과 투표는 할 수 없지만, <b>지목하여 조언할 수 있습니다.</b> 마피아라고 생각하는 사람의 프로필을 눌러 주세요.${iAdvise ? ` (지금 조언: ${nm(iAdvise)}님)` : ''}</div>` : ''}
      <div class="am-votes">${state.order.map((u) => {
        const dead = !!state.dead[u];
        const advisor = state.dead[me] && state.order.includes(me) && !ro;
        const off = dead || u === me || !(canVote || advisor) || (ro && !ro.includes(u));
        return `<button class="am-card ${ro && !ro.includes(u) ? 'out' : ''} ${(advisor ? iAdvise : iVote) === u ? 'on' : ''} ${advisor ? 'advisor' : ''} ${dead ? 'dead' : ''}" ${advisor ? 'data-advise' : 'data-vote'}="${u}" ${off ? 'disabled' : ''} style="--pc:${color(u)}">
          <span class="am-mini">${personHtml(color(u), players[u], dead)}</span><b>${nm(u)}</b><small>${dead ? '💀 공격당함' : u === me ? '나' : `${counts[u] || 0}표`}</small>
          ${!dead && adviceTo[u] ? `<em class="am-adv">${adviceTo[u].map((d) => `💬 ${nm(d)}님의 조언입니다`).join('<br>')}</em>` : ''}</button>`;
      }).join('')}</div>
      <div class="am-tip sm">투표 ${Object.keys(state.votes).length} / ${state.order.filter((u) => !state.dead[u]).length} · 다 투표하면 바로 결과가 나와요 · 다시 누르면 바꿀 수 있어요</div>`;
  } else if (state.phase === 'result') {
    const host = room?.hostId === me || !state.order.includes(room?.hostId);
    html = `${resultHtml(state.last)}${host ? '<button class="am-next" data-next>다음 라운드 시작 →</button>' : '<div class="am-tip">방장이 다음 라운드를 시작하길 기다리는 중…</div>'}`;
  } else if (state.phase === 'done' || finished) {
    const ranking = room?.result?.ranking || finalResult(state, players).ranking;
    html = `<div class="dm-title" style="color:var(--gold)">🗡 최종 순위</div>
      <ol class="nb-final">${ranking.map((r) => `<li class="${r.uid === me ? 'me' : ''}">
        <span class="nb-place">${r.place <= 3 ? ['🥇', '🥈', '🥉'][r.place - 1] : r.place + '등'}</span>
        <span class="nb-name">${nm(r.uid)}</span><span class="nb-score">${r.score}점</span>
        <span class="nb-reward">${r.garnets ? `${GARNET}+${r.garnets}` : ''}</span></li>`).join('')}</ol>${resultHtml(state.last)}`;
  }
  ctl.$('.am-panel').innerHTML = html;
  ctl.$('.am-chat').style.display = state.phase === 'done' || !(state.chat || []).length ? 'none' : '';
  const $log = ctl.$('.am-log');
  $log.innerHTML = (state.chat || []).slice(-30).map((m) => `<div><b style="color:${color(m.u)}">${nm(m.u)}</b> ${esc(m.text)}</div>`).join('');
  $log.scrollTop = $log.scrollHeight;
  ctl.root.classList.toggle('still', ['vote', 'result', 'done'].includes(state.phase));
}

export default {
  id: 'assassin',
  name: '자객 마피아',
  emoji: '🗡',
  category: 'variety',
  minPlayers: 6,
  maxPlayers: 8,
  duration: '15~30분',
  rewards: REWARDS,
  rewardLabel: '1등 +5',
  ownChat: true,
  description: '불이 꺼지면 자객이 움직인다! 시체를 찾고 마피아를 잡아라',
  options: [{ key: 'rounds', label: '라운드 수', choices: [3, 4, 5, 6, 7, 8, 9, 10], default: 3 }],
  rules: [
    '맵 안에 모두의 캐릭터가 랜덤한 위치에 서 있어요. 조이스틱(웹은 방향키·WASD)으로 움직이고, 상호작용 버튼(스페이스)을 써요.',
    '모두 준비를 누르면 불이 꺼져요. 방장이 마피아 선택을 누르면 1명이 몰래 마피아가 되고 비밀 미션을 받아요.',
    '어둠 속에선 내 캐릭터만 보여요. 누군가와 몸이 닿으면 0.5초 동안 느려져요. 마피아에겐 🗡+이름, 시민에겐 누구든 ✋만 떠요 (마피아인지 알 수 없어요).',
    '마피아는 마주친 순간 상호작용 버튼으로 공격! 공격받은 사람은 그 자리에 쓰러져 움직이거나 채팅할 수 없어요 (💀는 마피아에게만 보여요).',
    '어둠 속에서는 누가 쓰러졌는지 보이지 않아요. 누군가와 닿았을 때 상호작용을 눌러 살펴보세요. 쓰러진 사람이면 "시체발견!"을 외치고 그 자리에서 모두 멈추고 불이 켜져요. (아니면 아무 일도 없어요)',
    '3분 동안 채팅으로 추리하고, 마피아라고 생각하는 사람의 프로필을 눌러 투표해요. 공격받은 사람은 채팅·투표 대신 프로필을 눌러 조언할 수 있어요 (투표란에 "○○님의 조언입니다"로 보여요). 최다 득표 1명이 지목돼요. 동점이면 두 명으로 추려 1분 동안 결선 투표를 한 번 더 해요 (조언 없음, 또 동점이면 지목 없음). 3분 동안 아무도 시체를 못 찾으면 불이 자동으로 켜져요.',
    '마피아 미션: 정해진 2~3명만 공격(다른 사람을 공격하면 실패) / 4명 이상 공격 / 정해진 사람이 가장 많은 표를 받게 하기 중 하나.',
    '점수 — 마피아를 잡으면: 마피아 −5, 시민 모두 +5 / 못 잡으면: 마피아 +5, 시민 모두 −5. 마피아 미션 성공 +3 (실패해도 감점 없음), 시민은 공격받으면 −1, 생존 +1',
    '모든 라운드 후 1등 가넷 5개, 2등 4개, 3등 3개',
  ],

  // 마피아·미션·공격 여부는 서버가 맡아요 (방 문서엔 공개 정보만, 내 비밀은 secret으로 받아요)
  serverMoves: true,
  setup(players) {
    return { phase: 'deal', order: players.map((p) => p.uid) };
  },
  move() { throw new Error('자객 마피아는 서버가 진행해요'); },

  render(el, ctx0) {
    if (ctx0.state.phase === 'deal') { teardown(); dealing(el, ctx0, '🌑 맵을 준비하는 중…'); return; }
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
        if (!live) { c.noLive = true; return; }
        c.live = live;
        live.onLeave(ctx.me);
        c.unwatch = live.watch((all) => { c.others = all || {}; });
      });
    }
    ctl.ctx = ctx;
    if (typeof location !== 'undefined' && location.search.includes('test')) window.__am = ctl; // 테스트 모드 점검용
    if (ctl.root.parentNode !== el) { el.innerHTML = ''; el.appendChild(ctl.root); }
    const { state, me, room, finished } = ctx;
    const sig = JSON.stringify([state.phase, state.round, state.ready, state.votes, state.advice, state.runoff, state.dead, state.scores, state.last?.round, (state.chat || []).length, state.found?.by, state.mafia === me, room?.hostId, finished]);
    if (sig !== ctl.sig) {
      ctl.sig = sig;
      paintPanel();
      if (state.mafia === me && state.phase === 'hunt') setTimeout(() => ctl && paintPanel(), 1600); // 미션 줄 표시
    }
    if (room && state.phase === 'vote' && state.found) soundEvent(room.code, `am:found:${state.round}`, 'ok');
    if (room && (state.phase === 'result' || state.phase === 'done') && state.last) {
      const good = me === state.last.mafia ? !state.last.mafiaCaught : state.last.mafiaCaught;
      soundEvent(room.code, `am:res:${state.last.round}`, good ? 'ok' : 'no');
    }
  },
};
