// 예능: 타이핑 퀴즈 (6~10명, 팀전)
// - 무작위로 잘생긴팀 vs 못생긴팀, 팀장도 무작위
// - 라운드마다 두 팀에서 한 명씩 설명자(팀장부터 차례로). 둘 다 같은 제시어를 보고 설명을 타이핑
// - 설명에 제시어가 들어가면 입력 불가
// - 설명자 말고 누구나 정답을 외칠 수 있음. 먼저 맞힌 사람의 팀 +1점. 오답이면 그 팀 10초 잠금
// - 라운드(5~10) 후 이긴 팀 모두 가넷 +2
import { GARNET } from '../profile.js';
import { WORDS } from './typing-words.js';

const ROUND_MS = 90000;
const LOCK_MS = 10000;
const REVEAL_MS = 5000;
const REWARD = 2;
const MAX_LINE = 60;
export const TEAM = {
  A: { name: '잘생긴팀', short: '잘생김', color: '#3ee6ff' },
  B: { name: '못생긴팀', short: '못생김', color: '#ffb02e' },
};

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const norm = (s) => String(s ?? '').replace(/\s+/g, '').toLowerCase();
export const hasWord = (text, word) => norm(text).includes(norm(word));

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
    ...state, round: roundNo, phase: 'play', word, usedWords: [...state.usedWords, word],
    describers, lines: [], wrong: [], lockUntil: { A: 0, B: 0 },
    deadline: now + ROUND_MS, revealUntil: 0, solvedBy: '', solvedTeam: '',
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
    '설명자 말고 누구나 정답을 외칠 수 있어요. 먼저 맞힌 사람의 팀이 1점!',
    `틀리면 그 팀 전체가 10초 동안 정답을 외칠 수 없어요. 라운드 제한 시간은 ${ROUND_MS / 1000}초예요.`,
    '모든 라운드가 끝나면 이긴 팀 모두에게 가넷 +2개! (동점이면 보상 없음)',
  ],

  setup(players, room) {
    const ids = shuffle(players.map((p) => p.uid));
    const half = Math.ceil(ids.length / 2);
    const [A, B] = Math.random() < 0.5 ? [ids.slice(0, half), ids.slice(half)] : [ids.slice(half), ids.slice(0, half)];
    const rounds = Math.min(10, Math.max(5, Number(room?.options?.rounds) || 5));
    // 각 팀 배열의 첫 번째 사람이 팀장
    const base = { rounds, teams: { A, B }, leaders: { A: A[0], B: B[0] }, scores: { A: 0, B: 0 }, usedWords: [] };
    return newRound(base, 1, Date.now());
  },

  move(state, move, uid, players) {
    const now = Date.now();
    const myTeam = teamOf(state, uid);
    const isDescriber = state.describers.A === uid || state.describers.B === uid;

    if (move?.type === 'say') {
      if (state.phase !== 'play') throw new Error('지금은 설명할 수 없어요');
      if (!isDescriber) throw new Error('이번 라운드 설명자가 아니에요');
      const text = String(move.text ?? '').trim().slice(0, MAX_LINE);
      if (!text) throw new Error('설명을 입력해 주세요');
      if (hasWord(text, state.word)) throw new Error('제시어가 포함된 단어가 있습니다');
      return { state: { ...state, lines: [...state.lines, { team: myTeam, text }].slice(-30) } };
    }

    if (move?.type === 'answer') {
      if (state.phase !== 'play') throw new Error('지금은 정답을 외칠 수 없어요');
      if (!myTeam) throw new Error('참가자가 아니에요');
      if (isDescriber) throw new Error('설명자는 정답을 외칠 수 없어요');
      const left = (state.lockUntil[myTeam] || 0) - now;
      if (left > 0) throw new Error(`${Math.ceil(left / 1000)}초 뒤에 다시 외칠 수 있어요`);
      const text = String(move.text ?? '').trim().slice(0, 30);
      if (!text) throw new Error('정답을 입력해 주세요');
      if (norm(text) === norm(state.word)) {
        return { state: { ...state, scores: { ...state.scores, [myTeam]: state.scores[myTeam] + 1 }, phase: 'reveal', revealUntil: now + REVEAL_MS, solvedBy: uid, solvedTeam: myTeam } };
      }
      return { state: { ...state, lockUntil: { ...state.lockUntil, [myTeam]: now + LOCK_MS }, wrong: [...state.wrong, { uid, team: myTeam, text }].slice(-6) } };
    }

    if (move?.type === 'tick') {
      if (state.phase === 'play' && now >= state.deadline) {
        return { state: { ...state, phase: 'reveal', revealUntil: now + REVEAL_MS, solvedBy: '', solvedTeam: '' } };
      }
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

    const bubble = (t) => {
      const lines = state.lines.filter((l) => l.team === t).slice(-4);
      return `<div class="tq-bubble">${lines.length ? lines.map((l) => `<p>${esc(l.text)}</p>`).join('') : '<p class="muted">…</p>'}</div>`;
    };
    const lockLeft = myTeam ? Math.max(0, (state.lockUntil[myTeam] || 0) - Date.now()) : 0;

    let banner = '';
    if (state.phase === 'reveal') {
      banner = state.solvedBy
        ? `<span><b>${name(state.solvedBy)}</b>님 정답! <span class="gold">${TEAM[state.solvedTeam].name} +1점</span> · 제시어 <b>${esc(state.word)}</b></span>`
        : `<span>시간 초과! 제시어는 <b>${esc(state.word)}</b>였어요</span>`;
    } else {
      banner = amDescriber ? '<span>제시어를 설명해 주세요! <b>제시어가 들어간 말</b>은 쓸 수 없어요</span>' : '<span>설명을 보고 정답을 먼저 외치세요!</span>';
    }

    el.innerHTML = `
      <div class="tq">
        <div class="nb-top">
          <span class="nb-round">ROUND <b>${state.round}</b> / ${state.rounds}</span>
          <span class="nb-timer" data-timer></span>
        </div>
        <div class="tq-score"><span class="tq-A">${TEAM.A.name} <b>${state.scores.A}</b></span><i>:</i><span class="tq-B"><b>${state.scores.B}</b> ${TEAM.B.name}</span></div>
        <div class="nb-bar"><i data-bar></i></div>

        <div class="tq-stage">
          ${['A', 'B'].map((t) => `
            <div class="tq-side tq-${t} ${state.solvedTeam === t ? 'scored' : ''}">
              ${bubble(t)}
              <div class="tq-char">${t === 'A' ? HANDSOME : GOOFY}</div>
              <div class="tq-plate"><small>${TEAM[t].short}</small>${name(state.describers[t])}</div>
            </div>`).join('')}
        </div>

        <div class="nb-banner">${banner}</div>

        ${state.phase === 'play' && amDescriber ? `
          <div class="tq-word">제시어 <b>${esc(state.word)}</b></div>
          <form class="tq-say" data-form="say">
            <input data-key="say" maxlength="${MAX_LINE}" placeholder="설명을 입력하세요" autocomplete="off">
            <button class="btn primary">보내기</button>
          </form>
          <div class="tq-warn" data-warn></div>` : ''}
        ${state.phase === 'play' && myTeam && !amDescriber ? `
          <form class="tq-say" data-form="answer">
            <input data-key="ans" maxlength="30" placeholder="${lockLeft ? '오답! 잠시 기다려요' : '정답 입력'}" autocomplete="off">
            <button class="btn gold-btn" data-ans-btn>정답!</button>
          </form>
          <div class="tq-warn" data-lock></div>` : ''}

        ${state.wrong.length ? `<div class="tq-wrong">오답: ${state.wrong.map((w) => `<span class="tq-${w.team}">${name(w.uid)} "${esc(w.text)}"</span>`).join(' ')}</div>` : ''}
        ${teamList('A')}${teamList('B')}
      </div>`;

    // 말풍선은 항상 최신 줄이 보이게
    el.querySelectorAll('.tq-bubble').forEach((b) => (b.scrollTop = b.scrollHeight));

    // 입력값·포커스 유지
    el.querySelectorAll('[data-key]').forEach((inp) => {
      const k = `${key}:${inp.dataset.key}`;
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
      const bad = hasWord($sayInput.value, state.word);
      $warn.textContent = bad ? '⚠ 제시어가 포함된 단어가 있습니다' : '';
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
        drafts[`${key}:say`] = '';
        $sayInput.value = '';
        sendMove({ type: 'say', text: v });
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
    const $t = el.querySelector('[data-timer]');
    const $bar = el.querySelector('[data-bar]');
    const $lock = el.querySelector('[data-lock]');
    const $ansBtn = el.querySelector('[data-ans-btn]');
    const order = [...state.teams.A, ...state.teams.B];
    const myIndex = Math.max(0, order.indexOf(me));
    let lastTick = 0;
    const update = () => {
      if (!el.isConnected) return clearInterval(timer);
      const now = Date.now();
      let due;
      if (state.phase === 'play') {
        due = state.deadline;
        const left = Math.max(0, due - now);
        $t.textContent = Math.ceil(left / 1000);
        $t.classList.toggle('hurry', left <= 10000);
        $bar.style.width = `${(left / ROUND_MS) * 100}%`;
      } else {
        due = state.revealUntil;
        $t.textContent = '공개';
        $t.classList.remove('hurry');
        $bar.style.width = '0%';
      }
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
