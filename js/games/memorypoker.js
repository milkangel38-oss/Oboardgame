// 더 지니어스: 기억포커 (2~4명)
// 매 라운드: 카드 16장(A~P 위치)을 20초 동안 외움 → 뒤집힘 → 공유 카드 3장 공개
// → 30초 안에 A~P 중 2곳을 골라 공유 3장 + 내 2장으로 포커 족보 → 가장 높은 사람 승리 +10점
import { GARNET } from '../profile.js';
import { soundEvent } from '../sound.js';
import { cardHtml as faceCard } from './tichu.js';

const MEMO_MS = 20000;
const PICK_MS = 30000;
const WIN_PTS = 10;
const LETTERS = 'ABCDEFGHIJKLMNOP'.split('');
const SUITS = ['s', 'h', 'd', 'c'];
const SUIT_NAME = { s: '♠', h: '♥', d: '♦', c: '♣' };
const COLORS = ['#ff4f6e', '#3d7bff', '#3ddc84', '#ffb02e'];
export const rewardsFor = (n) => (n === 2 ? [1] : n === 3 ? [2, 1] : [3, 2, 1]);

const DECK = SUITS.flatMap((s) => Array.from({ length: 13 }, (_, i) => `${s}${i + 2}`));
const rankOf = (id) => Number(id.slice(1));
const suitOf = (id) => id[0];
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

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
function explain(results, winners, players) {
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
function finalResult(state, players) {
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

// ── 그림 ──
const back = (i, extra = '') => `<span class="mp-back">${extra}<i>${LETTERS[i]}</i><b>${LETTERS[i]}</b><small>MEMORY POKER</small></span>`;
const card = (id, size = '') => faceCard(id, size);

let ui = { key: '', sel: [] };

export default {
  id: 'memorypoker',
  name: '기억포커',
  emoji: '🃏',
  category: 'genius',
  minPlayers: 2,
  maxPlayers: 4,
  duration: '10~20분',
  rewards: [3, 2, 1],
  rewardLabel: '1등 최대 +3',
  description: '16장을 외워라! 기억으로 만드는 포커 족보',
  options: [{ key: 'rounds', label: '라운드 수', choices: [5, 6, 7, 8, 9, 10], default: 5 }],
  rules: [
    '매 라운드 카드 16장이 A~P 자리에 놓여요. 모두 준비되면 20초 동안 카드 앞면이 공개돼요. 숫자·무늬와 알파벳 위치를 함께 외우세요!',
    '20초가 지나면 카드가 모두 뒤집히고, 모두가 함께 쓰는 공유 카드 3장이 공개돼요.',
    '30초 안에 A~P 중 2곳을 골라 내 말을 올려요. 공유 카드 3장 + 내가 고른 2장 = 5장으로 포커 족보를 만들어요. (다른 사람과 같은 카드를 골라도 돼요)',
    '족보 순서: 하이카드 < 원페어 < 투페어 < 트리플 < 스트레이트 < 플러시 < 풀하우스 < 포카드 < 스트레이트 플러시. 같은 족보면 높은 숫자로 비교해요 (A가 가장 높음).',
    `가장 높은 족보를 만든 사람이 승리해 +${WIN_PTS}점! 완전히 같으면 같이 승리해요. 30초 안에 고르지 못하면 무작위 2장이 골라져요.`,
    '가넷: 2명 → 1등 1개 / 3명 → 1등 2개, 2등 1개 / 4명 → 1등 3개, 2등 2개, 3등 1개',
  ],

  setup(players, room) {
    const order = players.map((p) => p.uid);
    const rounds = Math.min(10, Math.max(5, Number(room?.options?.rounds) || 5));
    return { order, rounds, round: 0, phase: 'ready', ready: {}, scores: Object.fromEntries(order.map((u) => [u, 0])), board: [], shared: [], picks: {}, results: null, winners: [], history: [], deadline: 0 };
  },

  move(state, move, uid, players) {
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
  },

  render(el, { state, me, players, finished, sendMove, room }) {
    const name = (u) => esc(players[u]?.name || '나간 사람');
    const isPlayer = state.order.includes(me);
    const color = (u) => COLORS[state.order.indexOf(u) % COLORS.length];
    const key = `${room?.code}:${state.round}:${state.phase}`;
    if (ui.key !== key) ui = { key, sel: [] };

    if (!finished && room && state.phase === 'result') {
      soundEvent(room.code, `mp:${state.round}`, state.winners.includes(me) ? 'ok' : 'no');
    }

    const scoreBar = `<div class="mp-scores">${state.order.map((u) => `<span class="${u === me ? 'me' : ''}" style="--pc:${color(u)}"><i></i>${name(u)} <b>${state.scores[u]}점</b>${state.phase === 'pick' ? (state.picks[u] ? ' ✔' : ' …') : ''}${['ready', 'result'].includes(state.phase) && state.ready[u] ? ' ✔' : ''}</span>`).join('')}</div>`;

    // 결과 정리 (사람별 족보 · 고른 카드 · 승패)
    const resultView = () => {
      const rs = state.results;
      if (!rs) return '';
      const order = [...state.order].sort((a, b) => compare(rs[b].hand, rs[a].hand));
      return `<div class="mp-results">
        <div class="mp-res-t">ROUND ${state.round} 결과</div>
        ${order.map((u) => {
          const r = rs[u], win = state.winners.includes(u);
          const used = new Set(r.hand.used);
          return `<div class="mp-res ${win ? 'win' : 'lose'} ${u === me ? 'me' : ''}" style="--pc:${color(u)}">
            <div class="mp-res-h"><span><i></i>${name(u)}</span><em>${win ? '승리 +10' : '패배'}</em></div>
            <div class="mp-hand">${r.hand.name}</div>
            <div class="mp-res-cards">
              <div><small>공유 카드</small><div class="mp-row">${state.shared.map((c) => `<span class="mp-c ${used.has(c) ? 'used' : 'dim'}">${card(c, 'sm')}</span>`).join('')}</div></div>
              <div><small>선택 · ${r.picks.map((i) => LETTERS[i]).join(', ')}${r.auto ? ' (시간 초과 · 무작위)' : ''}</small><div class="mp-row">${r.cards.map((c) => `<span class="mp-c mine ${used.has(c) ? 'used' : 'dim'}">${card(c, 'sm')}</span>`).join('')}</div></div>
            </div>
          </div>`;
        }).join('')}
        <div class="mp-explain">${esc(state.explainText || explain(rs, state.winners, players))}</div>
        <div class="mp-legend">밝은 카드 = 족보를 만든 카드 · 흐린 카드 = 족보에 안 쓰인 카드</div>
      </div>`;
    };

    if (finished) {
      const ranking = room?.result?.ranking || finalResult(state, players).ranking;
      el.innerHTML = `<div class="mp">
        <div class="dm-title" style="color:var(--gold)">🃏 최종 순위</div>
        <ol class="nb-final">${ranking.map((r) => `<li class="${r.uid === me ? 'me' : ''}">
          <span class="nb-place">${r.place <= 3 ? ['🥇', '🥈', '🥉'][r.place - 1] : r.place + '등'}</span>
          <span class="nb-name">${name(r.uid)}<small class="ud-break">${state.history.filter((h) => h.winners.includes(r.uid)).length}승 / ${state.history.length}라운드</small></span>
          <span class="nb-score">${r.score}점</span>
          <span class="nb-reward">${r.garnets ? `${GARNET}+${r.garnets}` : ''}</span></li>`).join('')}</ol>
        ${resultView()}
      </div>`;
      return;
    }

    const head = `<div class="mp-head"><span class="mp-round">ROUND <b>${state.round || 1}</b> / ${state.rounds}</span></div>`;
    let body = '';

    if (state.phase === 'ready' || state.phase === 'result') {
      const myReady = state.ready[me];
      const waiting = state.order.filter((u) => !state.ready[u]).map(name).join(', ');
      body = `
        ${state.phase === 'result' ? resultView() : ''}
        <div class="mp-title">기억할 준비가 되셨나요?</div>
        <div class="mp-sub">모두 준비되면 카드 16장을 20초 동안 보여 줘요.</div>
        ${state.phase === 'ready' ? `<div class="mp-grid">${LETTERS.map((_, i) => back(i)).join('')}</div>` : ''}
        ${isPlayer ? `<button class="mp-go" data-ready ${myReady ? 'disabled' : ''}>${myReady ? `다른 사람 기다리는 중… <small>${waiting}</small>` : '20초 암기 시작 <span>→</span>'}</button>` : ''}`;
    } else if (state.phase === 'memo') {
      body = `
        <div class="mp-title">A~P 위치의 카드를 기억하세요</div>
        <div class="mp-sub">20초 동안 숫자·무늬와 알파벳 위치를 함께 외우세요.</div>
        <div class="mp-timer">암기 <b data-left>20</b>초</div>
        <div class="mp-grid">${state.board.map((c, i) => `<span class="mp-face">${card(c)}<i>위치 ${LETTERS[i]}</i></span>`).join('')}</div>
        <div class="mp-bar"><i data-bar></i></div>`;
    } else if (state.phase === 'pick') {
      const done = state.picks[me];
      const sel = done || ui.sel;
      body = `
        <div class="mp-timer">선택 <b data-left>30</b>초</div>
        <div class="mp-shared">${state.shared.map((c) => card(c)).join('')}</div>
        <div class="mp-sub"><i class="mp-dot" style="--pc:${color(me)}"></i> ${done ? '선택 완료! 다른 사람을 기다리는 중…' : `내 말 2개를 올려 주세요 (${sel.length}/2)`}</div>
        <div class="mp-grid pick">${LETTERS.map((_, i) => {
          const n = sel.indexOf(i);
          return `<button class="mp-slot ${n >= 0 ? 'on' : ''}" data-slot="${i}" ${done || !isPlayer ? 'disabled' : ''} style="--pc:${color(me)}">${back(i, n >= 0 ? `<em class="mp-token">${n + 1}</em>` : '')}</button>`;
        }).join('')}</div>
        ${isPlayer && !done ? `<button class="mp-go" data-lock ${sel.length === 2 ? '' : 'disabled'}>이 조합으로 승부하기 <span>→</span></button>` : ''}
        <div class="mp-bar"><i data-bar></i></div>`;
    }

    el.innerHTML = `<div class="mp">${head}${scoreBar}${body}</div>`;

    el.querySelector('[data-ready]')?.addEventListener('click', () => sendMove({ type: 'ready' }));
    el.querySelectorAll('[data-slot]').forEach((b) => (b.onclick = () => {
      const i = Number(b.dataset.slot);
      ui.sel = ui.sel.includes(i) ? ui.sel.filter((x) => x !== i) : ui.sel.length < 2 ? [...ui.sel, i] : [ui.sel[1], i];
      ui.key = key;
      this.render(el, { state, me, players, finished, sendMove, room });
    }));
    el.querySelector('[data-lock]')?.addEventListener('click', () => sendMove({ type: 'pick', picks: ui.sel }));

    // 타이머 + 진행 신호
    const $l = el.querySelector('[data-left]'), $bar = el.querySelector('[data-bar]');
    const total = state.phase === 'memo' ? MEMO_MS : PICK_MS;
    const myIndex = Math.max(0, state.order.indexOf(me));
    let lastTick = 0;
    const update = () => {
      if (!el.isConnected) return clearInterval(timer);
      if (!state.deadline) return;
      const left = Math.max(0, state.deadline - Date.now());
      if ($l) $l.textContent = Math.ceil(left / 1000);
      if ($bar) $bar.style.width = `${(left / total) * 100}%`;
      if ($l) $l.closest('.mp-timer').classList.toggle('hurry', left <= 5000);
      const n = Date.now();
      if (left <= 0 && n - lastTick > 2000 && n - state.deadline > 300 + myIndex * 300) {
        lastTick = n;
        sendMove({ type: 'tick' }, { silent: true });
      }
    };
    const timer = setInterval(update, 250);
    update();
  },
};
