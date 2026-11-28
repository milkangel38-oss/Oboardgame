// 보드게임: 숫자눈치게임 (4~8명)
// - 모두 0~9 숫자카드 10장을 들고 시작
// - 인장이 가장 많은 사람이 첫 라운드 선 플레이어를 정하고, 선부터 입장 순서대로 한 명씩 카드를 몰래 내요 (색은 공개)
// - 모두 내면 동시에 공개, 라운드 승자가 다음 라운드 선 플레이어
// - 중복되지 않은 숫자 중 가장 큰 숫자를 낸 사람이 10점 (9가 겹치면 그다음 큰 숫자)
// - 10라운드 후 점수 순위대로 인장 보상
import { GARNET } from '../profile.js';
import { turnAlert } from './turn-alert.js';

const ROUNDS = 10;
const PICK_MS = 30000;    // 라운드 제한 시간
const REVEAL_MS = 4500;
const CHOOSE_MS = 30000;  // 선 플레이어 고르는 시간   // 공개 결과를 보여주는 시간
const POINTS = 10;
const REWARDS = [3, 2, 1]; // 1등, 2등, 3등 인장

const colorOf = (n) => (n % 2 ? 'black' : 'white'); // 홀수 검정 · 짝수(0 포함) 흰색
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
  const cards = { ...state.picks };
  const auto = { ...(state.auto || {}) };
  const hands = { ...state.hands };
  for (const uid of state.order) hands[uid] = hands[uid].filter((x) => x !== cards[uid]);
  const { winner, number, dupes } = judge(cards);
  const scores = { ...state.scores };
  if (winner) scores[winner] = (scores[winner] || 0) + POINTS;
  return {
    ...state,
    hands, scores,
    picks: {}, auto: {},
    phase: 'reveal',
    turn: '',
    deadline: 0,
    revealUntil: now + REVEAL_MS,
    last: { round: state.round, cards, auto, winner: winner || '', number: number ?? -1, dupes },
  };
}
// 선 플레이어부터 입장 순서(프로필 왼쪽→오른쪽)대로 돌아가요
export const turnOrder = (state, first = state.first) => {
  const i = Math.max(0, state.order.indexOf(first));
  return [...state.order.slice(i), ...state.order.slice(0, i)];
};
// 지금 차례인 사람이 카드를 냈어요 → 다음 사람, 모두 냈으면 공개
function afterPick(state, now) {
  const seq = turnOrder(state);
  const next = seq.find((u) => state.picks[u] === undefined);
  if (!next) return reveal(state, now);
  return { ...state, turn: next, deadline: now + PICK_MS };
}
function autoPick(state, uid) {
  const n = Math.min(...state.hands[uid]); // 시간 초과: 남은 카드 중 가장 작은 숫자 자동 제출
  return { ...state, picks: { ...state.picks, [uid]: n }, auto: { ...(state.auto || {}), [uid]: true } };
}
function startRound(state, first, now) {
  return { ...state, first, phase: 'pick', picks: {}, auto: {}, turn: first, deadline: now + PICK_MS };
}

const pickUi = { key: '', n: null, timer: 0 };

export default {
  id: 'numbers',
  name: '숫자눈치게임',
  emoji: '🔢',
  category: 'board',
  minPlayers: 4,
  maxPlayers: 8,
  duration: '5분',
  rewards: REWARDS,
  description: '안 겹친 가장 큰 숫자가 이긴다!',
  rules: [
    '모두 0~9 숫자카드 10장을 가지고 시작해요.',
    '처음에는 인장을 가장 많이 가진 사람이 1라운드 선 플레이어를 정해요.',
    `선 플레이어부터 입장 순서대로 한 명씩, 내 차례에 ${PICK_MS / 1000}초 안에 카드 한 장을 골라 '제출하기'를 눌러요. 모두 내면 동시에 공개!`,
    '홀수 카드는 검정, 짝수 카드(0 포함)는 흰색이에요. 누가 카드를 내면 그 색이 모두에게 보여요!',
    '가장 큰 숫자를 낸 사람이 10점을 얻어요.',
    '가장 큰 숫자가 겹치면 무효! 겹치지 않은 그다음 큰 숫자가 점수를 얻어요.',
    '라운드에서 점수를 얻은 사람이 다음 라운드 선 플레이어가 돼요. (모두 겹쳐서 아무도 못 얻으면 선은 그대로)',
    '시간 안에 못 내면 남은 카드 중 가장 작은 숫자가 자동으로 나가요.',
    '10라운드 후 점수 순위로 1등 인장 3개, 2등 2개, 3등 1개!',
  ],

  // 자리: 입장 순서. 인장이 가장 많은 사람(같으면 먼저 들어온 사람)이 첫 선 플레이어를 골라요
  setup(players) {
    const order = players.map((p) => p.uid);
    const chooser = [...players].sort((a, b) => (Number(b.garnets) || 0) - (Number(a.garnets) || 0))[0]?.uid || order[0];
    const now = Date.now();
    return {
      round: 1,
      phase: 'choose',
      chooser,
      first: '',
      turn: '',
      deadline: now + CHOOSE_MS,
      revealUntil: 0,
      order,
      hands: Object.fromEntries(order.map((u) => [u, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]])),
      picks: {},
      auto: {},
      scores: Object.fromEntries(order.map((u) => [u, 0])),
      last: null,
    };
  },

  move(state, move, uid, players) {
    const now = Date.now();

    if (move?.type === 'first') {
      if (state.phase !== 'choose') throw new Error('__noop');
      if (uid !== state.chooser) throw new Error('선 플레이어는 인장이 가장 많은 사람이 정해요');
      if (!state.order.includes(move.uid)) throw new Error('참가자가 아니에요');
      return { state: startRound(state, move.uid, now) };
    }

    if (move?.type === 'pick') {
      if (state.phase !== 'pick') throw new Error('지금은 카드를 낼 수 없어요');
      if (!state.order.includes(uid)) throw new Error('참가자가 아니에요');
      if (uid !== state.turn) throw new Error(`지금은 ${players[state.turn]?.name || '다른 사람'}님 차례예요`);
      const n = move.n;
      if (state.picks[uid] !== undefined) throw new Error('이미 이번 라운드 카드를 제출했어요');
      if (!state.hands[uid].includes(n)) throw new Error('이미 쓴 카드예요');
      return { state: afterPick({ ...state, picks: { ...state.picks, [uid]: n } }, now) };
    }

    if (move?.type === 'tick') {
      if (state.phase === 'choose' && now >= state.deadline) return { state: startRound(state, state.chooser, now) };
      if (state.phase === 'pick' && now >= state.deadline) return { state: afterPick(autoPick(state, state.turn), now) };
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
        const first = state.last?.winner && state.order.includes(state.last.winner) ? state.last.winner : state.first;
        return { state: startRound({ ...state, round: state.round + 1 }, first, now) };
      }
      throw new Error('__noop');
    }

    throw new Error('알 수 없는 동작이에요');
  },

  render(el, { state, me, players, finished, sendMove, room }) {
    const name = (u) => esc(players[u]?.name || '나간 사람');
    const roundKey = `${room?.code}:${state.round}`;
    if (pickUi.key !== roundKey) { pickUi.key = roundKey; pickUi.n = null; }
    const myHand = state.hands[me] || [];
    const myPick = state.picks?.[me];
    const last = state.last;
    const isPlayer = state.order.includes(me);
    const myTurn = state.phase === 'pick' && state.turn === me && !finished;
    if (room) turnAlert(room.code, `nb:${state.round}:${state.turn}`, myTurn);

    // 결과 문구
    let banner = '';
    if (last && (state.phase === 'reveal' || state.phase === 'done' || finished)) {
      const dupText = last.dupes.length ? `<span class="nb-dupe">${last.dupes.join(', ')} 겹침!</span> ` : '';
      banner = last.winner
        ? `${dupText}<span><b>${last.number}</b>을(를) 낸 <b>${name(last.winner)}</b>님 <span class="gold">+${POINTS}점</span></span>`
        : `${dupText}<span>모든 숫자가 겹쳐서 아무도 점수를 얻지 못했어요</span>`;
    }

    const showCards = state.phase !== 'pick' && state.phase !== 'choose' && last;
    // 선 플레이어가 맨 위, 차례 순서대로 아래로 (왼쪽에 1·2·3 순번)
    const seq = state.first ? turnOrder(state) : state.order;
    const rows = seq.map((u, i) => {
      const card = showCards ? last.cards[u] : null;
      const status = finished || state.phase === 'done' ? ''
        : state.phase === 'choose' ? (u === state.chooser ? '<span class="nb-wait">👑 선 고르는 중</span>' : '')
        : state.phase === 'pick' ? (state.picks?.[u] !== undefined ? `<span class="nb-ok">✓ 제출</span><span class="nb-back ${colorOf(state.picks[u])}" title="${colorOf(state.picks[u]) === 'black' ? '검정(홀수)' : '흰색(짝수)'}"></span>` : state.turn === u ? '<span class="nb-turn">▶ 차례</span>' : '<span class="nb-wait">대기</span>')
        : `<span class="nb-card ${colorOf(card)} ${last.winner === u ? 'win' : ''} ${last.dupes.includes(card) ? 'dupe' : ''}">${card}</span>${last.auto[u] ? '<small class="nb-auto">자동</small>' : ''}`;
      return `<li class="${u === me ? 'me' : ''} ${showCards && last.winner === u ? 'win' : ''} ${state.phase === 'pick' && state.turn === u ? 'turn' : ''}">
        <span class="nb-seq">${state.first ? i + 1 : ''}</span>
        <span class="nb-name">${name(u)}${u === me ? ' <small>(나)</small>' : ''}${state.first === u ? ' <i class="nb-first">선</i>' : ''}</span>
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
        <div class="nb-banner">${banner || (state.phase === 'choose'
          ? (state.chooser === me ? '👑 인장이 가장 많아요! 1라운드 <b>선 플레이어</b>를 골라 주세요' : `👑 인장이 가장 많은 <b>${name(state.chooser)}</b>님이 선 플레이어를 고르는 중…`)
          : state.phase === 'pick' ? (myTurn ? '<b>내 차례!</b> 숫자 카드 한 장을 골라 제출하세요' : `<b>${name(state.turn)}</b>님 차례예요`) : '')}</div>
        ${state.phase === 'choose' && state.chooser === me ? `<div class="nb-choose">${state.order.map((u) => `<button class="btn" data-first="${esc(u)}">${name(u)}${u === me ? ' (나)' : ''}</button>`).join('')}</div>` : ''}
        <ul class="nb-board">${rows}</ul>
        ${isPlayer ? `
        <div class="nb-hand-title">내 카드 ${myPick !== undefined && state.phase === 'pick' ? `· <b>${myPick}</b> 제출 완료! 공개를 기다려요` : myTurn ? '· 카드를 고르고 제출하기를 눌러요' : state.phase === 'pick' ? '· 내 차례가 오면 낼 수 있어요' : ''}</div>
        <div class="nb-hand">
          ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
            const used = !myHand.includes(n);
            const sel = myPick !== undefined && state.phase === 'pick' ? myPick === n : pickUi.n === n && myTurn;
            return `<button class="nb-num ${colorOf(n)} ${used ? 'used' : ''} ${sel ? 'picked' : ''}" data-n="${n}" ${used || !myTurn || myPick !== undefined ? 'disabled' : ''}>${n}</button>`;
          }).join('')}
        </div>
        ${myTurn && myPick === undefined ? `<button class="btn primary block big nb-submit" data-submit ${pickUi.n !== null && myHand.includes(pickUi.n) ? '' : 'disabled'}>${pickUi.n !== null && myHand.includes(pickUi.n) ? `${pickUi.n} 제출하기` : '카드를 먼저 고르세요'}</button>` : ''}` : ''}`}
      </div>`;

    el.querySelectorAll('.nb-num').forEach((b) => {
      b.onclick = () => { const n = Number(b.dataset.n); pickUi.n = pickUi.n === n ? null : n; this.render(el, { state, me, players, finished, sendMove, room }); };
    });
    el.querySelectorAll('[data-first]').forEach((b) => (b.onclick = () => sendMove({ type: 'first', uid: b.dataset.first })));
    el.querySelector('[data-submit]')?.addEventListener('click', () => { if (pickUi.n !== null) sendMove({ type: 'pick', n: pickUi.n }); });

    // 타이머: 화면 갱신 + 시간이 지나면 진행 신호(tick) 보내기
    if (finished) return;
    const $t = el.querySelector('[data-timer]');
    const $bar = el.querySelector('[data-bar]');
    const myIndex = Math.max(0, state.order.indexOf(me));
    let lastTick = 0;
    const update = () => {
      if (!el.isConnected) return clearInterval(timer);
      const now = Date.now();
      if (state.phase === 'pick' || state.phase === 'choose') {
        const left = Math.max(0, state.deadline - now);
        $t.textContent = Math.ceil(left / 1000);
        $t.classList.toggle('hurry', left <= 5000);
        $bar.style.width = `${(left / (state.phase === 'choose' ? CHOOSE_MS : PICK_MS)) * 100}%`;
        if (left === 0 && now - lastTick > 2000 && now - state.deadline > 300 + myIndex * 350) { lastTick = now; sendMove({ type: 'tick' }, { silent: true }); }
      } else if (state.phase === 'reveal') {
        $t.textContent = state.round >= ROUNDS ? '결과' : '공개';
        $t.classList.remove('hurry');
        $bar.style.width = '0%';
        if (now >= state.revealUntil && now - lastTick > 2000 && now - state.revealUntil > 300 + myIndex * 350) { lastTick = now; sendMove({ type: 'tick' }, { silent: true }); }
      }
    };
    clearInterval(pickUi.timer);
    const timer = pickUi.timer = setInterval(update, 250);
    update();
  },
};
