// 보드게임: 새들의 정원 (2~4명) — 서식지에 새를 놓아 엔진을 키우는 오리지널 게임
// 행동 4가지: 새 놓기 / 🌲숲: 먹이 얻기 / 🌾들판: 알 낳기 / 🌊물가: 카드 뽑기
// 줄 행동을 하면 그 줄 새들의 '활성' 능력이 오른쪽부터 차례로 발동해요. 4라운드(행동 8·7·6·5번), 라운드마다 목표 점수.
import { GARNET } from '../profile.js';
import { soundEvent } from '../sound.js';
import { turnAlert, bigFlash } from './turn-alert.js';
import { BIRDS, FOODS, FOOD, HAB, powerInfo, birdSvg } from './garden-birds.js';

const ROWS = ['f', 'g', 'w'];
const SLOTS = 5;
const EGG_COST = [0, 1, 1, 2, 2];             // 줄의 몇 번째 칸에 놓느냐에 따른 알 비용
const YIELD = { f: [1, 2, 2, 2, 3, 3], g: [2, 2, 3, 3, 4, 4], w: [1, 2, 2, 2, 3, 3] }; // 줄에 새가 n마리일 때 행동 효과 (먹이·알·카드)
const ACTIONS = [8, 7, 6, 5];
const COPIES = 2;
export const rewardsFor = (n) => Array.from({ length: n }, (_, i) => n - i); // 2명 [2,1] · 3명 [3,2,1] · 4명 [4,3,2,1]

export const GOALS = {
  f: { name: '🌲 숲에 있는 새', count: (p) => p.board.f.length },
  g: { name: '🌾 들판에 있는 새', count: (p) => p.board.g.length },
  w: { name: '🌊 물가에 있는 새', count: (p) => p.board.w.length },
  eggBirds: { name: '🥚 알이 있는 새', count: (p) => allBirds(p).filter((b) => b.eggs > 0).length },
  eggs: { name: '🥚 알 전체 개수', count: (p) => allBirds(p).reduce((a, b) => a + b.eggs, 0) },
  stash: { name: '📦 저장 먹이 + 끼운 카드', count: (p) => allBirds(p).reduce((a, b) => a + b.cache + b.tuck, 0) },
  big: { name: '⭐ 4점 이상인 새', count: (p) => allBirds(p).filter((b) => BIRDS[cardBird(b.id)].pts >= 4).length },
  food: { name: '🍽️ 가진 먹이 개수', count: (p) => FOODS.reduce((a, f) => a + p.food[f], 0) },
};
const GOAL_PTS = [[4, 2, 1], [5, 3, 1], [6, 4, 2], [7, 5, 3]];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const DIE = ['B', 'S', 'F', 'I', 'M', 'B']; // 주사위 6면 (벌레가 조금 흔함)
const roll = () => DIE[Math.floor(Math.random() * 6)];
export const cardBird = (id) => Number(String(id).split('_')[0]);
const allBirds = (p) => ROWS.flatMap((r) => p.board[r]);
const room = (b) => BIRDS[cardBird(b.id)].eggs - b.eggs;
const clone = (s) => JSON.parse(JSON.stringify(s));

export function scoreOf(s, u) {
  const p = s.players[u];
  const birds = allBirds(p);
  const parts = {
    birds: birds.reduce((a, b) => a + BIRDS[cardBird(b.id)].pts, 0),
    eggs: birds.reduce((a, b) => a + b.eggs, 0),
    cache: birds.reduce((a, b) => a + b.cache, 0),
    tuck: birds.reduce((a, b) => a + b.tuck, 0),
    goals: (s.goalPts[u] || []).reduce((a, b) => a + b, 0),
  };
  return { ...parts, total: parts.birds + parts.eggs + parts.cache + parts.tuck + parts.goals };
}

// ── 덱 · 진열대 ──
function drawCard(s) {
  if (!s.deck.length) { s.deck = shuffle(s.discard); s.discard = []; }
  return s.deck.pop() ?? null;
}
function refillTray(s) {
  for (let i = 0; i < 3; i++) if (!s.tray[i]) s.tray[i] = drawCard(s);
}
function giveFood(p, f, n = 1) { p.food[f] += n; }
// 알: 빈자리가 가장 많은 새부터 자동으로 (능력·놓을 때 쓰임)
function autoEggs(p, n, prefer) {
  let laid = 0;
  for (let k = 0; k < n; k++) {
    const pool = allBirds(p).filter((b) => room(b) > 0);
    if (!pool.length) break;
    const pick = prefer && room(prefer) > 0 ? prefer : pool.sort((a, b) => room(b) - room(a))[0];
    pick.eggs += 1; laid += 1;
  }
  return laid;
}
function canPay(p, cost) {
  const need = { B: 0, S: 0, F: 0, I: 0, M: 0 };
  let wild = 0;
  cost.forEach((c) => (c === '*' ? wild++ : need[c]++));
  if (FOODS.some((f) => p.food[f] < need[f])) return false;
  const left = FOODS.reduce((a, f) => a + p.food[f] - need[f], 0);
  return left >= wild;
}
function pay(p, cost) {
  cost.filter((c) => c !== '*').forEach((c) => { p.food[c] -= 1; });
  cost.filter((c) => c === '*').forEach(() => { const f = [...FOODS].sort((a, b) => p.food[b] - p.food[a])[0]; p.food[f] -= 1; });
}
function payEggs(p, n) {
  for (let k = 0; k < n; k++) { const b = allBirds(p).filter((x) => x.eggs > 0).sort((a, c) => c.eggs - a.eggs)[0]; if (b) b.eggs -= 1; }
}
const cardsLeft = (s) => s.deck.length + s.discard.length + s.tray.filter(Boolean).length;
const totalEggs = (p) => allBirds(p).reduce((a, b) => a + b.eggs, 0);

// ── 능력 ──
function runPower(s, u, bird, row, log) {
  const info = powerInfo(BIRDS[cardBird(bird.id)].power);
  if (!info) return;
  const p = s.players[u];
  const nm = BIRDS[cardBird(bird.id)].name;
  switch (info.key) {
    case 'gainFood': giveFood(p, info.x); log.push(`${nm}: ${FOOD[info.x].icon}+1`); break;
    case 'eggSelf': if (room(bird) > 0) { bird.eggs += 1; log.push(`${nm}: 🥚+1`); } break;
    case 'eggAny': if (autoEggs(p, 1)) log.push(`${nm}: 🥚+1`); break;
    case 'draw': { const c = drawCard(s); if (c) { p.hand.push(c); log.push(`${nm}: 카드+1`); } break; }
    case 'flock': { const c = drawCard(s); if (c) { bird.tuck += 1; s.discard.push(c); log.push(`${nm}: 카드 끼우기+1`); } break; }
    case 'cache': bird.cache += 1; log.push(`${nm}: ${FOOD[info.x].icon} 저장+1`); break;
    case 'hunt': { const d = roll(); if (d === info.x) { bird.cache += 1; log.push(`${nm}: 🎲${FOOD[d].icon} 사냥 성공!`); } else log.push(`${nm}: 🎲${FOOD[d].icon} 사냥 실패`); break; }
    case 'share': s.order.forEach((v) => giveFood(s.players[v], info.x)); giveFood(p, info.x); log.push(`${nm}: 모두 ${FOOD[info.x].icon}+1, 나는 +1 더`); break;
    case 'tradeEgg': {
      const f = [...FOODS].sort((a, b) => p.food[b] - p.food[a])[0];
      if (p.food[f] > 0 && allBirds(p).some((b) => room(b) > 0)) { p.food[f] -= 1; const n = autoEggs(p, 2); log.push(`${nm}: ${FOOD[f].icon}-1 → 🥚+${n}`); }
      break;
    }
    case 'wFood': [...info.x].forEach((f) => giveFood(p, f)); log.push(`${nm}: ${[...info.x].map((f) => FOOD[f].icon).join('')} 얻음`); break;
    case 'wDraw2': for (let k = 0; k < 2; k++) { const c = drawCard(s); if (c) p.hand.push(c); } log.push(`${nm}: 카드+2`); break;
    case 'wEgg2': { const n = autoEggs(p, 2); if (n) log.push(`${nm}: 🥚+${n}`); break; }
    case 'rEgg': if (room(bird) > 0) { bird.eggs += 1; log.push(`${nm}: 🥚+1`); } break;
    case 'rDraw': { const c = drawCard(s); if (c) { p.hand.push(c); log.push(`${nm}: 카드+1`); } break; }
    default: break;
  }
}
function activateRow(s, u, row, log) {
  const birds = s.players[u].board[row];
  for (let i = birds.length - 1; i >= 0; i--) {
    const info = powerInfo(BIRDS[cardBird(birds[i].id)].power);
    if (info?.kind === 'act') runPower(s, u, birds[i], row, log);
  }
}
function pinkTriggers(s, u, kind, log) {
  s.order.filter((v) => v !== u).forEach((v) => {
    allBirds(s.players[v]).forEach((b) => {
      const info = powerInfo(BIRDS[cardBird(b.id)].power);
      if (info?.kind !== 'pink') return;
      if (info.key === 'pEgg' && kind === 'g' && room(b) > 0) { b.eggs += 1; log.push(`(${s.names?.[v] || ''} ${BIRDS[cardBird(b.id)].name} 🥚+1)`); }
      if (info.key === 'pFood' && kind === 'f') { giveFood(s.players[v], info.x); log.push(`(${s.names?.[v] || ''} ${BIRDS[cardBird(b.id)].name} ${FOOD[info.x].icon}+1)`); }
    });
  });
}

// ── 차례 · 라운드 ──
function endTurn(s, players) {
  s.pending = null;
  refillTray(s);
  s.actionsLeft[s.turn] -= 1;
  const n = s.order.length;
  const start = s.order.indexOf(s.turn);
  for (let k = 1; k <= n; k++) {
    const u = s.order[(start + k) % n];
    if (s.actionsLeft[u] > 0) { s.turn = u; s.turnNo += 1; return null; }
  }
  return endRound(s, players);
}
function endRound(s, players) {
  const log = [];
  // 라운드 끝 능력
  s.order.forEach((u) => allBirds(s.players[u]).forEach((b) => { const info = powerInfo(BIRDS[cardBird(b.id)].power); if (info?.kind === 'round') runPower(s, u, b, null, log); }));
  // 라운드 목표
  const g = GOALS[s.goals[s.round - 1]];
  const counts = s.order.map((u) => ({ u, c: g.count(s.players[u]) })).sort((a, b) => b.c - a.c);
  const pts = GOAL_PTS[s.round - 1];
  const res = {};
  counts.forEach((x) => {
    const place = counts.filter((o) => o.c > x.c).length;
    res[x.u] = x.c > 0 ? (pts[place] || 0) : 0;
    s.goalPts[x.u] = [...(s.goalPts[x.u] || []), res[x.u]];
  });
  s.roundLog = [...(s.roundLog || []), { round: s.round, goal: s.goals[s.round - 1], counts: Object.fromEntries(counts.map((x) => [x.u, x.c])), pts: res, powers: log }];
  // 진열대 비우기
  s.tray.forEach((c) => c && s.discard.push(c));
  s.tray = [null, null, null];
  refillTray(s);
  if (s.round >= 4) {
    s.phase = 'done';
    return finalResult(s, players);
  }
  s.round += 1;
  s.first = (s.first + 1) % s.order.length;
  s.turn = s.order[s.first];
  s.turnNo += 1;
  s.order.forEach((u) => { s.actionsLeft[u] = ACTIONS[s.round - 1]; });
  s.roundAt = Date.now();
  return null;
}
function finalResult(s, players) {
  const rewards = rewardsFor(s.order.length);
  const ranking = s.order
    .map((uid) => ({ uid, score: scoreOf(s, uid).total }))
    .sort((a, b) => b.score - a.score)
    .map((r, _, all) => { const place = 1 + all.filter((o) => o.score > r.score).length; return { ...r, place, garnets: rewards[place - 1] || 0 }; });
  const top = ranking.filter((r) => r.place === 1).map((r) => players[r.uid]?.name || '?');
  return { message: `${top.join(', ')}님 1등! 🐦`, winners: ranking.filter((r) => r.place === 1).map((r) => r.uid), ranking, rewards: Object.fromEntries(ranking.map((r) => [r.uid, r.garnets])) };
}

// 행동 후 마무리: 줄 능력 → 다른 사람 분홍 능력 → 차례 넘기기
function finishAction(s, u, row, players, base) {
  const log = [];
  activateRow(s, u, row, log);
  pinkTriggers(s, u, row, log);
  s.last = { u, text: base, powers: log, at: Date.now() };
  return endTurn(s, players);
}

export default {
  id: 'garden',
  name: '새들의 정원',
  emoji: '🐦',
  category: 'board',
  minPlayers: 2,
  maxPlayers: 4,
  duration: '30~50분',
  rewards: [4, 3, 2, 1],
  rewardLabel: '1등 최대 +4',
  description: '정원에 새를 모아 나만의 생태계를! 먹이·알·카드로 엔진 키우기',
  rules: [
    '내 정원에는 서식지 3줄(🌲숲 · 🌾들판 · 🌊물가)이 있고, 줄마다 새를 5마리까지 놓을 수 있어요.',
    '내 차례에 행동 1개를 해요. ① 새 놓기: 손의 새 카드를 그 새가 살 수 있는 줄의 왼쪽 빈칸에 놓아요. 카드의 먹이를 내고, 2·3번째 칸은 알 1개, 4·5번째 칸은 알 2개를 더 내요.',
    '② 🌲숲: 모이통 주사위에서 먹이를 가져와요. ③ 🌾들판: 새들 둥지에 알을 낳아요. ④ 🌊물가: 진열대나 덱에서 새 카드를 뽑아요. 그 줄에 새가 많을수록 더 많이 얻어요 (먹이·카드 1→3개, 알 2→4개).',
    '줄 행동을 하면 그 줄 새들의 [활성] 능력이 오른쪽 새부터 차례로 발동해요. [놓을 때] 능력은 새를 놓을 때 한 번, [다른 사람 차례] 능력은 다른 사람이 그 행동을 할 때, [라운드 끝] 능력은 라운드가 끝날 때 발동해요.',
    '4라운드 동안 각자 행동을 8 → 7 → 6 → 5번 해요. 라운드마다 목표(예: 숲에 있는 새 수)로 순위를 매겨 점수를 줘요.',
    '점수 = 새 카드 점수 + 알 1개당 1점 + 저장한 먹이·끼운 카드 1개당 1점 + 라운드 목표 점수',
    '가넷: 2명 → 1등 2, 2등 1 / 3명 → 3·2·1 / 4명 → 4·3·2·1',
  ],

  setup(players) {
    const order = shuffle(players.map((p) => p.uid));
    const deck = shuffle(BIRDS.flatMap((b) => Array.from({ length: COPIES }, (_, k) => `${b.i}_${k}`)));
    const s = {
      order, round: 1, first: 0, turn: order[0], turnNo: 1, phase: 'play', deck, discard: [], tray: [null, null, null],
      feeder: Array.from({ length: 5 }, roll), players: {}, actionsLeft: {}, pending: null,
      goals: shuffle(Object.keys(GOALS)).slice(0, 4), goalPts: {}, last: null, roundLog: [], roundAt: Date.now(),
      names: Object.fromEntries(players.map((p) => [p.uid, p.name])),
    };
    order.forEach((u, i) => {
      const hand = [drawCard(s), drawCard(s), drawCard(s), drawCard(s), drawCard(s)];
      s.players[u] = { hand, food: { B: 1, S: 1, F: 1, I: 0, M: 0, ...(i % 2 ? { I: 1 } : { M: 1 }) }, board: { f: [], g: [], w: [] } };
      s.actionsLeft[u] = ACTIONS[0];
    });
    refillTray(s);
    return s;
  },

  move(state, move, uid, players) {
    if (state.phase !== 'play') throw new Error('__noop');
    if (uid !== state.turn) throw new Error('내 차례가 아니에요');
    const s = clone(state);
    const p = s.players[uid];
    const t = move?.type;
    const done = (r) => (r ? { state: s, result: r } : { state: s });

    // 진행 중인 선택 (먹이 고르기 · 알 놓기 · 카드 고르기)
    if (s.pending) {
      const pd = s.pending;
      if (t === 'die' && pd.kind === 'food') {
        const i = Number(move.i);
        if (!(i >= 0 && i < s.feeder.length)) throw new Error('__noop');
        const f = s.feeder.splice(i, 1)[0];
        giveFood(p, f);
        pd.got.push(f);
        pd.left -= 1;
        if (!s.feeder.length) s.feeder = Array.from({ length: 5 }, roll);
        if (pd.left > 0) return { state: s };
        return done(finishAction(s, uid, 'f', players, `🌲 숲에서 먹이 ${pd.got.map((x) => FOOD[x].icon).join('')}`));
      }
      if (t === 'reroll' && pd.kind === 'food') {
        if (new Set(s.feeder).size !== 1) throw new Error('모이통 주사위가 모두 같은 먹이일 때만 다시 굴릴 수 있어요');
        s.feeder = Array.from({ length: 5 }, roll);
        return { state: s };
      }
      if (t === 'egg' && pd.kind === 'egg') {
        const b = p.board[move.row]?.[Number(move.slot)];
        if (!b) throw new Error('__noop');
        if (room(b) <= 0) throw new Error('이 새의 둥지가 가득 찼어요');
        b.eggs += 1;
        pd.left -= 1;
        pd.got += 1;
        if (pd.left > 0 && allBirds(p).some((x) => room(x) > 0)) return { state: s };
        return done(finishAction(s, uid, 'g', players, `🌾 들판에서 알 ${pd.got}개`));
      }
      if (t === 'skip' && pd.kind === 'egg') return done(finishAction(s, uid, 'g', players, `🌾 들판에서 알 ${pd.got}개`));
      if (t === 'draw' && pd.kind === 'draw') {
        let c;
        if (move.from === 'deck') c = drawCard(s);
        else { const i = Number(move.from); c = s.tray[i]; if (!c) throw new Error('빈 자리예요'); s.tray[i] = null; }
        if (!c) throw new Error('뽑을 카드가 없어요');
        p.hand.push(c);
        pd.left -= 1;
        pd.got += 1;
        if (pd.left > 0 && cardsLeft(s)) return { state: s };
        return done(finishAction(s, uid, 'w', players, `🌊 물가에서 카드 ${pd.got}장`));
      }
      throw new Error(pd.kind === 'food' ? '모이통에서 먹이를 먼저 골라 주세요' : pd.kind === 'egg' ? '알을 놓을 새를 먼저 골라 주세요' : '가져올 카드를 먼저 골라 주세요');
    }

    if (t === 'act') {
      const row = move.row;
      if (!ROWS.includes(row)) throw new Error('__noop');
      const n = YIELD[row][p.board[row].length];
      if (row === 'f') s.pending = { kind: 'food', left: n, total: n, got: [] };
      if (row === 'g') {
        if (!allBirds(p).some((b) => room(b) > 0)) throw new Error('알을 놓을 수 있는 새가 없어요. 먼저 새를 놓아 주세요');
        s.pending = { kind: 'egg', left: n, total: n, got: 0 };
      }
      if (row === 'w') {
        if (!cardsLeft(s)) throw new Error('뽑을 수 있는 새 카드가 남아 있지 않아요');
        s.pending = { kind: 'draw', left: n, total: n, got: 0 };
      }
      return { state: s };
    }
    if (t === 'play') {
      const ci = p.hand.indexOf(move.card);
      if (ci < 0) throw new Error('__noop');
      const bird = BIRDS[cardBird(move.card)];
      const row = move.row;
      if (!bird.hab.includes(row)) throw new Error(`${bird.name}은(는) ${HAB[row].name}에 살 수 없어요`);
      const slot = p.board[row].length;
      if (slot >= SLOTS) throw new Error(`${HAB[row].name} 줄이 가득 찼어요`);
      if (totalEggs(p) < EGG_COST[slot]) throw new Error(`이 칸에 놓으려면 알 ${EGG_COST[slot]}개가 필요해요`);
      if (!canPay(p, bird.cost)) throw new Error(`먹이가 부족해요 (필요: ${bird.cost.map((c) => FOOD[c].icon).join(' ')})`);
      pay(p, bird.cost);
      payEggs(p, EGG_COST[slot]);
      p.hand.splice(ci, 1);
      const b = { id: move.card, eggs: 0, cache: 0, tuck: 0 };
      p.board[row].push(b);
      const log = [];
      const info = powerInfo(bird.power);
      if (info?.kind === 'play') runPower(s, uid, b, row, log);
      s.last = { u: uid, text: `${HAB[row].icon} ${HAB[row].name}에 ${bird.name}을(를) 놓았어요`, powers: log, at: Date.now(), bird: bird.i };
      return done(endTurn(s, players));
    }
    throw new Error('알 수 없는 동작이에요');
  },

  render(el, { state, me, players, finished, sendMove, room: rm }) {
    const name = (u) => esc(players[u]?.name || state.names?.[u] || '나간 사람');
    const isPlayer = state.order.includes(me);
    const myTurn = state.turn === me && state.phase === 'play' && !finished;
    const p = state.players[me];
    const pd = myTurn ? state.pending : null;
    if (rm) turnAlert(rm.code, `gd:${state.turnNo}`, myTurn && !state.pending);
    if (rm && state.last && state.last.u !== me && Date.now() - state.last.at < 4000) soundEvent(rm.code, `gd:last:${state.last.at}`, 'ok');

    const foodIcons = (cost) => cost.map((c) => `<i class="gd-f" title="${FOOD[c].name}">${FOOD[c].icon}</i>`).join('');
    const card = (id, extra = '') => {
      const b = BIRDS[cardBird(id)];
      const info = powerInfo(b.power);
      return `<div class="gd-card ${extra}" data-card="${id}">
        <div class="gd-c-top"><span class="gd-c-hab">${b.hab.map((h) => HAB[h].icon).join('')}</span><b>${b.pts}<small>점</small></b></div>
        <div class="gd-c-art">${birdSvg(b)}</div>
        <div class="gd-c-name">${b.name}</div>
        <div class="gd-c-cost">${foodIcons(b.cost)}<span class="gd-c-egg" title="둥지 칸">🥚×${b.eggs}</span></div>
        <div class="gd-c-pow ${info ? info.kind : 'none'}">${info ? `<em>${info.when}</em>${info.text}` : '능력 없음'}</div>
      </div>`;
    };
    const slotBird = (b, row, i, owner) => {
      const bd = BIRDS[cardBird(b.id)];
      const info = powerInfo(bd.power);
      const eggTarget = owner === me && pd?.kind === 'egg' && room(b) > 0;
      return `<${eggTarget ? 'button' : 'div'} class="gd-slot bird ${eggTarget ? 'target' : ''}" ${eggTarget ? `data-egg="${row}:${i}"` : `data-peek="${b.id}"`} title="${bd.name} · ${bd.pts}점${info ? ` · [${info.when}] ${info.text}` : ''}">
        <span class="gd-s-art">${birdSvg(bd)}</span>
        <span class="gd-s-name">${bd.name}<b>${bd.pts}</b></span>
        <span class="gd-s-eggs">${'🥚'.repeat(b.eggs)}${'<i class="nest"></i>'.repeat(Math.max(0, bd.eggs - b.eggs))}</span>
        ${b.cache || b.tuck ? `<span class="gd-s-stash">${b.cache ? `📦${b.cache}` : ''}${b.tuck ? ` 🃏${b.tuck}` : ''}</span>` : ''}
        ${info ? `<span class="gd-s-pow ${info.kind}">${{ act: '활', play: '놓', pink: '남', round: '끝' }[info.kind]}</span>` : ''}
      </${eggTarget ? 'button' : 'div'}>`;
    };
    const boardHtml = (u, mine) => {
      const pl = state.players[u];
      return ROWS.map((row) => {
        const birds = pl.board[row];
        const n = YIELD[row][birds.length];
        const label = { f: `먹이 ${n}개`, g: `알 ${n}개`, w: `카드 ${n}장` }[row];
        const canAct = mine && myTurn && !pd;
        return `<div class="gd-row ${row}">
          <${canAct ? 'button' : 'div'} class="gd-row-h ${canAct ? 'act' : ''}" ${canAct ? `data-act="${row}"` : ''}><span>${HAB[row].icon}</span><b>${HAB[row].name}</b><small>${label}</small></${canAct ? 'button' : 'div'}>
          ${Array.from({ length: SLOTS }, (_, i) => birds[i] ? slotBird(birds[i], row, i, u)
            : `<div class="gd-slot empty ${mine && selCard && i === birds.length && BIRDS[cardBird(selCard)].hab.includes(row) ? 'drop' : ''}" ${mine && selCard && i === birds.length && BIRDS[cardBird(selCard)].hab.includes(row) ? `data-drop="${row}"` : ''}>${EGG_COST[i] ? `<small>🥚${EGG_COST[i]}</small>` : ''}${mine && selCard && i === birds.length && BIRDS[cardBird(selCard)].hab.includes(row) ? '<b>여기 놓기</b>' : ''}</div>`).join('')}
        </div>`;
      }).join('');
    };
    const foodBar = (pl) => FOODS.map((f) => `<span class="${pl.food[f] ? '' : 'zero'}">${FOOD[f].icon}<b>${pl.food[f]}</b></span>`).join('');

    // 선택한 손 카드 (내 차례에만)
    if (!myTurn || pd || !p?.hand.includes(ui.sel)) ui.sel = null;
    var selCard = ui.sel;

    const sc = scoreOf(state, me);
    const goalRow = state.goals.map((g, i) => {
      const pts = GOAL_PTS[i];
      const done = state.roundLog.find((r) => r.round === i + 1);
      return `<div class="gd-goal ${i + 1 === state.round && state.phase === 'play' ? 'now' : ''} ${done ? 'done' : ''}"><small>${i + 1}라운드</small><b>${GOALS[g].name}</b><span>${pts.slice(0, state.order.length).join('/')}점</span>
        ${done ? `<em>${state.order.map((u) => `${name(u)} ${done.counts[u]}→+${done.pts[u]}`).join(' · ')}</em>` : ''}</div>`;
    }).join('');

    let prompt = '';
    if (pd?.kind === 'food') prompt = `🌲 모이통에서 먹이를 골라요 (${pd.total - pd.left + 1}/${pd.total})${new Set(state.feeder).size === 1 ? ' · 모두 같은 먹이라 다시 굴릴 수 있어요' : ''}`;
    if (pd?.kind === 'egg') prompt = `🌾 알을 놓을 새를 눌러요 (${pd.total - pd.left + 1}/${pd.total}) <button class="gd-skip" data-skip>그만 낳기</button>`;
    if (pd?.kind === 'draw') prompt = `🌊 진열대 카드나 덱을 눌러 가져와요 (${pd.total - pd.left + 1}/${pd.total})`;
    if (myTurn && !pd) prompt = selCard ? `🐦 ${BIRDS[cardBird(selCard)].name}을(를) 놓을 줄의 <b>여기 놓기</b> 칸을 눌러요 · 다시 누르면 취소` : '👉 내 차례! 손의 새 카드를 눌러 놓거나, 줄 이름(🌲숲·🌾들판·🌊물가)을 눌러 행동해요';

    const lastHtml = state.last ? `<div class="gd-last"><b>${name(state.last.u)}</b> ${esc(state.last.text)}${state.last.powers?.length ? `<small>${state.last.powers.map(esc).join(' · ')}</small>` : ''}</div>` : '';

    const others = state.order.filter((u) => u !== me).map((u) => {
      const s2 = scoreOf(state, u);
      return `<div class="gd-other ${state.turn === u ? 'turn' : ''}"><div class="gd-o-h"><b>${name(u)}</b>${state.turn === u && !finished ? '<em>차례</em>' : ''}<span>${s2.total}점 · 손 ${state.players[u].hand.length}장 · 행동 ${state.actionsLeft[u]}</span></div>
        <div class="gd-o-food">${foodBar(state.players[u])}</div><div class="gd-board mini">${boardHtml(u, false)}</div></div>`;
    }).join('');

    let final = '';
    if (finished || state.phase === 'done') {
      const ranking = rm?.result?.ranking || finalResult(state, players).ranking;
      final = `<div class="dm-title" style="color:var(--gold)">🐦 최종 순위</div>
        <ol class="nb-final">${ranking.map((r) => { const s2 = scoreOf(state, r.uid); return `<li class="${r.uid === me ? 'me' : ''}">
          <span class="nb-place">${r.place <= 3 ? ['🥇', '🥈', '🥉'][r.place - 1] : r.place + '등'}</span>
          <span class="nb-name">${name(r.uid)}<small class="ud-break">새 ${s2.birds} + 알 ${s2.eggs} + 저장 ${s2.cache} + 끼움 ${s2.tuck} + 목표 ${s2.goals}</small></span>
          <span class="nb-score">${r.score}점</span><span class="nb-reward">${r.garnets ? `${GARNET}+${r.garnets}` : ''}</span></li>`; }).join('')}</ol>`;
    }

    el.innerHTML = `<div class="gd">
      ${final}
      <div class="gd-head"><span>ROUND <b>${state.round}</b> / 4</span><span class="gd-turn ${myTurn ? 'me' : ''}">${finished || state.phase === 'done' ? '게임 끝' : myTurn ? '내 차례!' : `${name(state.turn)}님 차례`}</span><span>내 행동 ${isPlayer ? state.actionsLeft[me] : '-'}번 남음</span></div>
      <div class="gd-goals">${goalRow}</div>
      ${lastHtml}
      <div class="gd-center">
        <div class="gd-feeder ${pd?.kind === 'food' ? 'pick' : ''}"><div class="gd-lbl">🪵 모이통</div><div class="gd-dice">${state.feeder.map((f, i) => `<button class="gd-die" data-die="${i}" ${pd?.kind === 'food' ? '' : 'disabled'}>${FOOD[f].icon}</button>`).join('')}</div>
          ${pd?.kind === 'food' && new Set(state.feeder).size === 1 ? '<button class="gd-skip" data-reroll>🎲 다시 굴리기</button>' : ''}</div>
        <div class="gd-trayw ${pd?.kind === 'draw' ? 'pick' : ''}"><div class="gd-lbl">🃏 진열대</div><div class="gd-tray">${state.tray.map((c, i) => c ? `<button class="gd-tbtn" data-draw="${i}" ${pd?.kind === 'draw' ? '' : 'disabled'}>${card(c, 'sm')}</button>` : '<div class="gd-card sm empty"></div>').join('')}
          <button class="gd-deck" data-draw="deck" ${pd?.kind === 'draw' && state.deck.length + state.discard.length ? '' : 'disabled'}><b>덱</b><small>${state.deck.length}장</small></button></div></div>
      </div>
      ${prompt ? `<div class="gd-prompt">${prompt}</div>` : ''}
      ${isPlayer ? `<div class="gd-mine">
        <div class="gd-me-h"><b>내 정원</b><span class="gd-food">${foodBar(p)}</span><span class="gd-score">${sc.total}점 <small>새${sc.birds}·알${sc.eggs}·저장${sc.cache + sc.tuck}·목표${sc.goals}</small></span></div>
        <div class="gd-board">${boardHtml(me, true)}</div>
        <div class="gd-legend"><span><i class="gd-s-pow act" style="position:static">활</i>활성(이 줄 행동 때)</span><span><i class="gd-s-pow play" style="position:static">놓</i>놓을 때</span><span><i class="gd-s-pow pink" style="position:static">남</i>다른 사람 차례</span><span><i class="gd-s-pow round" style="position:static">끝</i>라운드 끝</span><span>· 정원의 새를 누르면 카드를 크게 봐요</span></div>
        <div class="gd-hand-h">내 손 카드 ${p.hand.length}장</div>
        <div class="gd-hand">${p.hand.map((c) => { const b = BIRDS[cardBird(c)]; const ok = canPay(p, b.cost); return `<button class="gd-hbtn ${selCard === c ? 'sel' : ''} ${ok ? '' : 'poor'}" data-hand="${c}" ${myTurn && !pd ? '' : 'disabled'}>${card(c)}</button>`; }).join('') || '<p class="hint">손에 카드가 없어요 · 🌊물가에서 뽑아요</p>'}</div>
      </div>` : ''}
      <div class="gd-others">${others}</div>
    </div>`;

    el.querySelectorAll('[data-peek]').forEach((b) => (b.onclick = () => {
      document.querySelector('.gd-pop')?.remove();
      const pop = document.createElement('div');
      pop.className = 'gd-pop';
      pop.innerHTML = `<div>${card(b.dataset.peek, 'big')}<small>아무 곳이나 누르면 닫혀요</small></div>`;
      pop.onclick = () => pop.remove();
      document.body.appendChild(pop);
    }));
    el.querySelectorAll('[data-act]').forEach((b) => (b.onclick = () => sendMove({ type: 'act', row: b.dataset.act })));
    el.querySelectorAll('[data-die]').forEach((b) => (b.onclick = () => sendMove({ type: 'die', i: Number(b.dataset.die) })));
    el.querySelector('[data-reroll]')?.addEventListener('click', () => sendMove({ type: 'reroll' }));
    el.querySelectorAll('[data-egg]').forEach((b) => (b.onclick = () => { const [row, slot] = b.dataset.egg.split(':'); sendMove({ type: 'egg', row, slot: Number(slot) }); }));
    el.querySelector('[data-skip]')?.addEventListener('click', () => sendMove({ type: 'skip' }));
    el.querySelectorAll('[data-draw]').forEach((b) => (b.onclick = () => sendMove({ type: 'draw', from: b.dataset.draw })));
    el.querySelectorAll('[data-hand]').forEach((b) => (b.onclick = () => {
      ui.sel = ui.sel === b.dataset.hand ? null : b.dataset.hand;
      this.render(el, { state, me, players, finished, sendMove, room: rm });
    }));
    el.querySelectorAll('[data-drop]').forEach((b) => (b.onclick = () => { const c = ui.sel; ui.sel = null; sendMove({ type: 'play', card: c, row: b.dataset.drop }); }));

    // 라운드 바뀔 때 알림
    if (rm && state.round > 1 && Date.now() - state.roundAt < 5000 && ui.roundSeen !== `${rm.code}:${state.round}`) {
      ui.roundSeen = `${rm.code}:${state.round}`;
      const r = state.roundLog[state.roundLog.length - 1];
      bigFlash(`🏁 ${r.round}라운드 끝!<small>${GOALS[r.goal].name}: ${state.order.map((u) => `${name(u)} +${r.pts[u]}`).join(' · ')}</small>`, 3000, 'sx-note');
    }
  },
};
const ui = { sel: null, roundSeen: '' };
