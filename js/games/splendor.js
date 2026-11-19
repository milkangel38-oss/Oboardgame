// 보드게임: 스플렌더 (2~4명) — 보석을 모아 카드를 사고, 카드 보너스로 더 비싼 카드를 사는 엔진 빌딩
// 카드 90장(1단계 40 · 2단계 30 · 3단계 20)과 귀족 10장은 O게임이 직접 만든 구성이에요.
// 내 차례에 하나: ① 다른 색 보석 3개 ② 같은 색 2개(그 색이 4개 이상 남았을 때) ③ 카드 예약 + 황금 1개 ④ 카드 구매
// 보석은 10개까지 · 귀족 조건을 채우면 +3점 · 누가 15점에 닿으면 그 바퀴까지만 하고 끝
import { GARNET } from '../profile.js';
import { showAlert } from '../alert.js';
import { bigFlash } from './turn-alert.js';
import { SPL_DEFS, gemSvg, tokenSvg, sceneSvg, portraitSvg } from './splendor-art.js';

export const COLORS = ['w', 'u', 'g', 'r', 'k'];
export const GEM = {
  w: { name: '다이아몬드', fill: '#f4f6fb', dark: '#9aa6bd', text: '#1a1033' },
  u: { name: '사파이어', fill: '#2f6fd6', dark: '#173a7a', text: '#fff' },
  g: { name: '에메랄드', fill: '#2f9e5b', dark: '#175c33', text: '#fff' },
  r: { name: '루비', fill: '#d6334a', dark: '#7a1222', text: '#fff' },
  k: { name: '오닉스', fill: '#3a3340', dark: '#120e16', text: '#fff' },
  gold: { name: '황금', fill: '#f5c32c', dark: '#a87a10', text: '#3a2400' },
};
const WIN_POINTS = 15;
const MAX_TOKENS = 10;
const MAX_RESERVED = 3;

// ── 카드 만들기: 보너스 색마다 같은 모양의 비용 (나 → 다음 색들 순서로 돌려서) ──
// [점수, 비용(내 색, +1, +2, +3, +4)]
const PATTERNS = {
  1: [[0, [0, 1, 1, 1, 1]], [0, [0, 1, 2, 1, 1]], [0, [0, 2, 2, 0, 1]], [0, [0, 0, 0, 3, 0]],
      [0, [0, 0, 2, 1, 0]], [0, [0, 2, 0, 2, 0]], [0, [1, 0, 0, 1, 3]], [1, [0, 0, 4, 0, 0]]],
  2: [[1, [0, 3, 0, 2, 2]], [1, [2, 0, 3, 0, 3]], [2, [0, 5, 0, 0, 0]], [2, [0, 0, 1, 4, 2]],
      [2, [0, 0, 5, 3, 0]], [3, [6, 0, 0, 0, 0]]],
  3: [[3, [0, 3, 3, 5, 3]], [4, [0, 0, 0, 0, 7]], [4, [3, 0, 0, 3, 6]], [5, [3, 0, 0, 0, 7]]],
};
export const CARDS = {};
for (const lv of [1, 2, 3]) {
  COLORS.forEach((c, ci) => PATTERNS[lv].forEach(([pts, amounts], i) => {
    const cost = {};
    amounts.forEach((n, off) => { if (n) cost[COLORS[(ci + off) % 5]] = n; });
    const id = `${lv}${c}${i}`;
    CARDS[id] = { id, lv, bonus: c, pts, cost };
  }));
}
// 귀족 10장: 이웃한 두 색 4·4 (5장) + 세 색 3·3·3 (5장), 모두 3점
export const NOBLES = {};
COLORS.forEach((c, i) => {
  NOBLES[`n4${c}`] = { id: `n4${c}`, req: { [c]: 4, [COLORS[(i + 1) % 5]]: 4 } };
  NOBLES[`n3${c}`] = { id: `n3${c}`, req: { [c]: 3, [COLORS[(i + 2) % 5]]: 3, [COLORS[(i + 4) % 5]]: 3 } };
});

const tokensFor = (n) => (n === 2 ? 4 : n === 3 ? 5 : 7);
export const rewardsFor = (n) => (n === 2 ? [2] : n === 3 ? [2, 1] : [3, 2, 1]);
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const bonusOf = (p) => { const b = { w: 0, u: 0, g: 0, r: 0, k: 0 }; p.cards.forEach((id) => b[CARDS[id].bonus]++); return b; };
export const pointsOf = (p) => p.cards.reduce((s, id) => s + CARDS[id].pts, 0) + p.nobles.length * 3;

// 살 수 있나? (보너스 먼저, 모자라면 황금)
export function payFor(p, card) {
  const b = bonusOf(p);
  const pay = { w: 0, u: 0, g: 0, r: 0, k: 0, gold: 0 };
  for (const c of COLORS) {
    const need = Math.max(0, (card.cost[c] || 0) - b[c]);
    const use = Math.min(p.tokens[c], need);
    pay[c] = use;
    pay.gold += need - use;
  }
  return pay.gold <= p.tokens.gold ? pay : null;
}

const emptyPlayer = () => ({ tokens: { w: 0, u: 0, g: 0, r: 0, k: 0, gold: 0 }, cards: [], reserved: [], hidden: [], nobles: [] });

function result(state, players) {
  const rewards = rewardsFor(state.order.length);
  const rows = state.order.map((uid) => ({ uid, score: pointsOf(state.ps[uid]), cards: state.ps[uid].cards.length }));
  // 점수 높은 순, 같으면 산 카드가 적은 사람이 앞
  rows.sort((a, b) => b.score - a.score || a.cards - b.cards);
  const ranking = rows.map((r) => {
    const place = 1 + rows.filter((o) => o.score > r.score || (o.score === r.score && o.cards < r.cards)).length;
    return { uid: r.uid, score: r.score, cards: r.cards, place, garnets: rewards[place - 1] || 0 };
  });
  const top = ranking.filter((r) => r.place === 1).map((r) => players[r.uid]?.name || '?');
  return {
    message: `${top.join(', ')}님 1등! ${ranking[0].score}점 💎`,
    winners: ranking.filter((r) => r.place === 1).map((r) => r.uid),
    ranking,
    rewards: Object.fromEntries(ranking.map((r) => [r.uid, r.garnets])),
  };
}

// 차례 마무리: 보석 10개 초과 → 반납, 귀족 확인 → 다음 사람
function finishTurn(state, uid, players) {
  const p = state.ps[uid];
  const total = sum(p.tokens);
  if (total > MAX_TOKENS) return { state: { ...state, phase: 'discard', need: total - MAX_TOKENS } };
  const b = bonusOf(p);
  const can = state.nobles.filter((n) => Object.entries(NOBLES[n].req).every(([c, v]) => b[c] >= v));
  if (can.length > 1) return { state: { ...state, phase: 'noble', nobleChoices: can } };
  let s = state;
  if (can.length === 1) s = takeNoble(s, uid, can[0]);
  return nextTurn(s, uid, players);
}
function takeNoble(state, uid, n) {
  const p = state.ps[uid];
  return {
    ...state, nobles: state.nobles.filter((x) => x !== n),
    ps: { ...state.ps, [uid]: { ...p, nobles: [...p.nobles, n] } },
    log: `${state.log} · 👑 귀족 방문 +3점`,
  };
}
function nextTurn(state, uid, players) {
  state = { ...state, logs: [...(state.logs || []), { uid, text: state.log, t: Date.now() }].slice(-6) };
  const finalRound = state.finalRound || pointsOf(state.ps[uid]) >= WIN_POINTS;
  const next = (state.turn + 1) % state.order.length;
  const s = { ...state, phase: 'play', need: 0, nobleChoices: null, finalRound, turn: next };
  if (finalRound && next === 0) { // 첫 플레이어 차례로 돌아오면 끝 (모두 같은 횟수)
    const done = { ...s, phase: 'done', turn: -1 };
    return { state: done, result: result(done, players) };
  }
  return { state: s };
}
function refill(state, lv, slot) {
  const deck = [...state.decks[lv]];
  const market = { ...state.market, [lv]: [...state.market[lv]] };
  market[lv][slot] = deck.length ? deck.shift() : null;
  return { ...state, decks: { ...state.decks, [lv]: deck }, market };
}
function findMarket(state, id) {
  for (const lv of [1, 2, 3]) { const i = state.market[lv].indexOf(id); if (i >= 0) return [lv, i]; }
  return null;
}

let ui = { key: '', pick: [], card: null };
const seen = { room: '', action: null, turn: '' };

const flash = bigFlash;
const bigTurn = () => bigFlash('<div class="spl-myturn">내 차례!</div>', 1500, 'turn');

export default {
  id: 'splendor',
  name: '스플렌더',
  emoji: '💎',
  category: 'board',
  minPlayers: 2,
  maxPlayers: 4,
  duration: '30~45분',
  rewards: [3, 2, 1],
  rewardLabel: '1등 최대 +3',
  description: '보석을 모아 카드를 사고, 귀족을 맞이하라',
  rules: [
    '보석 5색(⚪다이아몬드 · 🔵사파이어 · 🟢에메랄드 · 🔴루비 · ⚫오닉스) + 🟡황금(조커). 보석은 2명 4개 · 3명 5개 · 4명 7개씩, 황금은 5개예요.',
    '내 차례에 아래 중 하나만 해요: ① 서로 다른 색 보석 3개 가져오기 ② 같은 색 보석 2개 가져오기 (그 색이 4개 이상 남았을 때만) ③ 카드 1장 예약하고 황금 1개 받기 (예약은 3장까지, 덱 맨 위 카드도 가능) ④ 바닥이나 예약한 카드 1장 사기',
    '산 카드는 그 색 보석 1개를 영구 할인해 줘요(보너스). 보너스가 쌓이면 보석 없이도 카드를 살 수 있어요. 모자란 보석은 황금으로 대신해요.',
    '손에 든 보석은 10개까지! 넘으면 차례 끝에 골라서 반납해요.',
    '👑 귀족: 카드 보너스가 귀족 조건을 채우면 차례 끝에 자동으로 찾아와 +3점 (한 번에 한 명).',
    '누군가 15점 이상이 되면 그 바퀴를 마저 해서 모두 같은 횟수를 한 뒤 끝나요. 점수가 같으면 산 카드가 적은 사람이 이겨요.',
    '가넷: 2명 → 1등 2개 / 3명 → 1등 2 · 2등 1 / 4명 → 1등 3 · 2등 2 · 3등 1',
  ],

  setup(players) {
    const order = shuffle(players.map((p) => p.uid));
    const n = order.length;
    const t = tokensFor(n);
    const decks = {};
    const market = {};
    for (const lv of [1, 2, 3]) {
      decks[lv] = shuffle(Object.keys(CARDS).filter((id) => CARDS[id].lv === lv));
      market[lv] = decks[lv].splice(0, 4);
    }
    return {
      order, turn: 0, phase: 'play', finalRound: false, need: 0, nobleChoices: null, log: '',
      bank: { w: t, u: t, g: t, r: t, k: t, gold: 5 },
      decks, market, nobles: shuffle(Object.keys(NOBLES)).slice(0, n + 1),
      ps: Object.fromEntries(order.map((u) => [u, emptyPlayer()])),
    };
  },

  move(state, move, uid, players) {
    if (move?.type === 'tick') throw new Error('__noop');
    if (!state.order.includes(uid)) throw new Error('참가자가 아니에요');
    const name = players[uid]?.name || '?';
    const myTurn = state.order[state.turn] === uid;
    const p = state.ps[uid];
    const setP = (s, np) => ({ ...s, ps: { ...s.ps, [uid]: np } });

    if (move.type === 'discard') {
      if (state.phase !== 'discard' || !myTurn) throw new Error('__noop');
      const give = move.tokens || {};
      const n = sum(give);
      if (n !== state.need) throw new Error(`보석 ${state.need}개를 골라 반납해 주세요`);
      const tokens = { ...p.tokens }, bank = { ...state.bank };
      for (const [c, v] of Object.entries(give)) {
        if (!(c in tokens) || v < 0 || tokens[c] < v) throw new Error('가진 보석만 반납할 수 있어요');
        tokens[c] -= v; bank[c] += v;
      }
      return finishTurn({ ...setP(state, { ...p, tokens }), bank, phase: 'play', need: 0 }, uid, players);
    }

    if (move.type === 'noble') {
      if (state.phase !== 'noble' || !myTurn || !state.nobleChoices.includes(move.noble)) throw new Error('__noop');
      return nextTurn(takeNoble(state, uid, move.noble), uid, players);
    }

    if (state.phase !== 'play') throw new Error('지금은 할 수 없어요');
    if (!myTurn) throw new Error(`지금은 ${players[state.order[state.turn]]?.name || '다른 사람'}님 차례예요.`);

    if (move.type === 'take') {
      const cs = move.colors || [];
      if (!cs.length || !cs.every((c) => COLORS.includes(c))) throw new Error('가져올 보석을 + 버튼으로 골라 주세요. (황금은 카드를 예약할 때만 받아요)');
      const bank = { ...state.bank }, tokens = { ...p.tokens };
      if (cs.length === 2 && cs[0] === cs[1]) {
        if (bank[cs[0]] < 4) throw new Error('같은 색 2개는 그 색이 4개 이상 남았을 때만 가져올 수 있어요');
      } else {
        if (new Set(cs).size !== cs.length) throw new Error('서로 다른 색을 골라 주세요');
        const avail = COLORS.filter((c) => bank[c] > 0).length;
        if (cs.length !== Math.min(3, avail)) throw new Error(avail >= 3 ? '서로 다른 색 3개를 골라 주세요' : `남은 색이 ${avail}가지라 ${avail}개를 골라 주세요`);
        if (cs.some((c) => bank[c] < 1)) throw new Error('없는 보석이에요');
      }
      cs.forEach((c) => { bank[c]--; tokens[c]++; });
      const s = { ...setP(state, { ...p, tokens }), bank, log: `${name}님이 보석 ${cs.map((c) => GEM[c].name).join('·')}을(를) 가져갔어요` };
      return finishTurn(s, uid, players);
    }

    if (move.type === 'reserve') {
      if (p.reserved.length >= MAX_RESERVED) throw new Error('예약은 3장까지만 할 수 있어요. 예약한 카드를 먼저 사세요.');
      let s = state, id;
      if (move.deck) {
        const lv = Number(move.deck);
        if (!state.decks[lv]?.length) throw new Error('덱이 비었어요');
        id = state.decks[lv][0];
        s = { ...s, decks: { ...s.decks, [lv]: s.decks[lv].slice(1) } };
      } else {
        const at = findMarket(state, move.card);
        if (!at) throw new Error('바닥에 없는 카드예요');
        id = move.card;
        s = refill(s, at[0], at[1]);
      }
      const tokens = { ...p.tokens }, bank = { ...s.bank };
      if (bank.gold > 0) { bank.gold--; tokens.gold++; }
      s = { ...setP(s, { ...p, tokens, reserved: [...p.reserved, id], hidden: move.deck ? [...(p.hidden || []), id] : (p.hidden || []) }), bank, log: `${name}님이 ${move.deck ? `${move.deck}단계 덱 카드를` : '카드를'} 예약했어요${tokens.gold > p.tokens.gold ? ' (+황금)' : ''}` };
      s.lastAction = { uid, type: 'reserve', card: id, hidden: !!move.deck, t: Date.now() };
      return finishTurn(s, uid, players);
    }

    if (move.type === 'buy') {
      const id = move.card;
      const fromRes = p.reserved.includes(id);
      const at = fromRes ? null : findMarket(state, id);
      if (!fromRes && !at) throw new Error('살 수 있는 카드가 아니에요');
      const pay = payFor(p, CARDS[id]);
      if (!pay) {
        const b = bonusOf(p), card = CARDS[id];
        const short = COLORS.map((c) => [c, Math.max(0, (card.cost[c] || 0) - b[c] - p.tokens[c])]).filter(([, v]) => v);
        const need = short.reduce((a, [, v]) => a + v, 0) - p.tokens.gold;
        throw new Error(`보석이 모자라요. ${short.map(([c, v]) => `${GEM[c].name} ${v}개`).join(', ')}가 부족한데 황금이 ${p.tokens.gold}개뿐이라 ${need}개가 모자라요.`);
      }
      const tokens = { ...p.tokens }, bank = { ...state.bank };
      for (const [c, v] of Object.entries(pay)) { tokens[c] -= v; bank[c] += v; }
      let s = { ...setP(state, { ...p, tokens, cards: [...p.cards, id], reserved: p.reserved.filter((x) => x !== id), hidden: (p.hidden || []).filter((x) => x !== id) }), bank };
      if (at) s = refill(s, at[0], at[1]);
      const c = CARDS[id];
      s.log = `${name}님이 ${GEM[c.bonus].name} 카드${c.pts ? ` (${c.pts}점)` : ''}를 샀어요`;
      s.lastAction = { uid, type: 'buy', card: id, t: Date.now() };
      return finishTurn(s, uid, players);
    }
    throw new Error('알 수 없는 동작이에요');
  },

  render(el, ctx) {
    const { state, me, players, finished, sendMove, room } = ctx;
    const name = (u) => esc(players[u]?.name || '나간 사람');
    const isPlayer = state.order.includes(me);
    const turnUid = state.turn >= 0 ? state.order[state.turn] : null;
    const myTurn = turnUid === me;
    const mp = state.ps[me];
    const key = `${room?.code}:${state.turn}:${state.phase}:${state.log}`;
    if (ui.key !== key) ui = { key, pick: [], card: null };

    if (finished) {
      const ranking = room?.result?.ranking || result(state, players).ranking;
      el.innerHTML = `<div class="spl">${SPL_DEFS}
        <div class="dm-title" style="color:var(--gold)">💎 최종 순위</div>
        <ol class="nb-final">${ranking.map((r) => `<li class="${r.uid === me ? 'me' : ''}">
          <span class="nb-place">${r.place <= 3 ? ['🥇', '🥈', '🥉'][r.place - 1] : r.place + '등'}</span>
          <span class="nb-name">${name(r.uid)}<small class="ud-break">카드 ${r.cards}장 · 귀족 ${state.ps[r.uid].nobles.length}명</small></span>
          <span class="nb-score">${r.score}점</span>
          <span class="nb-reward">${r.garnets ? `${GARNET}+${r.garnets}` : ''}</span></li>`).join('')}</ol>
      </div>`;
      return;
    }

    const myBonus = mp ? bonusOf(mp) : null;
    const nobleIdx = (n) => Object.keys(NOBLES).indexOf(n);
    const nobleHtml = (n) => `<div class="spl-noble">${portraitSvg(nobleIdx(n))}<b>3</b><div class="spl-nreq">${Object.entries(NOBLES[n].req).map(([c, v]) => `<span class="spl-req">${gemSvg(c)}<i>${v}</i></span>`).join('')}</div></div>`;
    const cardHtml = (id, { sm = false, back = false } = {}) => {
      const c = CARDS[id];
      if (back) return `<span class="spl-card back lv${c.lv} sm"><b>${'Ⅰ Ⅱ Ⅲ'.split(' ')[c.lv - 1]}</b></span>`;
      const can = !sm && mp && payFor(mp, c);
      return `<${sm ? 'span' : 'button'} class="spl-card lv${c.lv} ${sm ? 'sm' : ''} ${ui.card === id ? 'sel' : ''} ${myTurn && can ? 'can' : ''}" ${sm ? '' : `data-card="${id}"`} style="--gc:${GEM[c.bonus].fill};--gd:${GEM[c.bonus].dark};--gt:${GEM[c.bonus].text}">
        ${sceneSvg(c.bonus, c.lv)}
        <span class="spl-ch"><b>${c.pts || ''}</b>${gemSvg(c.bonus)}</span>
        <span class="spl-cost">${COLORS.filter((x) => c.cost[x]).map((x) => `<i class="spl-cg ${!sm && myBonus && myBonus[x] ? 'has' : ''}">${gemSvg(x)}<b>${c.cost[x]}</b></i>`).join('')}</span>
      </${sm ? 'span' : 'button'}>`;
    };

    // ── 보석 은행: 남은 개수 + / − ──
    const pickCount = (c) => ui.pick.filter((x) => x === c).length;
    const canAct = myTurn && state.phase === 'play';
    const bank = `<div class="spl-bank">${[...COLORS, 'gold'].map((c) => `
      <div class="spl-bcol ${pickCount(c) ? 'picked' : ''}">
        <div class="spl-tokwrap">${tokenSvg(c)}${pickCount(c) ? `<i class="spl-pickn">+${pickCount(c)}</i>` : ''}</div>
        <b class="spl-left">${state.bank[c] - pickCount(c)}</b>
        ${c === 'gold' ? '<small class="spl-goldtip">예약 시</small>' : `<div class="spl-pm"><button data-minus="${c}" aria-label="${GEM[c].name} 빼기">−</button><button data-plus="${c}" aria-label="${GEM[c].name} 더하기">+</button></div>`}
      </div>`).join('')}</div>`;

    // ── 행동 칸 ──
    let action = '';
    if (state.phase === 'discard' && myTurn) {
      const give = ui.pick.reduce((o, c) => ({ ...o, [c]: (o[c] || 0) + 1 }), {});
      action = `<div class="spl-act warn"><b>보석이 10개를 넘었어요!</b> ${state.need}개를 골라 반납하세요 (보석을 누르면 반납 목록에 들어가요)
        <div class="spl-mytok">${[...COLORS, 'gold'].map((c) => `<button class="spl-mtok" data-give="${c}">${tokenSvg(c)}<b>${mp.tokens[c] - (give[c] || 0)}</b></button>`).join('')}</div>
        <div class="spl-row"><span>반납: ${ui.pick.map((c) => GEM[c].name).join(', ') || '-'}</span><button class="btn sm ghost" data-clear>다시</button><button class="btn sm primary" data-discard>반납</button></div></div>`;
    } else if (state.phase === 'noble' && myTurn) {
      action = `<div class="spl-act"><b>👑 귀족 여러 명이 찾아왔어요!</b> 한 명을 고르세요<div class="spl-nobles">${state.nobleChoices.map((n) => `<button class="spl-nbtn" data-noble="${n}">${nobleHtml(n)}</button>`).join('')}</div></div>`;
    } else if (myTurn && ui.card) {
      const c = CARDS[ui.card];
      const pay = payFor(mp, c);
      const inRes = mp.reserved.includes(ui.card);
      action = `<div class="spl-act"><b>${GEM[c.bonus].name} 카드${c.pts ? ` · ${c.pts}점` : ''}</b> ${pay ? `→ 내는 보석: ${[...COLORS, 'gold'].filter((x) => pay[x]).map((x) => `${GEM[x].name} ${pay[x]}`).join(', ') || '없음 (보너스로 공짜!)'}` : '<span class="dn">지금은 보석이 모자라요</span>'}
        <div class="spl-row"><button class="btn sm primary" data-buy>💎 사기</button>${inRes ? '' : '<button class="btn sm" data-reserve>📌 예약 (+황금)</button>'}<button class="btn sm ghost" data-clear>취소</button></div></div>`;
    } else if (myTurn && ui.pick.length) {
      action = `<div class="spl-act">가져올 보석: <b>${ui.pick.map((c) => GEM[c].name).join(' · ')}</b>
        <small>서로 다른 색 3개, 또는 같은 색 2개 (그 색이 4개 이상 남았을 때)</small>
        <div class="spl-row"><button class="btn sm primary" data-take>가져오기</button><button class="btn sm ghost" data-clear>다시</button></div></div>`;
    }

    const banner = myTurn ? '<span><b>내 차례!</b> 보석 아래 + 로 고르거나, 카드를 눌러 사기·예약</span>' : `<span><b>${name(turnUid)}</b>님 차례</span>`;

    // 내 보석: 보석 토큰 그림 + 개수 + 카드 보너스
    const myGems = mp ? `<div class="spl-gems">${[...COLORS, 'gold'].map((c) => `
      <div class="spl-gem">${tokenSvg(c)}<b>${mp.tokens[c]}</b>${c === 'gold' ? '<small>&nbsp;</small>' : `<small class="${myBonus[c] ? 'on' : ''}">카드 +${myBonus[c]}</small>`}</div>`).join('')}</div>` : '';

    // 모든 플레이어(나 포함): 점수 · 보석 · 산 카드 · 예약 카드를 모두 공개
    const playerBox = (u) => {
      const p = state.ps[u];
      const owned = [...p.cards].sort((x, y) => COLORS.indexOf(CARDS[x].bonus) - COLORS.indexOf(CARDS[y].bonus) || CARDS[x].lv - CARDS[y].lv);
      const showHidden = u === me;
      return `<div class="spl-op ${u === turnUid ? 'turn' : ''} ${u === me ? 'me' : ''}">
        <div class="spl-op-h"><b>${u === turnUid ? '▶ ' : ''}${name(u)}${u === me ? ' (나)' : ''}</b>${p.nobles.length ? `<small>👑 귀족 ${p.nobles.length}명 (+${p.nobles.length * 3})</small>` : ''}<span class="spl-pts big">${pointsOf(p)}<small>점</small></span></div>
        <div class="spl-op-row"><span class="spl-op-t">보석</span><div class="spl-gems sm">${[...COLORS, 'gold'].map((c) => `<div class="spl-gem">${tokenSvg(c)}<b>${p.tokens[c]}</b></div>`).join('')}</div></div>
        <div class="spl-op-row"><span class="spl-op-t">구매 ${p.cards.length}</span><div class="spl-res sm multi">${owned.length ? owned.map((id) => cardHtml(id, { sm: true })).join('') : '<span class="muted">아직 없음</span>'}</div></div>
        <div class="spl-op-row"><span class="spl-op-t">예약 ${p.reserved.length}</span><div class="spl-res sm">${p.reserved.length ? p.reserved.map((id) => cardHtml(id, { sm: true, back: !showHidden && (p.hidden || []).includes(id) })).join('') : '<span class="muted">없음</span>'}</div></div>
      </div>`;
    };
    const scoreboard = `<div class="spl-board">${state.order.map((u) => `<span class="${u === turnUid ? 'turn' : ''} ${u === me ? 'me' : ''}"><b>${name(u)}</b><i>${pointsOf(state.ps[u])}점</i></span>`).join('')}</div>`;

    el.innerHTML = `
      <div class="spl">
        ${SPL_DEFS}
        ${state.finalRound ? '<div class="spl-final">🏁 누군가 15점에 닿았어요! 이번 바퀴가 마지막이에요</div>' : ''}
        ${scoreboard}
        <div class="spl-nobles-wrap"><div class="spl-ntitle">👑 귀족 카드<small>보너스 조건을 채우면 +3점</small></div><div class="spl-nobles">${state.nobles.map(nobleHtml).join('')}</div></div>
        <div class="spl-market">${[3, 2, 1].map((lv) => `
          <div class="spl-lv">
            <button class="spl-deck lv${lv}" data-deck="${lv}" title="덱 맨 위 카드 예약"><b>${'Ⅰ Ⅱ Ⅲ'.split(' ')[lv - 1]}</b><small>${state.decks[lv].length}</small></button>
            ${state.market[lv].map((id) => (id ? cardHtml(id) : '<span class="spl-card empty"></span>')).join('')}
          </div>`).join('')}</div>
        <div class="nb-banner">${banner}</div>
        <section class="spl-zone bank-zone"><div class="spl-zone-t">💎 보석 가져오기 <small>모두가 함께 쓰는 보석</small></div>${bank}${action}</section>
        ${isPlayer ? `<section class="spl-zone me-zone"><div class="spl-zone-t">🧑 내 자리 <span class="spl-pts big">${pointsOf(mp)}<small>점</small></span></div><div class="spl-me">
          <div class="spl-me-h">💰 내 보석</div>
          ${myGems}
          ${mp.reserved.length ? `<div class="spl-me-h">📌 예약한 카드 <small class="muted">눌러서 사기</small></div><div class="spl-res">${mp.reserved.map((id) => cardHtml(id)).join('')}</div>` : ''}
        </div></section>` : ''}
        <section class="spl-zone all-zone"><div class="spl-zone-t">👥 모든 플레이어 <small>점수 · 보석 · 구매/예약 카드</small></div><div class="spl-ops">${state.order.map(playerBox).join('')}</div></section>
        ${guide()}
      </div>`;

    // 다른 사람이 카드를 사거나 예약하면 모두에게 잠깐 보여 주기
    const la = state.lastAction;
    if (seen.room !== room?.code) { seen.room = room?.code; seen.action = la?.t ?? null; } // 방에 처음 들어왔을 땐 이전 행동은 건너뛰기
    if (la && la.t !== seen.action) {
      seen.action = la.t;
      if (la.uid !== me) flash(`<div class="spl-flash-t"><b>${name(la.uid)}</b>님이 카드를 ${la.type === 'buy' ? '<em class="buy">구매</em>' : '<em>예약</em>'}했어요</div>${la.type === 'reserve' && la.hidden ? `<div class="spl-flash-c">${cardHtml(la.card, { sm: true, back: true })}</div><small>덱에서 몰래 예약</small>` : `<div class="spl-flash-c">${cardHtml(la.card, { sm: true })}</div>`}`);
    }
    // 내 차례가 되면 가운데에 크게
    const turnKey = `${room?.code}:${state.turn}:${(state.logs || []).length}`;
    if (myTurn && state.phase === 'play' && seen.turn !== turnKey) { seen.turn = turnKey; setTimeout(() => bigTurn(), la && la.uid !== me ? 1600 : 0); }
    if (!myTurn) seen.turn = '';

    const rerender = () => { const y = window.scrollY; this.render(el, ctx); window.scrollTo(0, y); };
    const notTurn = () => showAlert(state.phase === 'discard' || state.phase === 'noble' ? '먼저 보석 반납이나 귀족 선택을 마쳐 주세요.' : `지금은 ${name(turnUid)}님 차례예요. 내 차례가 오면 할 수 있어요.`);
    el.querySelectorAll('[data-plus]').forEach((b) => (b.onclick = () => {
      if (!canAct) return notTurn();
      const c = b.dataset.plus, n = pickCount(c);
      if (state.bank[c] - n <= 0) return showAlert(`${GEM[c].name}가 더 남아 있지 않아요.`);
      if (n === 1) {
        if (ui.pick.length > 1) return showAlert('같은 색 2개는 다른 보석 없이 그 색만 가져올 때 할 수 있어요. 다른 색을 먼저 빼 주세요.');
        if (state.bank[c] < 4) return showAlert(`같은 색 2개는 그 색이 4개 이상 남았을 때만 가져올 수 있어요. ${GEM[c].name}는 지금 ${state.bank[c]}개 남았어요.`);
      }
      if (n >= 2) return showAlert('같은 색은 한 번에 2개까지만 가져올 수 있어요.');
      if (ui.pick.length >= 3) return showAlert('보석은 한 번에 3개까지만 가져올 수 있어요.');
      if (ui.pick.length === 2 && ui.pick[0] === ui.pick[1]) return showAlert('같은 색 2개를 골랐을 때는 다른 보석을 더 가져올 수 없어요.');
      ui.card = null; ui.pick = [...ui.pick, c]; ui.key = key; rerender();
    }));
    el.querySelectorAll('[data-minus]').forEach((b) => (b.onclick = () => {
      if (!canAct) return notTurn();
      const c = b.dataset.minus, i = ui.pick.lastIndexOf(c);
      if (i < 0) return showAlert(`${GEM[c].name}는 아직 고르지 않았어요.`);
      ui.pick = ui.pick.filter((_, j) => j !== i); ui.key = key; rerender();
    }));
    el.querySelectorAll('[data-card]').forEach((b) => (b.onclick = () => {
      if (!canAct) return notTurn();
      ui.card = ui.card === b.dataset.card ? null : b.dataset.card; ui.pick = []; ui.key = key; rerender();
    }));
    el.querySelectorAll('[data-give]').forEach((b) => (b.onclick = () => {
      const c = b.dataset.give;
      if (ui.pick.length >= state.need) return showAlert(`반납할 보석은 ${state.need}개예요. '다시'를 눌러 고쳐 주세요.`);
      if (mp.tokens[c] - pickCount(c) <= 0) return showAlert(`${GEM[c].name}가 더 없어요.`);
      ui.pick = [...ui.pick, c]; ui.key = key; rerender();
    }));
    el.querySelector('[data-clear]')?.addEventListener('click', () => { ui.pick = []; ui.card = null; rerender(); });
    el.querySelector('[data-take]')?.addEventListener('click', () => sendMove({ type: 'take', colors: ui.pick }));
    el.querySelector('[data-buy]')?.addEventListener('click', () => sendMove({ type: 'buy', card: ui.card }));
    el.querySelector('[data-reserve]')?.addEventListener('click', () => sendMove({ type: 'reserve', card: ui.card }));
    el.querySelectorAll('[data-deck]').forEach((b) => (b.onclick = () => {
      if (!canAct) return notTurn();
      if (mp.reserved.length >= MAX_RESERVED) return showAlert('예약은 3장까지만 할 수 있어요. 예약한 카드를 먼저 사세요.');
      if (!state.decks[b.dataset.deck].length) return showAlert('이 단계 덱은 다 떨어졌어요.');
      if (confirm(`${b.dataset.deck}단계 덱 맨 위 카드를 예약할까요? (황금 1개를 받아요)`)) sendMove({ type: 'reserve', deck: Number(b.dataset.deck) });
    }));
    el.querySelector('[data-discard]')?.addEventListener('click', () => sendMove({ type: 'discard', tokens: ui.pick.reduce((o, c) => ({ ...o, [c]: (o[c] || 0) + 1 }), {}) }));
    el.querySelectorAll('[data-noble]').forEach((b) => (b.onclick = () => sendMove({ type: 'noble', noble: b.dataset.noble })));
    const $g = el.querySelector('.tc-guide');
    if ($g) $g.ontoggle = () => (guideOpen = $g.open);
  },
};

// 보석 그림은 splendor-art.js
export const gemIcon = (c) => gemSvg(c);

let guideOpen = false;
function guide() {
  return `<details class="tc-guide" ${guideOpen ? 'open' : ''}><summary>📜 규칙 한눈에 보기</summary>
    <div class="tc-gsec"><div class="tc-gt">내 차례에 하나만</div><div class="tc-gnote">
      ① 서로 다른 색 보석 3개 · ② 같은 색 2개 (그 색이 4개 이상 남았을 때) · ③ 카드 예약 + 황금 1개 (3장까지, 덱 맨 위도 가능) · ④ 카드 사기</div></div>
    <div class="tc-gsec"><div class="tc-gt">카드 보는 법</div><div class="tc-gnote">위쪽 숫자 = 점수 · 오른쪽 위 보석 = 사면 얻는 보너스(그 색 영구 할인) · 아래 보석과 숫자 = 가격. 테두리가 반짝이는 카드는 지금 살 수 있어요.</div></div>
    <div class="tc-gsec"><div class="tc-gt">기타</div><div class="tc-gnote">보석은 10개까지 · 황금은 아무 색으로 쓸 수 있어요 · 귀족 조건(보너스 개수)을 채우면 +3점 · 15점에 닿으면 그 바퀴까지만 하고 끝 · 동점이면 산 카드가 적은 사람이 이겨요</div></div>
  </details>`;
}
