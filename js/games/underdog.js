// 보드게임: 언더독레이스 (2~6명)
// - 동물 7마리가 줄지어 경주 (1등 ~ 7등). 무작위 시작 순서, 무작위 다크호스 1마리
// - 티켓(동물 1~7, 각 2장): 2명이면 3장씩, 그 외 2장씩 비공개로 받음
// - 액션카드 33장: 2명 8장 / 3명 7장 / 4~5명 6장 / 6명 5장
// - 다크호스 토큰: 2~4명 2개, 5~6명 3개 (1인 1개)
// - 내 차례: ① 다크호스 토큰 가져오기(선택) ② 액션카드 1장 공개해서 효과 실행
// - 모두 액션카드를 다 쓰면 경주 끝: 티켓 동물 순위 점수(10·8·6·4·3·2·1) + 다크호스 토큰(+5 / −3)
import { GARNET } from '../profile.js';
import { charSvg } from '../avatars.js';

const TURN_MS = 45000;
const EXCHANGE_MS = 20000;
export const POINTS = [10, 8, 6, 4, 3, 2, 1];
const DH_GOOD = 5, DH_BAD = -3;

export const ANIMALS = {
  1: { name: '토끼', char: 'moonrabbit', color: '#f7a8d0' },
  2: { name: '호랑이', char: 'tiger', color: '#ff9d3a' },
  3: { name: '판다', char: 'panda', color: '#c9d2e3' },
  4: { name: '개구리', char: 'frog', color: '#5fcf6a' },
  5: { name: '펭귄', char: 'penguin', color: '#3d7bff' },
  6: { name: '여우', char: 'gumiho', color: '#ff6b4a' },
  7: { name: '해태', char: 'haetae', color: '#ffd84d' },
};

// ── 액션카드 33장 ──
export const CARDS = [
  ...[1, 2, 3, 4, 5, 6, 7].map((pos) => ({ kind: 'pos', pos, steps: 1 })),
  ...[2, 3, 4, 5, 6].map((pos) => ({ kind: 'pos', pos, steps: 2 })),
  ...[1, 2, 3, 4, 5, 6, 7].map((animal) => ({ kind: 'num', animal, steps: 1 })),
  { kind: 'fall', pos: 1 }, { kind: 'fall', pos: 2 }, { kind: 'fall', pos: 3 },
  ...[[1, 2], [3, 4], [5, 6], [7, 1], [2, 5], [3, 6]].map(([a, b]) => ({ kind: 'pair', a, b })),
  ...Array.from({ length: 5 }, () => ({ kind: 'ticket' })),
].map((c, id) => ({ ...c, id }));

const animalLabel = (n) => `${n}번 ${ANIMALS[n].name}`;
export function cardTitle(c) {
  if (c.kind === 'pos') return `${c.pos}등 말 ${c.steps}칸`;
  if (c.kind === 'num') return `${animalLabel(c.animal)} ${c.steps}칸`;
  if (c.kind === 'fall') return `낙마! ${c.pos}등`;
  if (c.kind === 'pair') return `${c.a}번·${c.b}번 함께`;
  return '티켓 교환';
}
export function cardDesc(c) {
  if (c.kind === 'pos') return `지금 ${c.pos}등인 말을 앞 또는 뒤로 ${c.steps}칸 옮겨요.`;
  if (c.kind === 'num') return `${animalLabel(c.animal)}를 앞 또는 뒤로 ${c.steps}칸 옮겨요.`;
  if (c.kind === 'fall') return `지금 ${c.pos}등인 말이 넘어져서 꼴찌(7등)로 가요.`;
  if (c.kind === 'pair') return `${animalLabel(c.a)}와 ${animalLabel(c.b)}를 같은 방향(앞 또는 뒤)으로 1칸씩 옮겨요.`;
  return '둘 중 하나: ① 내 티켓 1장을 버리고 더미에서 1장 받기 ② 다른 플레이어를 골라 그 사람이 티켓 1장을 버리고 더미에서 1장 받기. 버린 티켓은 모두에게 공개돼요.';
}

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const actionCount = (n) => ({ 2: 8, 3: 7, 4: 6, 5: 6, 6: 5 }[n] || 5);
const ticketCount = (n) => (n === 2 ? 3 : 2);
const tokenCount = (n) => (n <= 4 ? 2 : 3);
export const rewardsFor = (n) => (n === 2 ? [1] : n <= 4 ? [2, 1] : [3, 2, 1]);

// ── 말 이동 (lineup: 1등부터 7등까지 동물 번호 배열) ──
export function moveOne(lineup, animal, delta) {
  const L = [...lineup];
  const i = L.indexOf(animal);
  const t = Math.max(0, Math.min(6, i + delta));
  L.splice(i, 1);
  L.splice(t, 0, animal);
  return L;
}
// 두 마리를 같은 방향으로 1칸씩 (앞에 있는 말을 뛰어넘지 않게)
export function movePair(lineup, a, b, dir) {
  const [x, y] = [a, b].sort((p, q) => lineup.indexOf(p) - lineup.indexOf(q)); // x가 더 앞
  const px = lineup.indexOf(x), py = lineup.indexOf(y);
  let tx, ty;
  if (dir < 0) { tx = Math.max(0, px - 1); ty = Math.max(tx + 1, py - 1); }
  else { ty = Math.min(6, py + 1); tx = Math.min(ty - 1, px + 1); }
  const rest = lineup.filter((n) => n !== x && n !== y);
  const out = [];
  for (let i = 0; i < 7; i++) out.push(i === tx ? x : i === ty ? y : rest.shift());
  return out;
}
export const fall = (lineup, pos) => moveOne(lineup, lineup[pos - 1], 6);

export function scoreOf(state, uid) {
  const tickets = state.tickets[uid] || [];
  const ticketPts = tickets.map((a) => POINTS[state.lineup.indexOf(a)]);
  const dhTop3 = state.lineup.indexOf(state.darkHorse) < 3;
  const token = state.tokensHeld[uid] ? (dhTop3 ? DH_GOOD : DH_BAD) : 0;
  return { tickets, ticketPts, token, total: ticketPts.reduce((s, p) => s + p, 0) + token };
}

export function finalResult(state, players) {
  const rewards = rewardsFor(state.order.length);
  const ranking = state.order
    .map((uid) => ({ uid, score: scoreOf(state, uid).total }))
    .sort((a, b) => b.score - a.score)
    .map((r, _, all) => {
      const place = 1 + all.filter((o) => o.score > r.score).length;
      return { ...r, place, garnets: rewards[place - 1] || 0 };
    });
  const top = ranking.filter((r) => r.place === 1).map((r) => players[r.uid]?.name || '?');
  return {
    message: `${top.join(', ')}님 1등! 🏁`,
    winners: ranking.filter((r) => r.place === 1).map((r) => r.uid),
    ranking,
    rewards: Object.fromEntries(ranking.map((r) => [r.uid, r.garnets])),
  };
}

function nextTurn(state, now, players) {
  const n = state.order.length;
  for (let k = 1; k <= n; k++) {
    const idx = (state.turnIdx + k) % n;
    if ((state.hands[state.order[idx]] || []).length) {
      return { state: { ...state, turnIdx: idx, turnDeadline: now + TURN_MS, tokenThisTurn: false, exchange: null } };
    }
  }
  const done = { ...state, phase: 'done', turnIdx: -1, exchange: null };
  return { state: done, result: finalResult(done, players) };
}

function drawTicket(state, uid, discard) {
  const deck = [...state.ticketDeck];
  const got = deck.pop();
  const mine = [...state.tickets[uid]];
  mine.splice(mine.indexOf(discard), 1);
  mine.push(got);
  return { ...state, ticketDeck: deck, tickets: { ...state.tickets, [uid]: mine }, ticketDiscards: [...state.ticketDiscards, { animal: discard, by: uid }] };
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const animalIcon = (n, size = '') => `<span class="ud-ani ${size}" style="--ac:${ANIMALS[n].color}">${charSvg(ANIMALS[n].char)}<b>${n}</b></span>`;

// 화면에서 고른 카드·옵션 (다시 그려도 유지)
let ui = { key: '', card: null, mode: '', target: '' };

export default {
  id: 'underdog',
  name: '언더독레이스',
  emoji: '🏁',
  category: 'board',
  minPlayers: 2,
  maxPlayers: 6,
  duration: '10~20분',
  rewards: [3, 2, 1],
  rewardLabel: '1등 최대 +3',
  description: '내 티켓 동물을 앞으로! 뒤집기 경주',
  rules: [
    '동물 7마리가 한 줄로 경주해요. 맨 앞이 1등, 맨 뒤가 7등이에요. 시작 순서와 🌑다크호스는 무작위예요.',
    '티켓(동물 1~7번, 2장씩)을 몰래 받아요: 2명이면 3장, 그 외 2장. 내 티켓 동물이 앞서야 점수가 높아요.',
    '액션카드를 받아요: 2명 8장 · 3명 7장 · 4~5명 6장 · 6명 5장.',
    '시작 플레이어는 무작위, 이후 순서대로 진행해요.',
    '내 차례: ① 원하면 다크호스 토큰 1개 가져오기 (1인 1개, 토큰이 남아 있고 액션카드가 2장 이상일 때만) ② 액션카드 1장을 공개하고 효과대로 말을 옮겨요.',
    `🌑 다크호스 토큰: 경주가 끝났을 때 다크호스가 3등 안이면 +${DH_GOOD}점, 아니면 ${DH_BAD}점! (2~4명 2개, 5~6명 3개)`,
    '티켓 교환 카드: 내 티켓 1장 교체 또는 다른 플레이어를 지목해 그 사람이 1장 교체. 버린 티켓은 모두에게 공개돼요.',
    '모두 액션카드를 다 쓰면 경주 끝! 티켓 동물 순위 점수 1등 10 · 2등 8 · 3등 6 · 4등 4 · 5등 3 · 6등 2 · 7등 1 + 토큰 점수.',
    '가넷: 2명 → 1등 1개 / 3~4명 → 1등 2개, 2등 1개 / 5~6명 → 1등 3개, 2등 2개, 3등 1개',
    `차례 제한 시간 ${TURN_MS / 1000}초 (넘기면 첫 번째 카드가 '앞으로'로 자동 사용)`,
  ],

  setup(players) {
    const n = players.length;
    const order = shuffle(players.map((p) => p.uid)); // 무작위 시작 플레이어 + 순서
    const lineup = shuffle([1, 2, 3, 4, 5, 6, 7]);
    const darkHorse = 1 + Math.floor(Math.random() * 7);
    let tdeck = shuffle([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7]);
    let adeck = shuffle(CARDS.map((c) => c.id));
    const tickets = {}, hands = {};
    order.forEach((u) => {
      tickets[u] = tdeck.splice(0, ticketCount(n));
      hands[u] = adeck.splice(0, actionCount(n));
    });
    return {
      order, lineup, darkHorse, tickets, hands, ticketDeck: tdeck,
      ticketDiscards: [], tokensLeft: tokenCount(n), tokensHeld: {},
      played: [], turnIdx: 0, turnDeadline: Date.now() + TURN_MS, tokenThisTurn: false, exchange: null, phase: 'play',
    };
  },

  move(state, move, uid, players) {
    const now = Date.now();
    const turnUid = state.turnIdx >= 0 ? state.order[state.turnIdx] : null;

    if (move?.type === 'token') {
      if (state.phase !== 'play' || state.exchange) throw new Error('지금은 토큰을 가져올 수 없어요');
      if (turnUid !== uid) throw new Error('내 차례가 아니에요');
      if (state.tokensHeld[uid]) throw new Error('토큰은 1인 1개까지예요');
      if (state.tokensLeft <= 0) throw new Error('남은 토큰이 없어요');
      if ((state.hands[uid] || []).length < 2) throw new Error('액션카드가 1장뿐이면 토큰을 가져올 수 없어요');
      return { state: { ...state, tokensLeft: state.tokensLeft - 1, tokensHeld: { ...state.tokensHeld, [uid]: true }, tokenThisTurn: true } };
    }

    if (move?.type === 'play') {
      if (state.phase !== 'play' || state.exchange) throw new Error('지금은 카드를 낼 수 없어요');
      if (turnUid !== uid) throw new Error('내 차례가 아니에요');
      const id = Number(move.card);
      if (!(state.hands[uid] || []).includes(id)) throw new Error('가지고 있지 않은 카드예요');
      const c = CARDS[id];
      const dir = move.dir === 'back' ? 1 : -1;
      let s = { ...state, hands: { ...state.hands, [uid]: state.hands[uid].filter((x) => x !== id) } };
      let note = '';
      if (c.kind === 'pos') { const a = s.lineup[c.pos - 1]; s.lineup = moveOne(s.lineup, a, dir * c.steps); note = `${animalLabel(a)} ${dir < 0 ? '앞으로' : '뒤로'} ${c.steps}칸`; }
      else if (c.kind === 'num') { s.lineup = moveOne(s.lineup, c.animal, dir * c.steps); note = `${dir < 0 ? '앞으로' : '뒤로'} ${c.steps}칸`; }
      else if (c.kind === 'fall') { const a = s.lineup[c.pos - 1]; s.lineup = fall(s.lineup, c.pos); note = `${animalLabel(a)} 낙마!`; }
      else if (c.kind === 'pair') { s.lineup = movePair(s.lineup, c.a, c.b, dir); note = `${dir < 0 ? '앞으로' : '뒤로'} 1칸`; }
      else {
        // 티켓 교환
        if (!s.ticketDeck.length) { note = '티켓 더미가 비어서 효과 없음'; }
        else if (move.mode === 'other') {
          const target = move.target;
          if (!s.order.includes(target) || target === uid) throw new Error('다른 플레이어를 골라 주세요');
          s.played = [...s.played, { card: id, by: uid, note: `${players[target]?.name || '?'}님 티켓 교환 지목` }];
          return { state: { ...s, exchange: { by: uid, target, until: now + EXCHANGE_MS } } };
        } else {
          const discard = Number(move.ticket);
          if (!s.tickets[uid].includes(discard)) throw new Error('버릴 내 티켓을 골라 주세요');
          s = drawTicket(s, uid, discard);
          note = '내 티켓 1장 교환';
        }
      }
      s.played = [...s.played, { card: id, by: uid, note }];
      return nextTurn(s, now, players);
    }

    if (move?.type === 'discardTicket') {
      const ex = state.exchange;
      if (!ex || ex.target !== uid) throw new Error('티켓을 고를 차례가 아니에요');
      const discard = Number(move.ticket);
      if (!state.tickets[uid].includes(discard)) throw new Error('가지고 있는 티켓을 골라 주세요');
      return nextTurn(drawTicket({ ...state, exchange: null }, uid, discard), now, players);
    }

    if (move?.type === 'tick') {
      if (state.phase === 'play' && state.exchange && now >= state.exchange.until) {
        const t = state.exchange.target;
        return nextTurn(drawTicket({ ...state, exchange: null }, t, state.tickets[t][0]), now, players);
      }
      if (state.phase === 'play' && !state.exchange && now >= state.turnDeadline) {
        // 시간 초과: 첫 번째 카드를 기본 선택으로 사용
        const id = state.hands[turnUid][0];
        const c = CARDS[id];
        if (c.kind === 'ticket') {
          let s = { ...state, hands: { ...state.hands, [turnUid]: state.hands[turnUid].slice(1) } };
          if (s.ticketDeck.length) s = drawTicket(s, turnUid, s.tickets[turnUid][0]);
          s.played = [...s.played, { card: id, by: turnUid, note: '시간 초과 · 내 티켓 교환' }];
          return nextTurn(s, now, players);
        }
        return this.move(state, { type: 'play', card: id, dir: 'front' }, turnUid, players);
      }
      throw new Error('__noop');
    }

    throw new Error('알 수 없는 동작이에요');
  },

  render(el, ctx) {
    const { state, me, players, finished, sendMove, room } = ctx;
    if (el._udTimer) clearInterval(el._udTimer); // 카드를 고를 때 다시 그려도 타이머가 겹치지 않게
    const name = (u) => esc(players[u]?.name || '나간 사람');
    const isPlayer = state.order.includes(me);
    const turnUid = state.turnIdx >= 0 ? state.order[state.turnIdx] : null;
    const myTurn = turnUid === me && !state.exchange && state.phase === 'play';
    const key = `${room?.code}:${state.played.length}`;
    if (ui.key !== key) ui = { key, card: null, mode: '', target: '' };

    const track = `
      <ol class="ud-track">
        ${state.lineup.map((a, i) => `
          <li class="${a === state.darkHorse ? 'dh' : ''} ${isPlayer && (state.tickets[me] || []).includes(a) ? 'mine' : ''}">
            <span class="ud-rank">${i + 1}<small>등</small></span>
            ${animalIcon(a)}
            <span class="ud-aname">${ANIMALS[a].name}${a === state.darkHorse ? ' <i class="ud-dh">🌑 다크호스</i>' : ''}</span>
            <span class="ud-pts">${POINTS[i]}점</span>
          </li>`).join('')}
      </ol>`;

    if (finished) {
      const ranking = room?.result?.ranking || finalResult(state, players).ranking;
      el.innerHTML = `
        <div class="ud">
          <div class="dm-title" style="color:var(--gold)">🏁 최종 순위</div>
          ${track}
          <ol class="nb-final">
            ${ranking.map((r) => {
              const sc = scoreOf(state, r.uid);
              return `<li class="${r.uid === me ? 'me' : ''}">
                <span class="nb-place">${r.place <= 3 ? ['🥇', '🥈', '🥉'][r.place - 1] : r.place + '등'}</span>
                <span class="nb-name">${name(r.uid)}<small class="ud-break">${sc.tickets.map((a, i) => `${ANIMALS[a].name} ${sc.ticketPts[i]}`).join(' + ')}${sc.token ? ` ${sc.token > 0 ? '+' : '−'} 🌑${Math.abs(sc.token)}` : ''}</small></span>
                <span class="nb-score">${r.score}점</span>
                <span class="nb-reward">${r.garnets ? `${GARNET}+${r.garnets}` : ''}</span>
              </li>`;
            }).join('')}
          </ol>
        </div>`;
      return;
    }

    const lastPlay = state.played[state.played.length - 1];
    const myHand = (state.hands[me] || []).map((id) => CARDS[id]);
    const canToken = myTurn && !state.tokensHeld[me] && state.tokensLeft > 0 && myHand.length >= 2;
    const exForMe = state.exchange && state.exchange.target === me;

    let banner;
    if (state.exchange) banner = exForMe ? '<span><b>티켓 교환 지목!</b> 버릴 내 티켓 1장을 고르세요</span>' : `<span><b>${name(state.exchange.target)}</b>님이 버릴 티켓을 고르는 중…</span>`;
    else banner = myTurn ? '<span><b>내 차례!</b> 토큰을 가져올지 정하고, 액션카드 1장을 내세요</span>' : `<span><b>${name(turnUid)}</b>님 차례</span>`;

    const sel = ui.card !== null ? CARDS[ui.card] : null;
    let options = '';
    if (myTurn && sel) {
      if (['pos', 'num', 'pair'].includes(sel.kind)) {
        options = `<div class="ud-opts"><button class="btn primary" data-play="front">⬆ 앞으로</button><button class="btn" data-play="back">⬇ 뒤로</button></div>`;
      } else if (sel.kind === 'fall') {
        options = `<div class="ud-opts"><button class="btn primary block" data-play="front">낙마 실행!</button></div>`;
      } else {
        options = !state.ticketDeck.length ? '<div class="ud-opts"><button class="btn block" data-play="front">티켓 더미가 비었어요 (효과 없이 사용)</button></div>' : `
          <div class="ud-opts col">
            <div class="ud-opt-title">① 내 티켓 1장 교체 — 버릴 티켓 선택</div>
            <div class="ud-tickets">${(state.tickets[me] || []).map((a, i) => `<button class="ud-ticket btn-like" data-self="${a}">${animalIcon(a, 'sm')}${ANIMALS[a].name}</button>`).join('')}</div>
            <div class="ud-opt-title">② 다른 플레이어 지목 — 그 사람이 1장 교체</div>
            <div class="ud-tickets">${state.order.filter((u) => u !== me).map((u) => `<button class="btn sm" data-other="${u}">${name(u)}</button>`).join('')}</div>
          </div>`;
      }
    }

    el.innerHTML = `
      <div class="ud">
        <div class="nb-top">
          <span class="nb-round">${state.exchange ? '티켓 교환' : `<b>${name(turnUid)}</b>`}</span>
          <span class="nb-timer" data-timer></span>
        </div>
        <div class="nb-bar"><i data-bar></i></div>

        ${track}

        <div class="ud-info">
          <div class="ud-token">🌑 다크호스 <b>${ANIMALS[state.darkHorse].name}</b> · 토큰 남음 <b>${state.tokensLeft}</b>개
            <small>토큰을 가진 사람은 경주가 끝났을 때 다크호스가 3등 안이면 +${DH_GOOD}점, 아니면 ${DH_BAD}점</small>
            ${Object.keys(state.tokensHeld).length ? `<small>보유: ${Object.keys(state.tokensHeld).map(name).join(', ')}</small>` : ''}
          </div>
          ${lastPlay ? `<div class="ud-last">마지막 카드: <b>${name(lastPlay.by)}</b> · <span class="ud-cardname">${esc(cardTitle(CARDS[lastPlay.card]))}</span> ${esc(lastPlay.note)}</div>` : ''}
          ${state.ticketDiscards.length ? `<div class="ud-discards">버린 티켓: ${state.ticketDiscards.map((d) => `<span>${animalIcon(d.animal, 'xs')}<small>${name(d.by)}</small></span>`).join('')}</div>` : ''}
        </div>

        <div class="nb-banner">${banner}</div>

        ${exForMe ? `<div class="ud-tickets big">${(state.tickets[me] || []).map((a) => `<button class="ud-ticket btn-like" data-discard="${a}">${animalIcon(a)}${ANIMALS[a].name} 버리기</button>`).join('')}</div>` : ''}

        ${isPlayer ? `
          <div class="ud-mine">
            <div class="ud-mine-title">🎫 내 티켓 <small>나만 보여요</small></div>
            <div class="ud-tickets">${(state.tickets[me] || []).map((a) => `<span class="ud-ticket">${animalIcon(a, 'sm')}${ANIMALS[a].name} <small>${POINTS[state.lineup.indexOf(a)]}점</small></span>`).join('')}
              ${state.tokensHeld[me] ? '<span class="ud-ticket dh">🌑 토큰</span>' : ''}</div>
          </div>
          ${canToken ? `<button class="btn ud-tokenbtn" data-token>🌑 다크호스 토큰 가져오기 (선택)</button>` : ''}
          ${myTurn && state.tokenThisTurn ? '<div class="ud-took">🌑 토큰을 가져왔어요. 이제 카드를 내세요</div>' : ''}
          <div class="ud-mine-title">🃏 내 액션카드 ${myHand.length}장 ${myTurn ? '<small>카드를 눌러 고르세요</small>' : ''}</div>
          <div class="ud-hand">
            ${myHand.map((c) => `
              <button class="ud-card k-${c.kind} ${ui.card === c.id ? 'sel' : ''}" data-card="${c.id}" ${myTurn ? '' : 'disabled'}>
                <b>${esc(cardTitle(c))}</b><small>${esc(cardDesc(c))}</small>
              </button>`).join('')}
          </div>
          ${options}` : ''}

        <ul class="sp-players">
          ${state.order.map((u, i) => `
            <li class="${u === me ? 'me' : ''} ${u === turnUid ? 'turn' : ''}">
              <span class="sp-pname"><i class="sp-no">${'①②③④⑤⑥'[i]}</i>${name(u)}${state.tokensHeld[u] ? ' 🌑' : ''}</span>
              <span class="sp-pstat">카드 ${(state.hands[u] || []).length}장</span>
              <span class="sp-pchips">🎫${(state.tickets[u] || []).length}</span>
            </li>`).join('')}
        </ul>
      </div>`;

    el.querySelectorAll('[data-card]').forEach((b) => (b.onclick = () => { ui.card = Number(b.dataset.card); ui.key = key; this.render(el, ctx); }));
    el.querySelectorAll('[data-play]').forEach((b) => (b.onclick = () => sendMove({ type: 'play', card: ui.card, dir: b.dataset.play })));
    el.querySelectorAll('[data-self]').forEach((b) => (b.onclick = () => sendMove({ type: 'play', card: ui.card, mode: 'self', ticket: Number(b.dataset.self) })));
    el.querySelectorAll('[data-other]').forEach((b) => (b.onclick = () => sendMove({ type: 'play', card: ui.card, mode: 'other', target: b.dataset.other })));
    el.querySelectorAll('[data-discard]').forEach((b) => (b.onclick = () => sendMove({ type: 'discardTicket', ticket: Number(b.dataset.discard) })));
    const $tok = el.querySelector('[data-token]');
    if ($tok) $tok.onclick = () => sendMove({ type: 'token' });

    // 타이머 + 진행 신호
    const $t = el.querySelector('[data-timer]');
    const $bar = el.querySelector('[data-bar]');
    const myIndex = Math.max(0, state.order.indexOf(me));
    let lastTick = 0;
    const update = () => {
      if (!el.isConnected) return clearInterval(timer);
      const now = Date.now();
      const due = state.exchange ? state.exchange.until : state.turnDeadline;
      const total = state.exchange ? EXCHANGE_MS : TURN_MS;
      const left = Math.max(0, due - now);
      $t.textContent = Math.ceil(left / 1000);
      $t.classList.toggle('hurry', left <= 8000);
      $bar.style.width = `${(left / total) * 100}%`;
      if (now >= due && now - lastTick > 2000 && now - due > 300 + myIndex * 300) {
        lastTick = now;
        sendMove({ type: 'tick' }, { silent: true });
      }
    };
    const timer = setInterval(update, 250);
    el._udTimer = timer;
    update();
  },
};
