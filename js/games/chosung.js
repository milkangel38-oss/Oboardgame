// 미니게임: 초성퀴즈 (2~8명)
// - 방장이 카테고리(식품 · 영화/드라마 · 노래제목 · 속담/명언)를 고르면 그 카테고리로 10~20라운드
// - 초성을 보고 누구나 먼저 정답을 외쳐요. 정답 +10점, 오답 −5점 + 10초 동안 정답 금지
// - 힌트: 요청하면 다른 모두가 동의해야 받아요. 요청한 사람이 10% · 30% · 50% 중 골라 글자를 공개
// - 채팅은 아바타 위 말풍선으로 보여요
import { GARNET } from '../profile.js';
import { charSvg } from '../avatars.js';
import { soundEvent } from '../sound.js';
import { CATEGORIES } from './chosung-words.js';

const LOCK_MS = 10000;
const REVEAL_MS = 4000;
const BUBBLE_MS = 6000;
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';

const isHangul = (ch) => { const c = ch.charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3; };
export const choOf = (ch) => (isHangul(ch) ? CHO[Math.floor((ch.charCodeAt(0) - 0xac00) / 588)] : ch);
export const norm = (s) => String(s || '').toLowerCase().replace(/[\s.,!?~'"·\-]/g, '');
const shownAnswer = (w) => w.split('|')[0];
export const isCorrect = (word, text) => word.split('|').some((a) => norm(a) === norm(text) && norm(text));

export const rewardsFor = (n) => (n <= 2 ? [2] : n <= 4 ? [2, 2] : n <= 6 ? [3, 2, 1] : [4, 3, 2, 1]);

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const chatPush = (state, entry) => [...state.chat, { ...entry, t: Date.now() }].slice(-30);

function newRound(state, roundNo) {
  return {
    ...state, round: roundNo, phase: 'play', word: state.deck[roundNo - 1], revealed: [],
    hint: null, hintNote: '', solvedBy: '', revealUntil: 0, lockUntil: {},
  };
}

function result(state, players) {
  const rewards = rewardsFor(state.order.length);
  const ranking = state.order
    .map((uid) => ({ uid, score: state.scores[uid] }))
    .sort((a, b) => b.score - a.score)
    .map((r, _, all) => {
      const place = 1 + all.filter((o) => o.score > r.score).length;
      return { ...r, place, garnets: rewards[place - 1] || 0 };
    });
  const top = ranking.filter((r) => r.place === 1).map((r) => players[r.uid]?.name || '?');
  return {
    message: `${top.join(', ')}님 1등! 🏆`,
    winners: ranking.filter((r) => r.place === 1).map((r) => r.uid),
    ranking,
    rewards: Object.fromEntries(ranking.map((r) => [r.uid, r.garnets])),
  };
}

// 아바타 (게임 안에서 쓰는 작은 버전)
function face(p) {
  const photo = p?.photo || '';
  if (photo.startsWith('char:')) { const svg = charSvg(photo.slice(5)); if (svg) return `<span class="cs-face char">${svg}</span>`; }
  if (photo.startsWith('emoji:')) { const [, emo, color] = photo.split(':'); return `<span class="cs-face" style="background:${/^#[0-9a-f]{6}$/i.test(color) ? color : '#555'}">${esc(emo)}</span>`; }
  if (/^(https:|data:image\/)/.test(photo)) return `<img class="cs-face" src="${esc(photo)}" alt="" referrerpolicy="no-referrer">`;
  const colors = ['#ff4f9a', '#ffb02e', '#3ddc84', '#3d7bff', '#9b5cff', '#ff6b4a', '#14c7c7'];
  const hash = [...(p?.uid || p?.name || '')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return `<span class="cs-face" style="background:${colors[hash % colors.length]}">${esc((p?.name || '?')[0])}</span>`;
}

const drafts = {};
let focusKey = '';

export default {
  id: 'chosung',
  name: '초성퀴즈',
  emoji: '🔤',
  category: 'mini',
  minPlayers: 2,
  maxPlayers: 8,
  duration: '10~20분',
  rewards: [4, 3, 2, 1],
  rewardLabel: '1등 최대 +4',
  description: 'ㅊㅅㅋㅈ! 초성 보고 먼저 맞혀라',
  options: [{ key: 'rounds', label: '라운드 수', choices: [10, 15, 20], default: 10 }],
  rules: [
    '게임이 시작되면 방장이 카테고리를 골라요: 🍲 식품 · 🎬 영화/드라마 · 🎵 노래제목 · 📜 속담/명언. 고른 카테고리는 모두에게 보여요.',
    '가운데 나온 초성을 보고 정답을 맞혀요. 제한 시간은 없고, 누구나 먼저 외칠 수 있어요.',
    '정답 +10점, 오답 −5점! 틀리면 10초 동안 정답을 외칠 수 없어요. 띄어쓰기는 상관없어요.',
    '💡 힌트: 힌트 버튼을 누르면 다른 모든 사람에게 동의를 물어요. 한 명이라도 거부하면 힌트를 받을 수 없어요.',
    '모두 동의하면 요청한 사람이 10% · 30% · 50% 중 골라 그만큼 글자를 공개해요.',
    '아무도 못 맞히면 방장이 문제를 넘길 수 있어요 (점수 없음).',
    '채팅을 치면 내 아바타 위에 말풍선으로 보여요.',
    '가넷: 2명 → 1등 2개 / 3~4명 → 1·2등 2개 / 5~6명 → 1등 3 · 2등 2 · 3등 1 / 7~8명 → 1등 4 · 2등 3 · 3등 2 · 4등 1',
  ],

  setup(players, room) {
    const order = players.map((p) => p.uid);
    const rounds = [10, 15, 20].includes(Number(room?.options?.rounds)) ? Number(room.options.rounds) : 10;
    return {
      order, host: room?.hostId || order[0], rounds, round: 0, phase: 'pick', category: null, deck: [],
      scores: Object.fromEntries(order.map((u) => [u, 0])), chat: [], revealed: [], lockUntil: {}, hint: null, hintNote: '',
    };
  },

  move(state, move, uid, players) {
    const now = Date.now();
    const name = (u) => players[u]?.name || '?';

    if (move?.type === 'chat') {
      const text = String(move.text || '').trim().slice(0, 60);
      if (!text) throw new Error('__noop');
      return { state: { ...state, chat: chatPush(state, { uid, text, kind: 'chat' }) } };
    }

    if (move?.type === 'pick') {
      if (state.phase !== 'pick') throw new Error('__noop');
      if (uid !== state.host) throw new Error('방장이 카테고리를 골라요');
      const cat = CATEGORIES[move.cat];
      if (!cat) throw new Error('카테고리를 골라 주세요');
      const deck = shuffle(cat.words).slice(0, state.rounds);
      return { state: newRound({ ...state, category: move.cat, deck, rounds: Math.min(state.rounds, deck.length) }, 1) };
    }

    if (move?.type === 'answer') {
      if (state.phase !== 'play') throw new Error('지금은 정답을 외칠 수 없어요');
      if (!state.order.includes(uid)) throw new Error('참가자가 아니에요');
      const left = (state.lockUntil[uid] || 0) - now;
      if (left > 0) throw new Error(`오답! ${Math.ceil(left / 1000)}초 뒤에 다시 외칠 수 있어요`);
      const text = String(move.text || '').trim().slice(0, 40);
      if (!text) throw new Error('정답을 입력해 주세요');
      if (isCorrect(state.word, text)) {
        return { state: {
          ...state, phase: 'reveal', solvedBy: uid, revealUntil: now + REVEAL_MS, hint: null,
          scores: { ...state.scores, [uid]: state.scores[uid] + 10 },
          chat: chatPush(state, { uid, text, kind: 'right' }),
        } };
      }
      return { state: {
        ...state, scores: { ...state.scores, [uid]: state.scores[uid] - 5 },
        lockUntil: { ...state.lockUntil, [uid]: now + LOCK_MS },
        chat: chatPush(state, { uid, text, kind: 'wrong' }),
      } };
    }

    if (move?.type === 'hint') {
      if (state.phase !== 'play' || state.hint) throw new Error('지금은 힌트를 요청할 수 없어요');
      if (!state.order.includes(uid)) throw new Error('참가자가 아니에요');
      const letters = [...state.word.split('|')[0]].filter(isHangul).length;
      if (state.revealed.length >= letters) throw new Error('이미 모든 글자가 공개됐어요');
      return { state: { ...state, hint: { by: uid, votes: {}, stage: 'vote' }, hintNote: '' } };
    }

    if (move?.type === 'vote') {
      const h = state.hint;
      if (state.phase !== 'play' || !h || h.stage !== 'vote' || uid === h.by || !state.order.includes(uid)) throw new Error('__noop');
      if (!move.ok) return { state: { ...state, hint: null, hintNote: `${name(uid)}님이 힌트를 거부했어요` } };
      const votes = { ...h.votes, [uid]: true };
      const all = state.order.filter((u) => u !== h.by).every((u) => votes[u]);
      return { state: { ...state, hint: { ...h, votes, stage: all ? 'choose' : 'vote' } } };
    }

    if (move?.type === 'hintPick') {
      const h = state.hint;
      if (state.phase !== 'play' || !h || h.stage !== 'choose' || uid !== h.by) throw new Error('__noop');
      const pct = [10, 30, 50].includes(Number(move.pct)) ? Number(move.pct) : 10;
      const chars = [...shownAnswer(state.word)];
      const idx = chars.map((c, i) => (isHangul(c) ? i : -1)).filter((i) => i >= 0);
      const hidden = idx.filter((i) => !state.revealed.includes(i));
      const n = Math.max(1, Math.ceil((idx.length * pct) / 100));
      const pick = shuffle(hidden).slice(0, n);
      return { state: { ...state, hint: null, revealed: [...state.revealed, ...pick], hintNote: `💡 ${name(uid)}님이 ${pct}% 힌트를 열었어요 (${pick.length}글자)` } };
    }

    if (move?.type === 'skip') {
      if (state.phase !== 'play' || uid !== state.host) throw new Error('방장만 문제를 넘길 수 있어요');
      return { state: { ...state, phase: 'reveal', solvedBy: '', revealUntil: now + REVEAL_MS, hint: null } };
    }

    if (move?.type === 'tick') {
      if (state.phase === 'reveal' && now >= state.revealUntil) {
        if (state.round >= state.rounds) {
          const done = { ...state, phase: 'done' };
          return { state: done, result: result(done, players) };
        }
        return { state: newRound(state, state.round + 1) };
      }
      throw new Error('__noop');
    }
    throw new Error('알 수 없는 동작이에요');
  },

  render(el, { state, me, players, finished, sendMove, room }) {
    const name = (u) => esc(players[u]?.name || '나간 사람');
    const isPlayer = state.order.includes(me);
    const isHost = me === state.host;
    const key = `${room?.code}:${state.round}`;
    const cat = state.category ? CATEGORIES[state.category] : null;

    if (!finished && room) {
      if (state.phase === 'reveal' && state.solvedBy) soundEvent(room.code, `cs:${state.round}:ok`, 'ok');
      const last = state.chat[state.chat.length - 1];
      if (last?.kind === 'wrong' && last.uid === me) soundEvent(room.code, `cs:w:${last.t}`, 'no');
    }

    if (finished) {
      const ranking = room?.result?.ranking || result(state, players).ranking;
      el.innerHTML = `
        <div class="cs">
          ${cat ? `<div class="cs-cat">${cat.icon} ${esc(cat.name)}</div>` : ''}
          <ol class="nb-final">
            ${ranking.map((r) => `<li class="${r.uid === me ? 'me' : ''}">
              <span class="nb-place">${r.place <= 3 ? ['🥇', '🥈', '🥉'][r.place - 1] : r.place + '등'}</span>
              <span class="nb-name">${name(r.uid)}</span>
              <span class="nb-score">${r.score}점</span>
              <span class="nb-reward">${r.garnets ? `${GARNET}+${r.garnets}` : ''}</span>
            </li>`).join('')}
          </ol>
        </div>`;
      return;
    }

    // 아바타 + 말풍선
    const now = Date.now();
    const lastSay = {};
    state.chat.forEach((c) => { if (now - c.t < BUBBLE_MS) lastSay[c.uid] = c; });
    const avatars = `
      <div class="cs-players">
        ${state.order.map((u) => {
          const c = lastSay[u];
          const lock = Math.max(0, (state.lockUntil?.[u] || 0) - now);
          return `<div class="cs-p ${u === me ? 'me' : ''} ${state.solvedBy === u ? 'solved' : ''}">
            ${c ? `<span class="cs-bubble ${c.kind}" style="animation-delay:-${now - c.t}ms">${c.kind === 'right' ? '⭕ ' : c.kind === 'wrong' ? '❌ ' : ''}${esc(c.text)}</span>` : ''}
            ${face({ ...players[u], uid: u })}
            <b class="cs-pname">${u === state.host ? '👑' : ''}${name(u)}</b>
            <i class="cs-score ${state.scores[u] < 0 ? 'neg' : ''}">${state.scores[u]}점</i>
            ${lock && state.phase === 'play' ? `<i class="cs-lock" data-lock="${u}">🔒</i>` : ''}
          </div>`;
        }).join('')}
      </div>`;

    const chatBox = isPlayer ? `
      <form class="cs-form" data-chatform>
        <input data-key="chat" maxlength="60" placeholder="채팅 (말풍선으로 보여요)" autocomplete="off">
        <button class="btn">💬</button>
      </form>` : '';

    // 카테고리 고르기
    if (state.phase === 'pick') {
      el.innerHTML = `
        <div class="cs">
          <div class="nb-banner">${isHost ? '<span><b>카테고리를 골라 주세요!</b> 모든 라운드가 이 카테고리로 진행돼요</span>' : `<span><b>${name(state.host)}</b>님(방장)이 카테고리를 고르는 중…</span>`}</div>
          <div class="cs-cats">
            ${Object.entries(CATEGORIES).map(([id, c]) => `<button class="cs-catbtn" data-cat="${id}" ${isHost ? '' : 'disabled'}><span>${c.icon}</span>${esc(c.name)}</button>`).join('')}
          </div>
          ${avatars}
          ${chatBox}
        </div>`;
      bind();
      return;
    }

    // 초성판
    const answer = shownAnswer(state.word);
    const board = [...answer].map((ch, i) => {
      if (ch === ' ') return '<i class="cs-gap"></i>';
      if (!isHangul(ch)) return `<span class="cs-tile other">${esc(ch)}</span>`;
      if (state.phase === 'reveal') return `<span class="cs-tile open">${ch}</span>`;
      if (state.revealed.includes(i)) return `<span class="cs-tile hint">${ch}</span>`;
      return `<span class="cs-tile">${choOf(ch)}</span>`;
    }).join('');

    // 힌트 상태
    const h = state.hint;
    let hintBox = '';
    if (state.phase === 'play') {
      if (h && h.stage === 'vote') {
        const others = state.order.filter((u) => u !== h.by);
        const waiting = others.filter((u) => !h.votes[u]);
        hintBox = h.by === me
          ? `<div class="cs-hint ask">💡 힌트 요청을 보냈어요. 동의 기다리는 중… <small>${waiting.map(name).join(', ')}</small></div>`
          : isPlayer && !h.votes[me]
            ? `<div class="cs-hint ask"><b>${name(h.by)}</b>님이 💡 힌트를 요청했어요. 동의할까요?<div class="cs-hint-acts"><button class="btn primary sm" data-vote="1">👍 동의</button><button class="btn sm" data-vote="0">✋ 거부</button></div></div>`
            : `<div class="cs-hint ask">💡 <b>${name(h.by)}</b>님의 힌트 요청 · 동의 기다리는 중 <small>${waiting.map(name).join(', ')}</small></div>`;
      } else if (h && h.stage === 'choose') {
        hintBox = h.by === me
          ? `<div class="cs-hint ok">모두 동의했어요! 공개할 만큼 고르세요<div class="cs-hint-acts">${[10, 30, 50].map((p) => `<button class="btn primary sm" data-pct="${p}">${p}%</button>`).join('')}</div></div>`
          : `<div class="cs-hint ok">모두 동의! <b>${name(h.by)}</b>님이 힌트 크기를 고르는 중…</div>`;
      } else {
        hintBox = `${state.hintNote ? `<div class="cs-hint note">${esc(state.hintNote)}</div>` : ''}`;
      }
    }

    const myLock = () => Math.max(0, (state.lockUntil?.[me] || 0) - Date.now());
    const banner = state.phase === 'reveal'
      ? (state.solvedBy ? `<span><b>${name(state.solvedBy)}</b>님 정답! <span class="gold">+10점</span></span>` : '<span>문제를 넘겼어요</span>')
      : '<span>초성을 보고 먼저 정답을 외치세요!</span>';

    el.innerHTML = `
      <div class="cs">
        <div class="nb-top">
          <span class="nb-round">ROUND <b>${state.round}</b> / ${state.rounds}</span>
          <span class="cs-cat">${cat.icon} ${esc(cat.name)}</span>
        </div>
        <div class="cs-board ${state.phase === 'reveal' ? 'reveal' : ''}">${board}</div>
        <div class="nb-banner">${banner}</div>
        ${hintBox}
        ${avatars}
        ${isPlayer && state.phase === 'play' ? `
          <form class="cs-form ans" data-ansform>
            <input data-key="ans" maxlength="40" placeholder="정답 입력" autocomplete="off">
            <button class="btn gold-btn">정답!</button>
          </form>
          <div class="cs-lockmsg" data-mylock></div>
          <div class="cs-tools">
            <button class="btn sm" data-hint ${h ? 'disabled' : ''}>💡 힌트 요청</button>
            ${isHost ? '<button class="btn sm ghost" data-skip>⏭ 문제 넘기기</button>' : ''}
          </div>` : ''}
        ${chatBox}
      </div>`;
    bind();

    function bind() {
      el.querySelectorAll('input[data-key]').forEach((inp) => {
        const k = `${room?.code}:${inp.dataset.key}`;
        if (drafts[k] !== undefined) inp.value = drafts[k];
        inp.oninput = () => { drafts[k] = inp.value; };
        inp.onfocus = () => { focusKey = k; };
        inp.onblur = () => setTimeout(() => { if (inp.isConnected && focusKey === k) focusKey = ''; }, 0);
        if (focusKey === k) inp.focus();
      });
      el.querySelectorAll('[data-cat]').forEach((b) => (b.onclick = () => sendMove({ type: 'pick', cat: b.dataset.cat })));
      const $chat = el.querySelector('[data-chatform]');
      if ($chat) $chat.onsubmit = (e) => {
        e.preventDefault();
        const inp = $chat.querySelector('input');
        const text = inp.value.trim();
        if (!text) return;
        drafts[`${room?.code}:chat`] = ''; inp.value = '';
        sendMove({ type: 'chat', text });
      };
      const $ans = el.querySelector('[data-ansform]');
      if ($ans) $ans.onsubmit = (e) => {
        e.preventDefault();
        const inp = $ans.querySelector('input');
        const text = inp.value.trim();
        if (!text) return;
        if (myLock()) return;
        drafts[`${room?.code}:ans`] = ''; inp.value = '';
        sendMove({ type: 'answer', text });
      };
      el.querySelector('[data-hint]')?.addEventListener('click', () => sendMove({ type: 'hint' }));
      el.querySelector('[data-skip]')?.addEventListener('click', () => sendMove({ type: 'skip' }));
      el.querySelectorAll('[data-vote]').forEach((b) => (b.onclick = () => sendMove({ type: 'vote', ok: b.dataset.vote === '1' })));
      el.querySelectorAll('[data-pct]').forEach((b) => (b.onclick = () => sendMove({ type: 'hintPick', pct: Number(b.dataset.pct) })));
    }

    // 잠금 표시 · 다음 라운드 진행
    const $lock = el.querySelector('[data-mylock]');
    const myIndex = Math.max(0, state.order.indexOf(me));
    let lastTick = 0;
    const update = () => {
      if (!el.isConnected) return clearInterval(timer);
      const l = myLock();
      if ($lock) $lock.textContent = l ? `🔒 오답! ${Math.ceil(l / 1000)}초 뒤에 다시 외칠 수 있어요` : '';
      el.querySelectorAll('[data-lock]').forEach((i) => { if ((state.lockUntil?.[i.dataset.lock] || 0) <= Date.now()) i.remove(); });
      const n = Date.now();
      if (state.phase === 'reveal' && n >= state.revealUntil && n - lastTick > 2000 && n - state.revealUntil > 300 + myIndex * 300) {
        lastTick = n;
        sendMove({ type: 'tick' }, { silent: true });
      }
    };
    const timer = setInterval(update, 250);
    update();
  },
};
