// 보드게임: 언더독레이스 (2~6명)
// - 동물 7마리가 줄지어 경주 (1등 ~ 7등). 시작 순서는 무작위, 시작 7등 동물이 다크호스
// - 티켓(동물 1~7, 각 2장): 2명이면 3장씩, 그 외 2장씩 비공개로 받음
// - 액션카드 33장: 2명 8장 / 3명 7장 / 4~5명 6장 / 6명 5장
// - 다크호스 토큰: 2~4명 2개, 5~6명 3개 (1인 1개)
// - 내 차례: ① 다크호스 토큰 가져오기(선택) ② 액션카드 1장 공개해서 효과 실행 (시간 제한 없음)
// - 모두 액션카드를 다 쓰면 경주 끝: 티켓 동물 순위 점수(10·8·6·4·3·2·1) + 다크호스 토큰(+5 / −3)
import { turnAlert } from './turn-alert.js';
import { GARNET } from '../profile.js';
import { animalSvg, NUM_COLOR } from './underdog-art.js';

export const POINTS = [10, 8, 6, 4, 3, 2, 1];
const DH_GOOD = 5, DH_BAD = -3;

const NAMES = { 1: '토끼', 2: '호랑이', 3: '판다', 4: '개구리', 5: '펭귄', 6: '여우', 7: '코끼리' };
export const ANIMALS = Object.fromEntries(Object.entries(NAMES).map(([n, name]) => [n, { name, color: NUM_COLOR[n] }]));

// ── 액션카드 33장 ──
export const CARDS = [
  ...[1, 2, 3, 4, 5, 6, 7].map((pos) => ({ kind: 'pos', pos, steps: 1 })),
  ...[2, 3, 4, 5, 6].map((pos) => ({ kind: 'pos', pos, steps: 2 })),
  ...[1, 2, 3, 4, 5, 6, 7].map((animal) => ({ kind: 'num', animal, steps: 1 })),
  { kind: 'fall', pos: 1 }, { kind: 'fall', pos: 2 }, { kind: 'fall', pos: 3 },
  ...[[1, 2], [3, 4], [5, 6], [7, 1], [2, 5], [3, 6]].map(([a, b]) => ({ kind: 'pair', a, b })),
  ...Array.from({ length: 5 }, () => ({ kind: 'ticket' })),
].map((c, id) => ({ ...c, id }));

// 받침에 맞는 조사 (펭귄을 / 토끼를)
const hasJong = (w) => { const c = w.charCodeAt(w.length - 1) - 0xac00; return c >= 0 && c % 28 !== 0; };
const animalLabel = (n) => `${n}번 ${ANIMALS[n].name}`;
const eul = (n) => animalLabel(n) + (hasJong(ANIMALS[n].name) ? '을' : '를');
const wa = (n) => animalLabel(n) + (hasJong(ANIMALS[n].name) ? '과' : '와');

export function cardTitle(c) {
  if (c.kind === 'pos') return `${c.pos}등 말 ${c.steps}칸`;
  if (c.kind === 'num') return `${animalLabel(c.animal)} ${c.steps}칸`;
  if (c.kind === 'fall') return `낙마! ${c.pos}등`;
  if (c.kind === 'pair') return `${c.a}번·${c.b}번 함께`;
  return '티켓 교환';
}
export function cardDesc(c) {
  if (c.kind === 'pos') return `지금 ${c.pos}등인 말을 앞 또는 뒤로 ${c.steps}칸 옮겨요.`;
  if (c.kind === 'num') return `${eul(c.animal)} 앞 또는 뒤로 ${c.steps}칸 옮겨요.`;
  if (c.kind === 'fall') return `지금 ${c.pos}등인 말이 넘어져서 꼴찌(7등)로 가요.`;
  if (c.kind === 'pair') return `${wa(c.a)} ${eul(c.b)} 같은 방향(앞 또는 뒤)으로 1칸씩 옮겨요.`;
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

function nextTurn(state, players) {
  const n = state.order.length;
  for (let k = 1; k <= n; k++) {
    const idx = (state.turnIdx + k) % n;
    if ((state.hands[state.order[idx]] || []).length) {
      return { state: { ...state, turnIdx: idx, tokenThisTurn: false, exchange: null } };
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

// ── 그림: 액션카드 ──
// 경주 방향: 오른쪽이 결승선(1등). ▶ = 앞으로(초록), ◀ = 뒤로(빨강)
const arrows = (steps) => `<span class="b">${'◀'.repeat(steps)}</span><em>${steps}</em><span class="f">${'▶'.repeat(steps)}</span>`;
// 7칸 미니 트랙 (왼쪽 7등 → 오른쪽 1등)
const miniTrack = (pos, fallTo) => `<span class="udc-mini">${[7, 6, 5, 4, 3, 2, 1].map((r) => `<i class="${r === pos ? 'on' : ''} ${fallTo && r === 7 ? 'to' : ''}"></i>`).join('')}</span>`;

export function cardArt(c) {
  const wrap = (k, inner) => `<div class="udc k-${k}" style="--bg:url(/img/underdog/card-${k}.webp)">${inner}</div>`;
  if (c.kind === 'num') {
    return wrap('num', `
      <span class="udc-pic">${animalSvg(c.animal)}</span>
      <span class="udc-mv">${arrows(c.steps)}</span>
      <span class="udc-name">${esc(animalLabel(c.animal))}</span>`);
  }
  if (c.kind === 'pair') {
    return wrap('pair', `
      <span class="udc-pic two">${animalSvg(c.a)}${animalSvg(c.b)}</span>
      <span class="udc-mv">${arrows(1)}</span>
      <span class="udc-name">${ANIMALS[c.a].name}·${ANIMALS[c.b].name} 함께</span>`);
  }
  if (c.kind === 'pos') {
    return wrap('pos', `
      <span class="udc-pic">${medalSvg(c.pos)}</span>
      ${miniTrack(c.pos)}
      <span class="udc-mv">${arrows(c.steps)}</span>
      <span class="udc-name">${c.pos}등 말 ${c.steps}칸</span>`);
  }
  if (c.kind === 'fall') {
    return wrap('fall', `
      <span class="udc-pic"><img src="img/underdog/ic-fall.webp" alt="" draggable="false"></span>
      ${miniTrack(c.pos, true)}
      <span class="udc-mv"><span class="b">${c.pos}등 ➜ 꼴찌</span></span>
      <span class="udc-name">${c.pos}등 말 낙마!</span>`);
  }
  return wrap('ticket', `
    <span class="udc-pic"><img src="img/underdog/ic-swap.webp" alt="" draggable="false"></span>
    <span class="udc-mv"><em>나 또는 상대</em></span>
    <span class="udc-name">티켓 교환</span>`);
}

// 카드 그림: 등수 메달 / 낙마 / 티켓 교환
const MEDAL = { 1: ['#ffd84d', '#c99412'], 2: ['#e3e7ee', '#9aa3ad'], 3: ['#e5a066', '#a8642c'] };
// 메달 그림(금) 위에 메달 부분만 색을 바꿔 덧씌워요: 1등 금 · 2등 은 · 3등 동 · 4등 이하 파랑
const MEDAL_TINT = {
  2: '0.36 0.6 0.12 0 0.06  0.36 0.6 0.12 0 0.06  0.38 0.62 0.14 0 0.1  0 0 0 1 0',
  3: '1.05 0.1 0 0 0  0.18 0.55 0 0 0  0.05 0.1 0.3 0 0  0 0 0 1 0',
  4: '0.1 0.2 0.05 0 0  0.2 0.45 0.1 0 0  0.35 0.6 0.55 0 0.08  0 0 0 1 0',
};
function medalSvg(pos) {
  const tint = MEDAL_TINT[Math.min(pos, 4)];
  const id = `udm${pos}`;
  const img = '<image href="img/underdog/ic-medal.webp" width="230" height="420"/>';
  return `<svg viewBox="0 0 230 420" xmlns="http://www.w3.org/2000/svg">
    ${tint ? `<defs><filter id="${id}f" color-interpolation-filters="sRGB"><feColorMatrix type="matrix" values="${tint}"/></filter><clipPath id="${id}c"><circle cx="115" cy="300" r="118"/></clipPath></defs>` : ''}
    ${img}${tint ? `<g clip-path="url(#${id}c)" filter="url(#${id}f)">${img}</g>` : ''}
    <text x="115" y="345" text-anchor="middle" font-family="'Black Han Sans', sans-serif" font-size="130" fill="#fff" stroke="rgba(30,15,5,.85)" stroke-width="10" paint-order="stroke">${pos}<tspan font-size="56">등</tspan></text>
  </svg>`;
}

// ── 그림: 티켓 카드 ──
function ticketArt(state, a, extra = '') {
  const rank = state.lineup.indexOf(a);
  return `<span class="udt" style="--c1:${NUM_COLOR[a]}">
    <span class="udt-no">${a}</span>
    <span class="udt-pic">${animalSvg(a)}</span>
    <span class="udt-info"><b>${esc(ANIMALS[a].name)}</b><small>지금 ${rank + 1}등 · ${POINTS[rank]}점</small>${extra}</span>
  </span>`;
}

// ── 그림: 경주 트랙 (왼쪽 7등 → 오른쪽 결승선 1등) ──
function raceTrack(state, me) {
  const mine = state.tickets[me] || [];
  const slots = [6, 5, 4, 3, 2, 1, 0].map((i) => {
    const a = state.lineup[i];
    return `<div class="ud-slot ${a === state.darkHorse ? 'dh' : ''} ${mine.includes(a) ? 'mine' : ''}" data-ani="${a}" style="--c1:${NUM_COLOR[a]}">
      ${(() => {
        const cnt = mine.filter((x) => x === a).length;
        const tags = (a === state.darkHorse ? '<span class="ud-dhb">다크호스</span>' : '') + (cnt ? `<span class="ud-myt">내 티켓${cnt > 1 ? '×' + cnt : ''}</span>` : '');
        return tags ? `<span class="ud-tags">${tags}</span>` : '';
      })()}
      <span class="ud-stand">${animalSvg(a, '', true)}</span>
      <span class="ud-base"></span>
      <span class="ud-rk">${i + 1}<small>${['st', 'nd', 'rd'][i] || 'th'}</small></span>
    </div>`;
  }).join('');
  return `<div class="ud-race"><div class="ud-lane">${slots}</div><div class="ud-finish"><span>FINISH</span></div></div>`;
}
function scoreTable() {
  return `    <div class="ud-score">
      <div class="ud-score-t">🏆 등수별 점수 <small>경주가 끝났을 때 내 티켓 동물의 등수로 점수를 받아요</small></div>
      <div class="ud-score-row">${POINTS.map((p, i) => `<span class="${i < 3 ? 'hi' : ''}"><b>${i + 1}등</b>${p}점</span>`).join('')}</div>
      <div class="ud-score-dh">🌑 다크호스 토큰: 다크호스가 3등 안 <b class="up">+${DH_GOOD}점</b> · 4등 이하 <b class="dn">${DH_BAD}점</b></div>
    </div>`;
}

// 점수 합산 내역: 여우 1등 10점 + 판다 4등 4점 + 다크호스 +5점
function breakdown(state, sc) {
  const parts = sc.tickets.map((a, i) => `<span class="ud-bk">${esc(ANIMALS[a].name)} ${state.lineup.indexOf(a) + 1}등 <b>${sc.ticketPts[i]}점</b></span>`);
  if (sc.token) parts.push(`<span class="ud-bk dh">🌑다크호스(${esc(ANIMALS[state.darkHorse].name)} ${state.lineup.indexOf(state.darkHorse) + 1}등) <b class="${sc.token > 0 ? 'up' : 'dn'}">${sc.token > 0 ? '+' : ''}${sc.token}점</b></span>`);
  return parts.join('<i>+</i>') + ` <i>=</i> <b class="ud-sum">${sc.total}점</b>`;
}

// 말이 움직이면 미끄러지듯 이동하는 애니메이션
let lastLineup = { key: '', lineup: null };
function animateTrack(el, state, roomKey) {
  const prev = lastLineup.key === roomKey ? lastLineup.lineup : null;
  lastLineup = { key: roomKey, lineup: [...state.lineup] };
  if (!prev || prev.join() === state.lineup.join()) return;
  const slot = el.querySelector('.ud-slot');
  if (!slot || !slot.animate) return;
  const w = slot.getBoundingClientRect().width;
  el.querySelectorAll('.ud-slot').forEach((s) => {
    const a = Number(s.dataset.ani);
    const d = (state.lineup.indexOf(a) - prev.indexOf(a)) * w; // 순위가 오르면 오른쪽으로
    if (d) s.querySelector('.ud-stand').animate([{ transform: `translateX(${d}px)` }, { transform: 'none' }], { duration: 700, easing: 'cubic-bezier(.3,.7,.3,1.2)' });
  });
}

// 화면에서 고른 카드·옵션 (다시 그려도 유지)
let ui = { key: '', card: null };

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
    '동물 7마리(토끼·호랑이·판다·개구리·펭귄·여우·코끼리)가 결승선을 향해 한 줄로 경주해요. 결승선에 가장 가까운 말이 1등이에요.',
    '시작 순서는 무작위이고, 시작할 때 7등(꼴찌)인 동물이 🌑다크호스예요.',
    '티켓(동물 1~7번, 2장씩)을 몰래 받아요: 2명이면 3장, 그 외 2장. 내 티켓 동물이 앞서야 점수가 높아요.',
    '액션카드를 받아요: 2명 8장 · 3명 7장 · 4~5명 6장 · 6명 5장.',
    '시작 플레이어는 무작위, 이후 순서대로 진행해요. 시간 제한은 없으니 천천히 읽고 고르세요.',
    '내 차례: ① 원하면 다크호스 토큰 1개 가져오기 (1인 1개, 토큰이 남아 있고 액션카드가 2장 이상일 때만) ② 액션카드 1장을 공개하고 효과대로 말을 옮겨요.',
    `🌑 다크호스 토큰: 경주가 끝났을 때 다크호스가 3등 안이면 +${DH_GOOD}점, 아니면 ${DH_BAD}점! (2~4명 2개, 5~6명 3개)`,
    '티켓 교환 카드: 내 티켓 1장 교체 또는 다른 플레이어를 지목해 그 사람이 1장 교체. 버린 티켓은 모두에게 공개돼요.',
    '모두 액션카드를 다 쓰면 경주 끝! 티켓 동물 순위 점수 1등 10 · 2등 8 · 3등 6 · 4등 4 · 5등 3 · 6등 2 · 7등 1 + 토큰 점수.',
    '가넷: 2명 → 1등 1개 / 3~4명 → 1등 2개, 2등 1개 / 5~6명 → 1등 3개, 2등 2개, 3등 1개',
  ],

  setup(players) {
    const n = players.length;
    const order = shuffle(players.map((p) => p.uid)); // 무작위 시작 플레이어 + 순서
    const lineup = shuffle([1, 2, 3, 4, 5, 6, 7]);
    const darkHorse = lineup[6]; // 시작 7등이 다크호스
    const tdeck = shuffle([1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7]);
    const adeck = shuffle(CARDS.map((c) => c.id));
    const tickets = {}, hands = {};
    order.forEach((u) => {
      tickets[u] = tdeck.splice(0, ticketCount(n));
      hands[u] = adeck.splice(0, actionCount(n));
    });
    return {
      order, lineup, darkHorse, tickets, hands, ticketDeck: tdeck,
      ticketDiscards: [], tokensLeft: tokenCount(n), tokensHeld: {},
      played: [], turnIdx: 0, tokenThisTurn: false, exchange: null, phase: 'play',
    };
  },

  move(state, move, uid, players) {
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
        if (!s.ticketDeck.length) { note = '티켓 더미가 비어서 효과 없음'; }
        else if (move.mode === 'other') {
          const target = move.target;
          if (!s.order.includes(target) || target === uid) throw new Error('다른 플레이어를 골라 주세요');
          s.played = [...s.played, { card: id, by: uid, note: `${players[target]?.name || '?'}님 티켓 교환 지목` }];
          return { state: { ...s, exchange: { by: uid, target } } };
        } else {
          const discard = Number(move.ticket);
          if (!s.tickets[uid].includes(discard)) throw new Error('버릴 내 티켓을 골라 주세요');
          s = drawTicket(s, uid, discard);
          note = '내 티켓 1장 교환';
        }
      }
      s.played = [...s.played, { card: id, by: uid, note }];
      return nextTurn(s, players);
    }

    if (move?.type === 'discardTicket') {
      const ex = state.exchange;
      if (!ex || ex.target !== uid) throw new Error('티켓을 고를 차례가 아니에요');
      const discard = Number(move.ticket);
      if (!state.tickets[uid].includes(discard)) throw new Error('가지고 있는 티켓을 골라 주세요');
      return nextTurn(drawTicket({ ...state, exchange: null }, uid, discard), players);
    }

    if (move?.type === 'tick') throw new Error('__noop');
    throw new Error('알 수 없는 동작이에요');
  },

  render(el, ctx) {
    const { state, me, players, finished, sendMove, room } = ctx;
    const name = (u) => esc(players[u]?.name || '나간 사람');
    const isPlayer = state.order.includes(me);
    const turnUid = state.turnIdx >= 0 ? state.order[state.turnIdx] : null;
    const myTurn = turnUid === me && !state.exchange && state.phase === 'play';
    turnAlert(room?.code, `ud:${state.played.length}:${state.turnIdx}`, myTurn && !finished);
    const key = `${room?.code}:${state.played.length}`;
    if (ui.key !== key) ui = { key, card: null };

    if (finished) {
      const ranking = room?.result?.ranking || finalResult(state, players).ranking;
      el.innerHTML = `
        <div class="ud">
          <div class="dm-title" style="color:var(--gold)">🏁 최종 순위</div>
          ${raceTrack(state, me)}
          <ol class="nb-final">
            ${ranking.map((r) => {
              const sc = scoreOf(state, r.uid);
              return `<li class="${r.uid === me ? 'me' : ''}">
                <span class="nb-place">${r.place <= 3 ? ['🥇', '🥈', '🥉'][r.place - 1] : r.place + '등'}</span>
                <span class="nb-name">${name(r.uid)}</span>
                <span class="nb-score">${r.score}점</span>
                <span class="nb-reward">${r.garnets ? `${GARNET}+${r.garnets}` : ''}</span>
                <div class="ud-break">${breakdown(state, sc)}</div>
              </li>`;
            }).join('')}
          </ol>
        </div>`;
      animateTrack(el, state, room?.code);
      return;
    }

    const lastPlay = state.played[state.played.length - 1];
    const myHand = (state.hands[me] || []).map((id) => CARDS[id]);
    const canToken = myTurn && !state.tokensHeld[me] && state.tokensLeft > 0 && myHand.length >= 2;
    const exForMe = state.exchange && state.exchange.target === me;

    let banner;
    if (state.exchange) banner = exForMe ? '<span><b>티켓 교환 지목!</b> 버릴 내 티켓 1장을 고르세요</span>' : `<span><b>${name(state.exchange.target)}</b>님이 버릴 티켓을 고르는 중…</span>`;
    else banner = myTurn ? `<span><b>내 차례!</b> ${canToken ? '토큰을 가져올지 정하고, ' : ''}액션카드 1장을 내세요</span>` : `<span><b>${name(turnUid)}</b>님 차례</span>`;

    const sel = ui.card !== null && (state.hands[me] || []).includes(ui.card) ? CARDS[ui.card] : null;
    let options = '';
    if (sel) {
      let acts = '';
      if (myTurn) {
        if (['pos', 'num', 'pair'].includes(sel.kind)) {
          acts = `<div class="ud-opts"><button class="btn primary" data-play="front">▶ 앞으로</button><button class="btn" data-play="back">◀ 뒤로</button></div>`;
        } else if (sel.kind === 'fall') {
          acts = `<div class="ud-opts one"><button class="btn primary block" data-play="front">💥 낙마 실행!</button></div>`;
        } else if (!state.ticketDeck.length) {
          acts = '<div class="ud-opts one"><button class="btn block" data-play="front">티켓 더미가 비었어요 (효과 없이 사용)</button></div>';
        } else {
          acts = `
            <div class="ud-opt-title">① 내 티켓 1장 교체 — 버릴 티켓을 누르세요</div>
            <div class="ud-tickets">${(state.tickets[me] || []).map((a) => `<button class="udt-btn" data-self="${a}">${ticketArt(state, a, '<i class="udt-act">버리기</i>')}</button>`).join('')}</div>
            <div class="ud-opt-title">② 다른 플레이어 지목 — 그 사람이 1장 교체</div>
            <div class="ud-who">${state.order.filter((u) => u !== me).map((u) => `<button class="btn sm" data-other="${u}">${name(u)}</button>`).join('')}</div>`;
        }
      }
      options = `<div class="ud-sel">
        <div class="ud-sel-desc"><b>${esc(cardTitle(sel))}</b> ${esc(cardDesc(sel))}</div>
        ${acts}
      </div>`;
    }

    el.innerHTML = `
      <div class="ud">
        ${raceTrack(state, me)}

        <div class="nb-banner">${banner}</div>
        ${canToken ? `<button class="btn ud-tokenbtn block" data-token>🌑 다크호스 토큰 가져오기 <small>(남은 토큰 ${state.tokensLeft}개)</small></button>` : ''}
        ${myTurn && state.tokenThisTurn ? '<div class="ud-took">🌑 토큰을 가져왔어요. 이제 카드를 내세요</div>' : ''}
        <div class="ud-info">
          <div class="ud-token">🌑 다크호스 <b>${animalLabel(state.darkHorse)}</b>
            <small>다크호스로 정해진 <b>${animalLabel(state.darkHorse)}</b>${hasJong(ANIMALS[state.darkHorse].name) ? '은' : '는'} 끝날 때까지 바뀌지 않아요.</small><small>토큰을 가진 사람은 경주가 끝났을 때 다크호스가 3등 안이면 <b class="up">+${DH_GOOD}점</b>, 아니면 <b class="dn">${DH_BAD}점</b>이에요.</small>
            ${Object.keys(state.tokensHeld).length ? `<small>보유: ${Object.keys(state.tokensHeld).map(name).join(', ')}</small>` : ''}
          </div>
          ${lastPlay ? `<div class="ud-last"><span class="ud-lastcard">${cardArt(CARDS[lastPlay.card])}</span><span><small>방금 낸 카드</small><b>${name(lastPlay.by)}</b><br>${esc(cardTitle(CARDS[lastPlay.card]))}<br><span class="ud-note">${esc(lastPlay.note)}</span></span></div>` : ''}
          ${state.ticketDiscards.length ? `<div class="ud-discards"><span class="ud-dt">버린 티켓</span>${state.ticketDiscards.map((d) => `<span class="ud-dchip" style="--c1:${NUM_COLOR[d.animal]}"><i>${d.animal}</i>${esc(ANIMALS[d.animal].name)}<small>${name(d.by)}</small></span>`).join('')}</div>` : ''}
        </div>


        ${exForMe ? `<div class="ud-tickets big">${(state.tickets[me] || []).map((a) => `<button class="udt-btn" data-discard="${a}">${ticketArt(state, a, '<i class="udt-act">버리기</i>')}</button>`).join('')}</div>` : ''}

        ${isPlayer ? `
          <div class="ud-mine">
            <div class="ud-mine-title">🎫 내 티켓 <small>나만 보여요 · 내 티켓 동물이 높은 순위를 하도록 하세요</small></div>
            <div class="ud-tickets">${(state.tickets[me] || []).map((a) => ticketArt(state, a)).join('')}
              ${state.tokensHeld[me] ? '<span class="udt dhk"><span class="udt-pic">🌑</span><span class="udt-info"><b>다크호스 토큰</b><small>3등 안 +5 / 아니면 −3</small></span></span>' : ''}</div>
          </div>
          <div class="ud-mine-title">🃏 내 액션카드 ${myHand.length}장 <small>${myTurn ? '카드를 골라 내세요' : '눌러서 설명 보기'}</small></div>
          <div class="ud-hand">
            ${myHand.map((c) => `<button class="ud-cardbtn ${ui.card === c.id ? 'sel' : ''}" data-card="${c.id}">${cardArt(c)}</button>`).join('')}
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
        ${scoreTable()}
      </div>`;

    animateTrack(el, state, room?.code);

    el.querySelectorAll('[data-card]').forEach((b) => (b.onclick = () => {
      const id = Number(b.dataset.card);
      ui.card = ui.card === id ? null : id;
      ui.key = key;
      const y = window.scrollY;
      this.render(el, ctx);
      window.scrollTo(0, y);
    }));
    el.querySelectorAll('[data-play]').forEach((b) => (b.onclick = () => sendMove({ type: 'play', card: ui.card, dir: b.dataset.play })));
    el.querySelectorAll('[data-self]').forEach((b) => (b.onclick = () => sendMove({ type: 'play', card: ui.card, mode: 'self', ticket: Number(b.dataset.self) })));
    el.querySelectorAll('[data-other]').forEach((b) => (b.onclick = () => sendMove({ type: 'play', card: ui.card, mode: 'other', target: b.dataset.other })));
    el.querySelectorAll('[data-discard]').forEach((b) => (b.onclick = () => sendMove({ type: 'discardTicket', ticket: Number(b.dataset.discard) })));
    const $tok = el.querySelector('[data-token]');
    if ($tok) $tok.onclick = () => sendMove({ type: 'token' });
  },
};
