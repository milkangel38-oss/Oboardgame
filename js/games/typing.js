// 예능: 타이핑 퀴즈 (6~10명, 팀전)
// - 무작위로 잘생긴팀 vs 못생긴팀, 팀장도 무작위
// - 라운드마다 두 팀에서 한 명씩 설명자(팀장부터 차례로). 둘 다 같은 제시어를 보고 설명을 타이핑
// - 설명에 제시어(또는 제시어의 절반 이상 이어진 부분)가 들어가면 입력 불가
// - 설명 제한 시간 없음 (방장은 문제 넘기기 가능)
// - 설명자 말고 누구나 정답을 외칠 수 있음. 먼저 맞힌 사람의 팀 +1점. 오답이면 그 팀 10초 잠금
// - 라운드 시작 후 20초 동안 두 설명자가 상대 설명자용 함정단어(최대 3개)를 설치
//   상대 설명에 함정단어가 들어가면 "함정단어입니다" — 보낼 수 없음. 라운드가 끝나면 함정 공개
// - 맞히는 사람들의 채팅은 모두에게 보이고, 팀 캐릭터 옆 말풍선으로 나옴 (설명자는 채팅 없음)
// - 라운드(5~10) 후 이긴 팀 모두 가넷 +2
import { soundEvent } from '../sound.js';
import { GARNET } from '../profile.js';
import { WORDS, mainWord, allAnswers } from './typing-words.js';

const LOCK_MS = 10000;
const REVEAL_MS = 5000;
const REWARD = 2;
const MAX_LINE = 60;
const MAX_CHAT = 80;
const TRAP_MS = 20000;   // 함정 설치 시간
const MAX_TRAPS = 3;     // 설명자 한 명당 함정 수
export const TEAM = {
  A: { name: '잘생긴팀', short: '잘생김', color: '#3ee6ff' },
  B: { name: '못생긴팀', short: '못생김', color: '#ffb02e' },
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const norm = (s) => String(s ?? '').replace(/\s+/g, '').toLowerCase();
// 설명에 쓸 수 없는 부분: 제시어(·같이 인정하는 답)의 절반 이상 길이로 이어진 모든 부분
// 예) 번아웃 → 번아, 아웃 / 와신상담 → 와신, 신상, 상담 / 두 글자 제시어는 단어 전체만
export function forbiddenParts(entry) {
  const parts = new Set();
  for (const w of allAnswers(entry).map(norm)) {
    const k = Math.max(2, Math.ceil(w.length / 2));
    if (w.length <= k) { parts.add(w); continue; }
    for (let i = 0; i + k <= w.length; i++) parts.add(w.slice(i, i + k));
  }
  return [...parts];
}
// 설명에 금지된 부분이 있으면 그 부분을, 없으면 '' 를 돌려줘요
export const forbiddenIn = (text, entry) => forbiddenParts(entry).find((p) => norm(text).includes(p)) || '';
export const hasWord = (text, entry) => !!forbiddenIn(text, entry);
// 상대 팀이 설치한 함정단어가 들어 있는지
const other = (t) => (t === 'A' ? 'B' : 'A');
export const trapIn = (text, traps) => (traps || []).find((w) => norm(text).includes(w)) || '';

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

function pickWord(used) {
  const pool = WORDS.filter((w) => !used.includes(w));
  const list = pool.length ? pool : WORDS;
  return list[Math.floor(Math.random() * list.length)];
}

function newRound(state, roundNo, now) {
  const word = pickWord(state.usedWords);
  const describers = {
    A: state.teams.A[(roundNo - 1) % state.teams.A.length],
    B: state.teams.B[(roundNo - 1) % state.teams.B.length],
  };
  return {
    ...state, round: roundNo, phase: 'trap', trapUntil: now + TRAP_MS, traps: { A: [], B: [] }, trapDone: { A: false, B: false },
    word, usedWords: [...state.usedWords, word],
    describers, lines: [], chat: [], wrong: [], lockUntil: { A: 0, B: 0 },
    revealUntil: 0, solvedBy: '', solvedTeam: '', skipped: false,
  };
}

export const teamOf = (state, uid) => (state.teams.A.includes(uid) ? 'A' : state.teams.B.includes(uid) ? 'B' : null);

export function result(state, players) {
  const { A, B } = state.scores;
  const all = [...state.teams.A, ...state.teams.B];
  if (A === B) {
    return {
      message: `${A} : ${B} 무승부! 가넷 보상이 없어요`, winners: [], draw: true,
      ranking: all.map((u) => ({ uid: u, score: state.scores[teamOf(state, u)], place: 1, garnets: 0 })),
      rewards: Object.fromEntries(all.map((u) => [u, 0])),
    };
  }
  const win = A > B ? 'A' : 'B';
  const ranking = all.map((u) => {
    const t = teamOf(state, u);
    return { uid: u, team: t, score: state.scores[t], place: t === win ? 1 : 2, garnets: t === win ? REWARD : 0 };
  }).sort((x, y) => x.place - y.place);
  return {
    message: `${TEAM[win].name} 승리! (${A} : ${B}) 🎉`,
    winners: state.teams[win],
    ranking,
    rewards: Object.fromEntries(ranking.map((r) => [r.uid, r.garnets])),
  };
}

// ── 가운데 두 캐릭터 (O게임 오리지널) ──
export const HANDSOME = `
<svg viewBox="0 0 120 150" aria-hidden="true">
  <defs><linearGradient id="tq-h-hair" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a2b6b"/><stop offset="1" stop-color="#1b1440"/></linearGradient></defs>
  <path d="M22 150 q4 -38 38 -40 q34 2 38 40 z" fill="#2f6bff"/>
  <path d="M48 112 l12 16 l12 -16 z" fill="#fff"/><path d="M57 118 l3 22 l3 -22 z" fill="#ff4f6e"/>
  <ellipse cx="60" cy="66" rx="34" ry="38" fill="#ffd9be"/>
  <path d="M24 60 q-2 -40 38 -40 q38 0 34 34 q-10 -16 -30 -18 q-14 14 -42 24 z" fill="url(#tq-h-hair)"/>
  <path d="M60 22 q22 -6 30 10 q-14 -6 -26 -2 z" fill="#5a46a8"/>
  <path d="M38 58 q8 -5 16 0 M66 58 q8 -5 16 0" stroke="#2b1d22" stroke-width="3" fill="none" stroke-linecap="round"/>
  <ellipse cx="46" cy="68" rx="4.5" ry="5.5" fill="#2b1d22"/><ellipse cx="74" cy="68" rx="4.5" ry="5.5" fill="#2b1d22"/>
  <circle cx="47.6" cy="66" r="1.8" fill="#fff"/><circle cx="75.6" cy="66" r="1.8" fill="#fff"/>
  <path d="M60 72 q-3 8 1 9" stroke="#e0a07a" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M48 87 q12 10 24 0 q-12 4 -24 0 z" fill="#fff" stroke="#2b1d22" stroke-width="2" stroke-linejoin="round"/>
  <ellipse cx="38" cy="80" rx="5" ry="3" fill="#ff8aa8" opacity=".45"/><ellipse cx="82" cy="80" rx="5" ry="3" fill="#ff8aa8" opacity=".45"/>
  <g fill="#fff6a8"><path d="M100 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z"/><path d="M14 40 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z"/><path d="M104 84 l2 4 4 2 -4 2 -2 4 -2 -4 -4 -2 4 -2 z"/></g>
</svg>`;

export const GOOFY = `
<svg viewBox="0 0 120 150" aria-hidden="true">
  <path d="M22 150 q4 -38 38 -40 q34 2 38 40 z" fill="#5fcf6a"/>
  <path d="M40 116 q20 10 40 0" stroke="#3a9a45" stroke-width="3" fill="none"/>
  <ellipse cx="60" cy="68" rx="36" ry="36" fill="#f6c9a2"/>
  <path d="M34 40 l-6 -14 l12 8 l2 -16 l8 14 l6 -18 l6 18 l8 -12 l0 16 l12 -6 l-6 14 q-24 -10 -42 -4 z" fill="#7a4a1d"/>
  <ellipse cx="24" cy="70" rx="7" ry="10" fill="#f6c9a2"/><ellipse cx="96" cy="70" rx="7" ry="10" fill="#f6c9a2"/>
  <path d="M38 56 q22 -8 44 0" stroke="#3a2412" stroke-width="5" fill="none" stroke-linecap="round"/>
  <circle cx="47" cy="66" r="7" fill="#fff"/><circle cx="73" cy="66" r="9" fill="#fff"/>
  <circle cx="49" cy="67" r="3.6" fill="#2b1d22"/><circle cx="70" cy="64" r="4.2" fill="#2b1d22"/>
  <ellipse cx="60" cy="80" rx="9" ry="7.5" fill="#f0a882"/><ellipse cx="57" cy="78" rx="2.5" ry="1.8" fill="#fff" opacity=".6"/>
  <path d="M42 92 q18 14 36 0" stroke="#2b1d22" stroke-width="2.6" fill="#a8323e" stroke-linejoin="round"/>
  <rect x="55" y="92" width="6" height="7" rx="1" fill="#fff" stroke="#2b1d22" stroke-width="1.4"/>
  <g fill="#c98a5e" opacity=".8"><circle cx="36" cy="80" r="1.6"/><circle cx="40" cy="84" r="1.4"/><circle cx="33" cy="85" r="1.3"/><circle cx="84" cy="80" r="1.6"/><circle cx="80" cy="85" r="1.4"/><circle cx="87" cy="85" r="1.3"/></g>
  <path d="M100 34 q6 4 2 10" stroke="#9ad7ff" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="101" cy="48" r="2.6" fill="#9ad7ff"/>
</svg>`;

// 입력 중인 내용·포커스 유지
const drafts = {};
let focusKey = '';

export default {
  id: 'typing',
  name: '타이핑 퀴즈',
  emoji: '⌨️',
  category: 'variety',
  teamGame: true,
  minPlayers: 6,
  maxPlayers: 10,
  duration: '15~25분',
  rewards: [REWARD],
  rewardLabel: `이긴 팀 +${REWARD}`,
  description: '잘생긴팀 vs 못생긴팀 타이핑 대결!',
  options: [
    { key: 'rounds', label: '라운드 수', choices: [5, 6, 7, 8, 9, 10], default: 5 },
  ],
  rules: [
    '참가자를 무작위로 [잘생긴팀]과 [못생긴팀]으로 나누고, 팀장도 무작위로 정해요.',
    '라운드마다 두 팀에서 한 명씩 설명자가 나와요. 팀장부터 시작해서 팀원들이 차례로 맡아요.',
    '두 설명자는 같은 제시어를 보고 설명을 타이핑해요. 설명은 모두에게 보여요.',
    '설명에 제시어가 들어가면 입력되지 않아요. 설명자 말고는 아무도 제시어를 볼 수 없어요.',
    '설명에 제시어는 물론, 제시어의 절반 이상이 이어진 부분도 쓸 수 없어요. (예: 번아웃 → "아웃" 금지)',
    `🪤 라운드 시작 후 ${TRAP_MS / 1000}초 동안 설명자는 상대 설명자용 함정단어를 최대 ${MAX_TRAPS}개 설치해요. 상대가 그 단어를 쓰면 "함정단어입니다"가 뜨고 설명할 수 없어요.`,
    '설명자 말고 누구나 정답을 외칠 수 있어요. 먼저 맞힌 사람의 팀이 1점!',
    '제시어는 사자성어, 의학·경제·과학·법 용어, 어려운 단어 중에서 나와요.',
    '맞히는 사람들은 채팅을 할 수 있어요. 채팅은 모두에게 보이고 팀 캐릭터 옆에 말풍선으로 나와요. (설명자는 채팅 불가)',
    '틀리면 그 팀 전체가 10초 동안 정답을 외칠 수 없어요. 설명 제한 시간은 없고, 방장은 문제를 넘길 수 있어요.',
    '모든 라운드가 끝나면 이긴 팀 모두에게 가넷 +2개! (동점이면 보상 없음)',
  ],

  setup(players, room) {
    const ids = shuffle(players.map((p) => p.uid));
    const half = Math.ceil(ids.length / 2);
    const [A, B] = Math.random() < 0.5 ? [ids.slice(0, half), ids.slice(half)] : [ids.slice(half), ids.slice(0, half)];
    const rounds = Math.min(10, Math.max(5, Number(room?.options?.rounds) || 5));
    // 각 팀 배열의 첫 번째 사람이 팀장
    const base = { rounds, host: room?.hostId || '', teams: { A, B }, leaders: { A: A[0], B: B[0] }, scores: { A: 0, B: 0 }, usedWords: [], chat: [] };
    return newRound(base, 1, Date.now());
  },

  move(state, move, uid, players) {
    const now = Date.now();
    const myTeam = teamOf(state, uid);
    const isDescriber = state.describers.A === uid || state.describers.B === uid;

    if (move?.type === 'trap' || move?.type === 'untrap' || move?.type === 'trapDone') {
      if (state.phase !== 'trap') throw new Error('함정 설치 시간이 끝났어요');
      if (!isDescriber) throw new Error('설명자만 함정을 설치할 수 있어요');
      const mine = state.traps[myTeam] || [];
      if (move.type === 'trapDone') {
        const trapDone = { ...state.trapDone, [myTeam]: true };
        const both = trapDone.A && trapDone.B;
        return { state: { ...state, trapDone, ...(both ? { phase: 'play' } : {}) } };
      }
      const w = norm(move.word).slice(0, 10);
      if (move.type === 'untrap') return { state: { ...state, traps: { ...state.traps, [myTeam]: mine.filter((x) => x !== w) } } };
      if (w.length < 2) throw new Error('함정단어는 2글자 이상이어야 해요');
      if (mine.includes(w)) throw new Error('이미 설치한 함정이에요');
      if (mine.length >= MAX_TRAPS) throw new Error(`함정은 최대 ${MAX_TRAPS}개까지예요`);
      if (forbiddenIn(w, state.word)) throw new Error('제시어는 이미 금지돼 있어요. 다른 단어를 골라 주세요');
      return { state: { ...state, traps: { ...state.traps, [myTeam]: [...mine, w] } } };
    }

    if (move?.type === 'say') {
      if (state.phase !== 'play') throw new Error('지금은 설명할 수 없어요');
      if (!isDescriber) throw new Error('이번 라운드 설명자가 아니에요');
      const text = String(move.text ?? '').trim().slice(0, MAX_LINE);
      if (!text) throw new Error('설명을 입력해 주세요');
      if (forbiddenIn(text, state.word)) throw new Error('제시어가 포함된 단어가 있습니다');
      if (trapIn(text, state.traps?.[other(myTeam)])) throw new Error('함정단어입니다');
      return { state: { ...state, lines: [...state.lines, { team: myTeam, text }].slice(-30) } };
    }

    if (move?.type === 'chat') {
      if (!myTeam) throw new Error('참가자가 아니에요');
      if (isDescriber && state.phase === 'play') throw new Error('설명자는 채팅을 쓸 수 없어요');
      const text = String(move.text ?? '').trim().slice(0, MAX_CHAT);
      if (!text) throw new Error('메시지를 입력해 주세요');
      return { state: { ...state, chat: [...(state.chat || []), { team: myTeam, uid, text }].slice(-40) } };
    }

    if (move?.type === 'skip') {
      if (uid !== state.host) throw new Error('방장만 문제를 넘길 수 있어요');
      if (state.phase !== 'play') throw new Error('지금은 넘길 수 없어요');
      return { state: { ...state, phase: 'reveal', revealUntil: now + REVEAL_MS, solvedBy: '', solvedTeam: '', skipped: true } };
    }

    if (move?.type === 'answer') {
      if (state.phase !== 'play') throw new Error('지금은 정답을 외칠 수 없어요');
      if (!myTeam) throw new Error('참가자가 아니에요');
      if (isDescriber) throw new Error('설명자는 정답을 외칠 수 없어요');
      const left = (state.lockUntil[myTeam] || 0) - now;
      if (left > 0) throw new Error(`${Math.ceil(left / 1000)}초 뒤에 다시 외칠 수 있어요`);
      const text = String(move.text ?? '').trim().slice(0, 30);
      if (!text) throw new Error('정답을 입력해 주세요');
      if (allAnswers(state.word).some((w) => norm(text) === norm(w))) {
        return { state: { ...state, scores: { ...state.scores, [myTeam]: state.scores[myTeam] + 1 }, phase: 'reveal', revealUntil: now + REVEAL_MS, solvedBy: uid, solvedTeam: myTeam } };
      }
      return { state: { ...state, lockUntil: { ...state.lockUntil, [myTeam]: now + LOCK_MS }, wrong: [...state.wrong, { uid, team: myTeam, text, t: now }].slice(-6) } };
    }

    if (move?.type === 'tick' && state.phase === 'trap' && now >= state.trapUntil) {
      return { state: { ...state, phase: 'play' } };
    }

    if (move?.type === 'tick') {
      if (state.phase === 'reveal' && now >= state.revealUntil) {
        if (state.round >= state.rounds) return { state: { ...state, phase: 'done' }, result: result(state, players) };
        return { state: newRound(state, state.round + 1, now) };
      }
      throw new Error('__noop');
    }

    throw new Error('알 수 없는 동작이에요');
  },

  render(el, { state, me, players, finished, sendMove, room }) {
    const name = (u) => esc(players[u]?.name || '나간 사람');
    const myTeam = teamOf(state, me);
    const amDescriber = state.describers.A === me || state.describers.B === me;
    const key = `${room?.code}:${state.round}`;
    if (!finished && room) {
      if (state.phase === 'reveal' && state.solvedBy) soundEvent(room.code, `tq:${state.round}:solved`, 'ok');
      const lw = state.wrong[state.wrong.length - 1];
      if (lw?.uid === me && lw.t) soundEvent(room.code, `tq:w:${lw.t}`, 'no');
    }

    const teamList = (t) => `
      <div class="tq-team tq-${t}">
        <div class="tq-team-name">${TEAM[t].name} <b>${state.scores[t]}</b></div>
        <div class="tq-members">${state.teams[t].map((u) => `<span class="${u === me ? 'me' : ''} ${state.describers[t] === u && !finished ? 'desc' : ''}">${u === state.leaders[t] ? '👑' : ''}${name(u)}</span>`).join('')}</div>
      </div>`;

    if (finished) {
      const r = room?.result || {};
      el.innerHTML = `
        <div class="tq">
          <div class="tq-final">${['A', 'B'].map((t) => `
            <div class="tq-final-team tq-${t} ${r.winners?.includes(state.teams[t][0]) ? 'win' : ''}">
              <div class="tq-final-char">${t === 'A' ? HANDSOME : GOOFY}</div>
              <div class="tq-team-name">${TEAM[t].name}</div>
              <div class="tq-final-score">${state.scores[t]}</div>
              <div class="tq-final-reward">${r.winners?.includes(state.teams[t][0]) ? `${GARNET}+${REWARD}` : r.draw ? '무승부' : '보상 없음'}</div>
            </div>`).join('<div class="tq-vs">VS</div>')}
          </div>
          ${teamList('A')}${teamList('B')}
        </div>`;
      return;
    }

    const descBubble = (t) => {
      const lines = state.lines.filter((l) => l.team === t).slice(-4);
      return `<div class="tq-bubble tq-${t}">${lines.length ? lines.map((l) => `<p>${esc(l.text)}</p>`).join('') : '<p class="muted">설명을 기다리는 중…</p>'}</div>`;
    };
    // 맞히는 사람들의 채팅: 팀 캐릭터 바깥쪽에 말풍선으로
    const chatCol = (t, side) => {
      const msgs = (state.chat || []).filter((c) => c.team === t).slice(-4);
      return `<div class="tq-chatcol ${side}">${msgs.map((c) => `
        <div class="tq-cb tq-${t} ${c.uid === me ? 'mine' : ''}"><small>${name(c.uid)}</small>${esc(c.text)}</div>`).join('')}</div>`;
    };
    const lockLeft = myTeam ? Math.max(0, (state.lockUntil[myTeam] || 0) - Date.now()) : 0;
    const isHost = me === state.host;

    let banner = '';
    if (state.phase === 'reveal') {
      banner = state.solvedBy
        ? `<span><b>${name(state.solvedBy)}</b>님 정답! <span class="gold">${TEAM[state.solvedTeam].name} +1점</span> · 제시어 <b>${esc(mainWord(state.word))}</b></span>`
        : `<span>${state.skipped ? '방장이 문제를 넘겼어요' : '라운드 종료'}! 제시어는 <b>${esc(mainWord(state.word))}</b>였어요</span>`;
    } else {
      banner = state.phase === 'trap'
        ? (amDescriber ? '<span>🪤 <b>함정 설치 시간!</b> 상대 설명자가 쓸 만한 단어를 함정으로 숨기세요</span>' : '<span>🪤 설명자들이 함정단어를 설치하는 중…</span>')
        : amDescriber ? '<span>제시어를 설명해 주세요! 제시어의 <b>절반 이상</b>이 들어간 말과 <b>함정단어</b>는 못 써요</span>' : '<span>설명을 보고 정답을 먼저 외치세요!</span>';
    }

    el.innerHTML = `
      <div class="tq">
        <div class="nb-top">
          <span class="nb-round">ROUND <b>${state.round}</b> / ${state.rounds}</span>
          <span class="nb-timer" data-timer>${state.phase === 'reveal' ? '공개' : ''}</span>
        </div>
        <div class="tq-score"><span class="tq-A">${TEAM.A.name} <b>${state.scores.A}</b></span><i>:</i><span class="tq-B"><b>${state.scores.B}</b> ${TEAM.B.name}</span></div>

        <div class="tq-descs">${descBubble('A')}${descBubble('B')}</div>
        <div class="tq-stage">
          ${chatCol('A', 'left')}
          ${['A', 'B'].map((t) => `
            <div class="tq-side tq-${t} ${state.solvedTeam === t ? 'scored' : ''}">
              <div class="tq-char">${t === 'A' ? HANDSOME : GOOFY}</div>
              <div class="tq-plate"><small>${TEAM[t].short} 설명</small>${name(state.describers[t])}</div>
            </div>`).join('')}
          ${chatCol('B', 'right')}
        </div>

        <div class="nb-banner">${banner}</div>

        ${state.phase === 'trap' && amDescriber ? `
          <div class="tq-word">제시어 <b>${esc(mainWord(state.word))}</b>${allAnswers(state.word).length > 1 ? `<small>(${allAnswers(state.word).slice(1).map(esc).join(', ')}도 쓰면 안 돼요)</small>` : ''}</div>
          <div class="tq-trapbox">
            <div class="tq-trap-title">🪤 함정단어 설치 <small>상대 설명자가 이 단어를 쓰면 설명할 수 없어요 · 2글자 이상 · 최대 ${MAX_TRAPS}개</small></div>
            <div class="tq-traps">${(state.traps[myTeam] || []).map((w) => `<button class="tq-trap" data-untrap="${esc(w)}">${esc(w)} ✕</button>`).join('') || '<em>아직 없어요</em>'}</div>
            ${state.trapDone[myTeam] ? '<p class="tq-trap-done">✅ 설치 완료! 상대 설명자를 기다리는 중…</p>' : `
            <form class="tq-say" data-form="trap">
              <input data-key="trap" maxlength="10" placeholder="함정단어 입력" autocomplete="off" ${(state.traps[myTeam] || []).length >= MAX_TRAPS ? 'disabled' : ''}>
              <button class="btn" ${(state.traps[myTeam] || []).length >= MAX_TRAPS ? 'disabled' : ''}>추가</button>
            </form>
            <button class="btn primary block" data-trapdone>설치 완료</button>`}
          </div>` : ''}
        ${state.phase === 'play' && amDescriber ? `
          <div class="tq-word">제시어 <b>${esc(mainWord(state.word))}</b>${allAnswers(state.word).length > 1 ? `<small>(${allAnswers(state.word).slice(1).map(esc).join(', ')}도 쓰면 안 돼요)</small>` : ''}</div>
          <form class="tq-say" data-form="say">
            <input data-key="say" maxlength="${MAX_LINE}" placeholder="설명을 입력하세요" autocomplete="off">
            <button class="btn primary">보내기</button>
          </form>
          <div class="tq-warn" data-warn></div>
          ${(state.traps[myTeam] || []).length ? `<div class="tq-mytraps">내가 설치한 함정: ${state.traps[myTeam].map(esc).join(', ')}</div>` : ''}` : ''}
        ${state.phase === 'reveal' && (state.traps.A.length || state.traps.B.length) ? `
          <div class="tq-trapreveal">🪤 함정 공개 · <span class="tq-A">${TEAM.A.name}: ${state.traps.A.map(esc).join(', ') || '없음'}</span> · <span class="tq-B">${TEAM.B.name}: ${state.traps.B.map(esc).join(', ') || '없음'}</span></div>` : ''}
        ${state.phase === 'trap' && myTeam && !amDescriber ? `
          <form class="tq-say tq-chatform" data-form="chat">
            <input data-key="chat" maxlength="${MAX_CHAT}" placeholder="💬 채팅 (모두에게 보여요)" autocomplete="off">
            <button class="btn">전송</button>
          </form>` : ''}
        ${state.phase === 'play' && myTeam && !amDescriber ? `
          <form class="tq-say" data-form="answer">
            <input data-key="ans" maxlength="30" placeholder="${lockLeft ? '오답! 잠시 기다려요' : '정답 입력'}" autocomplete="off">
            <button class="btn gold-btn" data-ans-btn>정답!</button>
          </form>
          <div class="tq-warn" data-lock></div>
          <form class="tq-say tq-chatform" data-form="chat">
            <input data-key="chat" maxlength="${MAX_CHAT}" placeholder="💬 채팅 (모두에게 보여요)" autocomplete="off">
            <button class="btn">전송</button>
          </form>` : ''}
        ${state.phase === 'play' && isHost ? '<button class="btn ghost sm tq-skip" data-skip>⏭ 문제 넘기기 (방장)</button>' : ''}

        ${state.wrong.length ? `<div class="tq-wrong">오답: ${state.wrong.map((w) => `<span class="tq-${w.team}">${name(w.uid)} "${esc(w.text)}"</span>`).join(' ')}</div>` : ''}
        ${teamList('A')}${teamList('B')}
      </div>`;

    // 설명 말풍선은 항상 최신 줄이 보이게
    el.querySelectorAll('.tq-bubble').forEach((b) => (b.scrollTop = b.scrollHeight));

    // 입력값·포커스 유지
    el.querySelectorAll('[data-key]').forEach((inp) => {
      const k = inp.dataset.key === 'chat' ? `${room?.code}:chat` : `${key}:${inp.dataset.key}`;
      if (drafts[k] !== undefined) inp.value = drafts[k];
      inp.oninput = () => { drafts[k] = inp.value; checkWord(); };
      inp.onfocus = () => { focusKey = k; };
      inp.onblur = () => setTimeout(() => { if (inp.isConnected && focusKey === k) focusKey = ''; }, 0);
      if (focusKey === k) inp.focus();
    });

    const $warn = el.querySelector('[data-warn]');
    const $sayInput = el.querySelector('[data-key="say"]');
    function checkWord() {
      if (!$warn || !$sayInput) return false;
      const part = forbiddenIn($sayInput.value, state.word);
      const bad = !!part;
      $warn.textContent = bad ? `⚠ 제시어가 포함된 단어가 있습니다 ("${part}")` : '';
      $sayInput.classList.toggle('bad', bad);
      return bad;
    }
    checkWord();

    const $say = el.querySelector('[data-form="say"]');
    if ($say) {
      $say.onsubmit = (e) => {
        e.preventDefault();
        const v = $sayInput.value.trim();
        if (!v || checkWord()) return;
        if (trapIn(v, state.traps?.[other(myTeam)])) { $warn.textContent = '🪤 함정단어입니다'; $sayInput.classList.add('bad'); return; }
        drafts[`${key}:say`] = '';
        $sayInput.value = '';
        sendMove({ type: 'say', text: v });
      };
    }
    const $trap = el.querySelector('[data-form="trap"]');
    if ($trap) {
      $trap.onsubmit = (e) => {
        e.preventDefault();
        const inp = $trap.querySelector('input');
        const v = inp.value.trim();
        if (!v) return;
        drafts[`${key}:trap`] = '';
        inp.value = '';
        sendMove({ type: 'trap', word: v });
      };
    }
    el.querySelectorAll('[data-untrap]').forEach((b) => (b.onclick = () => sendMove({ type: 'untrap', word: b.dataset.untrap })));
    const $trapDone = el.querySelector('[data-trapdone]');
    if ($trapDone) $trapDone.onclick = () => sendMove({ type: 'trapDone' });
    const $skip = el.querySelector('[data-skip]');
    if ($skip) $skip.onclick = () => { if (confirm('이 문제를 넘길까요? (무득점)')) sendMove({ type: 'skip' }); };
    const $chat = el.querySelector('[data-form="chat"]');
    if ($chat) {
      $chat.onsubmit = (e) => {
        e.preventDefault();
        const inp = $chat.querySelector('input');
        const v = inp.value.trim();
        if (!v) return;
        drafts[`${room?.code}:chat`] = '';
        inp.value = '';
        sendMove({ type: 'chat', text: v });
      };
    }
    const $ans = el.querySelector('[data-form="answer"]');
    if ($ans) {
      $ans.onsubmit = (e) => {
        e.preventDefault();
        const inp = $ans.querySelector('input');
        const v = inp.value.trim();
        if (!v) return;
        drafts[`${key}:ans`] = '';
        inp.value = '';
        sendMove({ type: 'answer', text: v });
      };
    }

    // 타이머, 팀 잠금 표시, 진행 신호
    const $lock = el.querySelector('[data-lock]');
    const $ansBtn = el.querySelector('[data-ans-btn]');
    const order = [...state.teams.A, ...state.teams.B];
    const myIndex = Math.max(0, order.indexOf(me));
    let lastTick = 0;
    const update = () => {
      if (!el.isConnected) return clearInterval(timer);
      const now = Date.now();
      // 설명 중에는 제한 시간 없음. 함정 설치(20초)와 정답 공개 때만 시간이 흘러요
      const due = state.phase === 'reveal' ? state.revealUntil : state.phase === 'trap' ? state.trapUntil : 0;
      const $timer = el.querySelector('[data-timer]');
      if ($timer && state.phase === 'trap') { const l = Math.max(0, state.trapUntil - now); $timer.textContent = `🪤${Math.ceil(l / 1000)}`; $timer.classList.toggle('hurry', l <= 5000); }
      if (myTeam && $lock) {
        const l = Math.max(0, (state.lockUntil[myTeam] || 0) - now);
        $lock.textContent = l ? `🔒 우리 팀 오답! ${Math.ceil(l / 1000)}초 뒤에 다시 외칠 수 있어요` : '';
        if ($ansBtn) $ansBtn.disabled = l > 0;
      }
      if (due && now >= due && now - lastTick > 2000 && now - due > 300 + myIndex * 300) {
        lastTick = now;
        sendMove({ type: 'tick' }, { silent: true });
      }
    };
    const timer = setInterval(update, 250);
    update();
  },
};
