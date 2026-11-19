// 기억포커 규칙 (순수 함수) — 서버(/api/game)와 테스트 모드가 함께 써요. 화면 코드는 memorypoker.js.
// 카드판은 외우는 20초 동안만 공개, 고르는 동안에는 서버만 알아요. 다른 사람의 선택도 결과 때까지 비밀이에요.
// 시간 판정은 서버 시계로 해요 (기기 시계가 달라도 공정하게).
export const MEMO_MS = 20000;
export const PICK_MS = 30000;
export const WIN_PTS = 10;
export const LETTERS = 'ABCDEFGHIJKLMNOP'.split('');
const SUITS = ['s', 'h', 'd', 'c'];
const SUIT_NAME = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const rewardsFor = (n) => (n === 2 ? [1] : n === 3 ? [2, 1] : [3, 2, 1]);

const DECK = SUITS.flatMap((s) => Array.from({ length: 13 }, (_, i) => `${s}${i + 2}`));
const rankOf = (id) => Number(id.slice(1));
const suitOf = (id) => id[0];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// ── 5장 족보 ──
export const HAND_NAMES = ['하이카드', '원페어', '투페어', '트리플', '스트레이트', '플러시', '풀하우스', '포카드', '스트레이트 플러시'];
export function evaluate(ids) {
  const ranks = ids.map(rankOf);
  const cnt = {};
  ranks.forEach((r) => (cnt[r] = (cnt[r] || 0) + 1));
  // 많이 나온 숫자 → 큰 숫자 순
  const groups = Object.entries(cnt).map(([r, c]) => [Number(r), c]).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const flush = ids.every((id) => suitOf(id) === suitOf(ids[0]));
  const uniq = [...new Set(ranks)].sort((a, b) => b - a);
  let straightHigh = 0;
  if (uniq.length === 5) {
    if (uniq[0] - uniq[4] === 4) straightHigh = uniq[0];
    else if (uniq.join() === '14,5,4,3,2') straightHigh = 5; // A-2-3-4-5
  }
  const byGroup = groups.flatMap(([r, c]) => Array(c).fill(r));
  let cat, vals, used;
  const inGroups = (minCount) => ids.filter((id) => cnt[rankOf(id)] >= minCount);
  if (straightHigh && flush) { cat = 8; vals = [straightHigh]; used = ids; }
  else if (groups[0][1] === 4) { cat = 7; vals = [groups[0][0], groups[1][0]]; used = inGroups(4); }
  else if (groups[0][1] === 3 && groups[1][1] === 2) { cat = 6; vals = [groups[0][0], groups[1][0]]; used = ids; }
  else if (flush) { cat = 5; vals = [...ranks].sort((a, b) => b - a); used = ids; }
  else if (straightHigh) { cat = 4; vals = [straightHigh]; used = ids; }
  else if (groups[0][1] === 3) { cat = 3; vals = [groups[0][0], ...groups.slice(1).map((g) => g[0])]; used = inGroups(3); }
  else if (groups[0][1] === 2 && groups[1][1] === 2) { cat = 2; vals = [groups[0][0], groups[1][0], groups[2][0]]; used = inGroups(2); }
  else if (groups[0][1] === 2) { cat = 1; vals = [groups[0][0], ...groups.slice(1).map((g) => g[0])]; used = inGroups(2); }
  else { cat = 0; vals = byGroup; used = ids.filter((id) => rankOf(id) === byGroup[0]); }
  return { cat, vals, name: HAND_NAMES[cat], used };
}
export function compare(a, b) {
  if (a.cat !== b.cat) return a.cat - b.cat;
  for (let i = 0; i < Math.max(a.vals.length, b.vals.length); i++) {
    const d = (a.vals[i] || 0) - (b.vals[i] || 0);
    if (d) return d;
  }
  return 0;
}
const rl = (r) => (r === 14 ? 'A' : r === 13 ? 'K' : r === 12 ? 'Q' : r === 11 ? 'J' : String(r));

// 승패 이유 설명
export function explain(results, winners, players) {
  const nm = (u) => players[u]?.name || '?';
  const ranked = Object.entries(results).sort((x, y) => compare(y[1].hand, x[1].hand));
  if (winners.length === ranked.length) return `모두 같은 ${ranked[0][1].hand.name}라서 무승부예요. 모두 승리!`;
  const [wu, w] = ranked[0];
  const [lu, l] = ranked.find(([u]) => !winners.includes(u));
  const wn = winners.map(nm).join(', ');
  if (w.hand.cat !== l.hand.cat) return `${wn}님의 ${w.hand.name}가 ${nm(lu)}님의 ${l.hand.name}보다 높아 승리했어요.`;
  const i = w.hand.vals.findIndex((v, k) => v !== l.hand.vals[k]);
  const what = i === 0 ? '비교 숫자' : `${i + 1}번째 비교 숫자(키커)`;
  return `같은 ${w.hand.name}예요. ${what} ${rl(w.hand.vals[i])}가 ${rl(l.hand.vals[i])}보다 높아 ${wn}님이 승리했어요.`;
}

function newRound(state, roundNo, now) {
  const deck = shuffle(DECK);
  return {
    ...state, round: roundNo, phase: 'memo', deadline: now + MEMO_MS,
    board: deck.slice(0, 16), shared: deck.slice(16, 19), picks: {}, results: null, winners: [], explain: '', ready: {},
  };
}
function resolve(state, now, players = {}) {
  const picks = { ...state.picks };
  state.order.forEach((u) => { if (!picks[u]) picks[u] = shuffle([...Array(16).keys()]).slice(0, 2); }); // 시간 초과 → 무작위
  const results = {};
  state.order.forEach((u) => {
    const mine = picks[u].map((i) => state.board[i]);
    results[u] = { picks: picks[u], cards: mine, hand: evaluate([...state.shared, ...mine]), auto: !state.picks[u] };
  });
  const best = Object.values(results).reduce((a, r) => (compare(r.hand, a) > 0 ? r.hand : a), results[state.order[0]].hand);
  const winners = state.order.filter((u) => compare(results[u].hand, best) === 0);
  const scores = { ...state.scores };
  winners.forEach((u) => (scores[u] += WIN_PTS));
  return { ...state, phase: 'result', picks, results, winners, scores, deadline: 0, ready: {}, explainText: explain(results, winners, players), history: [...state.history, { round: state.round, winners }] };
}
export function finalResult(state, players) {
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
    message: `${top.join(', ')}님 1등! 🃏`,
    winners: ranking.filter((r) => r.place === 1).map((r) => r.uid),
    ranking,
    rewards: Object.fromEntries(ranking.map((r) => [r.uid, r.garnets])),
  };
}

export function applyMove(state, move, uid, players) {
  const now = Date.now();
  if (!state.order.includes(uid) && move?.type !== 'tick') throw new Error('참가자가 아니에요');

  if (move?.type === 'ready') {
    if (!['ready', 'result'].includes(state.phase)) throw new Error('__noop');
    if (state.phase === 'result' && state.round >= state.rounds) throw new Error('__noop');
    const ready = { ...state.ready, [uid]: true };
    if (state.order.every((u) => ready[u])) return { state: newRound(state, state.round + 1, now) };
    return { state: { ...state, ready } };
  }

  if (move?.type === 'pick') {
    if (state.phase !== 'pick') throw new Error('지금은 카드를 고를 수 없어요');
    if (state.picks[uid]) throw new Error('이미 골랐어요');
    const ix = (move.picks || []).map(Number);
    if (ix.length !== 2 || ix[0] === ix[1] || !ix.every((i) => Number.isInteger(i) && i >= 0 && i < 16)) throw new Error('A~P 중 서로 다른 2곳을 골라 주세요');
    const picks = { ...state.picks, [uid]: ix };
    const s = { ...state, picks };
    if (state.order.every((u) => picks[u])) {
      const r = resolve(s, now, players);
      if (r.round >= r.rounds) { const done = { ...r, phase: 'done' }; return { state: done, result: finalResult(done, players) }; }
      return { state: r };
    }
    return { state: s };
  }

  if (move?.type === 'tick') {
    if (state.phase === 'memo' && now >= state.deadline) return { state: { ...state, phase: 'pick', deadline: now + PICK_MS } };
    if (state.phase === 'pick' && now >= state.deadline) {
      const r = resolve(state, now, players);
      if (r.round >= r.rounds) { const done = { ...r, phase: 'done' }; return { state: done, result: finalResult(done, players) }; }
      return { state: r };
    }
    throw new Error('__noop');
  }
  throw new Error('알 수 없는 동작이에요');
}

// ── 서버 진행용 ──
export const SECRET_MOVES = ['deal', 'pick']; // 사람별 비밀(내 선택)이 바뀌는 동작
export function deal(room) {
  const order = Object.keys(room.players || {}).sort((x, y) => (room.players[x].joinedAt || 0) - (room.players[y].joinedAt || 0));
  if (order.length < 2 || order.length > 4) throw new Error('기억포커는 2~4명이에요');
  const rounds = Math.min(10, Math.max(5, Number(room?.options?.rounds) || 5));
  return { order, rounds, round: 0, phase: 'ready', ready: {}, scores: Object.fromEntries(order.map((u) => [u, 0])), board: [], shared: [], picks: {}, results: null, winners: [], history: [], deadline: 0 };
}
export function split(full) {
  const { picks, ...pub } = full;
  pub.picked = Object.fromEntries(Object.keys(picks || {}).map((u) => [u, true])); // 누가 골랐는지만
  if (full.phase === 'pick') pub.board = []; // 고르는 동안 카드판은 비밀
  const mine = Object.fromEntries(full.order.map((u) => [u, { picks: (picks || {})[u] || null }]));
  return { pub, mine };
}
