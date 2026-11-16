// 더 지니어스: 시드포커 (6~7명)
// - 1~15 숫자카드, 각자 칩 20개
// - 라운드 시작: 카드 한 장씩 비공개로 받고, 더미 맨 위 1장을 뒤집어 첫 시드카드
// - 선부터 차례로 [카드 받기: 1장 더 받고 둘 중 하나 공개해서 버리기] 또는 [시드 추가: 더미에서 1장 뒤집어 시드에 추가]
//   시드는 높은 3장만 남김
// - 베팅: 모두 기본 1개, 선부터 차례로 포기 또는 1~3개 베팅
// - 승부: 베팅한 사람 카드 공개 → 가장 낮은 카드부터 가장 높은 시드를 차례로 더함 → 합이 가장 큰 사람이 판돈 획득
// - 10라운드 후 칩 순위로 가넷 1등 3, 2등 2, 3등 1
import { GARNET } from '../profile.js';

const START_CHIPS = 20;
const ROUNDS = 10;
const MAX_BET = 3;
const ACTION_MS = 25000;
const BET_MS = 20000;
const REVEAL_MS = 8000;
const REWARDS = [3, 2, 1];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

function newRound(state, roundNo, now) {
  const n = state.order.length;
  const s0 = (roundNo - 1) % n; // 선 플레이어가 라운드마다 돌아가요
  const turnOrder = [...state.order.slice(s0), ...state.order.slice(0, s0)];
  const deck = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
  const hands = {};
  turnOrder.forEach((u) => (hands[u] = deck.pop()));
  const first = deck.pop();
  return {
    ...state, round: roundNo, phase: 'action', turnOrder, turnIdx: 0, turnDeadline: now + ACTION_MS,
    deck, hands, seeds: [first], table: [{ card: first, kind: 'seed', by: '' }],
    pending: null, actions: {}, bets: {}, pot: 0, base: {}, last: null, revealUntil: 0,
  };
}

const cur = (s) => s.turnOrder[s.turnIdx];

function addSeed(state, uid) {
  const deck = [...state.deck];
  const card = deck.pop();
  let seeds = [...state.seeds, card].sort((a, b) => b - a);
  const table = [...state.table, { card, kind: 'seed', by: uid }];
  if (seeds.length > 3) {
    const dropped = seeds.slice(3);
    seeds = seeds.slice(0, 3);
    dropped.forEach((d) => table.push({ card: d, kind: 'burned', by: '' }));
  }
  return { ...state, deck, seeds, table, actions: { ...state.actions, [uid]: 'seed' } };
}

function startBet(state, now) {
  const chips = { ...state.chips };
  const base = {};
  const bets = {};
  let pot = state.carry || 0;
  state.turnOrder.forEach((u) => {
    if (chips[u] >= 1) { chips[u] -= 1; pot += 1; base[u] = true; } else bets[u] = 'fold'; // 칩이 없으면 자동 포기
  });
  const next = { ...state, phase: 'bet', chips, base, bets, pot, carry: 0, turnIdx: -1, pending: null };
  return nextBetter(next, now);
}

function nextBetter(state, now) {
  for (let i = state.turnIdx + 1; i < state.turnOrder.length; i++) {
    const u = state.turnOrder[i];
    if (state.bets[u] === undefined) {
      // 걸 칩이 없거나, 앞 사람만큼 걸 칩이 모자라면 자동 포기
      if (state.chips[u] <= 0 || state.chips[u] < minBet(state)) { state = { ...state, bets: { ...state.bets, [u]: 'fold' } }; continue; }
      return { ...state, turnIdx: i, turnDeadline: now + BET_MS };
    }
  }
  return resolve(state, now);
}

function nextAction(state, now) {
  const turnIdx = state.turnIdx + 1;
  if (turnIdx >= state.turnOrder.length) return startBet(state, now);
  return { ...state, turnIdx, turnDeadline: now + ACTION_MS, pending: null };
}

// 승부: 가장 낮은 카드부터 가장 높은 시드를 차례로 더해요
export function showdown(bettors, hands, seeds) {
  const sortedSeeds = [...seeds].sort((a, b) => b - a);
  const byCard = [...bettors].sort((a, b) => hands[a] - hands[b]);
  const rows = byCard.map((u, i) => ({ uid: u, card: hands[u], seed: sortedSeeds[i] || 0, total: hands[u] + (sortedSeeds[i] || 0) }));
  const best = Math.max(...rows.map((r) => r.total));
  return { rows, winners: rows.filter((r) => r.total === best).map((r) => r.uid), best };
}

function resolve(state, now) {
  const chips = { ...state.chips };
  const bettors = state.turnOrder.filter((u) => typeof state.bets[u] === 'number');
  let carry = 0;
  let last;
  if (!bettors.length) {
    // 모두 포기 → 기본 베팅 돌려주기
    let refunded = 0;
    Object.keys(state.base).forEach((u) => { chips[u] += 1; refunded += 1; });
    carry = state.pot - refunded;
    last = { rows: [], winners: [], pot: state.pot, share: 0, carry, allFold: true };
  } else {
    const { rows, winners } = showdown(bettors, state.hands, state.seeds);
    const share = Math.floor(state.pot / winners.length);
    winners.forEach((u) => (chips[u] += share));
    carry = state.pot - share * winners.length;
    last = { rows, winners, pot: state.pot, share, carry, allFold: false };
  }
  return { ...state, chips, carry, pot: 0, phase: 'reveal', revealUntil: now + REVEAL_MS, last, turnIdx: -1 };
}

export function rank(order, chips) {
  return order
    .map((uid) => ({ uid, score: chips[uid] }))
    .sort((a, b) => b.score - a.score)
    .map((r, _, all) => {
      const place = 1 + all.filter((o) => o.score > r.score).length;
      return { ...r, place, garnets: REWARDS[place - 1] || 0 };
    });
}

// 앞서 베팅한 사람들 중 가장 큰 금액 이상으로만 걸 수 있어요
export const minBet = (state) => Math.max(1, ...Object.values(state.bets || {}).filter((b) => typeof b === 'number'));

const cardHtml = (n, cls = '') => `<span class="sp-card ${cls}">${n ?? '?'}</span>`;

export default {
  id: 'seedpoker',
  name: '시드포커',
  emoji: '🃏',
  category: 'genius',
  minPlayers: 6,
  maxPlayers: 7,
  duration: '20~30분',
  rewards: REWARDS,
  description: '낮은 카드에 높은 시드! 심리 베팅',
  rules: [
    `1~15 숫자카드로 진행하고, 모두 칩 ${START_CHIPS}개로 시작해요. 총 ${ROUNDS}라운드, 선은 라운드마다 돌아가요.`,
    '라운드가 시작되면 각자 카드 1장을 몰래 받고, 더미 맨 위 1장이 첫 번째 시드카드로 공개돼요.',
    '선부터 차례로 둘 중 하나를 골라요: [카드 받기] 1장 더 받고 둘 중 하나를 공개해서 버리기 / [시드 추가] 더미에서 1장을 뒤집어 시드에 추가.',
    '시드카드는 가장 높은 3장만 남아요. 밀려난 시드는 휴지통으로 가요.',
    `베팅: 모두 기본 1개를 내고, 선부터 차례로 [포기] 또는 [1~${MAX_BET}개 베팅]. 앞 사람이 건 것보다 적게 걸 수는 없어요(같거나 많게). 포기한 사람의 카드는 공개되지 않아요.`,
    '버린 카드는 누가 버렸는지 함께 공개되고, 시드에서 밀려난 카드는 휴지통으로 가서 보이지 않아요.',
    '참가자 목록은 매 라운드 끝날 때마다 칩이 많은 순서로 다시 정렬돼요. (①②③은 이번 라운드 차례 순서)',
    '승부: 베팅한 사람들의 카드를 공개하고, 가장 낮은 카드부터 가장 높은 시드를 차례로 더해요. 합이 가장 큰 사람이 판돈을 모두 가져가요.',
    '동점이면 판돈을 나누고 남는 칩은 다음 판돈으로 넘어가요. 모두 포기하면 기본 베팅을 돌려받아요.',
    `차례 제한 시간: 카드 ${ACTION_MS / 1000}초(넘기면 시드 추가) · 베팅 ${BET_MS / 1000}초(넘기면 포기)`,
    `${ROUNDS}라운드 후 칩 순위로 가넷! 1등 3개, 2등 2개, 3등 1개 (동점은 같은 등수)`,
  ],

  setup(players, room) {
    const ids = shuffle(players.map((p) => p.uid)); // 자리(순서)는 추첨
    const base = { rounds: ROUNDS, order: ids, chips: Object.fromEntries(ids.map((u) => [u, START_CHIPS])), carry: 0 };
    return newRound(base, 1, Date.now());
  },

  move(state, move, uid, players) {
    const now = Date.now();
    const me = cur(state);

    if (move?.type === 'draw' || move?.type === 'seed' || move?.type === 'keep') {
      if (state.phase !== 'action') throw new Error('지금은 카드를 고를 수 없어요');
      if (me !== uid) throw new Error('내 차례가 아니에요');
      if (move.type === 'draw') {
        if (state.pending) throw new Error('이미 카드를 받았어요');
        const deck = [...state.deck];
        const card = deck.pop();
        return { state: { ...state, deck, pending: { uid, card }, turnDeadline: now + ACTION_MS, actions: { ...state.actions, [uid]: 'draw' } } };
      }
      if (move.type === 'seed') {
        if (state.pending) throw new Error('받은 카드 중 하나를 골라 주세요');
        return { state: nextAction(addSeed(state, uid), now) };
      }
      // keep: 'old'(원래 카드) | 'new'(새 카드)
      if (!state.pending) throw new Error('먼저 카드를 받아 주세요');
      const keepNew = move.keep === 'new';
      const kept = keepNew ? state.pending.card : state.hands[uid];
      const thrown = keepNew ? state.hands[uid] : state.pending.card;
      const next = { ...state, hands: { ...state.hands, [uid]: kept }, table: [...state.table, { card: thrown, kind: 'discard', by: uid }], pending: null };
      return { state: nextAction(next, now) };
    }

    if (move?.type === 'bet' || move?.type === 'fold') {
      if (state.phase !== 'bet') throw new Error('지금은 베팅 시간이 아니에요');
      if (me !== uid) throw new Error('내 베팅 차례가 아니에요');
      if (move.type === 'fold') return { state: nextBetter({ ...state, bets: { ...state.bets, [uid]: 'fold' } }, now) };
      const n = Number(move.n);
      if (!(n >= 1 && n <= MAX_BET && Number.isInteger(n))) throw new Error(`1~${MAX_BET}개까지 걸 수 있어요`);
      const min = minBet(state);
      if (n < min) throw new Error(`앞 사람보다 적게 걸 수 없어요 (최소 ${min}개)`);
      if (n > state.chips[uid]) throw new Error('칩이 부족해요');
      const chips = { ...state.chips, [uid]: state.chips[uid] - n };
      return { state: nextBetter({ ...state, chips, pot: state.pot + n, bets: { ...state.bets, [uid]: n } }, now) };
    }

    if (move?.type === 'tick') {
      if (state.phase === 'action' && now >= state.turnDeadline) {
        const u = me;
        if (state.pending) {
          // 시간 초과: 원래 카드를 남기고 새 카드를 버려요
          const next = { ...state, table: [...state.table, { card: state.pending.card, kind: 'discard', by: u }], pending: null };
          return { state: nextAction(next, now) };
        }
        return { state: nextAction(addSeed(state, u), now) };
      }
      if (state.phase === 'bet' && now >= state.turnDeadline) {
        return { state: nextBetter({ ...state, bets: { ...state.bets, [me]: 'fold' } }, now) };
      }
      if (state.phase === 'reveal' && now >= state.revealUntil) {
        if (state.round >= state.rounds) {
          const ranking = rank(state.order, state.chips);
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
        return { state: newRound(state, state.round + 1, now) };
      }
      throw new Error('__noop');
    }

    throw new Error('알 수 없는 동작이에요');
  },

  render(el, { state, me, players, finished, sendMove, room }) {
    const name = (u) => esc(players[u]?.name || '나간 사람');
    const isPlayer = state.order.includes(me);

    if (finished) {
      const ranking = room?.result?.ranking || rank(state.order, state.chips);
      el.innerHTML = `
        <div class="sp">
          <ol class="nb-final">
            ${ranking.map((r) => `<li class="${r.uid === me ? 'me' : ''}">
              <span class="nb-place">${r.place <= 3 ? ['🥇', '🥈', '🥉'][r.place - 1] : r.place + '등'}</span>
              <span class="nb-name">${name(r.uid)}</span>
              <span class="nb-score">🪙${r.score}</span>
              <span class="nb-reward">${r.garnets ? `${GARNET}+${r.garnets}` : ''}</span>
            </li>`).join('')}
          </ol>
        </div>`;
      return;
    }

    const turnUid = state.turnIdx >= 0 ? state.turnOrder[state.turnIdx] : null;
    const myTurn = turnUid === me;
    const myCard = state.hands?.[me];
    const pendingMine = state.pending && state.pending.uid === me;
    const last = state.last;
    const lastRow = (u) => last?.rows?.find((r) => r.uid === u);

    const statusOf = (u) => {
      if (state.phase === 'reveal') {
        const r = lastRow(u);
        if (r) return `<span class="sp-sum ${last.winners.includes(u) ? 'win' : ''}">${r.card}${r.seed ? `+${r.seed}` : ''}=<b>${r.total}</b></span>`;
        return state.bets[u] === 'fold' ? '<span class="sp-fold">포기</span>' : '';
      }
      if (state.phase === 'bet') {
        const b = state.bets[u];
        if (b === 'fold') return '<span class="sp-fold">포기</span>';
        if (typeof b === 'number') return `<span class="sp-bet">🪙${b} 베팅</span>`;
        return u === turnUid ? '<span class="sp-now">고민 중…</span>' : '';
      }
      const a = state.actions[u];
      if (a === 'draw') return u === turnUid ? '<span class="sp-now">카드 고르는 중…</span>' : '<span class="sp-act">카드 받음</span>';
      if (a === 'seed') return '<span class="sp-act">시드 추가</span>';
      return u === turnUid ? '<span class="sp-now">차례</span>' : '';
    };

    let banner = '';
    if (state.phase === 'reveal') {
      banner = last.allFold
        ? '<span>모두 포기! 기본 베팅을 돌려받았어요</span>'
        : `<span><b>${last.winners.map(name).join(', ')}</b>님 승리! <span class="gold">🪙${last.share}${last.winners.length > 1 ? '씩' : ''}</span>${last.carry ? ` · 남은 ${last.carry}개는 다음 판돈으로` : ''}</span>`;
    } else if (state.phase === 'bet') {
      const min = minBet(state);
      banner = myTurn
        ? `<span><b>내 베팅 차례!</b> 포기하거나 칩을 거세요 · 최소 <b>🪙${min}</b>${min > state.chips[me] ? ' (칩이 모자라 포기만 가능)' : ''}</span>`
        : `<span><b>${name(turnUid)}</b>님 베팅 차례 · 현재 최소 🪙${min}</span>`;
    } else {
      banner = myTurn ? (pendingMine ? '<span><b>둘 중 남길 카드</b>를 고르세요. 다른 한 장은 공개돼요</span>' : '<span><b>내 차례!</b> 카드를 받거나 시드를 추가하세요</span>') : `<span><b>${name(turnUid)}</b>님 차례</span>`;
    }

    const discards = state.table.filter((t) => t.kind === 'discard');
    const trash = state.table.filter((t) => t.kind === 'burned').length;

    el.innerHTML = `
      <div class="sp">
        <div class="nb-top">
          <span class="nb-round">ROUND <b>${state.round}</b> / ${state.rounds}</span>
          <span class="nb-timer" data-timer></span>
        </div>
        <div class="nb-bar"><i data-bar></i></div>

        <div class="sp-felt">
          <div class="sp-seeds">
            <span class="sp-label">시드</span>
            ${state.seeds.map((n) => cardHtml(n, 'seed')).join('')}
          </div>
          <div class="sp-pot">${state.phase === 'bet' ? `판돈 🪙<b>${state.pot}</b>` : state.carry ? `이월 🪙${state.carry}` : ''} <small>더미 ${state.deck.length}장${trash ? ` · 🗑️ 휴지통 ${trash}장` : ''}</small></div>
          ${discards.length ? `<div class="sp-seen"><span class="sp-label">버린 카드</span>${discards.map((t) => `
            <span class="sp-dis"><small>${name(t.by)}</small>${cardHtml(t.card, 'open')}</span>`).join('')}</div>` : ''}
        </div>

        <div class="nb-banner">${banner}</div>

        ${isPlayer && state.phase !== 'reveal' ? `
          <div class="sp-mine">
            <span class="sp-label">내 카드</span>
            ${pendingMine
              ? `<button class="sp-pick" data-keep="old">${cardHtml(myCard, 'mine big')}<small>원래 카드 남기기</small></button>
                 <button class="sp-pick" data-keep="new">${cardHtml(state.pending.card, 'mine big new')}<small>새 카드 남기기</small></button>`
              : cardHtml(myCard, 'mine big')}
            <span class="sp-chips">내 칩 🪙<b>${state.chips[me]}</b></span>
          </div>` : ''}

        ${myTurn && state.phase === 'action' && !pendingMine ? `
          <div class="sp-actions">
            <button class="btn primary big" data-act="draw">🂠 카드 받기</button>
            <button class="btn gold-btn big" data-act="seed">🌱 시드 추가</button>
          </div>` : ''}
        ${myTurn && state.phase === 'bet' ? `
          <div class="sp-actions bet">
            <button class="btn ghost big" data-fold>포기</button>
            ${[1, 2, 3].map((n) => `<button class="btn primary big" data-bet="${n}" ${n > state.chips[me] || n < minBet(state) ? 'disabled' : ''}>🪙${n}</button>`).join('')}
          </div>` : ''}

        <ul class="sp-players">
          ${[...state.turnOrder].sort((a, b) => state.chips[b] - state.chips[a] || state.turnOrder.indexOf(a) - state.turnOrder.indexOf(b)).map((u) => {
            const i = state.turnOrder.indexOf(u);
            return `
            <li class="${u === me ? 'me' : ''} ${u === turnUid ? 'turn' : ''} ${state.phase === 'reveal' && last?.winners?.includes(u) ? 'win' : ''}">
              <span class="sp-pname"><i class="sp-no">${'①②③④⑤⑥⑦'[i]}</i>${i === 0 ? '<i class="sp-dealer">선</i>' : ''}${name(u)}</span>
              <span class="sp-pstat">${statusOf(u)}</span>
              <span class="sp-pchips">🪙${state.chips[u]}</span>
            </li>`;
          }).join('')}
        </ul>
      </div>`;

    el.querySelectorAll('[data-act]').forEach((b) => (b.onclick = () => sendMove({ type: b.dataset.act })));
    el.querySelectorAll('[data-keep]').forEach((b) => (b.onclick = () => sendMove({ type: 'keep', keep: b.dataset.keep })));
    el.querySelectorAll('[data-bet]').forEach((b) => (b.onclick = () => sendMove({ type: 'bet', n: Number(b.dataset.bet) })));
    const $fold = el.querySelector('[data-fold]');
    if ($fold) $fold.onclick = () => sendMove({ type: 'fold' });

    // 타이머 + 진행 신호
    const $t = el.querySelector('[data-timer]');
    const $bar = el.querySelector('[data-bar]');
    const myIndex = Math.max(0, state.order.indexOf(me));
    let lastTick = 0;
    const update = () => {
      if (!el.isConnected) return clearInterval(timer);
      const now = Date.now();
      let due, total;
      if (state.phase === 'reveal') { due = state.revealUntil; total = REVEAL_MS; $t.textContent = '공개'; }
      else { due = state.turnDeadline; total = state.phase === 'bet' ? BET_MS : ACTION_MS; const left = Math.max(0, due - now); $t.textContent = Math.ceil(left / 1000); $t.classList.toggle('hurry', left <= 5000); }
      $bar.style.width = `${Math.max(0, Math.min(100, ((due - now) / total) * 100))}%`;
      if (due && now >= due && now - lastTick > 2000 && now - due > 300 + myIndex * 300) {
        lastTick = now;
        sendMove({ type: 'tick' }, { silent: true });
      }
    };
    const timer = setInterval(update, 250);
    update();
  },
};
