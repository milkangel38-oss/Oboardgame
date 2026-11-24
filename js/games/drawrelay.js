// 예능: 그림 이어그리기 (협동, 4~6명)
// 방장이 정답자를 고르면, 나머지가 한 줄로 앉아 왼쪽(출제자)부터 차례로 10초씩 그림을 이어 그려요.
// 출제자만 제시어를 보고, 다음 사람들은 앞사람 그림만 보고 이어 그려요. 맨 오른쪽 정답자가 완성된 그림을 보고 맞혀요.
import { GARNET } from '../profile.js';
import { soundEvent, sfxKnock } from '../sound.js';
import { sitHtml, chatFormHtml, bindChat } from './sit.js';
import { DRAW_WORDS } from './drawrelay-words.js';

const DRAW_MS = 10000;
const WORD_MS = 12000; // 출제자가 제시어를 확인하는 시간 (지나면 자동으로 그리기 시작)
const GUESS_MS = 30000;
const KNOCK_MS = 1400; // 똑똑 하고 다음 사람에게 넘어가는 여유
const PTS = 10;
export const BW = 430, BH = 300; // 화이트보드 안쪽 비율
const PENS = [3, 7, 14];
const ERASER = 26;
const ROBES = ['#e8443a', '#2f6fe0', '#2fae5f', '#f2a81d', '#8a4fd8', '#1fb5b0'];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const norm = (s) => String(s || '').replace(/\s+/g, '').toLowerCase();
const entryOf = (i) => { const [word, ...alias] = DRAW_WORDS[i].split('/'); return { word, alias }; };
export const isRight = (answer, i) => { const e = entryOf(i); return [e.word, ...e.alias].some((w) => norm(w) === norm(answer)); };
export const garnetsFor = (score) => Math.trunc(score / PTS);

function finalResult(state) {
  const g = garnetsFor(state.score);
  const hits = state.history.filter((h) => h.correct).length;
  return {
    message: g > 0 ? `협동 성공! ${hits}/${state.rounds} 맞혔어요 🎉` : g < 0 ? `아쉬워요… ${hits}/${state.rounds} 맞혔어요` : `${hits}/${state.rounds} 맞혔어요`,
    winners: g > 0 ? [...state.order] : [],
    ranking: state.order.map((uid) => ({ uid, score: state.score, place: 1, garnets: g })),
    rewards: Object.fromEntries(state.order.map((u) => [u, g])),
  };
}
function nextDrawer(state, strokes, now, uid) {
  const all = [...state.strokes, ...strokes];
  const splits = [...state.splits, all.length];
  const di = state.di + 1;
  const knock = { uid, at: now, di: state.di };
  if (di >= state.line.length) return { ...state, strokes: all, splits, di, knock, phase: 'guess', deadline: now + KNOCK_MS + GUESS_MS };
  return { ...state, strokes: all, splits, di, knock, deadline: now + KNOCK_MS + DRAW_MS };
}
function finish(state, answer) {
  const correct = !!answer && isRight(answer, state.word);
  const score = state.score + (correct ? PTS : -PTS);
  const history = [...state.history, { round: state.round, word: entryOf(state.word).word, guesser: state.guesser, answer, correct }];
  const s = { ...state, phase: 'result', answer, correct, score, history, deadline: 0, ready: {} };
  if (s.round >= s.rounds) { const done = { ...s, phase: 'done' }; return { state: done, result: finalResult(done) }; }
  return { state: s };
}
// 획 정리: "펜:x,y,x,y..." (펜 0~2, e = 지우개), 좌표는 정수
function cleanStrokes(list) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, 120).map((s) => String(s).slice(0, 2400)).filter((s) => /^[012e]:[\d,]+$/.test(s));
}

// ── 그리기 ──
export function paint(cx, strokes, scale = 1) {
  cx.lineCap = 'round'; cx.lineJoin = 'round';
  for (const s of strokes) {
    const [k, pts] = s.split(':');
    const n = pts.split(',').map(Number);
    if (n.length < 2) continue;
    cx.strokeStyle = k === 'e' ? '#ffffff' : '#1d1d24';
    cx.fillStyle = cx.strokeStyle;
    const w = (k === 'e' ? ERASER : PENS[+k]) * scale;
    cx.lineWidth = w;
    if (n.length === 2) { cx.beginPath(); cx.arc(n[0] * scale, n[1] * scale, w / 2, 0, Math.PI * 2); cx.fill(); continue; }
    cx.beginPath(); cx.moveTo(n[0] * scale, n[1] * scale);
    for (let i = 2; i < n.length; i += 2) cx.lineTo(n[i] * scale, n[i + 1] * scale);
    cx.stroke();
  }
}
function canvasHtml(cls = '') { return `<canvas class="dr-cv ${cls}" width="${BW * 2}" height="${BH * 2}"></canvas>`; }
const boardHtml = (cls) => `<div class="dr-board"><img class="dr-frame" src="/img/drawrelay/board.webp" alt="" draggable="false">${canvasHtml(cls)}</div>`;
const BODY_FY = [26.1, 26.0, 24.5, 26.1, 26.1, 26.1];
function paintInto($c, strokes) {
  const cx = $c.getContext('2d');
  cx.fillStyle = '#fff'; cx.fillRect(0, 0, $c.width, $c.height);
  paint(cx, strokes, $c.width / BW);
}

// 화면 위에 뜨는 창 (출제자 제시어 · 그리기 · 정답 입력)
let pop = null;
function closePop() { pop?.el.remove(); clearInterval(pop?.iv); pop = null; }

export default {
  voiceMute: (s, me) => (['word', 'draw', 'guess'].includes(s?.phase) && s.line?.[0] === me ? '🤫 출제자는 정답이 나올 때까지 말할 수 없어요' : ''),
  chatBlock: (s, me) => (['word', 'draw', 'guess'].includes(s?.phase) && s.line?.[0] === me ? '출제자는 정답이 나올 때까지 채팅할 수 없어요 🤫' : ''),
  id: 'drawrelay',
  name: '그림 이어그리기',
  emoji: '🎨',
  category: 'variety',
  minPlayers: 4,
  maxPlayers: 6,
  duration: '10~20분',
  coopGame: true,
  rewards: [10],
  rewardLabel: '점수 10점당 ±1',
  description: '제시어는 첫 사람만! 10초씩 이어 그려 마지막 사람이 맞혀라',
  options: [{ key: 'rounds', label: '라운드 수', choices: [5, 6, 7, 8, 9, 10], default: 5 }],
  rules: [
    '모두 준비를 누르면, 이야기를 나눠 방장이 이번 라운드의 정답자를 골라요.',
    '정답자는 맨 오른쪽, 나머지는 칸막이를 사이에 두고 한 줄로 앉아요. 맨 왼쪽이 출제자예요.',
    '출제자만 제시어를 보고 10초 동안 화이트보드에 그림을 그려요. (가는펜 · 중간펜 · 두꺼운펜 · 지우개)',
    '다 그리면 완성! (10초가 지나면 자동으로 넘어가요) 똑똑 노크하면 다음 사람이 앞사람 그림을 이어받아 10초 동안 더 그려요.',
    '출제자는 정답이 나올 때까지 말하거나 채팅할 수 없어요. 다른 사람들은 자유롭게 채팅해요.',
    '마지막 정답자가 완성된 그림을 보고 30초 안에 정답을 입력해요.',
    `맞히면 모두 +${PTS}점, 틀리면 모두 −${PTS}점 (협동게임이라 점수는 모두 같아요).`,
    '가넷: 최종 팀 점수 10점당 모두 가넷 1개 (예: 30점 → +3). 최종 점수가 마이너스면 그만큼 차감돼요 (예: −20점 → −2)',
  ],

  setup(players, room) {
    const order = players.map((p) => p.uid);
    const rounds = Math.min(10, Math.max(5, Number(room?.options?.rounds) || 5));
    return { order, host: room?.hostId || order[0], rounds, round: 0, phase: 'ready', ready: {}, guesser: null, line: [], di: 0, word: null, used: [], strokes: [], splits: [], knock: null, answer: '', correct: null, score: 0, history: [], deadline: 0 };
  },

  move(state, move, uid, players) {
    const now = Date.now();
    const t = move?.type;
    if (t !== 'tick' && !state.order.includes(uid)) throw new Error('참가자가 아니에요');
    const hostOk = uid === state.host || !players[state.host];

    if (t === 'ready') {
      if (!['ready', 'result'].includes(state.phase)) throw new Error('__noop');
      const ready = { ...state.ready, [uid]: true };
      if (state.order.every((u) => ready[u])) {
        return { state: { ...state, round: state.round + 1, phase: 'choose', ready: {}, guesser: null, line: [], di: 0, word: null, strokes: [], splits: [], knock: null, answer: '', correct: null, deadline: 0 } };
      }
      return { state: { ...state, ready } };
    }
    if (t === 'pick') {
      if (state.phase !== 'choose') throw new Error('__noop');
      if (!hostOk) throw new Error('방장만 정답자를 고를 수 있어요');
      if (!state.order.includes(move.target)) throw new Error('고를 수 없는 사람이에요');
      const rest = state.order.filter((u) => u !== move.target);
      const k = (state.round - 1) % rest.length;
      const line = [...rest.slice(k), ...rest.slice(0, k)]; // 라운드마다 출제자가 바뀌어요
      const pool = DRAW_WORDS.map((_, i) => i).filter((i) => !state.used.includes(i));
      const word = (pool.length ? pool : DRAW_WORDS.map((_, i) => i))[Math.floor(Math.random() * (pool.length || DRAW_WORDS.length))];
      return { state: { ...state, phase: 'word', guesser: move.target, line, di: 0, word, used: [...state.used, word], strokes: [], splits: [], knock: null, deadline: now + WORD_MS } };
    }
    if (t === 'start') {
      if (state.phase !== 'word' || uid !== state.line[0]) throw new Error('__noop');
      return { state: { ...state, phase: 'draw', deadline: now + DRAW_MS } };
    }
    if (t === 'drew') {
      if (state.phase !== 'draw' || uid !== state.line[state.di]) throw new Error('__noop');
      return { state: nextDrawer(state, cleanStrokes(move.strokes), now, uid) };
    }
    if (t === 'guess') {
      if (state.phase !== 'guess') throw new Error('지금은 정답을 낼 수 없어요');
      if (uid !== state.guesser) throw new Error('정답자만 정답을 낼 수 있어요');
      return finish(state, String(move.text || '').trim().slice(0, 20));
    }
    if (t === 'tick') {
      if (state.phase === 'word' && now >= state.deadline) return { state: { ...state, phase: 'draw', deadline: now + DRAW_MS } };
      // 그리는 사람이 나갔거나 응답이 없으면 (2초 여유) 빈 그림으로 넘어가요
      if (state.phase === 'draw' && now >= state.deadline + 2000) return { state: nextDrawer(state, [], now, state.line[state.di]) };
      if (state.phase === 'guess' && now >= state.deadline) return finish(state, '');
      throw new Error('__noop');
    }
    throw new Error('알 수 없는 동작이에요');
  },

  render(el, { state, me, players, finished, sendMove, room }) {
    const name = (u) => esc(players[u]?.name || '나간 사람');
    const isPlayer = state.order.includes(me);
    const isHost = room?.hostId === me || !players[state.host];
    const now = Date.now();
    const drawer = state.phase === 'draw' ? state.line[state.di] : null;
    const knocking = state.knock && now - state.knock.at < KNOCK_MS ? state.knock : null;
    const entry = state.word != null ? entryOf(state.word) : null;

    if (room && state.knock) soundEvent(room.code, `dr:${room.startedAt}:${state.round}:knock${state.knock.di}`, 'knock');
    if (room && ['result', 'done'].includes(state.phase) && state.history.length) soundEvent(room.code, `dr:${room.startedAt}:${state.round}:res`, state.correct ? 'ok' : 'no');

    // 자리: 정해진 뒤에는 [출제자 … 정답자], 정하기 전에는 입장 순서
    const seats = state.guesser ? [...state.line, state.guesser] : state.order;
    const seat = (u, i) => {
      const role = !state.guesser ? '' : i === 0 ? 'q' : u === state.guesser ? 'a' : '';
      const draw = u === drawer && (!knocking || knocking.uid !== u);
      const done = state.guesser && u !== state.guesser && state.line.indexOf(u) < state.di;
      const pickable = state.phase === 'choose' && isHost;
      const tag = role === 'q' ? '<em class="dr-tag q">✏️ 출제자</em>' : role === 'a' ? '<em class="dr-tag a">🙋 정답자</em>' : '<em class="dr-tag none"></em>';
      const status = ['ready', 'result'].includes(state.phase) && state.ready[u] ? '<i class="dr-st ok">준비 ✔</i>'
        : draw ? '<i class="dr-st draw">그리는 중…</i>' : done ? '<i class="dr-st ok">완성 ✔</i>'
        : u === state.guesser && state.phase === 'guess' ? '<i class="dr-st draw">고민 중…</i>' : '';
      return `${i > 0 ? '<i class="dr-wall"></i>' : ''}<${pickable ? 'button' : 'div'} class="dr-seat ${role} ${draw ? 'drawing' : ''} ${knocking?.uid === u ? 'knock' : ''} ${u === me ? 'me' : ''}" ${pickable ? `data-pick="${esc(u)}"` : ''}>
        ${tag}<b class="dr-nm">${name(u)}</b>
        ${sitHtml(players[u], { uid: u, robe: ROBES[state.order.indexOf(u) % ROBES.length], me: u === me, body: { src: `/img/drawrelay/body${(state.order.indexOf(u) % 6) + 1}.webp`, fy: BODY_FY[state.order.indexOf(u) % 6] } })}
        ${draw ? '<span class="dr-pen">✏️</span>' : ''}${knocking?.uid === u ? '<span class="dr-knock">똑똑!<i>✊</i></span>' : ''}
        ${status}
      </${pickable ? 'button' : 'div'}>`;
    };

    let info = '';
    if (state.phase === 'ready') info = `모두 준비를 누르면 시작해요 · 준비 ${Object.keys(state.ready).length} / ${state.order.length}`;
    else if (state.phase === 'choose') info = isHost ? '💬 이야기를 나눠 보고, <b>이번 라운드 정답자</b>를 눌러 골라 주세요' : '💬 방장이 이번 라운드 정답자를 고르는 중…';
    else if (state.phase === 'word') info = `<b>${name(state.line[0])}</b>님이 제시어를 확인하는 중…`;
    else if (state.phase === 'draw') info = `🎨 <b>${name(drawer)}</b>님이 그리는 중! (${state.di + 1}/${state.line.length}번째)`;
    else if (state.phase === 'guess') info = `🙋 <b>${name(state.guesser)}</b>님이 그림을 보고 정답을 고민하는 중…`;

    const showResult = ['result', 'done'].includes(state.phase) || (finished && state.history.length);
    const result = showResult ? `<div class="dr-res ${state.correct ? 'ok' : 'no'}">
        <div class="dr-shout"><small>${name(state.guesser)}님의 정답!</small><b>“${esc(state.answer || '…시간 초과')}”</b></div>
        <span class="dr-ox">${state.correct ? 'O' : 'X'}</span>
        <div class="dr-resw"><small>제시어</small><b>${esc(entry?.word || '')}</b><em>${state.correct ? `모두 +${PTS}점` : `모두 −${PTS}점`}</em></div>
        <div class="dr-resboard">${boardHtml('res')}</div>
      </div>` : '';

    const timer = ['word', 'draw', 'guess'].includes(state.phase) ? `<div class="dk-timer"><span>⏱ <b data-left>10</b>초</span><div class="dk-bar2"><i data-bar></i></div></div>` : '';
    const gNow = garnetsFor(state.score);
    const head = `<div class="dk-head"><span>ROUND <b>${Math.max(1, state.round)}</b> / ${state.rounds}</span><span class="dk-score ${state.score < 0 ? 'minus' : ''}">팀 점수 <b>${state.score}</b> · ${GARNET}${gNow > 0 ? '+' : ''}${gNow}</span></div>`;
    const hist = state.history.length ? `<div class="dk-hist">${state.history.map((h) => `<span class="${h.correct ? 'ok' : 'no'}">${h.round}R ${esc(h.word)} ${h.correct ? '⭕' : '❌'}</span>`).join('')}</div>` : '';
    let foot = '';
    if (finished || state.phase === 'done') {
      const g = garnetsFor(state.score);
      foot = `<div class="dk-final ${g > 0 ? 'ok' : g < 0 ? 'no' : ''}"><b>${g > 0 ? '🎉 협동 성공!' : g < 0 ? '😢 협동 실패' : '🙂 본전'}</b><span>팀 점수 ${state.score}점 → 모두 ${g ? `${GARNET}${g > 0 ? '+' : '−'}${Math.abs(g)}` : '가넷 변동 없음'}</span></div>`;
    } else if (isPlayer && ['ready', 'result'].includes(state.phase)) {
      const r = state.ready[me];
      foot = `<button class="dk-go" data-ready ${r ? 'disabled' : ''}>${r ? '다른 사람 기다리는 중…' : state.phase === 'ready' ? '준비' : '다음 라운드 준비 →'}</button>`;
    }
    const chatOk = isPlayer && !this.chatBlock(state, me);

    el.innerHTML = `<div class="dr">
      ${head}
      <div class="dr-show">
        <div class="dr-lights"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
        <div class="dr-title">🎨 그림 이어그리기</div>
        ${info ? `<div class="dr-info">${info}</div>` : ''}
        ${timer}
        <div class="dr-row n${seats.length}">${seats.map(seat).join('')}</div>
        <div class="dr-desk"></div>
      </div>
      ${result}
      ${foot}
      ${hist}
      ${chatOk ? chatFormHtml() : isPlayer && !finished ? '<div class="dr-mute">🤫 출제자는 정답이 나올 때까지 채팅할 수 없어요</div>' : ''}
    </div>`;
    if (showResult) paintInto(el.querySelector('.dr-cv.res'), state.strokes);

    el.querySelector('[data-ready]')?.addEventListener('click', () => sendMove({ type: 'ready' }));
    el.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => sendMove({ type: 'pick', target: b.dataset.pick })));
    bindChat(el);

    // 타이머 (모두가 시간이 다 되면 넘기기를 도와요)
    if (timer) {
      const $l = el.querySelector('[data-left]'), $bar = el.querySelector('[data-bar]');
      const total = state.phase === 'word' ? WORD_MS : state.phase === 'guess' ? GUESS_MS : DRAW_MS;
      const myIndex = Math.max(0, state.order.indexOf(me));
      let lastTick = 0;
      const update = () => {
        if (!el.isConnected) return clearInterval(iv);
        const left = Math.max(0, Math.min(total, state.deadline - Date.now()));
        $l.textContent = Math.ceil(left / 1000);
        $bar.style.width = `${(left / total) * 100}%`;
        $l.closest('.dk-timer').classList.toggle('hurry', left <= 3000);
        const n = Date.now(), grace = state.phase === 'draw' ? 2300 : 300;
        if (n - state.deadline > grace + myIndex * 300 && n - lastTick > 2000) { lastTick = n; sendMove({ type: 'tick' }, { silent: true }); }
      };
      const iv = setInterval(update, 250);
      update();
    }

    // ── 나에게 뜨는 창 ──
    if (typeof document === 'undefined' || !room) return;
    const key = `${room.code}:${room.startedAt}:${state.round}:${state.phase}:${state.di}`;
    let want = '';
    if (!finished && state.phase === 'word' && state.line[0] === me) want = 'word';
    else if (!finished && state.phase === 'draw' && drawer === me) want = 'draw';
    else if (!finished && state.phase === 'guess' && state.guesser === me) want = 'guess';
    if (!want) { closePop(); return; }
    if (pop && pop.key === key) return;
    closePop();
    const $p = document.createElement('div');
    $p.className = `dr-pop ${want}`;
    document.body.appendChild($p);
    pop = { key, el: $p, iv: 0 };
    const delay = Math.max(0, (state.knock?.at || 0) + KNOCK_MS - Date.now());

    if (want === 'word') {
      $p.innerHTML = `<div class="dr-card"><small>🤫 나만 보는 제시어</small><b class="dr-word">${esc(entry.word)}</b>
        <p>확인을 누르면 <b>10초</b> 동안 그림을 그려요.<br>글자나 숫자는 쓰지 말고 그림으로만!</p>
        <button class="btn primary block" data-ok>확인</button></div>`;
      $p.querySelector('[data-ok]').onclick = () => sendMove({ type: 'start' });
      return;
    }
    if (want === 'guess') {
      $p.innerHTML = `<div class="dr-card wide"><small>🙋 완성된 그림을 보고 정답을 맞혀요!</small>
        ${boardHtml('g')}
        <form class="dr-ans"><input maxlength="20" placeholder="정답 입력" autocomplete="off" enterkeyhint="send"><button class="btn primary">확인</button></form>
        <div class="dk-timer"><span>⏱ <b data-pl>30</b>초</span><div class="dk-bar2"><i data-pb></i></div></div></div>`;
      paintInto($p.querySelector('canvas'), state.strokes);
      const $f = $p.querySelector('form'), $in = $f.querySelector('input');
      setTimeout(() => $in.focus({ preventScroll: true }), 80);
      $f.onsubmit = (e) => { e.preventDefault(); const v = $in.value.trim(); if (v) sendMove({ type: 'guess', text: v }); };
      const $l = $p.querySelector('[data-pl]'), $b = $p.querySelector('[data-pb]');
      pop.iv = setInterval(() => { const left = Math.max(0, Math.min(GUESS_MS, state.deadline - Date.now())); $l.textContent = Math.ceil(left / 1000); $b.style.width = `${(left / GUESS_MS) * 100}%`; }, 250);
      return;
    }

    // 그리기 화이트보드
    $p.innerHTML = `<div class="dr-wb">
      <div class="dr-wbtop"><span>${state.di === 0 ? `제시어 <b>${esc(entry.word)}</b>` : `<b>${state.di}</b>명이 그린 그림을 이어서 그려요`}</span>
        <span class="dr-wbt">⏱ <b data-wl>10</b>초</span></div>
      <div class="dk-bar2 dr-wbbar"><i data-wb></i></div>
      <div class="dr-wbmain">
        ${boardHtml('w')}
        <div class="dr-tools">
          ${['가는펜', '중간펜', '두꺼운펜'].map((t, i) => `<button class="dr-tool pen ${i === 1 ? 'on' : ''}" data-tool="${i}" title="${t}"><img src="/img/drawrelay/pen${i + 1}.webp" alt=""><small>${t}</small></button>`).join('')}
          <button class="dr-tool eraser" data-tool="e" title="지우개"><img src="/img/drawrelay/eraser.webp" alt=""><small>지우개</small></button>
          <button class="dr-tool undo" data-undo title="되돌리기"><span>↩</span><small>되돌리기</small></button>
        </div>
      </div>
      <button class="btn primary block dr-done" data-done>✅ 완성!</button>
      ${delay ? '<div class="dr-wait">똑똑! 이어받는 중…</div>' : ''}
    </div>`;
    const $c = $p.querySelector('canvas');
    const cx = $c.getContext('2d');
    const mine = [];
    let tool = '1', cur = null, sent = false;
    const redraw = () => { paintInto($c, [...state.strokes, ...mine, ...(cur ? [cur.k + ':' + cur.p.join(',')] : [])]); };
    redraw();
    const pt = (e) => { const r = $c.getBoundingClientRect(); return [Math.round(((e.clientX - r.left) / r.width) * BW), Math.round(((e.clientY - r.top) / r.height) * BH)]; };
    const ready = () => Date.now() >= (state.knock?.at || 0) + KNOCK_MS;
    $c.addEventListener('pointerdown', (e) => {
      if (sent || !ready()) return;
      e.preventDefault(); $c.setPointerCapture(e.pointerId);
      cur = { k: tool, p: pt(e) }; redraw();
    });
    $c.addEventListener('pointermove', (e) => {
      if (!cur) return;
      const [x, y] = pt(e), n = cur.p.length;
      if (Math.abs(x - cur.p[n - 2]) + Math.abs(y - cur.p[n - 1]) < 3) return;
      cur.p.push(x, y);
      // 마지막 선분만 이어 그리기
      cx.save(); cx.lineCap = 'round'; cx.lineJoin = 'round';
      const s = $c.width / BW;
      cx.strokeStyle = cur.k === 'e' ? '#fff' : '#1d1d24'; cx.lineWidth = (cur.k === 'e' ? ERASER : PENS[+cur.k]) * s;
      cx.beginPath(); cx.moveTo(cur.p[n - 2] * s, cur.p[n - 1] * s); cx.lineTo(x * s, y * s); cx.stroke(); cx.restore();
    });
    const end = () => { if (!cur) return; if (mine.length < 120) mine.push(cur.k + ':' + cur.p.slice(0, 1200).join(',')); cur = null; redraw(); };
    $c.addEventListener('pointerup', end); $c.addEventListener('pointercancel', end); $c.addEventListener('pointerleave', end);
    $p.querySelectorAll('[data-tool]').forEach((b) => (b.onclick = () => { tool = b.dataset.tool; $p.querySelectorAll('[data-tool]').forEach((x) => x.classList.toggle('on', x === b)); }));
    $p.querySelector('[data-undo]').onclick = () => { mine.pop(); redraw(); };
    const submit = () => { if (sent) return; end(); sent = true; $p.querySelector('[data-done]').disabled = true; sendMove({ type: 'drew', strokes: mine }); };
    $p.querySelector('[data-done]').onclick = submit;
    const $wl = $p.querySelector('[data-wl]'), $wb = $p.querySelector('[data-wb]');
    pop.iv = setInterval(() => {
      if (ready()) $p.querySelector('.dr-wait')?.remove();
      const left = Math.max(0, Math.min(DRAW_MS, state.deadline - Date.now()));
      $wl.textContent = Math.ceil(left / 1000); $wb.style.width = `${(left / DRAW_MS) * 100}%`;
      $p.querySelector('.dr-wbt').classList.toggle('hurry', left <= 3000);
      if (left <= 150) submit(); // 시간이 다 되면 지금까지 그린 그림으로 자동 완성
    }, 100);
  },
};
