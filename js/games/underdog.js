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
  if (c.kind === 'num') {
    return `<div class="udc k-num" style="--c1:${NUM_COLOR[c.animal]}">
      <span class="udc-pic">${animalSvg(c.animal)}</span>
      <span class="udc-mv">${arrows(c.steps)}</span>
      <span class="udc-name">${esc(animalLabel(c.animal))}</span></div>`;
  }
  if (c.kind === 'pair') {
    return `<div class="udc k-pair" style="--c1:${NUM_COLOR[c.a]};--c2:${NUM_COLOR[c.b]}">
      <span class="udc-pic two">${animalSvg(c.a)}${animalSvg(c.b)}</span>
      <span class="udc-mv">${arrows(1)}</span>
      <span class="udc-name">${ANIMALS[c.a].name}·${ANIMALS[c.b].name} 함께</span></div>`;
  }
  if (c.kind === 'pos') {
    return `<div class="udc k-pos">
      <span class="udc-pic">${medalSvg(c.pos)}</span>
      ${miniTrack(c.pos)}
      <span class="udc-mv">${arrows(c.steps)}</span>
      <span class="udc-name">${c.pos}등 말 ${c.steps}칸</span></div>`;
  }
  if (c.kind === 'fall') {
    return `<div class="udc k-fall">
      <span class="udc-pic">${fallSvg(c.pos)}</span>
      ${miniTrack(c.pos, true)}
      <span class="udc-mv"><span class="b">${c.pos}등 ➜ 꼴찌</span></span>
      <span class="udc-name">${c.pos}등 말 낙마!</span></div>`;
  }
  return `<div class="udc k-ticket">
    <span class="udc-pic">${swapSvg()}</span>
    <span class="udc-mv"><em>나 또는 상대</em></span>
    <span class="udc-name">티켓 교환</span></div>`;
}

// 카드 그림: 등수 메달 / 낙마 / 티켓 교환
const MEDAL = { 1: ['#ffd84d', '#c99412'], 2: ['#e3e7ee', '#9aa3ad'], 3: ['#e5a066', '#a8642c'] };
function medalSvg(pos) {
  const [f, d] = MEDAL[pos] || ['#8fb8ff', '#3b5fb0'];
  return `<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
    <path d="M44 4 l14 34 l-12 4 l-16 -34 z" fill="#d64545"/><path d="M76 4 l-14 34 l12 4 l16 -34 z" fill="#2f6fd6"/>
    <circle cx="60" cy="56" r="28" fill="${d}"/><circle cx="60" cy="56" r="22" fill="${f}" stroke="#fff" stroke-width="2"/>
    <text x="60" y="66" text-anchor="middle" font-family="'Black Han Sans', sans-serif" font-size="28" fill="#2b1d12">${pos}<tspan font-size="14">등</tspan></text>
  </svg>`;
}
function fallSvg(pos) {
  return `<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
    <g stroke="#2b1d12" stroke-width="2" stroke-linejoin="round">
      <rect x="18" y="52" width="6" height="30" fill="#fff"/><rect x="96" y="52" width="6" height="30" fill="#fff"/>
      <rect x="14" y="48" width="92" height="9" rx="2" fill="#fff"/>
      <path d="M14 48 h14 v9 h-14 z M42 48 h14 v9 h-14 z M70 48 h14 v9 h-14 z M98 48 h8 v9 h-8 z" fill="#d64545"/>
      <path d="M60 4 l6 14 l15 -6 l-7 14 l15 4 l-14 6 l8 12 l-15 -4 l-4 14 l-6 -13 l-11 9 l1 -14 l-15 0 l11 -10 l-10 -11 l15 2 z" fill="#ffd84d"/>
    </g>
    <text x="60" y="35" text-anchor="middle" font-family="'Black Han Sans', sans-serif" font-size="13" fill="#c81d38">낙마</text>
    <g fill="#cbb08a" opacity=".9"><circle cx="30" cy="84" r="6"/><circle cx="44" cy="86" r="5"/><circle cx="78" cy="86" r="5"/><circle cx="90" cy="84" r="6"/></g>
  </svg>`;
}
function swapSvg() {
  const tk = (x, y, r, c) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-22" y="-14" width="44" height="28" rx="4" fill="${c}" stroke="#2b1d12" stroke-width="2"/><path d="M-10 -14 v28" stroke="#2b1d12" stroke-width="1.5" stroke-dasharray="3 3"/><circle cx="6" cy="0" r="7" fill="#fff" stroke="#2b1d12" stroke-width="1.5"/><text x="6" y="4" text-anchor="middle" font-family="'Black Han Sans', sans-serif" font-size="10" fill="#2b1d12">?</text></g>`;
  return `<svg viewBox="0 0 120 90" xmlns="http://www.w3.org/2000/svg">
    ${tk(38, 36, -12, '#ffd84d')}${tk(82, 54, 10, '#ff8fb8')}
    <path d="M60 14 q30 -4 34 22" fill="none" stroke="#2f6fd6" stroke-width="4" stroke-linecap="round"/><path d="M88 32 l6 8 l5 -10 z" fill="#2f6fd6"/>
    <path d="M60 78 q-30 4 -34 -22" fill="none" stroke="#d64545" stroke-width="4" stroke-linecap="round"/><path d="M32 60 l-6 -8 l-5 10 z" fill="#d64545"/>
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
