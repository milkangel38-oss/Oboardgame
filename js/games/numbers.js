// 미니게임: 숫자눈치게임 (4~8명)
// - 모두 0~9 숫자카드 10장을 들고 시작
// - 매 라운드 제한 시간 안에 한 장을 몰래 내고, 시간이 끝나면(또는 모두 내면) 동시에 공개
// - 중복되지 않은 숫자 중 가장 큰 숫자를 낸 사람이 10점 (9가 겹치면 그다음 큰 숫자)
// - 10라운드 후 점수 순위대로 가넷 보상
import { GARNET } from '../profile.js';

const ROUNDS = 10;
const PICK_MS = 15000;    // 라운드 제한 시간
const REVEAL_MS = 4500;   // 공개 결과를 보여주는 시간
const POINTS = 10;
const REWARDS = [3, 2, 1]; // 1등, 2등, 3등 가넷

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 중복되지 않은 숫자 중 가장 큰 숫자를 낸 사람 찾기
export function judge(cards) {
  const count = {};
  Object.values(cards).forEach((n) => (count[n] = (count[n] || 0) + 1));
  const unique = Object.keys(count).map(Number).filter((n) => count[n] === 1).sort((a, b) => b - a);
  const dupes = Object.keys(count).map(Number).filter((n) => count[n] > 1).sort((a, b) => b - a);
  if (!unique.length) return { winner: null, number: null, dupes };
  const number = unique[0];
  const winner = Object.keys(cards).find((uid) => cards[uid] === number);
  return { winner, number, dupes };
}

// 점수 순위 (같은 점수는 같은 등수)
export function rank(order, scores) {
  return order
    .map((uid) => ({ uid, score: scores[uid] || 0 }))
    .sort((a, b) => b.score - a.score)
    .map((r, _, all) => {
      const place = 1 + all.filter((o) => o.score > r.score).length;
      return { ...r, place, garnets: REWARDS[place - 1] || 0 };
    });
}

function reveal(state, now) {
  const cards = {};
  const auto = {};
  const hands = { ...state.hands };
  for (const uid of state.order) {
    let n = state.picks[uid];
    if (n === undefined || n === null || !hands[uid].includes(n)) {
      n = Math.min(...hands[uid]); // 시간 초과: 남은 카드 중 가장 작은 숫자 자동 제출
      auto[uid] = true;
    }
    cards[uid] = n;
    hands[uid] = hands[uid].filter((x) => x !== n);
  }
  const { winner, number, dupes } = judge(cards);
  const scores = { ...state.scores };
  if (winner) scores[winner] = (scores[winner] || 0) + POINTS;
  return {
    ...state,
    hands, scores,
    picks: {},
    phase: 'reveal',
    revealUntil: now + REVEAL_MS,
    last: { round: state.round, cards, auto, winner: winner || '', number: number ?? -1, dupes },
  };
}

export default {
  id: 'numbers',
  name: '숫자눈치게임',
  emoji: '🔢',
  category: 'mini',
  minPlayers: 4,
  maxPlayers: 8,
  duration: '5분',
  rewards: REWARDS,
  description: '안 겹친 가장 큰 숫자가 이긴다!',
  rules: [
    '모두 0~9 숫자카드 10장을 가지고 시작해요.',
    `매 라운드 ${PICK_MS / 1000}초 안에 카드 한 장을 몰래 내요. 시간이 끝나면 동시에 공개!`,
    '가장 큰 숫자를 낸 사람이 10점을 얻어요.',
    '가장 큰 숫자가 겹치면 무효! 겹치지 않은 그다음 큰 숫자가 점수를 얻어요.',
    '시간 안에 못 내면 남은 카드 중 가장 작은 숫자가 자동으로 나가요.',
    '10라운드 후 점수 순위로 1등 가넷 3개, 2등 2개, 3등 1개!',
  ],

  // 선: 방장부터 참가 순서대로
  setup(players, room) {
    const ids = players.map((p) => p.uid);
    const h = Math.max(0, ids.indexOf(room?.hostId));
    const order = [...ids.slice(h), ...ids.slice(0, h)];
    const now = Date.now();
    return {
      round: 1,
      phase: 'pick',
      deadline: now + PICK_MS,
      revealUntil: 0,
      order,
      hands: Object.fromEntries(order.map((u) => [u, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]])),
      picks: {},
      scores: Object.fromEntries(order.map((u) => [u, 0])),
      last: null,
    };
  },

  move(state, move, uid, players) {
    const now = Date.now();

    if (move?.type === 'pick') {
      if (state.phase !== 'pick') throw new Error('지금은 카드를 낼 수 없어요');
      if (!state.order.includes(uid)) throw new Error('참가자가 아니에요');
      const n = move.n;
      if (!state.hands[uid].includes(n)) throw new Error('이미 쓴 카드예요');
      const next = { ...state, picks: { ...state.picks, [uid]: n } };
      const allIn = next.order.every((u) => next.picks[u] !== undefined);
      return { state: allIn ? reveal(next, now) : next };
    }

    if (move?.type === 'tick') {
      if (state.phase === 'pick' && now >= state.deadline) return { state: reveal(state, now) };
      if (state.phase === 'reveal' && now >= state.revealUntil) {
        if (state.round >= ROUNDS) {
          const ranking = rank(state.order, state.scores);
          const top = ranking.filter((r) => r.place === 1).map((r) => players[r.uid]?.name || '?');
          return {
            state: { ...state, phase: 'done' },
            result: {
              message: `${top.join(', ')}님 1등! 🎉`,
              winners: ranking.filter((r) => r.place === 1).map((r) => r.uid),
              ranking,
              rewards: Object.fromEntries(ranking.map((r) => [r.uid, r.garnets])),
            },
          };
        }
        return { state: { ...state, round: state.round + 1, phase: 'pick', deadline: now + PICK_MS, picks: {} } };
      }
      throw new Error('__noop');
    }

    throw new Error('알 수 없는 동작이에요');
  },

  render(el, { state, me, players, finished, sendMove, room }) {
    const name = (u) => esc(players[u]?.name || '나간 사람');
    const myHand = state.hands[me] || [];
    const myPick = state.picks?.[me];
    const last = state.last;
    const isPlayer = state.order.includes(me);

    // 결과 문구
    let banner = '';
    if (last && (state.phase === 'reveal' || state.phase === 'done' || finished)) {
      const dupText = last.dupes.length ? `<span class="nb-dupe">${last.dupes.join(', ')} 겹침!</span> ` : '';
      banner = last.winner
        ? `${dupText}<span><b>${last.number}</b>을(를) 낸 <b>${name(last.winner)}</b>님 <span class="gold">+${POINTS}점</span></span>`
        : `${dupText}<span>모든 숫자가 겹쳐서 아무도 점수를 얻지 못했어요</span>`;
    }

    const showCards = state.phase !== 'pick' && last;
    const rows = state.order.map((u) => {
      const card = showCards ? last.cards[u] : null;
      const status = finished || state.phase === 'done' ? ''
        : state.phase === 'pick' ? (state.picks?.[u] !== undefined ? '<span class="nb-ok">✓ 제출</span>' : '<span class="nb-wait">고민 중…</span>')
        : `<span class="nb-card ${last.winner === u ? 'win' : ''} ${last.dupes.includes(card) ? 'dupe' : ''}">${card}</span>${last.auto[u] ? '<small class="nb-auto">자동</small>' : ''}`;
      return `<li class="${u === me ? 'me' : ''} ${showCards && last.winner === u ? 'win' : ''}">
        <span class="nb-name">${name(u)}${u === me ? ' <small>(나)</small>' : ''}</span>
        <span class="nb-status">${status}</span>
        <span class="nb-score">${state.scores[u] || 0}</span>
      </li>`;
    }).join('');

    // 최종 순위
    const ranking = finished ? (room?.result?.ranking || rank(state.order, state.scores)) : null;
    const finalHtml = ranking ? `
      <ol class="nb-final">
        ${ranking.map((r) => `<li class="${r.uid === me ? 'me' : ''}">
          <span class="nb-place p${r.place}">${r.place <= 3 ? ['🥇', '🥈', '🥉'][r.place - 1] : r.place + '등'}</span>
          <span class="nb-name">${name(r.uid)}</span>
          <span class="nb-score">${r.score}점</span>
          <span class="nb-reward">${r.garnets ? `${GARNET}+${r.garnets}` : ''}</span>
        </li>`).join('')}
      </ol>` : '';

    el.innerHTML = `
      <div class="nb">
        ${finished ? finalHtml : `
        <div class="nb-top">
          <span class="nb-round">ROUND <b>${state.round}</b> / ${ROUNDS}</span>
          <span class="nb-timer" data-timer></span>
        </div>
        <div class="nb-bar"><i data-bar></i></div>
        <div class="nb-banner">${banner || (state.phase === 'pick' ? '숫자 카드 한 장을 골라 내세요!' : '')}</div>
        <ul class="nb-board">${rows}</ul>
        ${isPlayer ? `
        <div class="nb-hand-title">내 카드 ${myPick !== undefined && state.phase === 'pick' ? `· <b>${myPick}</b> 제출함 (공개 전까지 바꿀 수 있어요)` : ''}</div>
        <div class="nb-hand">
          ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
            const used = !myHand.includes(n);
            return `<button class="nb-num ${used ? 'used' : ''} ${myPick === n ? 'picked' : ''}" data-n="${n}" ${used || state.phase !== 'pick' ? 'disabled' : ''}>${n}</button>`;
          }).join('')}
        </div>` : ''}`}
      </div>`;

    el.querySelectorAll('.nb-num').forEach((b) => {
      b.onclick = () => sendMove({ type: 'pick', n: Number(b.dataset.n) });
    });

    // 타이머: 화면 갱신 + 시간이 지나면 진행 신호(tick) 보내기
    if (finished) return;
    const $t = el.querySelector('[data-timer]');
    const $bar = el.querySelector('[data-bar]');
    const myIndex = Math.max(0, state.order.indexOf(me));
    let lastTick = 0;
    const update = () => {
      if (!el.isConnected) return clearInterval(timer);
      const now = Date.now();
      if (state.phase === 'pick') {
        const left = Math.max(0, state.deadline - now);
        $t.textContent = Math.ceil(left / 1000);
        $t.classList.toggle('hurry', left <= 5000);
        $bar.style.width = `${(left / PICK_MS) * 100}%`;
        if (left === 0 && now - lastTick > 2000 && now - state.deadline > 300 + myIndex * 350) { lastTick = now; sendMove({ type: 'tick' }, { silent: true }); }
      } else if (state.phase === 'reveal') {
        $t.textContent = state.round >= ROUNDS ? '결과' : '공개';
        $t.classList.remove('hurry');
        $bar.style.width = '0%';
        if (now >= state.revealUntil && now - lastTick > 2000 && now - state.revealUntil > 300 + myIndex * 350) { lastTick = now; sendMove({ type: 'tick' }, { silent: true }); }
      }
    };
    const timer = setInterval(update, 250);
    update();
  },
};
