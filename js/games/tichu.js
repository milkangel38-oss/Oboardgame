// 보드게임: 티츄 (4명, 2:2 팀전 클라이밍 게임)
// 카드 56장: ♠♥♦♣ 2~A + 특수 카드 4장(참새 1, 개, 주작, 용)
// 8장 받고 그랜드 티츄 → 6장 더 받고 카드 교환(3장) → 참새를 가진 사람이 선
// 같은 조합으로 더 높게 내거나 패스. 나머지가 모두 패스하면 마지막으로 낸 사람이 트릭을 가져가요.
// 점수: 5=5점, 10·K=10점, 용 +25, 주작 −25 / 티츄 ±100, 그랜드 티츄 ±200 / 원투(같은 팀 1·2등) 200점
import { turnAlert } from './turn-alert.js';
import { GARNET } from '../profile.js';

const SUITS = { s: { sym: '♠', color: '#23232b' }, h: { sym: '♥', color: '#d23a3a' }, d: { sym: '♦', color: '#2f6fd6' }, c: { sym: '♣', color: '#2f9e5b' } };
const RL = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
export const rankLabel = (r) => RL[r] || String(r);

export const CARDS = {};
for (const s of Object.keys(SUITS)) for (let r = 2; r <= 14; r++) CARDS[`${s}${r}`] = { id: `${s}${r}`, suit: s, rank: r };
CARDS.mj = { id: 'mj', special: 'mj', rank: 1 };
CARDS.dog = { id: 'dog', special: 'dog', rank: 0 };
CARDS.ph = { id: 'ph', special: 'ph', rank: 0 };
CARDS.dr = { id: 'dr', special: 'dr', rank: 15 };
export const DECK = Object.keys(CARDS);
const SPECIAL_NAME = { mj: '참새', dog: '개', ph: '주작', dr: '용' };
export const SPECIAL_DESC = {
  mj: '가장 낮은 카드(1). 참새를 가진 사람은 첫 트릭을 꼭 참새로 시작해요(싱글 또는 스트레이트). 낼 때 소원 숫자를 불러요 — 그 숫자를 가진 사람은 낼 수 있으면 꼭 내야 해요.',
  dog: '내가 선일 때만 혼자 낼 수 있어요. 바로 파트너에게 선을 넘겨요. 점수 0점.',
  ph: '싱글로 내면 바로 앞 카드보다 ½ 높아요(선이면 1½, 용은 못 이김). 조합에서는 아무 숫자나 대신해요(폭탄 제외). −25점.',
  dr: '가장 높은 싱글이에요(폭탄만 이길 수 있어요). 용으로 트릭을 이기면 그 트릭을 상대 팀 한 명에게 줘야 해요. +25점.',
};
const isNormal = (id) => !CARDS[id].special;

export const cardPoints = (id) => { const c = CARDS[id]; if (c.special === 'dr') return 25; if (c.special === 'ph') return -25; return c.rank === 5 ? 5 : c.rank === 10 || c.rank === 13 ? 10 : 0; };
const sumPts = (ids) => ids.reduce((s, id) => s + cardPoints(id), 0);

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// ── 조합 판정 ──
function classify(ranks) {
  const n = ranks.length;
  const cnt = {};
  ranks.forEach((r) => (cnt[r] = (cnt[r] || 0) + 1));
  const keys = Object.keys(cnt).map(Number).sort((a, b) => a - b);
  const seq = keys.every((k, i) => i === 0 || k === keys[i - 1] + 1);
  if (n === 2 && keys.length === 1 && keys[0] > 1) return { type: 'pair', rank: keys[0], len: 2 };
  if (n === 3 && keys.length === 1 && keys[0] > 1) return { type: 'triple', rank: keys[0], len: 3 };
  if (n === 5 && keys.length === 2 && keys[0] > 1) {
    const [a, b] = keys;
    if (cnt[a] === 3 && cnt[b] === 2) return { type: 'full', rank: a, len: 5 };
    if (cnt[b] === 3 && cnt[a] === 2) return { type: 'full', rank: b, len: 5 };
  }
  if (n >= 5 && keys.length === n && seq) return { type: 'straight', rank: keys[n - 1], len: n };
  if (n >= 4 && n % 2 === 0 && keys[0] > 1 && keys.every((k) => cnt[k] === 2) && seq) return { type: 'pairs', rank: keys[keys.length - 1], len: n };
  return null;
}

// top: 지금 바닥에 있는 조합 (주작 단독의 값 계산용)
export function analyze(ids, top = null) {
  if (!ids?.length || new Set(ids).size !== ids.length || ids.some((id) => !CARDS[id])) return null;
  const cs = ids.map((id) => CARDS[id]);
  const n = cs.length;
  if (n === 1) {
    const c = cs[0];
    if (c.special === 'dog') return { type: 'dog', rank: 0, len: 1 };
    if (c.special === 'ph') return { type: 'single', rank: (top && top.type === 'single' ? top.rank : 1) + 0.5, len: 1, phoenix: true };
    return { type: 'single', rank: c.rank, len: 1 };
  }
  if (cs.some((c) => c.special === 'dog' || c.special === 'dr')) return null;
  const hasPh = cs.some((c) => c.special === 'ph');
  const rest = cs.filter((c) => c.special !== 'ph');
  if (!hasPh && !rest.some((c) => c.special)) {
    if (n === 4 && rest.every((c) => c.rank === rest[0].rank)) return { type: 'bomb', sub: 'four', rank: rest[0].rank, len: 4 };
    if (n >= 5 && rest.every((c) => c.suit === rest[0].suit)) {
      const rs = rest.map((c) => c.rank).sort((a, b) => a - b);
      if (rs.every((r, i) => i === 0 || r === rs[i - 1] + 1)) return { type: 'bomb', sub: 'sf', rank: rs[n - 1], len: n };
    }
  }
  let best = null;
  for (const v of hasPh ? [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] : [null]) {
    const ranks = rest.map((c) => c.rank);
    if (v !== null) ranks.push(v);
    const r = classify(ranks);
    if (r && (!best || r.rank > best.rank)) best = r;
  }
  return best;
}

const bombVal = (b) => (b.sub === 'four' ? b.rank : 100 + b.len * 20 + b.rank);
export function beats(c, top) {
  if (!c) return false;
  if (!top) return true;
  if (top.type === 'dog' || c.type === 'dog') return false;
  if (c.type === 'bomb') return top.type !== 'bomb' || bombVal(c) > bombVal(top);
  if (top.type === 'bomb') return false;
  if (c.type !== top.type || c.len !== top.len) return false;
  if (c.phoenix && top.rank === 15) return false; // 주작은 용을 못 이겨요
  return c.rank > top.rank;
}

export function comboName(c) {
  if (!c) return '';
  if (c.phoenix) return `싱글 주작 (${c.rank === 1.5 ? '1½' : `${rankLabel(Math.floor(c.rank))}½`})`;
  const r = (x) => (x === 15 ? '용' : x % 1 ? `${rankLabel(Math.floor(x))}½` : rankLabel(x));
  return {
    single: `싱글 ${r(c.rank)}`, pair: `페어 ${r(c.rank)}`, triple: `트리플 ${r(c.rank)}`, full: `풀하우스 ${r(c.rank)}`,
    straight: `스트레이트 ${c.len}장 (~${r(c.rank)})`, pairs: `연속 페어 ${c.len / 2}쌍 (~${r(c.rank)})`, dog: '개',
    bomb: c.sub === 'four' ? `💣 포카드 폭탄 ${r(c.rank)}` : `💣 스트레이트 플러시 폭탄 ${c.len}장`,
  }[c.type];
}

// 소원: 소원 숫자로 이길 수 있는 조합이 있으면 꼭 내야 해요 (폭탄은 제외)
export function mustFulfill(hand, top, wish) {
  if (!wish || !hand.some((id) => isNormal(id) && CARDS[id].rank === wish)) return false;
  if (!top) return true;
  if (top.type === 'dog' || top.type === 'bomb' || top.len > hand.length) return false;
  const L = top.len, n = hand.length, pick = [];
  let found = false;
  const rec = (start) => {
    if (found) return;
    if (pick.length === L) {
      const ids = pick.map((i) => hand[i]);
      if (!ids.some((id) => isNormal(id) && CARDS[id].rank === wish)) return;
      const c = analyze(ids, top);
      if (c && c.type !== 'bomb' && beats(c, top)) found = true;
      return;
    }
    for (let i = start; i < n && !found; i++) { pick.push(i); rec(i + 1); pick.pop(); }
  };
  rec(0);
  return found;
}

// ── 진행 도우미 ──
const team = (state, u) => state.order.indexOf(u) % 2;
const active = (state, u) => (state.hands[u] || []).length > 0;
function nextActive(state, idx) {
  for (let k = 1; k <= 4; k++) { const j = (idx + k) % 4; if (active(state, state.order[j])) return j; }
  return -1;
}

function dealHand(state) {
  const deck = shuffle(DECK);
  const hands = {}, pending = {};
  state.order.forEach((u) => { hands[u] = deck.splice(0, 8); pending[u] = deck.splice(0, 6); });
  const none = (v) => Object.fromEntries(state.order.map((u) => [u, v]));
  return {
    ...state, phase: 'grand', hands, pending, grand: none(null), tichu: none(false), played: none(false),
    exchange: none(null), received: null, taken: none([]), outs: [], turn: -1,
    trick: { plays: [], top: null, last: null, passes: [] }, wish: null, dragon: null, handLog: null,
  };
}

function finalResult(state, players) {
  const win = state.scores[0] > state.scores[1] ? 0 : 1;
  const ranking = state.order.map((uid, i) => ({ uid, score: state.scores[i % 2], place: i % 2 === win ? 1 : 2, garnets: i % 2 === win ? 2 : 0 }))
    .sort((a, b) => a.place - b.place);
  const names = state.order.filter((_, i) => i % 2 === win).map((u) => players[u]?.name || '?');
  return {
    message: `${win ? '🔵 파랑팀' : '🔴 빨강팀'} (${names.join(' · ')}) 승리! ${state.scores[win]} : ${state.scores[1 - win]}`,
    winners: ranking.filter((r) => r.place === 1).map((r) => r.uid),
    ranking,
    rewards: Object.fromEntries(ranking.map((r) => [r.uid, r.garnets])),
  };
}

// 판 끝 점수 계산
function endHand(state, players) {
  const s = { ...state, taken: { ...state.taken } };
  // 진행 중이던 트릭은 마지막으로 낸 사람에게 (용이면 다음 자리 상대에게)
  if (s.trick.plays.length) {
    const cards = s.trick.plays.flatMap((p) => p.cards);
    let to = s.trick.last;
    if (s.trick.top?.type === 'single' && s.trick.top.rank === 15) to = s.order[(s.order.indexOf(to) + 1) % 4];
    s.taken[to] = [...s.taken[to], ...cards];
  }
  const first = s.outs[0];
  const pts = [0, 0], cardPts = [0, 0], calls = [0, 0];
  const double = s.outs.length >= 2 && team(s, s.outs[0]) === team(s, s.outs[1]);
  let lastU = null;
  if (double) pts[team(s, first)] += 200;
  else {
    lastU = s.order.find((u) => !s.outs.includes(u));
    cardPts[1 - team(s, lastU)] += sumPts(s.hands[lastU]); // 남은 손패 → 상대 팀
    s.taken[first] = [...s.taken[first], ...s.taken[lastU]]; // 가져간 카드 → 1등
    s.taken[lastU] = [];
    s.order.forEach((u) => (cardPts[team(s, u)] += sumPts(s.taken[u])));
    pts[0] += cardPts[0]; pts[1] += cardPts[1];
  }
  const callLog = [];
  s.order.forEach((u) => {
    const t = team(s, u);
    if (s.grand[u]) { const v = first === u ? 200 : -200; calls[t] += v; callLog.push({ uid: u, kind: '그랜드 티츄', v }); }
    if (s.tichu[u]) { const v = first === u ? 100 : -100; calls[t] += v; callLog.push({ uid: u, kind: '티츄', v }); }
  });
  pts[0] += calls[0]; pts[1] += calls[1];
  const scores = [s.scores[0] + pts[0], s.scores[1] + pts[1]];
  const handLog = { no: s.handNo, double, outs: s.outs, cardPts, calls: callLog, pts };
  const out = { ...s, scores, history: [...s.history, handLog], handLog, phase: 'handEnd', turn: -1, trick: { plays: [], top: null, last: null, passes: [] }, dragon: null };
  if (Math.max(...scores) >= s.target && scores[0] !== scores[1]) {
    const done = { ...out, phase: 'done' };
    return { state: done, result: finalResult(done, players) };
  }
  return { state: out };
}

function checkEnd(state, players) {
  const o = state.outs;
  if (o.length >= 3 || (o.length === 2 && team(state, o[0]) === team(state, o[1]))) return endHand(state, players);
  return null;
}

// 트릭 끝: 카드를 가져가고 다음 선을 정해요
function finishTrick(state, winner, toWhom = winner) {
  const cards = state.trick.plays.flatMap((p) => p.cards);
  const taken = { ...state.taken, [toWhom]: [...state.taken[toWhom], ...cards] };
  const wi = state.order.indexOf(winner);
  const s = { ...state, taken, trick: { plays: [], top: null, last: null, passes: [] }, dragon: null };
  s.turn = active(s, winner) ? wi : nextActive(s, wi);
  return s;
}

// 화면 상태
let ui = { key: '', sel: [], slots: [null, null, null], wish: false };

export default {
  id: 'tichu',
  name: '티츄',
  emoji: '🐉',
  category: 'board',
  minPlayers: 4,
  maxPlayers: 4,
  duration: '40~80분',
  teamGame: true,
  rewards: [2],
  rewardLabel: '승리팀 +2',
  description: '마주 앉은 파트너와 2:2! 먼저 손패를 털어라',
  options: [{ key: 'target', label: '목표 점수', choices: [1000, 500], default: 1000 }],
  rules: [
    '4명이 2:2 팀전을 해요. 마주 앉은 사람이 내 파트너예요 (🔴 빨강팀 vs 🔵 파랑팀, 자리는 무작위).',
    '카드 56장: 숫자 2~A(4무늬) + 특수 카드 🐦참새(1) · 🐕개 · 🔥주작 · 🐉용.',
    '먼저 8장을 받아요. 이때 "그랜드 티츄"를 선언할 수 있어요 (1등으로 나가면 +200, 못 하면 −200). 그다음 6장을 더 받아요.',
    '다른 세 사람에게 카드를 1장씩 줘요 (3장 교환). 첫 카드를 내기 전까지 "티츄"를 선언할 수 있어요 (1등이면 +100, 아니면 −100).',
    '🐦 참새를 가진 사람이 첫 트릭을 꼭 참새로 시작해요. 조합: 싱글 · 페어 · 트리플 · 풀하우스 · 스트레이트(5장 이상) · 연속 페어(2쌍 이상).',
    '앞사람과 같은 조합·같은 장수로 더 높게 내거나 패스해요. 나머지가 모두 패스하면 마지막으로 낸 사람이 트릭을 가져가고 새로 시작해요.',
    '💣 폭탄(같은 숫자 4장 / 같은 무늬 스트레이트 5장 이상)은 내 차례가 아니어도 언제든 낼 수 있고 무엇이든 이겨요.',
    '🐦참새를 낼 때 소원 숫자를 꼭 불러요. 다음 사람부터 그 숫자를 가진 사람은 낼 수 있으면 반드시 내야 해요 (소원은 그 숫자가 나올 때까지 유지). 🐕개는 선일 때만 내고 파트너에게 선을 넘겨요.',
    '🔥주작: 싱글이면 앞 카드보다 ½ 높고(용은 못 이김), 조합에서는 아무 숫자나 대신해요 (폭탄 제외). 🐉용: 가장 높은 싱글, 이기면 그 트릭을 상대 팀에게 줘야 해요.',
    '3명이 나가면 판 끝! 꼴찌의 손패는 상대 팀에게, 꼴찌가 가져간 카드는 1등에게 가요. 점수 카드: 5 = 5점, 10·K = 10점, 용 +25점, 주작 −25점.',
    '같은 팀이 1·2등으로 나가면 "원투"로 200점! (카드 점수 없음)',
    '목표 점수(1000 또는 500)에 먼저 닿은 팀이 승리, 이긴 팀 모두 가넷 +2',
  ],

  setup(players, room) {
    const order = shuffle(players.map((p) => p.uid));
    const target = Number(room?.options?.target) === 500 ? 500 : 1000;
    return dealHand({ order, target, scores: [0, 0], handNo: 1, history: [] });
  },

  move(state, move, uid, players) {
    if (move?.type === 'tick') throw new Error('__noop');
    if (!state.order.includes(uid)) throw new Error('참가자가 아니에요');
    const idx = state.order.indexOf(uid);

    if (move.type === 'grand') {
      if (state.phase !== 'grand' || state.grand[uid] !== null) throw new Error('__noop');
      const grand = { ...state.grand, [uid]: !!move.call };
      let s = { ...state, grand };
      if (state.order.every((u) => grand[u] !== null)) {
        const hands = Object.fromEntries(state.order.map((u) => [u, [...state.hands[u], ...state.pending[u]]]));
        s = { ...s, hands, pending: null, phase: 'exchange' };
      }
      return { state: s };
    }

    if (move.type === 'tichu') {
      if (!['exchange', 'play'].includes(state.phase) || state.played[uid] || state.grand[uid] || state.tichu[uid]) throw new Error('지금은 티츄를 선언할 수 없어요');
      return { state: { ...state, tichu: { ...state.tichu, [uid]: true } } };
    }

    if (move.type === 'exchange') {
      if (state.phase !== 'exchange' || state.exchange[uid]) throw new Error('__noop');
      const cs = move.cards;
      if (!Array.isArray(cs) || cs.length !== 3 || new Set(cs).size !== 3 || !cs.every((c) => state.hands[uid].includes(c))) throw new Error('줄 카드 3장을 골라 주세요');
      const exchange = { ...state.exchange, [uid]: cs };
      let s = { ...state, exchange };
      if (state.order.every((u) => exchange[u])) {
        // cs[0] → 다음 사람, cs[1] → 파트너, cs[2] → 이전 사람
        const hands = Object.fromEntries(state.order.map((u) => [u, state.hands[u].filter((c) => !exchange[u].includes(c))]));
        const received = Object.fromEntries(state.order.map((u) => [u, []]));
        state.order.forEach((u, i) => [1, 2, 3].forEach((d, k) => {
          const to = state.order[(i + d) % 4];
          hands[to].push(exchange[u][k]);
          received[to].push({ from: u, card: exchange[u][k] });
        }));
        const lead = state.order.findIndex((u) => hands[u].includes('mj'));
        s = { ...s, hands, received, phase: 'play', turn: lead };
      }
      return { state: s };
    }

    if (move.type === 'dragon') {
      if (state.phase !== 'play' || !state.dragon || state.dragon !== uid) throw new Error('__noop');
      if (!state.order.includes(move.to) || team(state, move.to) === team(state, uid)) throw new Error('상대 팀에게 줘야 해요');
      return { state: finishTrick(state, uid, move.to) };
    }

    if (move.type === 'play') {
      if (state.phase !== 'play' || state.dragon) throw new Error('지금은 낼 수 없어요');
      const hand = state.hands[uid];
      const cards = move.cards || [];
      if (!cards.length || !cards.every((c) => hand.includes(c))) throw new Error('가지고 있는 카드를 골라 주세요');
      const top = state.trick.top;
      const combo = analyze(cards, top);
      if (!combo) throw new Error('낼 수 없는 조합이에요');
      const myTurn = state.turn === idx;
      if (combo.type === 'bomb') {
        if (!myTurn && !top) throw new Error('폭탄은 바닥에 카드가 있을 때 끼어들 수 있어요');
      } else if (!myTurn) throw new Error('내 차례가 아니에요');
      if (combo.type === 'dog' && top) throw new Error('개는 선일 때만 낼 수 있어요');
      if (hand.includes('mj') && !Object.values(state.played).some(Boolean) && !cards.includes('mj')) throw new Error('첫 트릭은 참새를 내면서 시작해야 해요');
      if (cards.includes('mj') && !(move.wish >= 2 && move.wish <= 14)) throw new Error('참새를 낼 때는 소원 숫자를 불러야 해요');
      if (!beats(combo, top)) throw new Error('바닥보다 높은 같은 조합을 내야 해요');
      if (combo.type !== 'bomb' && mustFulfill(hand, top, state.wish) && !cards.some((c) => isNormal(c) && CARDS[c].rank === state.wish)) {
        throw new Error(`소원 숫자 ${rankLabel(state.wish)}를 내야 해요!`);
      }
      let wish = state.wish;
      if (cards.some((c) => isNormal(c) && CARDS[c].rank === wish)) wish = null;
      if (cards.includes('mj')) wish = Number(move.wish);
      const hands = { ...state.hands, [uid]: hand.filter((c) => !cards.includes(c)) };
      let s = {
        ...state, hands, wish, played: { ...state.played, [uid]: true },
        trick: { plays: [...state.trick.plays, { uid, cards, combo }], top: combo, last: uid, passes: [] },
      };
      if (!hands[uid].length) s.outs = [...s.outs, uid];
      const end = checkEnd(s, players);
      if (end) return end;
      if (combo.type === 'dog') {
        const p = (idx + 2) % 4;
        s = finishTrick(s, uid);
        s.turn = active(s, s.order[p]) ? p : nextActive(s, p);
        return { state: s };
      }
      s.turn = nextActive(s, idx);
      return { state: s };
    }

    if (move.type === 'pass') {
      if (state.phase !== 'play' || state.dragon || state.turn !== idx) throw new Error('내 차례가 아니에요');
      if (!state.trick.top) throw new Error('선은 패스할 수 없어요');
      if (mustFulfill(state.hands[uid], state.trick.top, state.wish)) throw new Error(`소원 숫자 ${rankLabel(state.wish)}를 낼 수 있으면 꼭 내야 해요!`);
      const passes = [...state.trick.passes, uid];
      let s = { ...state, trick: { ...state.trick, passes } };
      const last = s.trick.last;
      const others = s.order.filter((u) => u !== last && active(s, u));
      if (others.every((u) => passes.includes(u))) {
        const top = s.trick.top;
        if (top.type === 'single' && top.rank === 15) return { state: { ...s, dragon: last, turn: -1 } }; // 용: 줄 상대를 골라요
        return { state: finishTrick(s, last) };
      }
      s.turn = nextActive(s, idx);
      return { state: s };
    }

    if (move.type === 'next') {
      if (state.phase !== 'handEnd') throw new Error('__noop');
      return { state: dealHand({ ...state, handNo: state.handNo + 1 }) };
    }
    throw new Error('알 수 없는 동작이에요');
  },

  render(el, ctx) {
    const { state, me, players, finished, sendMove, room } = ctx;
    const name = (u) => esc(players[u]?.name || '나간 사람');
    const isPlayer = state.order.includes(me);
    const myIdx = isPlayer ? state.order.indexOf(me) : 0;
    const seatAt = (d) => state.order[(myIdx + d) % 4];
    const teamOf = (u) => state.order.indexOf(u) % 2;
    const TEAM = ['🔴 빨강팀', '🔵 파랑팀'];
    const teamNames = (t) => state.order.filter((_, i) => i % 2 === t).map(name).join(' · ');
    const hand = sortHand(state.hands[me] || []);
    const turnUid = state.turn >= 0 ? state.order[state.turn] : null;
    const myTurn = state.phase === 'play' && !state.dragon && turnUid === me;
    turnAlert(room?.code, `tc:${state.handNo}:${Object.values(state.hands).map((h) => h.length).join()}:${state.trick.plays.length}:${state.trick.passes.length}:${state.turn}`, myTurn && !finished);
    const key = `${room?.code}:${state.handNo}:${state.phase}:${(state.hands[me] || []).join()}:${state.trick.plays.length}`;
    if (ui.key !== key) ui = { key, sel: [], slots: ui.key.split(':').slice(0, 3).join() === key.split(':').slice(0, 3).join() ? ui.slots : [null, null, null], wish: false };

    const scoreboard = `
      <div class="tc-score">
        ${[0, 1].map((t) => `<div class="tc-team t${t} ${isPlayer && teamOf(me) === t ? 'mine' : ''}"><span>${TEAM[t]}${isPlayer && teamOf(me) === t ? ' <small>우리 팀</small>' : ''}</span><b>${state.scores[t]}</b><small>${teamNames(t)}</small></div>`).join('')}
        <div class="tc-target">목표 ${state.target}점 · ${state.handNo}번째 판</div>
      </div>`;

    if (finished) {
      const res = room?.result || finalResult(state, players);
      el.innerHTML = `<div class="tc">${scoreboard}
        <div class="dm-title" style="color:var(--gold)">🐉 최종 결과</div>
        ${historyTable(state, name)}
      </div>`;
      return;
    }

    const seat = (u, pos) => {
      if (!u) return '';
      const n = (state.hands[u] || []).length + (state.pending?.[u]?.length || 0);
      const out = state.outs.indexOf(u);
      const passed = state.trick.passes.includes(u);
      return `<div class="tc-seat ${pos} t${teamOf(u)} ${u === turnUid ? 'turn' : ''} ${u === me ? 'me' : ''}">
        <span class="tc-sname">${name(u)}${pos === 'top' ? ' <small>파트너</small>' : ''}</span>
        <span class="tc-sinfo">${out >= 0 ? `<b class="tc-out">${out + 1}등 완료</b>` : `🂠 ${n}장`}${state.grand[u] ? ' <b class="tc-call g">그랜드</b>' : state.tichu[u] ? ' <b class="tc-call">티츄</b>' : ''}${state.phase === 'exchange' ? (state.exchange[u] ? ' ✔' : ' …') : ''}${state.phase === 'grand' ? (state.grand[u] === null ? ' …' : ' ✔') : ''}</span>
        ${passed ? '<span class="tc-pass">패스</span>' : ''}
      </div>`;
    };

    // 바닥
    const lastPlay = state.trick.plays[state.trick.plays.length - 1];
    const center = state.phase === 'play' ? `
      <div class="tc-center">
        ${state.wish ? `<div class="tc-wish">🐦 소원 <b>${rankLabel(state.wish)}</b></div>` : ''}
        ${lastPlay ? `<div class="tc-floor">${lastPlay.cards.map((c) => cardHtml(c, 'sm')).join('')}</div><div class="tc-floor-t"><b>${name(lastPlay.uid)}</b> · ${esc(comboName(lastPlay.combo))}</div>` : `<div class="tc-floor-t muted">${turnUid ? `${name(turnUid)}님이 선이에요` : ''}</div>`}
      </div>` : '<div class="tc-center"></div>';

    // 안내 + 행동
    let banner = '', action = '';
    if (state.phase === 'grand') {
      banner = state.grand[me] === null ? '<span><b>카드 8장</b>을 보고 그랜드 티츄를 선언할지 정하세요 (1등이면 +200, 아니면 −200)</span>' : '<span>다른 사람을 기다리는 중…</span>';
      if (isPlayer && state.grand[me] === null) action = `<div class="ud-opts"><button class="btn tc-gbtn" data-grand="1">🔥 그랜드 티츄!</button><button class="btn primary" data-grand="0">6장 더 받기</button></div>`;
    } else if (state.phase === 'exchange') {
      if (isPlayer && !state.exchange[me]) {
        banner = '<span>각 사람에게 줄 카드를 1장씩 고르세요. 카드를 누르면 빈칸에 들어가요</span>';
        const labels = [`다음 · ${name(seatAt(1))}`, `파트너 · ${name(seatAt(2))}`, `이전 · ${name(seatAt(3))}`];
        action = `<div class="tc-slots">${ui.slots.map((c, i) => `<button class="tc-slot ${c ? 'full' : ''}" data-slot="${i}">${c ? cardHtml(c, 'sm') : '<span class="tc-empty">+</span>'}<small>${labels[i]}</small></button>`).join('')}</div>
          <button class="btn primary block" data-give ${ui.slots.every(Boolean) ? '' : 'disabled'}>카드 3장 주기</button>`;
      } else banner = '<span>교환할 카드를 고르는 중…</span>';
    } else if (state.phase === 'play') {
      if (state.dragon) {
        banner = state.dragon === me ? '<span><b>🐉 용으로 이겼어요!</b> 이 트릭을 줄 상대를 고르세요</span>' : `<span><b>${name(state.dragon)}</b>님이 용 트릭을 줄 상대를 고르는 중…</span>`;
        if (state.dragon === me) action = `<div class="ud-opts">${state.order.filter((u) => teamOf(u) !== teamOf(me)).map((u) => `<button class="btn" data-dragon="${u}">${name(u)}에게 주기</button>`).join('')}</div>`;
      } else {
        const must = myTurn && mustFulfill(state.hands[me], state.trick.top, state.wish);
        const mjFirst = myTurn && (state.hands[me] || []).includes('mj') && !Object.values(state.played).some(Boolean);
        banner = myTurn ? `<span><b>내 차례!</b> ${state.trick.top ? `${esc(comboName(state.trick.top))}보다 높게 내거나 패스` : '선이에요. 원하는 조합을 내세요'}${must ? ` · <b style="color:var(--gold)">소원 ${rankLabel(state.wish)}를 꼭 내야 해요</b>` : ''}${mjFirst ? ' · <b style="color:var(--gold)">🐦 참새를 내면서 시작하세요</b>' : ''}</span>` : `<span><b>${name(turnUid)}</b>님 차례${state.outs.includes(me) ? ' · 나는 이미 나갔어요' : ''}</span>`;
        const combo = analyze(ui.sel, state.trick.top);
        const ok = combo && beats(combo, state.trick.top) && (myTurn || (combo.type === 'bomb' && state.trick.top)) && !(combo.type === 'dog' && state.trick.top);
        if (isPlayer && active(state, me)) {
          action = `
            ${ui.sel.filter((c) => CARDS[c].special).map((c) => `<div class="tc-spdesc">${cardHtml(c, 'xs')}<span><b>${SPECIAL_NAME[CARDS[c].special]}</b> ${SPECIAL_DESC[CARDS[c].special]}</span></div>`).join('')}
            <div class="tc-preview">${ui.sel.length ? (combo ? `${esc(comboName(combo))}${ok ? '' : ' · <span class="dn">지금은 못 내요</span>'}` : '<span class="dn">조합이 아니에요</span>') : '<span class="muted">낼 카드를 눌러 고르세요</span>'}</div>
            ${ui.wish ? `<div class="tc-wishpick"><span>🐦 소원 숫자를 부르세요! 그 숫자를 가진 사람은 낼 수 있으면 꼭 내야 해요</span><div>${[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map((r) => `<button class="btn sm" data-wish="${r}">${rankLabel(r)}</button>`).join('')}</div></div>` : `
            <div class="tc-acts">
              <button class="btn primary" data-play ${ok ? '' : 'disabled'}>${combo?.type === 'bomb' && !myTurn ? '💣 폭탄 끼어들기!' : '내기'}</button>
              <button class="btn" data-pass ${myTurn && state.trick.top && !must ? '' : 'disabled'}>패스</button>
            </div>`}`;
        }
      }
    } else if (state.phase === 'handEnd') {
      const h = state.handLog;
      banner = `<span><b>${h.no}번째 판 끝!</b> ${h.double ? `${TEAM[teamOf(h.outs[0])]} 원투! +200` : ''}</span>`;
      action = `<div class="tc-handend">
          ${[0, 1].map((t) => `<div class="t${t}"><b>${TEAM[t]}</b>${h.double ? '' : `<span>카드 ${h.cardPts[t]}점</span>`}${h.calls.filter((c) => teamOf(c.uid) === t).map((c) => `<span>${name(c.uid)} ${c.kind} ${c.v > 0 ? '성공 +' : '실패 '}${c.v}</span>`).join('')}<em class="${h.pts[t] >= 0 ? 'up' : 'dn'}">${h.pts[t] >= 0 ? '+' : ''}${h.pts[t]}</em></div>`).join('')}
        </div>
        <button class="btn primary block" data-next>다음 판 시작 ▶</button>`;
    }

    const canTichu = isPlayer && ['exchange', 'play'].includes(state.phase) && !state.played[me] && !state.grand[me] && !state.tichu[me];
    const shownHand = state.phase === 'exchange' ? hand.filter((c) => !ui.slots.includes(c)) : hand;
    const received = state.received?.[me] && !state.played[me] ? `<div class="tc-recv">받은 카드: ${state.received[me].map((r) => `<span>${cardHtml(r.card, 'xs')}<small>${name(r.from)}</small></span>`).join('')}</div>` : '';

    el.innerHTML = `
      <div class="tc">
        ${scoreboard}
        <div class="tc-table">
          ${seat(seatAt(2), 'top')}
          ${seat(seatAt(3), 'left')}
          ${center}
          ${seat(seatAt(1), 'right')}
        </div>
        <div class="nb-banner">${banner}</div>
        ${action}
        ${received}
        ${isPlayer && shownHand.length ? `
          <div class="ud-mine-title">🃏 내 카드 ${hand.length}장 ${state.grand[me] ? '<b class="tc-call g">그랜드 티츄</b>' : state.tichu[me] ? '<b class="tc-call">티츄</b>' : ''}
            ${canTichu ? '<button class="btn sm tc-tbtn" data-tichu>티츄!</button>' : ''}</div>
          <div class="tc-hand">${shownHand.map((c) => `<button class="tc-cbtn ${ui.sel.includes(c) ? 'sel' : ''} ${state.wish && !CARDS[c].special && CARDS[c].rank === state.wish ? 'wishc' : ''}" data-c="${c}">${cardHtml(c)}</button>`).join('')}</div>` : ''}
        ${guideHtml()}
        ${state.history.length ? `<details class="tc-hist"><summary>판별 점수 보기</summary>${historyTable(state, name)}</details>` : ''}
      </div>`;

    const rerender = () => { const y = window.scrollY; this.render(el, ctx); window.scrollTo(0, y); };
    el.querySelectorAll('[data-grand]').forEach((b) => (b.onclick = () => sendMove({ type: 'grand', call: b.dataset.grand === '1' })));
    el.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => {
      const c = b.dataset.c;
      if (state.phase === 'exchange') {
        if (state.exchange[me]) return;
        const i = ui.slots.indexOf(null);
        if (i >= 0) ui.slots[i] = c;
      } else if (state.phase === 'play') {
        ui.sel = ui.sel.includes(c) ? ui.sel.filter((x) => x !== c) : [...ui.sel, c];
        ui.wish = false;
      }
      ui.key = key;
      rerender();
    }));
    el.querySelectorAll('[data-slot]').forEach((b) => (b.onclick = () => { ui.slots[Number(b.dataset.slot)] = null; ui.key = key; rerender(); }));
    const $give = el.querySelector('[data-give]');
    if ($give) $give.onclick = () => sendMove({ type: 'exchange', cards: ui.slots });
    const $play = el.querySelector('[data-play]');
    if ($play) $play.onclick = () => {
      if (ui.sel.includes('mj')) { ui.wish = true; ui.key = key; rerender(); return; }
      sendMove({ type: 'play', cards: ui.sel });
    };
    el.querySelectorAll('[data-wish]').forEach((b) => (b.onclick = () => sendMove({ type: 'play', cards: ui.sel, wish: Number(b.dataset.wish) || null })));
    const $pass = el.querySelector('[data-pass]');
    if ($pass) $pass.onclick = () => sendMove({ type: 'pass' });
    const $t = el.querySelector('[data-tichu]');
    if ($t) $t.onclick = () => sendMove({ type: 'tichu' });
    el.querySelectorAll('[data-dragon]').forEach((b) => (b.onclick = () => sendMove({ type: 'dragon', to: b.dataset.dragon })));
    const $next = el.querySelector('[data-next]');
    if ($next) $next.onclick = () => sendMove({ type: 'next' });
    const $g = el.querySelector('.tc-guide');
    if ($g) $g.ontoggle = () => (guideOpen = $g.open);
  },
};

// ── 족보 · 이기는 순서 (모두에게 게시) ──
let guideOpen = true;
function guideHtml() {
  const ex = (...ids) => `<span class="tc-ex">${ids.map((c) => cardHtml(c, 'xs')).join('')}</span>`;
  const rows = [
    ['싱글', '카드 1장', ex('h9')],
    ['페어', '같은 숫자 2장', ex('s7', 'h7')],
    ['트리플', '같은 숫자 3장', ex('s7', 'h7', 'd7')],
    ['풀하우스', '트리플 + 페어 · 트리플 숫자로 비교', ex('s7', 'h7', 'd7', 'c3', 'h3')],
    ['스트레이트', '연속된 숫자 5장 이상 · 가장 높은 숫자로 비교', ex('s3', 'h4', 'd5', 'c6', 'h7')],
    ['연속 페어', '이어지는 페어 2쌍 이상', ex('s3', 'h3', 'd4', 'c4')],
  ];
  return `<details class="tc-guide" ${guideOpen ? 'open' : ''}><summary>📜 족보 · 이기는 순서</summary>
    <div class="tc-gsec">
      <div class="tc-gt">숫자 순서 (낮음 → 높음)</div>
      <div class="tc-order">🐦참새(1) < 2 < 3 < 4 < 5 < 6 < 7 < 8 < 9 < 10 < J < Q < K < A < 🐉용</div>
    </div>
    <div class="tc-gsec">
      <div class="tc-gt">족보 <small>바닥과 같은 족보 · 같은 장수로 더 높아야 이겨요</small></div>
      ${rows.map(([n, d, e]) => `<div class="tc-grow"><b>${n}</b><span>${d}</span>${e}</div>`).join('')}
    </div>
    <div class="tc-gsec bomb">
      <div class="tc-gt">💣 폭탄 <small>무엇이든 이기고, 내 차례가 아니어도 끼어들 수 있어요</small></div>
      <div class="tc-grow"><b>포카드</b><span>같은 숫자 4장</span>${ex('s9', 'h9', 'd9', 'c9')}</div>
      <div class="tc-grow"><b>스트레이트 플러시</b><span>같은 무늬 연속 5장 이상 · 포카드보다 강하고, 길수록 강해요</span>${ex('h4', 'h5', 'h6', 'h7', 'h8')}</div>
    </div>
    <div class="tc-gsec">
      <div class="tc-gt">특수 카드</div>
      ${['mj', 'dog', 'ph', 'dr'].map((c) => `<div class="tc-grow sp">${cardHtml(c, 'sm')}<span><b>${SPECIAL_NAME[CARDS[c].special]}</b> ${SPECIAL_DESC[CARDS[c].special]}</span></div>`).join('')}
    </div>
    <div class="tc-gsec">
      <div class="tc-gt">점수 카드</div>
      <div class="tc-pts">${ex('h5')}<b>5점</b>${ex('s10')}${ex('dK'.replace('K', '13'))}<b>10점</b>${ex('dr')}<b class="up">+25점</b>${ex('ph')}<b class="dn">−25점</b></div>
      <div class="tc-gnote">티츄 성공 +100 / 실패 −100 · 그랜드 티츄 ±200 · 원투(같은 팀 1·2등) +200</div>
    </div>
  </details>`;
}

function historyTable(state, name) {
  return `<table class="sk-table tc-htable"><thead><tr><th>판</th><th>🔴 빨강</th><th>🔵 파랑</th><th>내용</th></tr></thead><tbody>
    ${state.history.map((h) => `<tr><td>${h.no}</td><td class="${h.pts[0] >= 0 ? 'up' : 'dn'}">${h.pts[0] >= 0 ? '+' : ''}${h.pts[0]}</td><td class="${h.pts[1] >= 0 ? 'up' : 'dn'}">${h.pts[1] >= 0 ? '+' : ''}${h.pts[1]}</td>
      <td class="tc-hnote">${h.double ? '원투! ' : ''}${h.calls.map((c) => `${name(c.uid)} ${c.kind} ${c.v > 0 ? '성공' : '실패'}`).join(', ')}</td></tr>`).join('')}
    <tr class="tc-total"><td>합계</td><td>${state.scores[0]}</td><td>${state.scores[1]}</td><td></td></tr>
  </tbody></table>`;
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function sortHand(ids) {
  const k = (id) => { const c = CARDS[id]; if (c.special === 'dog') return -1; if (c.special === 'mj') return 0; if (c.special === 'ph') return 15.5; if (c.special === 'dr') return 16; return c.rank + 'shdc'.indexOf(c.suit) / 10; };
  return [...ids].sort((a, b) => k(a) - k(b));
}

// ── 카드 그림 (직접 그림) ──
const SP_ART = {
  mj: `<svg viewBox="0 0 40 40"><ellipse cx="20" cy="24" rx="11" ry="8" fill="#a8743a"/><circle cx="29" cy="16" r="6" fill="#8a5a2a"/><path d="M34 16 l5 1.5 l-5 1.5 z" fill="#e0a11a"/><circle cx="30" cy="15" r="1.4" fill="#111"/><path d="M10 22 l-8 -4 l3 7 z" fill="#6b4420"/><path d="M14 22 q6 -6 14 0" fill="#c99a62"/><path d="M17 31 v5 M23 31 v5" stroke="#6b4420" stroke-width="1.6"/></svg>`,
  dog: `<svg viewBox="0 0 40 40"><path d="M8 10 C6 18 8 24 12 24 L14 14 Z" fill="#6b4420"/><path d="M32 10 C34 18 32 24 28 24 L26 14 Z" fill="#6b4420"/><ellipse cx="20" cy="21" rx="10" ry="11" fill="#d9a066"/><ellipse cx="20" cy="27" rx="6" ry="4.5" fill="#f2dcc0"/><circle cx="16" cy="19" r="1.7" fill="#111"/><circle cx="24" cy="19" r="1.7" fill="#111"/><ellipse cx="20" cy="24.5" rx="2.4" ry="1.7" fill="#111"/><path d="M20 26 v2 M17 29 q3 2 6 0" stroke="#111" stroke-width="1" fill="none"/></svg>`,
  ph: `<svg viewBox="0 0 40 40"><path d="M20 34 C10 30 4 20 6 8 C12 16 16 18 20 18 C24 18 28 16 34 8 C36 20 30 30 20 34 Z" fill="#ff6b2a"/><path d="M20 34 C14 30 11 24 12 16 C16 21 18 22 20 22 C22 22 24 21 28 16 C29 24 26 30 20 34 Z" fill="#ffc23a"/><circle cx="20" cy="12" r="4.5" fill="#ff8a2a"/><path d="M24 12 l4 1 l-4 1.5 z" fill="#e0a11a"/><circle cx="21" cy="11" r="1" fill="#111"/><path d="M18 8 q-1 -5 2 -6 M20 8 q1 -5 4 -5" stroke="#ff4f2a" stroke-width="1.4" fill="none"/></svg>`,
  dr: `<svg viewBox="0 0 40 40"><path d="M6 30 C10 20 16 22 20 18 C24 14 22 8 28 6 C34 5 38 10 36 14 C34 18 30 16 28 18 C26 22 30 26 26 30 C22 34 14 34 6 30 Z" fill="#2f9e5b"/><path d="M28 6 l-2 -4 l4 3 z M33 6 l1 -4 l1 5 z" fill="#e0a11a"/><circle cx="32" cy="10" r="1.6" fill="#ffd84d"/><circle cx="32.4" cy="10" r=".7" fill="#111"/><path d="M36 14 q4 1 3 4" stroke="#d23a3a" stroke-width="1.4" fill="none"/><path d="M12 26 q4 -3 8 0 M16 30 q4 -3 8 0" stroke="#1f7a40" stroke-width="1.4" fill="none"/></svg>`,
};
const PIPS = {
  2: [[25, 17], [25, 53]], 3: [[25, 17], [25, 35], [25, 53]],
  4: [[18, 17], [32, 17], [18, 53], [32, 53]], 5: [[18, 17], [32, 17], [25, 35], [18, 53], [32, 53]],
  6: [[18, 17], [32, 17], [18, 35], [32, 35], [18, 53], [32, 53]],
  7: [[18, 17], [32, 17], [25, 26], [18, 35], [32, 35], [18, 53], [32, 53]],
  8: [[18, 17], [32, 17], [25, 26], [18, 35], [32, 35], [25, 44], [18, 53], [32, 53]],
  9: [[18, 15], [32, 15], [18, 28], [32, 28], [25, 35], [18, 42], [32, 42], [18, 55], [32, 55]],
  10: [[18, 15], [32, 15], [25, 21.5], [18, 28], [32, 28], [18, 42], [32, 42], [25, 48.5], [18, 55], [32, 55]],
};
export function cardHtml(id, size = '') {
  const c = CARDS[id];
  if (c.special) {
    // 특수 카드: 동양화 그림(img/tichu) + 금색 이름
    return `<div class="tcard sp ${size} sp-${c.special}"><svg viewBox="0 0 50 70">
      <defs><clipPath id="tcclip"><rect x="2.5" y="2.5" width="45" height="51" rx="2.5"/></clipPath></defs>
      <image href="img/tichu/sp-${c.special}.webp" x="-1" y="2.5" width="52" height="52" clip-path="url(#tcclip)" preserveAspectRatio="xMidYMid slice"/>
      <rect x="2.5" y="2.5" width="45" height="51" rx="2.5" fill="none" stroke="#c9a24a" stroke-width=".8"/>
      ${c.special === 'mj' ? '<circle cx="8" cy="9" r="5" fill="#1d1830" stroke="#c9a24a" stroke-width=".6"/><text x="8" y="12" text-anchor="middle" font-family="\'Black Han Sans\', sans-serif" font-size="8" fill="#f2d27a">1</text>' : ''}
      <text x="25" y="64.5" text-anchor="middle" font-size="8.5" font-weight="800" fill="#f2d27a">${SPECIAL_NAME[c.special]}</text></svg></div>`;
  }
  ensureSuitSprite();
  const L = rankLabel(c.rank), pip = (x, y, w, flip) => `<use href="#suit-${c.suit}" class="pip" fill="url(#sg-${c.suit})" x="${x - w / 2}" y="${y - w / 2}" width="${w}" height="${w}"${flip ? ` transform="rotate(180 ${x} ${y})"` : ''}/>`;
  const col = SUITS[c.suit].color;
  const corner = `<text x="5.4" y="9.6" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${L.length > 1 ? 7.4 : 9}" letter-spacing="${L.length > 1 ? -0.6 : 0}" fill="${col}">${L}</text>${pip(5.4, 14.4, 5.2)}`;
  let mid;
  if (c.rank <= 10) mid = PIPS[c.rank].map(([x, y]) => pip(x, y, 8.6, y > 36)).join('');
  else if (c.rank === 14) mid = `<circle cx="25" cy="35" r="14" fill="${col}" fill-opacity=".05" stroke="#b8963e" stroke-width=".6"/><circle cx="25" cy="35" r="12.4" fill="none" stroke="#b8963e" stroke-width=".3"/>${pip(25, 35, 17)}`;
  else {
    // J·Q·K: 금테 안에 무늬 색 문장(검·작은 왕관·큰 왕관) + 아래에 무늬
    const em = { 11: 'j', 12: 'q', 13: 'k' }[c.rank];
    mid = `<rect x="10.5" y="7" width="29" height="56" rx="2.2" fill="${col}" fill-opacity=".05" stroke="#b8963e" stroke-width=".6"/><rect x="12" y="8.5" width="26" height="53" rx="1.6" fill="none" stroke="#b8963e" stroke-width=".25"/>
      <use href="#emb-${em}" fill="url(#sg-${c.suit})" x="13" y="16" width="24" height="24"/>${pip(25, 48, 9)}`;
  }
  return `<div class="tcard ${size}"><svg viewBox="0 0 50 70">${mid}${corner}<g transform="rotate(180 25 35)">${corner}</g></svg></div>`;
}

// 무늬 그림: 문서에 한 번만 넣어 두고 카드마다 <use>로 불러와요 (그라데이션이 숨은 SVG 안에 있으면 안 그려지는 문제 방지)
const SUIT_PATH = {
  s: '<path d="M5 .3C6.8 2.6 10 4.3 10 6.6 10 8.3 8.4 9.1 7 8.4 6.5 8.1 6.1 7.7 5.8 7.2 5.9 8.5 6.4 9.3 7.2 9.8H2.8C3.6 9.3 4.1 8.5 4.2 7.2 3.9 7.7 3.5 8.1 3 8.4 1.6 9.1 0 8.3 0 6.6 0 4.3 3.2 2.6 5 .3Z"/>',
  h: '<path d="M5 9.6C3.5 8 .2 5.9 .2 3.3 .2 1.6 1.5 .4 3 .4 4 .4 4.6 1 5 1.7 5.4 1 6 .4 7 .4 8.5 .4 9.8 1.6 9.8 3.3 9.8 5.9 6.5 8 5 9.6Z"/>',
  d: '<path d="M5 .2 8.6 5 5 9.8 1.4 5Z"/>',
  c: '<circle cx="5" cy="2.8" r="2.35"/><circle cx="2.55" cy="6.05" r="2.35"/><circle cx="7.45" cy="6.05" r="2.35"/><path d="M4 3.5 3.4 6.5h3.2L6 3.5ZM4.4 6.2C4.4 8 3.8 9.2 2.9 9.8h4.2C6.2 9.2 5.6 8 5.6 6.2Z"/>',
};
const SUIT_GRAD = { s: ['#5a5a6a', '#26262e', '#08080c'], h: ['#ff7b6b', '#d22a2a', '#8a0f18'], d: ['#7fb0ff', '#2f6fd6', '#12388a'], c: ['#6fe0a0', '#2f9e5b', '#0e5a2e'] };
const GOLD = '#e8cf8a';
const EMBLEMS = [
  // J: 검
  `<symbol id="emb-j" viewBox="0 0 20 20" overflow="visible"><g stroke="rgba(0,0,0,.3)" stroke-width=".22"><path d="M10 .6 11.4 3.6V12.8H8.6V3.6Z"/><rect x="4.2" y="12.8" width="11.6" height="1.8" rx=".9"/><rect x="9.1" y="14.6" width="1.8" height="3.4" rx=".4"/><circle cx="10" cy="18.9" r="1.25"/></g><path d="M10 3.2V12" stroke="rgba(255,255,255,.55)" stroke-width=".45"/><circle cx="10" cy="13.7" r=".6" fill="${GOLD}"/></symbol>`,
  // Q: 둥근 아치 왕관(티아라)
  `<symbol id="emb-q" viewBox="0 0 20 20" overflow="visible"><g stroke="rgba(0,0,0,.3)" stroke-width=".22"><path d="M2.5 14.2C2.2 10.5 3.6 8.4 5.6 9.6 6.2 6.4 7.8 4.6 10 4.4 12.2 4.6 13.8 6.4 14.4 9.6 16.4 8.4 17.8 10.5 17.5 14.2Z"/><rect x="2.3" y="14.2" width="15.4" height="2.4" rx=".6"/><circle cx="5.4" cy="8.4" r="1.05"/><circle cx="10" cy="3.2" r="1.15"/><circle cx="14.6" cy="8.4" r="1.05"/></g><ellipse cx="10" cy="10.4" rx="1.3" ry="1.8" fill="${GOLD}"/><circle cx="6" cy="15.4" r=".55" fill="${GOLD}"/><circle cx="10" cy="15.4" r=".55" fill="${GOLD}"/><circle cx="14" cy="15.4" r=".55" fill="${GOLD}"/></symbol>`,
  // K: 뾰족한 큰 왕관
  `<symbol id="emb-k" viewBox="0 0 20 20" overflow="visible"><g stroke="rgba(0,0,0,.3)" stroke-width=".22"><path d="M2.2 13.6 1 5.2 6.2 9.2 10 2.4 13.8 9.2 19 5.2 17.8 13.6Z"/><rect x="2" y="13.6" width="16" height="2.8" rx=".6"/><circle cx="1" cy="5" r="1.1"/><circle cx="10" cy="2.2" r="1.2"/><circle cx="19" cy="5" r="1.1"/></g><path d="M10 6.6 11.2 9.6 10 12.4 8.8 9.6Z" fill="${GOLD}"/><circle cx="5.6" cy="15" r=".65" fill="${GOLD}"/><circle cx="10" cy="15" r=".65" fill="${GOLD}"/><circle cx="14.4" cy="15" r=".65" fill="${GOLD}"/></symbol>`,
].join('');
function ensureSuitSprite() {
  if (typeof document === 'undefined' || document.getElementById('suit-sprite')) return;
  const g = Object.entries(SUIT_GRAD).map(([k, [a, b, d]]) => `<linearGradient id="sg-${k}" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".45" stop-color="${b}"/><stop offset="1" stop-color="${d}"/></linearGradient>`).join('');
  const sym = Object.entries(SUIT_PATH).map(([k, d]) => `<symbol id="suit-${k}" viewBox="0 0 10 10" overflow="visible"><g stroke="rgba(0,0,0,.28)" stroke-width=".22">${d}</g></symbol>`).join('');
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.id = 'suit-sprite'; el.setAttribute('aria-hidden', 'true');
  el.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
  el.innerHTML = `<defs>${g}</defs>${sym}${EMBLEMS}`;
  document.body.appendChild(el);
}
