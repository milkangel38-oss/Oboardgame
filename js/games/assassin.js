// 예능: 자객 마피아 (6~8명) — 실시간 이동 + 암전 + 마피아 미션 + 시체발견 회의 투표
// 차례·투표·점수 같은 "게임 상태"는 방 문서(sendMove)로, 캐릭터 위치는 실시간 채널(backend.live)로 주고받아요.
import { GARNET } from '../profile.js';
import { soundEvent, sfxAlert } from '../sound.js';
import { personHtml, faceHtml } from './face.js';

import { W, H, R, MEET, SPEED, SLOW, SLOW_MS, INTRO_MS, HUNT_MS, VOTE_MS, RUNOFF_MS, KILL_CD, SEND_MS, REWARDS, dist, missionText, finalResult, ROLES, MAFIA_SKILLS, MAFIA_BOOST, KICK_MS, REVIVE_MS, SIREN_MS, SCARE_MS, needLeft, winLeft, reaperOk, STUN_MS } from './assassin-core.js';
export { REWARDS, missionText } from './assassin-core.js';
import { dealing } from './server-deal.js';

const COLORS = ['#ff4f6e', '#3d7bff', '#3ddc84', '#ffb02e', '#b26bff', '#2ee6d6', '#ff8ad8', '#e8cf8a'];
// 공개 상태 + 내 비밀 → 화면용 상태 (마피아 본인만 마피아·미션·쓰러진 사람을, 공격받은 사람은 자기만 알아요)
function view(pub, sec, me) {
  if (!sec || (sec.round != null && sec.round !== pub.round)) return pub; // 지난 라운드 비밀은 무시
  const dead = { ...(pub.dead || {}), ...(sec.dead || {}), ...(sec.spec?.dead || {}) };
  if (sec.deadMe) dead[me] = sec.deadMe;
  return { ...pub, mafia: sec.mafia ? me : pub.mafia ?? null, mission: sec.mission || pub.mission || null, dead, lastKill: sec.lastKill || pub.lastKill || 0,
    myRole: sec.role || null, myUsed: !!sec.used, mskill: sec.mskill || null, eyeAt: sec.eyeAt || 0, counter: sec.counter || null, revive: sec.revive || null, policeHit: sec.policeHit || null, guess: sec.guess || null, revived: sec.revived || null, probe: sec.probe || null, spec: sec.spec || null };
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ── 직업 몸통 그림 (머리 자리에 프로필 얼굴) ──
const BODY = {"cover": {"w": 162, "h": 420, "hx": 87, "hy": 28, "hr": 28}, "mafia": {"w": 196, "h": 420, "hx": 116, "hy": 24, "hr": 24}, "police": {"w": 173, "h": 420, "hx": 91, "hy": 30, "hr": 30}, "doctor": {"w": 169, "h": 420, "hx": 91, "hy": 30, "hr": 30}, "detective": {"w": 204, "h": 420, "hx": 88, "hy": 31, "hr": 31}, "lawyer": {"w": 240, "h": 420, "hx": 154, "hy": 30, "hr": 30}, "ma": {"w": 195, "h": 420, "hx": 114, "hy": 28, "hr": 28}, "prophet": {"w": 208, "h": 420, "hx": 105, "hy": 30, "hr": 29}, "coward": {"w": 163, "h": 420, "hx": 118, "hy": 32, "hr": 32}};
const MAPS = ['mansion', 'gallery', 'alley', 'garden', 'casino', 'train'];
export function bodyHtml(key, player) {
  const b = BODY[key] || BODY.cover;
  const hx = (b.hx / b.w) * 100;
  return `<span class="ab" style="--bw:${b.w};--hx:${hx}%;--hxf:${100 - hx}%;--hy:${(b.hy / b.h) * 100}%;--hr:${(b.hr * 2 / b.h) * 100}"><img src="/img/assassin/body-${key in BODY ? key : 'cover'}.webp" alt="" draggable="false"><span class="ab-face">${faceHtml(player)}</span></span>`;
}
// 누구의 몸통을 보여 줄지: 나는 내 직업, 결과 화면에선 모두 공개, 그 외에는 공통 코트
function bodyKey(state, u, me) {
  if (['result', 'done'].includes(state.phase) && state.last?.roles?.[u]) return state.last.roles[u];
  if (state.spec?.roles?.[u]) return state.spec.roles[u]; // 관전 중이면 모두의 직업이 보여요
  if (u === me && state.myRole) return state.myRole;
  return 'cover';
}

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
        <div class="am-row2"><button class="am-skill" data-skill><b>스킬</b><small></small></button>
        <button class="am-act" data-act><b>상호작용</b><small></small></button></div>
        <div class="am-row">
          <button class="am-b" data-readyb>준비</button>
          <button class="am-b" data-pick>마피아 선택</button>
        </div>
      </div>
    </div>
    <div class="am-hint">조이스틱(또는 방향키·WASD)으로 움직이고, 상호작용(스페이스) · 스킬(Ctrl) 버튼을 눌러요</div>
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
    chars: {}, live: null, unwatch: null, notice: null, gone: 0, shake: 0, say, chatSeen: {}, dir: { x: 1, y: 0 }, armed: false, prevDisp: {}, walkT: {}, counterSeen: 0, reviveSent: 0, kickSeen: 0, sirenEl: null, dashAt: 0,
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
    if (e.type === 'keydown' && (e.code === 'ControlLeft' || e.code === 'ControlRight') && !e.repeat) { e.preventDefault(); useSkill(); }
  };
  window.addEventListener('pointermove', c.onPMove);
  window.addEventListener('pointerup', c.onPUp);
  window.addEventListener('pointercancel', c.onPUp);
  window.addEventListener('keydown', c.onKey);
  window.addEventListener('keyup', c.onKey);

  c.$('[data-act]').addEventListener('click', () => interact());
  c.$('[data-skill]').addEventListener('click', () => useSkill());
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
  c.$('.am-mission').addEventListener('click', (e) => {
    const ms = e.target.closest('[data-mskill]');
    if (ms) c.ctx.sendMove({ type: 'mskill', pick: ms.dataset.mskill });
  });
  c.$('.am-panel').addEventListener('click', (e) => {
    const v = e.target.closest('[data-vote]');
    if (v && !v.disabled) c.ctx.sendMove({ type: 'vote', target: v.dataset.vote });
    const a = e.target.closest('[data-advise]');
    if (a && !a.disabled) c.ctx.sendMove({ type: 'advise', target: a.dataset.advise });
    if (e.target.closest('[data-next]')) c.ctx.sendMove({ type: 'next' });
    const cf = e.target.closest('[data-confirm]');
    if (cf && !cf.disabled) { cf.classList.add('pressed'); cf.innerHTML = '✅ 투표완료!'; c.ctx.sendMove({ type: 'confirm' }); }
    const ms = e.target.closest('[data-mskill]');
    if (ms) c.ctx.sendMove({ type: 'mskill', pick: ms.dataset.mskill });
    if (e.target.closest('[data-prophet]')) {
      const tg = c.$('[data-pp]')?.value, role = c.$('[data-pr]')?.value;
      if (!tg || !role) return showMsg('예언할 사람과 직업을 골라 주세요');
      c.ctx.sendMove({ type: 'skill', target: tg, role });
    }
    if (e.target.closest('[data-reap]')) {
      const tg = c.$('[data-rp]')?.value;
      if (!tg) return showMsg('쓰러뜨릴 사람을 골라 주세요');
      if (confirm(`사신 스킬로 ${c.ctx.players[tg]?.name || ''}님을 쓰러뜨릴까요?`)) c.ctx.sendMove({ type: 'skill', target: tg });
    }
    if (e.target.closest('[data-detect]')) c.ctx.sendMove({ type: 'skill' });
  });
  return c;
}

// 지금 내 주변 상황 (만남 판정)
function surroundings(now) {
  const { state, me, players } = ctl.ctx;
  const out = { slow: false, icon: '', target: null, body: null, near: [] };
  if (state.phase !== 'hunt' || state.dead[me] || state.outs?.[me] || !ctl.pos) return out;
  const mine = ctl.pos;
  const seen = new Set();
  const touch = (key) => { seen.add(key); if (!ctl.enter[key]) ctl.enter[key] = now; return now - ctl.enter[key] < SLOW_MS; };
  const alive = state.order.filter((u) => u !== me && !state.outs?.[u] && (!state.dead[u] || (state.myRole === 'doctor' && me !== state.mafia)) && ctl.disp[u]);
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
      out.icon = '👋'; // 시민끼리는 이름 없이 인사만 (마피아에겐 이름이 보여요)
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
  if (state.phase !== 'hunt' || state.dead[me] || state.outs?.[me] || now < (state.goAt || 0)) { ctl.shake = now; return; }
  const s = surroundings(performance.now());
  if (me === state.mafia) {
    if (!s.target) { ctl.shake = now; return; }
    if (now - (state.lastKill || 0) < KILL_CD) { ctl.shake = now; return; }
    if (state.counter && state.counter.mafia === me && now - state.counter.at < STUN_MS) { ctl.shake = now; return; }
    const p = ctl.disp[s.target];
    const blink = ctl.armed && state.mskill === 'blink' && !state.myUsed;
    const back = { ...ctl.pos };
    sendMove({ type: 'kill', target: s.target, x: Math.round(p.x), y: Math.round(p.y), mx: Math.round(ctl.pos.x), my: Math.round(ctl.pos.y), blink }, { silent: true, onError: (e) => { ctl.shake = Date.now(); if (String(e?.message).includes('변호사')) showMsg('⚖️ 붙어 있는 사람이 있어 공격할 수 없어요'); if (blink && ctl) { ctl.pos = back; ctl.armed = true; } } });
    if (blink) { ctl.armed = false; ctl.pos = { x: Math.max(R, Math.min(W - R, W - ctl.pos.x)), y: Math.max(R + 10, Math.min(H - R, H - ctl.pos.y)) }; ctl.dashAt = Date.now(); }
  } else if (s.body) {
    sendMove({ type: 'shout', body: s.body }, { silent: true, onError: () => { ctl.shake = Date.now(); } }); // 쓰러진 사람이 아니면 흔들림
  } else ctl.shake = now;
}

function canMove(state, me, now) {
  if (state.dead?.[me] || state.outs?.[me]) return false;
  if (state.phase === 'lobby') return true;
  if (state.counter && state.counter.mafia === me && now - state.counter.at < STUN_MS) return false; // 마동석에게 반격당해 5초 경직
  if (state.revive && state.revive.by === me) return false; // 소생시키는 동안은 제자리
  return state.phase === 'hunt' && now >= (state.goAt || 0);
}

let msgT = 0;
function showMsg(text) {
  if (!ctl) return;
  ctl.msg = { text, at: Date.now() };
}
// 스킬 (라운드마다 1번) — 버튼 또는 Ctrl
function skillInfo(state, me, now) {
  const role = state.myRole;
  if (!role || !state.order.includes(me)) return { label: '', on: false, name: '스킬' };
  const going = state.phase === 'hunt' && now >= (state.goAt || 0) && !state.dead[me] && !state.outs?.[me];
  const used = state.myUsed;
  if (role === 'mafia') {
    const sk = MAFIA_SKILLS[state.mskill];
    if (!sk) return { name: '스킬', label: state.phase === 'hunt' ? '아래에서 스킬을 골라요' : '', on: false };
    if (used) return { name: `${sk.icon} ${sk.name}`, label: '사용함', on: false };
    if (state.mskill === 'reaper') return { name: `${sk.icon} ${sk.name}`, label: state.phase === 'vote' ? '아래 사신 칸에서 이름 제출' : '투표 때 사용', on: false };
    if (state.mskill === 'blink') return { name: `${sk.icon} ${sk.name}`, label: ctl.armed ? '켜짐 · 다음 공격 뒤 순간이동' : '눌러서 켜기', on: going, armed: ctl.armed };
    return { name: `${sk.icon} ${sk.name}`, label: '1초 동안 모두 보기', on: going };
  }
  const r = ROLES[role];
  const name = `${r.icon} ${r.name}`;
  if (role === 'lawyer' || role === 'ma' || role === 'coward') return { name, label: role === 'ma' && used ? '반격 사용함' : '자동 능력', on: false };
  if (used) return { name, label: '사용함', on: false };
  if (role === 'detective') return { name, label: state.phase === 'vote' ? '눌러서 쓰러진 순서 보기' : '투표 때 사용', on: state.phase === 'vote' && !state.dead[me] && !state.outs?.[me] };
  if (role === 'prophet') return { name, label: state.phase === 'vote' ? '아래 예언 칸에서 사용' : '투표 때 사용', on: false };
  const sur = surroundings(performance.now());
  const pr = state.probe && sur.body && state.probe.target === sur.body ? state.probe : null;
  if (role === 'police') return { name, label: sur.body ? '🔍 닿은 사람 조사하기' : '누군가와 닿으면 조사 (1번)', on: going && !!sur.body };
  if (role === 'coward') return { name, label: '마피아를 만나면 자동으로 도망', on: false };
  if (role === 'doctor') {
    if (state.revive?.by === me) return { name, label: '소생 중…', on: false };
    if (pr && pr.down) return { name, label: '🩺 살리기!', on: going };
    return { name, label: '쓰러진 사람과 닿으면 켜져요', on: false };
  }
  return { name, label: '', on: false };
}
function useSkill() {
  if (!ctl) return;
  const { state, me, sendMove } = ctl.ctx;
  const now = Date.now();
  const info = skillInfo(state, me, now);
  const role = state.myRole;
  if (role === 'mafia' && state.mskill === 'blink' && !state.myUsed && state.phase === 'hunt') { ctl.armed = !ctl.armed; return; }
  if (!info.on) { ctl.shake2 = now; return; }
  const fail = () => { if (ctl) ctl.shake2 = Date.now(); };
  if (role === 'mafia' && state.mskill === 'eye') return sendMove({ type: 'skill' }, { silent: true, onError: fail });
  if (role === 'detective') return sendMove({ type: 'skill' }, { onError: fail });
  const sur = surroundings(performance.now());
  if (!sur.body) return fail();
  if (role === 'police') return sendMove({ type: 'skill', target: sur.body, near: true }, { silent: true, onError: fail });
  if (role === 'doctor') { ctl.reviveSent = 0; return sendMove({ type: 'skill', target: sur.body, near: true }, { silent: true, onError: () => { fail(); showMsg('쓰러진 사람이 아니에요'); } }); }
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
  // 마동석 반격: 뒤로 밀려나요
  if (state.counter && state.counter.target === me && c.counterSeen !== state.counter.at && c.pos) {
    c.counterSeen = state.counter.at;
    const f = state.counter.from, dx = c.pos.x - f.x, dy = c.pos.y - f.y, l = Math.hypot(dx, dy) || 1;
    c.pos = { x: Math.max(R, Math.min(W - R, c.pos.x + (dx / l) * 170)), y: Math.max(R + 10, Math.min(H - R, c.pos.y + (dy / l) * 170)) };
    c.dashAt = now;
  }
  // 의사: 5초가 지나면 소생 완료
  if (state.revive && state.revive.by === me && now - state.revive.at >= REVIVE_MS && c.reviveSent !== state.revive.at) {
    c.reviveSent = state.revive.at;
    sendMove({ type: 'reviveDone' }, { silent: true, onError: () => sendMove({ type: 'reviveCancel' }, { silent: true }) });
  }

  // 이동
  const sur = surroundings(t);
  // 경찰·의사: 누군가와 닿으면 자동으로 살펴봐요
  if (['doctor', 'coward'].includes(state.myRole) && sur.body && state.phase === 'hunt' && now >= (state.goAt || 0) && !state.dead[me] && !state.outs?.[me]) {
    const pk = sur.body;
    if (c.probeKey !== pk || now - c.probeAt > 2500) {
      c.probeKey = pk; c.probeAt = now;
      sendMove({ type: 'probe', target: pk, x: Math.round(c.pos.x), y: Math.round(c.pos.y), mx: Math.round(c.disp[pk]?.x || 0), my: Math.round(c.disp[pk]?.y || 0) }, { silent: true });
    }
  } else if (!sur.body) c.probeKey = '';
  if (iAmIn && c.pos && canMove(state, me, now)) {
    let vx = c.joy.x + (c.keys.has('r') ? 1 : 0) - (c.keys.has('l') ? 1 : 0);
    let vy = c.joy.y + (c.keys.has('d') ? 1 : 0) - (c.keys.has('u') ? 1 : 0);
    const len = Math.hypot(vx, vy);
    if (len > 1) { vx /= len; vy /= len; }
    const sp = isMafia && state.phase === 'hunt' ? SPEED * MAFIA_BOOST : SPEED; // 마피아는 조금 더 빨라요
    if (len > 0.2) c.dir = { x: vx / len, y: vy / len };
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
  const map = MAPS[((state.round || 1) - 1) % MAPS.length];
  const $fl = c.$('.am-floor');
  if ($fl.dataset.map !== map) { $fl.dataset.map = map; $fl.style.backgroundImage = `url(/img/assassin/bg-${map}.webp)`; }
  const spec = !!state.spec && state.phase === 'hunt';
  const dark = (state.phase === 'dark' || state.phase === 'hunt') && !spec;
  const eye = isMafia && state.mskill === 'eye' && now - (state.eyeAt || 0) < 1000; // 사륜안: 1초 동안 어둠이 걷혀요
  c.$('.am-dark').classList.toggle('eye', eye);
  // 탐정: 쓰러진 순서 번호
  const detectNo = {};
  if (state.phase === 'vote' && state.myRole === 'detective' && state.myUsed) Object.entries(state.dead || {}).sort((a, b) => a[1].at - b[1].at).forEach(([u], i) => (detectNo[u] = i + 1));
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
    const out = !!state.outs?.[u];
    const visible = !out && (!dark || u === me || (dead && isMafia) || (eye && !dead));
    const rk = state.spec?.roles?.[u];
    el.classList.toggle('spec', !!rk);
    el.dataset.role = rk ? `${ROLES[rk]?.icon || ''} ${ROLES[rk]?.name || ''}` : '';
    const layer = dark ? $over : $under;
    if (el.parentNode !== layer) layer.appendChild(el);
    el.style.display = p && visible ? '' : 'none';
    if (!p) return;
    el.style.left = `${(p.x / W) * 100}%`;
    el.style.top = `${(p.y / H) * 100}%`;
    el.style.zIndex = String(Math.round(p.y));
    el.classList.toggle('flip', p.y < 150); // 맨 위쪽이면 표시·말풍선을 아래로
    const bk = bodyKey(state, u, me);
    const look = `${bk}|${players[u]?.photo || ''}`;
    if (el.dataset.look !== look) { el.dataset.look = look; el.querySelector('.am-svg').innerHTML = bodyHtml(bk, players[u]); }
    el.style.setProperty('--pc', COLORS[i % COLORS.length]);
    // 걷기: 움직이고 있으면 팔다리가 흔들려요 (방향에 따라 좌우 뒤집기)
    const pv = c.prevDisp[u];
    if (pv) { const mx = p.x - pv.x, my = p.y - pv.y; if (Math.hypot(mx, my) > 0.4) { c.walkT[u] = now; if (Math.abs(mx) > 0.3) el.classList.toggle('left', mx < 0); } }
    c.prevDisp[u] = { x: p.x, y: p.y };
    el.classList.toggle('walking', !dead && now - (c.walkT[u] || 0) < 140);
    el.classList.toggle('dash', u === me && now - c.dashAt < 350);
    el.querySelector('.am-nm').textContent = players[u]?.name || '나간 사람';
    el.classList.toggle('me', u === me);
    el.classList.toggle('dead', dead);
    // 머리 위 표시
    let fx = '';
    if (dead && (isMafia || !dark)) fx = detectNo[u] ? `<b class="am-dno">${detectNo[u]}</b>💀` : '💀';
    if (dead && state.revive && state.revive.target === u && (u === me || state.revive.by === me)) fx = '🩺';
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

  // 경찰 사이렌: 모두에게 그 자리가 보여요
  const sir = state.siren && now - state.siren.at < SIREN_MS && state.phase === 'hunt' ? state.siren : null;
  if (sir) {
    if (!c.sirenEl || !c.sirenEl.isConnected) { c.sirenEl = document.createElement('div'); c.sirenEl.className = 'am-siren'; c.sirenEl.innerHTML = '<i></i><b>🚨</b><small>경찰 위치!</small>'; $over.appendChild(c.sirenEl); }
    c.sirenEl.style.left = `${(sir.x / W) * 100}%`; c.sirenEl.style.top = `${(sir.y / H) * 100}%`; c.sirenEl.style.display = '';
  } else if (c.sirenEl) c.sirenEl.style.display = 'none';
  // 겁쟁이 ‼ : 모두에게 보이고, 겁쟁이는 반대쪽으로 튕겨 나가요
  const sc = state.scare && now - state.scare.at < SCARE_MS && state.phase === 'hunt' ? state.scare : null;
  if (sc) {
    if (c.scareSeen !== sc.at) {
      c.scareSeen = sc.at;
      if (now - sc.at < 1200) sfxAlert();
      if (sc.uid === me && c.pos) {
        const dx = c.pos.x - sc.fx, dy = c.pos.y - sc.fy, l = Math.hypot(dx, dy) || 1;
        c.pos = { x: Math.max(R, Math.min(W - R, c.pos.x + (dx / l) * 260)), y: Math.max(R + 10, Math.min(H - R, c.pos.y + (dy / l) * 260)) };
        c.dashAt = now;
      }
    }
    if (!c.scareEl || !c.scareEl.isConnected) { c.scareEl = document.createElement('div'); c.scareEl.className = 'am-scare'; c.scareEl.innerHTML = '<b>‼</b>'; $over.appendChild(c.scareEl); }
    c.scareEl.style.left = `${(sc.x / W) * 100}%`; c.scareEl.style.top = `${(sc.y / H) * 100}%`; c.scareEl.style.display = '';
  } else if (c.scareEl) c.scareEl.style.display = 'none';

  // 투표로 쫓겨나는 연출 (새 창)
  if (state.kick && now - state.kick.at < KICK_MS && c.kickSeen !== state.kick.at) { c.kickSeen = state.kick.at; kickShow(state, players); }

  // 가운데 안내 문구
  let center = '';
  if (state.phase === 'vote' && state.runoff && now - state.runoffAt < 2500) center = `<b>⚖️ 동점!</b><small>${state.runoff.map((u) => esc(players[u]?.name || '')).join(' vs ')} · 결선 투표를 해요</small>`;
  else if (state.phase === 'vote' && state.found && now - state.found.at < 2500) center = `<b class="red">시체발견!</b><small>${esc(players[state.found.by]?.name || '')}님이 외쳤어요 · 모두 멈추고 불이 켜졌어요</small>`;
  if (state.phase === 'vote' && state.reaped && now - state.reaped.at < 3500) center = `<b class="red">☠️ 사신 발동!</b><small>${esc(players[state.reaped.uid]?.name || '')}님이 쓰러졌어요${state.reaped.uid === me ? ' · 투표할 수 없어요' : ''}</small>`;
  if (c.noLive) center = '<b>실시간 서버 준비 중</b><small>관리자가 Realtime Database를 연결하면 플레이할 수 있어요</small>';
  else if (state.phase === 'dark') center = `<b>불이 꺼졌어요</b><small>${room?.hostId === me ? '마피아 선택 버튼을 눌러 주세요' : '방장이 마피아를 고르길 기다리는 중…'}</small>`;
  if (state.phase === 'hunt' && !c.noLive) {
    const e = now - state.mafiaAt;
    const role = ROLES[state.myRole];
    if (!state.kick && e < INTRO_MS) {
      if (e < 1500) center = '<b>직업을 나눠 주는 중…</b>';
      else if (isMafia) center = e < 4500 ? `<b class="red">당신은 마피아입니다</b><small>🎯 ${esc(missionText(state.mission, players))}<br>아래에서 스킬을 하나 고르세요</small>` : '<b class="red">유저들을 공격하세요</b>';
      else if (role) center = e < 4500 ? `<b>${role.icon} 당신은 ${role.name}입니다</b><small>${esc(role.desc)}</small>` : '<b>마피아의 공격으로부터 피하세요</b>';
    }
    if (!center && state.outs?.[me] && now - (state.kick?.at || 0) < KICK_MS + 2500) center = '<b>🚪 투표로 쫓겨났어요</b><small>불이 켜진 채로 모두의 직업을 보며 구경해요</small>';
    if (!center && state.revive && state.revive.target === me) center = `<b>🩺 소생중…</b><small>${Math.max(0, Math.ceil((state.revive.at + REVIVE_MS - now) / 1000))}초 뒤 다시 일어나요</small>`;
    if (!center && state.revive && state.revive.by === me) center = `<b>🩺 살리는 중…</b><small>${Math.max(0, Math.ceil((state.revive.at + REVIVE_MS - now) / 1000))}초 · 그 자리에서 기다려요</small>`;
    if (!center && state.revived && now - state.revived.at < 2500) center = '<b>💚 다시 살아났어요!</b><small>어둠 속에서 계속 피하세요</small>';
    if (!center && state.reaped && state.reaped.uid === me && state.dead[me]) center = '<b class="red">☠️ 사신에게 당했어요</b><small>이번 라운드는 움직일 수 없어요</small>';
    if (!center && state.counter && now - state.counter.at < (state.counter.mafia === me ? STUN_MS : 1500)) center = state.counter.mafia === me ? `<b class="red">💪 반격당했어요!</b><small>${Math.max(0, Math.ceil((state.counter.at + STUN_MS - now) / 1000))}초 동안 움직일 수 없어요</small>` : state.counter.target === me ? '<b>💪 반격!</b><small>마피아를 밀쳐 내고 뒤로 물러났어요</small>' : '';
    if (!center && state.policeHit && now - state.policeHit.at < 3000) center = state.policeHit.hit ? `<b class="red">🔍 ${esc(players[state.policeHit.target]?.name || '')}님은 마피아예요!</b><small>회의 때 모두에게 알려 주세요</small>` : `<b>🔍 ${esc(players[state.policeHit.target]?.name || '')}님은 마피아가 아니에요</b>`;
    if (!center && sir && !isMafia && now - sir.at < 2000) center = '<b class="red">🚨 사이렌!</b><small>경찰이 마피아를 마주쳤어요</small>';
    if (!center && state.dead[me] && !state.spec) center = '<b class="red">공격당했어요</b><small>움직일 수 없고 채팅도 할 수 없어요</small>';
  }
  if (!center && c.msg && now - c.msg.at < 1800) center = `<b>${esc(c.msg.text)}</b>`;
  const $c = c.$('.am-center');
  if ($c.dataset.v !== center) { $c.dataset.v = center; $c.innerHTML = center; $c.classList.toggle('on', !!center); }

  // 타이머
  let left = 0;
  if (state.phase === 'hunt' && now >= (state.goAt || 0)) left = state.deadline - now;
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
  if (state.phase === 'hunt' && !state.dead[me] && !state.outs?.[me] && now >= (state.goAt || 0)) {
    if (isMafia && sur.target) { actOn = now - (state.lastKill || 0) >= KILL_CD; actLabel = actOn ? `${players[sur.target]?.name || ''} 공격!` : '잠시 후 공격 가능'; }
    else if (!isMafia && sur.body) { actOn = true; actLabel = '살펴보기 (쓰러져 있으면 시체발견!)'; }
  }
  $act.classList.toggle('hot', actOn);
  $act.classList.toggle('mafia', isMafia && state.phase === 'hunt');
  $act.classList.toggle('shake', now - c.shake < 300);
  const $al = $act.querySelector('small');
  if ($al.textContent !== actLabel) $al.textContent = actLabel;
  const sk = skillInfo(state, me, now);
  const $sk = c.$('[data-skill]');
  $sk.hidden = !sk.label && !state.myRole;
  const skv = `${sk.name}|${sk.label}`;
  if ($sk.dataset.v !== skv) { $sk.dataset.v = skv; $sk.querySelector('b').textContent = sk.name; $sk.querySelector('small').textContent = sk.label; }
  $sk.classList.toggle('hot', !!sk.on);
  $sk.classList.toggle('armed', !!sk.armed);
  $sk.classList.toggle('shake', now - (c.shake2 || 0) < 300);
  const $rb = c.$('[data-readyb]');
  $rb.disabled = state.phase !== 'lobby' || !iAmIn;
  $rb.textContent = state.ready?.[me] && state.phase === 'lobby' ? '준비 완료 ✔' : '준비';
  $rb.classList.toggle('on', !!state.ready?.[me] && state.phase === 'lobby');
  c.$('[data-pick]').disabled = !(state.phase === 'dark' && room?.hostId === me);
  c.$('.am-joy').classList.toggle('off', !canMove(state, me, now));

  // 채팅 가능 여부: 암전 중 X, 회의 중 죽은 사람 X
  const canChat = iAmIn && !dark && !(state.phase === 'vote' && (state.dead[me] || state.outs?.[me]));
  c.say.style.display = state.phase === 'done' || !iAmIn ? 'none' : '';
  const $in = c.say.querySelector('input');
  const ph = canChat ? '채팅 입력' : state.dead?.[me] && !dark ? '공격당해 채팅할 수 없어요 · 프로필을 눌러 조언하세요' : '불이 꺼진 동안은 채팅할 수 없어요';
  if ($in.placeholder !== ph) $in.placeholder = ph;
  if ($in.disabled === canChat) {
    $in.disabled = !canChat; c.say.querySelector('button').disabled = !canChat;
  }
}

// 투표로 쫓겨난 시민: 새 창에서 발로 뻥 차여 문밖으로
function kickShow(state, players) {
  document.querySelector('.am-kick')?.remove();
  const k = state.kick;
  const o = document.createElement('div');
  o.className = 'am-kick';
  const i = state.order.indexOf(k.uid);
  const nm = esc(players[k.uid]?.name || '');
  const t = k.tally || {};
  const tallyHtml = `<div class="am-vgrid">${Object.keys(t).sort((a, b) => t[b] - t[a]).map((u) => `<div class="am-vsq ${u === k.uid ? 'top' : ''}" style="--pc:${COLORS[state.order.indexOf(u) % COLORS.length]}"><b>${esc(players[u]?.name || '')}</b><strong>${t[u]}</strong><small>표</small></div>`).join('')}</div>`;
  o.innerHTML = k.uid ? `<div class="am-kbox">
      <div class="am-kstage"><div class="am-door"><i></i></div><div class="am-kfig">${bodyHtml('cover', players[k.uid])}</div><div class="am-boot">🦶</div><span class="am-kpow">뻥!</span></div>
      <b>${nm}님이 쫓겨났어요</b>${tallyHtml}<small>${nm}님은 <em>시민</em>이었어요 · 마피아는 아직 숨어 있어요<br>곧 다시 불이 꺼져요!</small></div>`
    : `<div class="am-kbox"><div class="am-kstage none">🤷</div><b>아무도 쫓겨나지 않았어요</b>${tallyHtml}<small>${k.runoff ? '결선 투표도 동점이에요' : '최다 득표가 동점이거나 투표가 없었어요'}<br>곧 다시 불이 꺼져요!</small></div>`;
  document.body.appendChild(o);
  setTimeout(() => o.remove(), Math.max(800, KICK_MS - (Date.now() - k.at)));
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
  ctl.$('.am-chips').innerHTML = state.order.map((u) => `<span class="${u === me ? 'me' : ''} ${(showDead && state.dead[u]) || state.outs?.[u] ? 'dead' : ''}" style="--pc:${color(u)}"><i></i>${nm(u)} <b>${state.scores[u]}</b>${state.phase === 'lobby' && state.ready[u] ? ' ✔' : ''}${state.phase === 'vote' && (state.confirmed || {})[u] ? ' ✅' : state.phase === 'vote' && state.votes[u] ? ' 🗳' : ''}${showDead && state.dead[u] ? ' 💀' : ''}${state.outs?.[u] ? ' 🚪' : ''}</span>`).join('');
  const role = ROLES[state.myRole];
  const midRound = ['hunt', 'vote'].includes(state.phase) && Date.now() >= state.mafiaAt + 1500;
  ctl.$('.am-mission').innerHTML = !midRound || !role ? '' : isMafia
    ? `🎯 <b>마피아 미션</b> ${esc(missionText(state.mission, players))}<span class="am-goal">남은 시민이 <b>${winLeft(state.order.length)}명</b> 이하가 되면 승리! (공격으로든 투표로든 · 마피아 1 : 시민 ${winLeft(state.order.length)})</span>
       ${state.mskill ? `<span class="am-myskill">${MAFIA_SKILLS[state.mskill].icon} <b>${MAFIA_SKILLS[state.mskill].name}</b> · ${esc(MAFIA_SKILLS[state.mskill].desc)}${state.myUsed ? ' (사용함)' : ''}</span>`
         : `<div class="am-mpick"><small>스킬을 하나 고르세요 (라운드마다 1번)</small>${Object.entries(MAFIA_SKILLS).map(([k, v]) => `<button data-mskill="${k}"><b>${v.icon} ${v.name}</b><small>${esc(v.desc)}</small></button>`).join('')}</div>`}`
    : `${role.icon} <b>내 직업: ${role.name}</b> ${esc(role.desc)}${state.myUsed ? ' <em>(사용함)</em>' : ''}`;
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
        <div><small>마피아는</small><b>${nm(L.mafia)}</b><em>${L.mafiaCaught ? '🚨 검거 성공!' : '🗡 마피아 승리'}</em>${L.mskill ? `<small>스킬: ${MAFIA_SKILLS[L.mskill].icon} ${MAFIA_SKILLS[L.mskill].name}</small>` : ''}</div>
      </div>
      <div class="am-mis ${L.missionOk ? 'ok' : 'fail'}">🎯 미션: ${esc(mission)} → <b>${L.missionOk ? '성공' : '실패'}</b></div>
      ${L.roles ? `<div class="am-roles">${state.order.map((u) => `<span style="--pc:${color(u)}">${ROLES[L.roles[u]]?.icon || ''} ${nm(u)} <b>${ROLES[L.roles[u]]?.name || ''}</b>${(L.outs || []).includes(u) ? ' 🚪' : L.dead.includes(u) ? ' 💀' : ''}</span>`).join('')}</div>` : ''}
      ${L.guess ? `<div class="am-mis ${L.guess.ok ? 'ok' : 'fail'}">🔮 예언: ${nm(L.guess.target)}님 = ${ROLES[L.guess.role]?.name} → <b>${L.guess.ok ? '적중!' : '빗나감'}</b></div>` : ''}
      <div class="am-vgrid">${order.filter((u) => L.tally[u]).map((u) => `<div class="am-vsq ${u === L.caught ? 'top' : ''}" style="--pc:${color(u)}"><b>${nm(u)}</b><strong>${L.tally[u]}</strong><small>표</small></div>`).join('') || '<div class="am-tip sm">투표가 없었어요</div>'}</div>
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
    const confirmedMe = !!(state.confirmed || {})[me];
    const canVote = state.order.includes(me) && !state.dead[me] && !state.outs?.[me];
    const ro = state.runoff;
    const gone = state.dead[me] || state.outs?.[me];
    const iAdvise = gone && !ro ? (state.advice || {})[me] : null;
    const adviceTo = {};
    if (!ro) Object.entries(state.advice || {}).forEach(([d, tg]) => (adviceTo[tg] = [...(adviceTo[tg] || []), d]));
    const counts = {};
    Object.values(state.votes).forEach((t) => (counts[t] = (counts[t] || 0) + 1));
    const alive = state.order.filter((u) => !state.dead[u] && !state.outs?.[u]);
    const pick = (attr, list) => `<select ${attr}><option value="">사람 고르기</option>${list.map((u) => `<option value="${esc(u)}">${nm(u)}</option>`).join('')}</select>`;
    const extra = [];
    if (state.reaped && Date.now() - state.reaped.at < 60000) extra.push(`<div class="am-tip red">☠️ 사신이 <b>${nm(state.reaped.uid)}</b>님을 쓰러뜨렸어요!</div>`);
    if (canVote && state.myRole === 'prophet') extra.push(state.guess ? `<div class="am-sbox">🔮 예언 완료: <b>${nm(state.guess.target)}</b>님은 <b>${ROLES[state.guess.role].name}</b>! (맞았는지는 라운드가 끝나면 알 수 있어요)</div>`
      : state.myUsed ? '' : `<div class="am-sbox">🔮 <b>예언자</b> · 한 사람의 직업을 맞히면 +5점 (1번)
        <div class="am-srow">${pick('data-pp', state.order.filter((u) => u !== me))}<select data-pr><option value="">직업 고르기</option>${Object.entries(ROLES).map(([k, v]) => `<option value="${k}">${v.icon} ${v.name}</option>`).join('')}</select><button class="btn sm primary" data-prophet>예언하기</button></div></div>`);
    if (canVote && isMafia && state.mskill === 'reaper' && !state.myUsed && !ro) extra.push(!reaperOk(state) ? `<div class="am-sbox red">☠️ <b>사신</b> · 쓰러진 사람이 1~${winLeft(state.order.length)}명일 때만 쓸 수 있어요 (지금 ${Object.keys(state.dead || {}).length}명)</div>` : `<div class="am-sbox red">☠️ <b>사신</b> · 이름을 제출하면 그 사람이 쓰러져요 (1번)
        <div class="am-srow">${pick('data-rp', alive.filter((u) => u !== me))}<button class="btn sm" data-reap>사신 발동</button></div></div>`);
    if (canVote && state.myRole === 'detective') extra.push(state.myUsed ? '<div class="am-sbox">🔍 시체 위 번호 = 쓰러진 순서예요</div>' : '<div class="am-sbox">🔍 <b>탐정</b> · 스킬을 쓰면 시체 위에 쓰러진 순서가 번호로 보여요 <button class="btn sm primary" data-detect>스킬 사용</button></div>');
    html = ro ? `<div class="am-tip runoff">⚖️ <b>동점이에요!</b> ${ro.map(nm).join(' vs ')} 두 사람 중 한 명에게 <b>마지막으로 한 번 더</b> 투표하세요. (1분 · 조언 없음 · 또 동점이면 지목 없음)</div>` : `<div class="am-tip">🔦 불이 켜졌어요! ${state.meeting === 'time' ? '시간이 다 되어 회의가 열렸어요.' : '시체가 발견됐어요.'} 시민을 뽑으면 그 사람만 쫓겨나고 게임이 계속돼요. 채팅으로 이야기하고 <b>마피아라고 생각하는 사람의 프로필</b>을 눌러 투표하세요.</div>
      ${gone && !ro ? `<div class="am-tip adv">${state.outs?.[me] ? '🚪 쫓겨나서' : '💀 공격당해'} 채팅과 투표는 할 수 없지만, <b>지목하여 조언할 수 있습니다.</b> 마피아라고 생각하는 사람의 프로필을 눌러 주세요.${iAdvise ? ` (지금 조언: ${nm(iAdvise)}님)` : ''}</div>` : ''}
      <div class="am-votes">${state.order.map((u) => {
        const dead = !!state.dead[u] || !!state.outs?.[u];
        const advisor = gone && state.order.includes(me) && !ro;
        const off = dead || u === me || !(canVote || advisor) || (ro && !ro.includes(u)) || (!advisor && confirmedMe);
        return `<button class="am-card ${ro && !ro.includes(u) ? 'out' : ''} ${(advisor ? iAdvise : iVote) === u ? 'on' : ''} ${advisor ? 'advisor' : ''} ${dead ? 'dead' : ''}" ${advisor ? 'data-advise' : 'data-vote'}="${u}" ${off ? 'disabled' : ''} style="--pc:${color(u)}">
          <span class="am-mini">${personHtml(color(u), players[u], dead)}</span><b>${nm(u)}</b><small>${state.outs?.[u] ? '🚪 쫓겨남' : dead ? '💀 공격당함' : u === me ? '나' : `${counts[u] || 0}표`}</small>
          ${!dead && adviceTo[u] ? `<em class="am-adv">${adviceTo[u].map((d) => `💬 ${nm(d)}님의 조언입니다`).join('<br>')}</em>` : ''}</button>`;
      }).join('')}</div>
      ${extra.join('')}
      ${canVote ? (confirmedMe ? '<button class="am-next am-confirm done" disabled>✅ 투표완료 · 다른 사람을 기다리는 중…</button>'
        : `<button class="am-next am-confirm" data-confirm ${iVote ? '' : 'disabled'}>${iVote ? `🗳 ${nm(iVote)}님 · 투표완료` : '먼저 프로필을 눌러 투표하세요'}</button>`) : ''}
      <div class="am-tip sm">투표완료 <b>${Object.keys(state.confirmed || {}).length} / ${alive.length}</b>명 · 모두 투표완료를 누르면 결과가 나와요 · 완료 전에는 다시 눌러 바꿀 수 있어요</div>`;
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
  // 음성 채팅: 어둠 속(마피아 고르기·사냥)에는 모두, 쓰러진 사람은 계속 음소거
  voiceMute: (s, me) => (['dark', 'hunt'].includes(s?.phase) ? '🌑 어둠 속에서는 말할 수 없어요' : s?.dead?.[me] ? '💀 쓰러진 사람은 말할 수 없어요' : ''),
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
    '맵 안에 모두의 캐릭터가 랜덤한 위치에 서 있어요. 조이스틱(웹은 방향키·WASD)으로 움직이고, 상호작용(스페이스)·스킬(Ctrl) 버튼을 써요.',
    '모두 준비를 누르면 불이 꺼지고, 방장이 마피아 선택을 누르면 모두에게 직업이 몰래 정해져요. 마피아 1명은 비밀 미션을 받고 스킬 3개 중 하나를 골라요. 스킬은 라운드마다 1번만 쓸 수 있어요.',
    '마피아 스킬 — 👁 사륜안: 1초 동안 어둠이 걷혀 모두가 보여요 / ✨ 점멸자: 켜 두면 다음 공격 뒤 맵 정반대편으로 순간이동 / ☠️ 사신: 투표 때 이름을 제출해 한 사람을 쓰러뜨려요 (쓰러진 사람이 1명 ~ 인원−5명일 때만 · 모두에게 알림). 마피아는 다른 사람보다 조금 더 빨라요.',
    '시민 직업 — 🚨 경찰: 닿아 있는 사람을 조사해 마피아인지 알아내요 (1번) / 🩺 의사: 쓰러진 사람과 닿았을 때만 스킬이 켜지고, 5초 동안 살려요 / 🔍 탐정: 투표 때 시체 위에 쓰러진 순서가 보여요 / ⚖️ 변호사: 다른 사람과 붙어 있는 동안은 공격당하지 않아요 / 😱 겁쟁이: 마피아와 마주치면 ‼ 표시가 모두에게 뜨고 반대쪽으로 튕겨 나가요 / 💪 마동석: 마피아의 첫 공격을 반격 (뒤로 밀려나고 마피아는 5초 경직) / 🔮 예언자: 투표 때 한 사람의 직업을 맞히면 +5점',
    '어둠 속에선 내 캐릭터만 보여요. 누군가와 닿으면 👋 인사 표시만 떠요 (이름은 안 보여요, 마피아에겐 보여요). 마피아는 마주친 순간 상호작용으로 공격! 쓰러진 사람은 움직이거나 채팅할 수 없어요.',
    '누군가와 닿았을 때 상호작용을 눌러 살펴보세요. 쓰러진 사람이면 "시체발견!" — 모두 멈추고 불이 켜져 회의·투표를 해요 (3분). 3분 동안 아무도 못 찾으면 자동으로 회의가 열려요.',
    '투표에서 마피아를 뽑으면 라운드 끝(시민 승리). 시민을 뽑으면 그 사람만 문밖으로 쫓겨나고, 결과를 알려 준 뒤 바로 다시 불이 꺼져요. 동점이면 두 명으로 결선 투표, 또 동점이면 아무도 쫓겨나지 않아요.',
    '마피아 승리: 남은 시민이 6명일 때 1명, 7명일 때 2명, 8명일 때 3명 이하가 되면 (공격으로든 투표로든).',
    '마피아 미션: 정해진 2명만 공격 / 정해진 횟수 이상 공격 / 정해진 사람이 투표로 쫓겨나게 하기 중 하나.',
    '쓰러지거나 쫓겨난 사람은 불이 켜진 채로 모두의 직업을 보며 관전해요.',
    '점수 — 마피아 검거: 마피아 −5, 시민 모두 +5 / 마피아 승리: 마피아 +5, 시민 모두 −5. 마피아 미션 성공 +3, 시민은 쓰러지거나 쫓겨나면 −1, 끝까지 살아남으면 +1. 예언 적중 +5',
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
    const sig = JSON.stringify([state.phase, state.round, state.ready, state.votes, state.confirmed, state.advice, state.runoff, state.dead, state.outs, state.scores, state.last?.round, (state.chat || []).length, state.found?.by, state.mafia === me, room?.hostId, finished, state.myRole, state.myUsed, state.mskill, state.guess, state.reaped, state.kick?.at]);
    if (sig !== ctl.sig) {
      ctl.sig = sig;
      paintPanel();
      if (state.phase === 'hunt') setTimeout(() => ctl && paintPanel(), 1600); // 직업·미션 줄 표시
    }
    if (room && state.phase === 'vote' && state.found) soundEvent(room.code, `am:found:${state.round}`, 'ok');
    if (room && (state.phase === 'result' || state.phase === 'done') && state.last) {
      const good = me === state.last.mafia ? !state.last.mafiaCaught : state.last.mafiaCaught;
      soundEvent(room.code, `am:res:${state.last.round}`, good ? 'ok' : 'no');
    }
  },
};
