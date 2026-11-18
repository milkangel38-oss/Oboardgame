// 예능: 동상이몽퀴즈 (협동, 4~8명)
// 정답자 1명을 뺀 모두가 제시어를 보고 키워드를 하나씩 써요. 겹친 키워드는 정답자에게 가려지고,
// 정답자는 남은 키워드만 보고 제시어를 맞혀요. 맞히면 모두 +10, 틀리면 모두 −10.
import { GARNET } from '../profile.js';
import { soundEvent } from '../sound.js';
import { charSvg } from './assassin.js';
import { WORDS } from './dongsang-words.js';

const WRITE_MS = 30000;
const GUESS_MS = 30000;
const PTS = 10;
const COLORS = ['#ff4f6e', '#3d7bff', '#3ddc84', '#ffb02e', '#b26bff', '#2ee6d6', '#ff8ad8', '#e8cf8a'];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const norm = (s) => String(s || '').replace(/\s+/g, '').toLowerCase();
const subs2 = (s) => { const out = new Set(); for (let i = 0; i + 2 <= s.length; i++) out.add(s.slice(i, i + 2)); return out; };

// 키워드에 제시어 일부가 들어 있나? (제시어가 한 글자면 그 글자, 아니면 연속 2글자)
export function containsWord(keyword, word) {
  const k = norm(keyword), w = norm(word);
  if (!k || !w) return false;
  if (w.length === 1) return k.includes(w);
  if (k.includes(w) || w.includes(k) && k.length >= 2) return true;
  return [...subs2(w)].some((p) => k.includes(p));
}
// 두 키워드가 겹치나? (연속 2글자 이상 같거나, 한 글자 키워드끼리 같으면)
export function overlaps(a, b) {
  const x = norm(a), y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if (x.length < 2 || y.length < 2) return false;
  const sx = subs2(x);
  return [...subs2(y)].some((p) => sx.has(p));
}
export function hiddenOf(keywords) {
  const ids = Object.keys(keywords).filter((u) => norm(keywords[u]));
  const hidden = {};
  ids.forEach((a) => ids.forEach((b) => { if (a < b && overlaps(keywords[a], keywords[b])) { hidden[a] = true; hidden[b] = true; } }));
  return hidden;
}
export const isRight = (answer, entry) => [entry.word, ...(entry.alias || [])].some((w) => norm(w) === norm(answer));
export const garnetsFor = (score, rounds) => (score >= rounds * PTS ? rounds : score < 0 ? -rounds : 0);

function newRound(state, now) {
  return { ...state, round: state.round + 1, phase: 'choose', readyAt: now, ready: {}, guesser: null, word: null, keywords: {}, hidden: {}, answer: '', correct: null, deadline: 0 };
}
function pickWord(state) {
  const pool = WORDS.map((_, i) => i).filter((i) => !state.used.includes(i));
  const i = (pool.length ? pool : WORDS.map((_, j) => j))[Math.floor(Math.random() * (pool.length || WORDS.length))];
  return i;
}
const writers = (s) => s.order.filter((u) => u !== s.guesser);
function reveal(state, now) {
  return { ...state, phase: 'guess', hidden: hiddenOf(state.keywords), deadline: now + GUESS_MS };
}
function finish(state, answer, players) {
  const entry = WORDS[state.word];
  const correct = !!answer && isRight(answer, entry);
  const score = state.score + (correct ? PTS : -PTS);
  const history = [...state.history, { round: state.round, word: entry.word, guesser: state.guesser, answer, correct }];
  const s = { ...state, phase: 'result', answer, correct, score, history, deadline: 0, ready: {} };
  if (s.round >= s.rounds) {
    const done = { ...s, phase: 'done' };
    return { state: done, result: finalResult(done, players) };
  }
  return { state: s };
}
function finalResult(state) {
  const g = garnetsFor(state.score, state.rounds);
  const ranking = state.order.map((uid) => ({ uid, score: state.score, place: 1, garnets: g }));
  const hits = state.history.filter((h) => h.correct).length;
  return {
    message: g > 0 ? `협동 성공! ${hits}/${state.rounds} 모두 맞혔어요 🎉` : g < 0 ? `아쉬워요… ${hits}/${state.rounds} 맞혔어요` : `${hits}/${state.rounds} 맞혔어요`,
    winners: g > 0 ? [...state.order] : [],
    ranking,
    rewards: Object.fromEntries(state.order.map((u) => [u, g])),
  };
}

// ── 입력 바: 화면 아래 고정 (다른 사람이 제출해 화면이 다시 그려져도 입력이 끊기지 않게) ──
let bar = null;
function ensureBar(code) {
  if (bar && bar.code === code && bar.el.isConnected) return bar;
  bar?.el.remove();
  const el = document.createElement('form');
  el.className = 'dk-bar';
  el.innerHTML = '<input maxlength="15" autocomplete="off" enterkeyhint="send" /><button>제출</button>';
  document.body.appendChild(el);
  bar = { code, el, send: null, mode: '' };
  el.addEventListener('submit', (e) => {
    e.preventDefault();
    const $i = el.querySelector('input');
    const text = $i.value.trim();
    if (!text || !bar.send) return;
    bar.send(text); // 성공하면 화면이 바뀌며 입력창이 비워지고, 실패하면(제시어 포함 등) 고쳐 쓸 수 있게 그대로 둬요
  });
  // 방을 나가면 치우기
  const watch = setInterval(() => {
    if (!document.querySelector('.dk')) { if (++bar.gone > 3) { clearInterval(watch); el.remove(); if (bar?.el === el) bar = null; } }
    else if (bar) bar.gone = 0;
  }, 500);
  bar.gone = 0;
  return bar;
}

export default {
  id: 'dongsang',
  name: '동상이몽퀴즈',
  emoji: '🪧',
  category: 'variety',
  minPlayers: 4,
  maxPlayers: 8,
  duration: '10~20분',
  coopGame: true,
  rewards: [10],
  rewardLabel: '전원 성공 시 +라운드 수',
  description: '같은 제시어, 다른 생각! 안 겹치는 키워드로 정답자를 도와라',
  options: [{ key: 'rounds', label: '라운드 수', choices: [5, 6, 7, 8, 9, 10], default: 5 }],
  rules: [
    '모두 준비를 누르면, 이야기를 나눠 방장이 이번 라운드의 정답자를 골라요.',
    '정답자를 뺀 모두에게 제시어가 공개돼요. 30초 안에 제시어를 떠올릴 수 있는 키워드를 하나씩 써서 제출해요.',
    '키워드에 제시어의 일부(연속 2글자)가 들어가면 제출할 수 없어요.',
    '다른 사람과 키워드가 겹치면(연속 2글자 이상 같으면) 그 키워드들은 정답자에게 보이지 않아요. 서로 안 겹치게 써야 해요!',
    '모두 제출하면 정답자가 남은 키워드를 보고 30초 안에 정답을 입력해요.',
    `맞히면 모두 +${PTS}점, 틀리면 모두 −${PTS}점 (협동게임이라 점수는 모두 같아요).`,
    '가넷: 모든 라운드를 맞혀 (라운드 수 × 10)점이 되면 모두 +라운드 수, 최종 점수가 마이너스면 모두 −라운드 수 (가넷 차감이 있어요!)',
  ],

  setup(players, room) {
    const order = players.map((p) => p.uid);
    const rounds = Math.min(10, Math.max(5, Number(room?.options?.rounds) || 5));
    return { order, host: room?.hostId || order[0], rounds, round: 0, phase: 'ready', ready: {}, readyAt: 0, guesser: null, word: null, used: [], keywords: {}, hidden: {}, answer: '', correct: null, score: 0, history: [], deadline: 0 };
  },

  move(state, move, uid, players) {
    const now = Date.now();
    const t = move?.type;
    if (t !== 'tick' && !state.order.includes(uid)) throw new Error('참가자가 아니에요');
    const hostOk = uid === state.host || !players[state.host];

    if (t === 'ready') {
      if (!['ready', 'result'].includes(state.phase)) throw new Error('__noop');
      const ready = { ...state.ready, [uid]: true };
      if (state.order.every((u) => ready[u])) return { state: newRound(state, now) };
      return { state: { ...state, ready } };
    }
    if (t === 'pick') {
      if (state.phase !== 'choose') throw new Error('__noop');
      if (!hostOk) throw new Error('방장만 정답자를 고를 수 있어요');
      if (!state.order.includes(move.target)) throw new Error('고를 수 없는 사람이에요');
      const word = pickWord(state);
      return { state: { ...state, phase: 'write', guesser: move.target, word, used: [...state.used, word], keywords: {}, deadline: now + WRITE_MS } };
    }
    if (t === 'keyword') {
      if (state.phase !== 'write') throw new Error('지금은 키워드를 쓸 수 없어요');
      if (uid === state.guesser) throw new Error('정답자는 키워드를 쓸 수 없어요');
      if (state.keywords[uid]) throw new Error('이미 제출했어요');
      const text = String(move.text || '').trim().slice(0, 15);
      if (!norm(text)) throw new Error('키워드를 입력해 주세요');
      if (containsWord(text, WORDS[state.word].word)) throw new Error('키워드에 제시어의 일부가 들어 있어요! 다른 키워드를 써 주세요');
      const keywords = { ...state.keywords, [uid]: text };
      const s = { ...state, keywords };
      if (writers(s).every((u) => keywords[u])) return { state: reveal(s, now) };
      return { state: s };
    }
    if (t === 'guess') {
      if (state.phase !== 'guess') throw new Error('지금은 정답을 낼 수 없어요');
      if (uid !== state.guesser) throw new Error('정답자만 정답을 낼 수 있어요');
      return finish(state, String(move.text || '').trim().slice(0, 20), players);
    }
    if (t === 'tick') {
      if (state.phase === 'write' && now >= state.deadline) return { state: reveal(state, now) };
      if (state.phase === 'guess' && now >= state.deadline) return finish(state, '', players);
      throw new Error('__noop');
    }
    throw new Error('알 수 없는 동작이에요');
  },

  render(el, { state, me, players, finished, sendMove, room }) {
    const name = (u) => esc(players[u]?.name || '나간 사람');
    const color = (u) => COLORS[state.order.indexOf(u) % COLORS.length];
    const isPlayer = state.order.includes(me);
    const isHost = room?.hostId === me || !players[state.host];
    const amGuesser = me === state.guesser;
    const entry = state.word != null ? WORDS[state.word] : null;
    const seeWord = entry && (!amGuesser || ['result', 'done'].includes(state.phase) || finished);
    const now = Date.now();

    if (!finished && room && state.phase === 'result') soundEvent(room.code, `dk:${state.round}`, state.correct ? 'ok' : 'no');
    if (room && state.phase === 'done' && state.history.length) soundEvent(room.code, `dk:${state.round}`, state.correct ? 'ok' : 'no');

    // 캐릭터 + 화이트보드
    const person = (u) => {
      const isG = u === state.guesser;
      const kw = state.keywords[u];
      let pose = 'idle', board = '', bubble = '';
      if (isG && ['write', 'guess'].includes(state.phase)) {
        pose = state.phase === 'guess' ? 'think' : 'blind';
        bubble = state.phase === 'guess' ? '<span class="dk-think">🤔</span>' : '<span class="dk-think">🙈</span>';
      } else if (isG && ['result', 'done'].includes(state.phase)) {
        pose = 'up';
        board = `<b class="${state.correct ? 'ok' : 'no'}">${esc(state.answer || '…')}</b>`;
      } else if (state.phase === 'write' && !isG) {
        if (kw) { pose = 'up'; board = u === me ? `<b>${esc(kw)}</b>` : '<b class="secret">✔ 제출</b>'; }
        else { pose = 'think'; bubble = '<span class="dk-think dots"><i></i><i></i><i></i></span>'; }
      } else if (['guess', 'result', 'done'].includes(state.phase) && !isG && state.guesser) {
        pose = 'up';
        if (!kw) board = '<b class="none">시간 초과</b>';
        else if (state.hidden[u]) board = amGuesser && state.phase === 'guess' ? '<b class="cover">겹쳐서 가려짐</b>' : `<b class="dup">${esc(kw)}</b><em>겹침</em>`;
        else board = `<b>${esc(kw)}</b>`;
      }
      const pickable = state.phase === 'choose' && isHost;
      return `<${pickable ? 'button' : 'div'} class="dk-p ${pose} ${u === me ? 'me' : ''} ${isG ? 'g' : ''}" ${pickable ? `data-pick="${u}"` : ''} style="--pc:${color(u)}">
        ${bubble}
        <span class="dk-board"><span class="dk-stick"></span><span class="dk-face">${board}</span></span>
        <span class="dk-char">${charSvg(color(u))}</span>
        <span class="dk-nm">${isG ? '<em>정답자</em>' : ''}${name(u)}${['ready', 'result'].includes(state.phase) && state.ready[u] ? ' ✔' : ''}</span>
      </${pickable ? 'button' : 'div'}>`;
    };

    // 위쪽 안내
    let info = '';
    if (state.phase === 'ready') info = `<div class="dk-msg">모두 준비를 누르면 시작해요. 준비한 사람 ${Object.keys(state.ready).length} / ${state.order.length}</div>`;
    else if (state.phase === 'choose') info = `<div class="dk-msg">${isHost ? '💬 이야기를 나눠 보고, <b>이번 라운드 정답자</b>를 눌러 골라 주세요' : '💬 방장이 이번 라운드 정답자를 고르는 중…'}</div>`;
    else if (state.phase === 'write') {
      const left = writers(state).filter((u) => !state.keywords[u]).length;
      info = amGuesser
        ? `<div class="dk-word secret">제시어는 비밀! 🙈<small>다른 사람들이 키워드를 쓰는 중… (남은 사람 ${left}명)</small></div>`
        : `<div class="dk-word"><small>제시어</small>${esc(entry.word)}<small>${state.keywords[me] ? `제출 완료! 남은 사람 ${left}명` : '제시어 일부가 들어가지 않게, 다른 사람과 겹치지 않게!'}</small></div>`;
    } else if (state.phase === 'guess') {
      const shown = Object.keys(state.keywords).filter((u) => !state.hidden[u] && norm(state.keywords[u])).length;
      info = amGuesser
        ? `<div class="dk-word guess">정답을 맞혀 보세요!<small>보이는 키워드 ${shown}개 · 아래에 정답을 입력해요</small></div>`
        : `<div class="dk-word"><small>제시어</small>${esc(entry.word)}<small>${name(state.guesser)}님이 정답을 고민하는 중… (보이는 키워드 ${shown}개)</small></div>`;
    } else if (['result', 'done'].includes(state.phase) || finished) {
      info = `<div class="dk-res ${state.correct ? 'ok' : 'no'}">
        <span class="dk-ox">${state.correct ? 'O' : 'X'}</span>
        <div><small>제시어</small><b>${esc(entry?.word || '')}</b><small>${name(state.guesser)}님의 답: ${esc(state.answer || '(시간 초과)')}</small></div>
        <em>${state.correct ? `모두 +${PTS}점` : `모두 −${PTS}점`}</em></div>`;
    }

    const timer = ['write', 'guess'].includes(state.phase) ? `<div class="dk-timer"><span>⏱ <b data-left>30</b>초</span><div class="dk-bar2"><i data-bar></i></div></div>` : '';
    const target = state.rounds * PTS;
    const head = `<div class="dk-head"><span>ROUND <b>${Math.max(1, state.round)}</b> / ${state.rounds}</span><span class="dk-score ${state.score < 0 ? 'minus' : ''}">팀 점수 <b>${state.score}</b> / ${target}</span></div>`;
    const hist = state.history.length ? `<div class="dk-hist">${state.history.map((h) => `<span class="${h.correct ? 'ok' : 'no'}">${h.round}R ${esc(h.word)} ${h.correct ? '⭕' : '❌'}</span>`).join('')}</div>` : '';

    let foot = '';
    if (finished || state.phase === 'done') {
      const g = garnetsFor(state.score, state.rounds);
      foot = `<div class="dk-final ${g > 0 ? 'ok' : g < 0 ? 'no' : ''}"><b>${g > 0 ? '🎉 협동 성공!' : g < 0 ? '😢 협동 실패' : '🙂 무승부'}</b>
        <span>팀 점수 ${state.score}점 (목표 ${target}점) → 모두 ${g ? `${GARNET}${g > 0 ? '+' : '−'}${Math.abs(g)}` : '가넷 변동 없음'}</span></div>`;
    } else if (isPlayer && ['ready', 'result'].includes(state.phase)) {
      const r = state.ready[me];
      foot = `<button class="dk-go" data-ready ${r ? 'disabled' : ''}>${r ? '다른 사람 기다리는 중…' : state.phase === 'ready' ? '준비' : '다음 라운드 준비 →'}</button>`;
    }

    // 가넷 차감 안내 (첫 라운드, 모두 준비한 순간)
    const warn = state.round === 1 && state.phase === 'choose' && now - state.readyAt < 3500
      ? `<div class="dk-warn"><b>⚠️ 본 게임은 가넷 차감이 있어요</b><small>최종 점수가 마이너스면 모두 가넷 ${state.rounds}개가 차감돼요</small></div>` : '';

    el.innerHTML = `<div class="dk">${head}${info}${timer}<div class="dk-stage">${state.order.map(person).join('')}${warn}</div>${foot}${hist}</div>`;
    if (warn) setTimeout(() => el.querySelector('.dk-warn')?.remove(), Math.max(0, 3500 - (Date.now() - state.readyAt)));

    el.querySelector('[data-ready]')?.addEventListener('click', () => sendMove({ type: 'ready' }));
    el.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => sendMove({ type: 'pick', target: b.dataset.pick })));

    // 입력 바
    if (typeof document !== 'undefined' && room) {
      const b = ensureBar(room.code);
      let mode = '';
      if (!finished && state.phase === 'write' && isPlayer && !amGuesser && !state.keywords[me]) mode = 'keyword';
      if (!finished && state.phase === 'guess' && amGuesser) mode = 'guess';
      const $i = b.el.querySelector('input');
      b.el.style.display = mode ? '' : 'none';
      if (b.mode !== mode) {
        b.mode = mode;
        $i.value = '';
        $i.placeholder = mode === 'guess' ? '정답 입력' : '키워드 입력 (한 단어)';
        b.el.querySelector('button').textContent = mode === 'guess' ? '정답!' : '제출';
        if (mode) setTimeout(() => $i.focus({ preventScroll: true }), 50);
      }
      b.send = (text) => sendMove({ type: mode === 'guess' ? 'guess' : 'keyword', text });
    }

    // 타이머
    if (timer) {
      const $l = el.querySelector('[data-left]'), $bar = el.querySelector('[data-bar]');
      const total = state.phase === 'write' ? WRITE_MS : GUESS_MS;
      const myIndex = Math.max(0, state.order.indexOf(me));
      let lastTick = 0;
      const update = () => {
        if (!el.isConnected) return clearInterval(iv);
        const left = Math.max(0, state.deadline - Date.now());
        $l.textContent = Math.ceil(left / 1000);
        $bar.style.width = `${(left / total) * 100}%`;
        $l.closest('.dk-timer').classList.toggle('hurry', left <= 5000);
        const n = Date.now();
        if (left <= 0 && n - lastTick > 2000 && n - state.deadline > 300 + myIndex * 300) { lastTick = n; sendMove({ type: 'tick' }, { silent: true }); }
      };
      const iv = setInterval(update, 250);
      update();
    }
  },
};
