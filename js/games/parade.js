// 보드게임: 퍼레이드 (2~6명) — 행렬 끝에 카드를 내고, 빠져나온 카드를 가져가요. 점수가 낮을수록 승리!
// 카드 66장: 6색 × 0~10. id = 색 글자 + 숫자 (예: r7)
import { turnAlert, bigFlash } from './turn-alert.js';
import { faceHtml } from './face.js';
import { sfxCard } from '../sound.js';
import { chatFormHtml, bindChat } from './sit.js';

export const COLORS = {
  r: { name: '빨강 북', color: '#e0384a', icon: '🥁' },
  y: { name: '노랑 나팔', color: '#f2b821', icon: '🎺' },
  g: { name: '초록 풍선', color: '#2fae5f', icon: '🎈' },
  b: { name: '파랑 별', color: '#2f7fe0', icon: '⭐' },
  p: { name: '보라 깃발', color: '#8a4fd8', icon: '🚩' },
  k: { name: '검정 모자', color: '#3a3a46', icon: '🎩' },
};
const CK = Object.keys(COLORS);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const col = (id) => id[0];
const val = (id) => Number(id.slice(1));
const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const rewardsFor = (n) => (n === 2 ? [1] : n <= 4 ? [2, 1] : [3, 2, 1]);

// 카드를 냈을 때 행렬에서 빠져나오는 카드 (index 목록)
export function takenBy(parade, card) {
  const v = val(card), c = col(card);
  const open = parade.length - v; // 앞쪽 open장만 대상 (뒤쪽 v장은 안전)
  const out = [];
  for (let i = 0; i < open; i++) if (col(parade[i]) === c || val(parade[i]) <= v) out.push(i);
  return out;
}

// 점수: 색마다 가장 많이 모은 사람은 그 색 카드 1장당 1점, 나머지는 숫자 그대로 (2명은 2장 이상 많아야 다수)
export function scoreAll(state) {
  const n = state.order.length;
  const res = Object.fromEntries(state.order.map((u) => [u, { pts: 0, cards: state.coll[u].length, major: [] }]));
  for (const c of CK) {
    const cnt = Object.fromEntries(state.order.map((u) => [u, state.coll[u].filter((x) => col(x) === c).length]));
    const max = Math.max(...Object.values(cnt));
    for (const u of state.order) {
      let major = max > 0 && cnt[u] === max;
      if (n === 2 && major) { const other = state.order.find((o) => o !== u); major = cnt[u] - cnt[other] >= 2; }
      const cards = state.coll[u].filter((x) => col(x) === c);
      if (major) { res[u].pts += cards.length; res[u].major.push(c); } else res[u].pts += cards.reduce((s, x) => s + val(x), 0);
    }
  }
  return res;
}

function finalResult(state, players) {
  const sc = scoreAll(state);
  const rewards = rewardsFor(state.order.length);
  const key = (u) => sc[u].pts * 1000 + sc[u].cards;
  const ranking = state.order
    .map((uid) => ({ uid, score: sc[uid].pts, cards: sc[uid].cards }))
    .sort((a, b) => key(a.uid) - key(b.uid))
    .map((r, _, all) => {
      const place = 1 + all.filter((o) => key(o.uid) < key(r.uid)).length;
      return { ...r, place, garnets: rewards[place - 1] || 0 };
    });
  const top = ranking.filter((r) => r.place === 1);
  return {
    message: `${top.map((r) => players[r.uid]?.name || '?').join(', ')}님 승리! 🎪 (${top[0].score}점)`,
    winners: top.map((r) => r.uid),
    ranking,
    rewards: Object.fromEntries(ranking.map((r) => [r.uid, r.garnets])),
  };
}

export function cardHtml(id, { small = false, cls = '' } = {}) {
  const c = COLORS[col(id)], v = val(id);
  return `<div class="pdc ${small ? 'sm' : ''} ${cls}" style="--pc:${c.color}" title="${c.name} ${v}">
    <b class="pdc-n l">${v}</b><span class="pdc-ic">${c.icon}</span><b class="pdc-n r">${v}</b></div>`;
}

const ui = { key: '', sel: null, picks: [] };
const fx = { n: -1, anim: '' };

export default {
  id: 'parade',
  name: '퍼레이드',
  emoji: '🎪',
  category: 'board',
  minPlayers: 2,
  maxPlayers: 6,
  duration: '20~30분',
  rewards: [3, 2, 1],
  rewardLabel: '1등 최대 +3',
  description: '행렬에서 카드를 최대한 적게 가져가라! 점수가 낮을수록 승리',
  rules: [
    '카드는 6색 × 0~10, 모두 66장. 각자 5장을 받고, 가운데에 6장을 늘어놓아 퍼레이드 행렬을 만들어요.',
    '내 차례에는 카드 1장을 행렬 맨 끝에 내요. 낸 카드의 숫자만큼, 끝에서부터 그 장수의 카드는 안전해요.',
    '안전하지 않은 앞쪽 카드 중에서 낸 카드와 색이 같거나, 숫자가 같거나 작은 카드는 모두 내가 가져가요.',
    '그다음 카드 1장을 뽑아요. 가져간 카드는 색별로 내 앞에 쌓여요.',
    '누군가 6색을 모두 모으거나 더미가 다 떨어지면, 모두 한 번씩 더 내고(뽑지 않아요) 게임이 끝나요.',
    '끝나면 손에 남은 4장 중 2장을 골라 내 카드에 더하고, 나머지 2장은 버려요.',
    '점수: 색마다 가장 많이 모은 사람은 그 색 카드를 1장당 1점, 나머지는 적힌 숫자 그대로 더해요. (2명이면 상대보다 2장 이상 많아야 해요)',
    '점수가 가장 낮은 사람이 승리! 같으면 카드가 적은 사람이 이겨요.',
    '가넷: 2명 → 1등 1개 / 3~4명 → 1등 2개, 2등 1개 / 5~6명 → 1등 3개, 2등 2개, 3등 1개',
  ],

  setup(players) {
    const order = players.map((p) => p.uid);
    const deck = shuffle(CK.flatMap((c) => Array.from({ length: 11 }, (_, v) => c + v)));
    const hands = {};
    for (const u of order) hands[u] = deck.splice(0, 5);
    const parade = deck.splice(0, 6);
    return {
      order, hands, deck, parade, coll: Object.fromEntries(order.map((u) => [u, []])),
      turnIdx: 0, phase: 'play', lastLeft: 0, picks: Object.fromEntries(order.map((u) => [u, null])), n: 0, log: null,
    };
  },

  move(state, move, uid, players) {
    if (!state.order.includes(uid)) throw new Error('참가자가 아니에요');
    if (state.phase === 'pick') {
      if (move?.type !== 'pick') throw new Error('__noop');
      const cards = move.cards || [];
      if (cards.length !== 2 || cards[0] === cards[1] || !cards.every((c) => state.hands[uid].includes(c))) throw new Error('손에서 2장을 골라 주세요');
      const picks = { ...state.picks, [uid]: cards };
      let s = { ...state, picks };
      if (state.order.every((u) => picks[u])) {
        const coll = Object.fromEntries(state.order.map((u) => [u, [...state.coll[u], ...picks[u]]]));
        s = { ...s, coll, phase: 'done' };
        return { state: s, result: finalResult(s, players) };
      }
      return { state: s };
    }
    if (move?.type !== 'play') throw new Error('__noop');
    if (state.order[state.turnIdx] !== uid) throw new Error('내 차례가 아니에요');
    const card = move.card;
    if (!state.hands[uid].includes(card)) throw new Error('손에 없는 카드예요');
    const takenIdx = takenBy(state.parade, card);
    const taken = takenIdx.map((i) => state.parade[i]);
    const parade = [...state.parade.filter((_, i) => !takenIdx.includes(i)), card];
    const coll = { ...state.coll, [uid]: [...state.coll[uid], ...taken] };
    let hand = state.hands[uid].filter((c) => c !== card);
    let deck = state.deck;
    let { phase, lastLeft } = state;
    if (phase === 'play') {
      if (deck.length) { hand = [...hand, deck[0]]; deck = deck.slice(1); }
      const all6 = new Set(coll[uid].map(col)).size === CK.length;
      if (all6 || !deck.length) { phase = 'last'; lastLeft = state.order.length; }
    } else lastLeft -= 1;
    if (phase === 'last' && lastLeft === 0) phase = 'pick';
    const s = {
      ...state, parade, coll, deck, phase, lastLeft, hands: { ...state.hands, [uid]: hand },
      turnIdx: (state.turnIdx + 1) % state.order.length, n: state.n + 1,
      log: { uid, card, taken, trigger: phase !== state.phase && phase === 'last' ? (deck.length ? 'six' : 'deck') : null },
    };
    return { state: s };
  },

  render(el, ctx) {
    const { state, me, players, finished, sendMove, room } = ctx;
    const name = (u) => esc(players[u]?.name || '나간 사람');
    const isPlayer = state.order.includes(me);
    const turnUid = state.order[state.turnIdx];
    const myTurn = !finished && isPlayer && ['play', 'last'].includes(state.phase) && turnUid === me;
    const k = `${room?.code}:${room?.startedAt}:${state.n}:${state.phase}`;
    if (ui.key !== k) { ui.key = k; ui.sel = null; if (state.phase !== 'pick') ui.picks = []; }
    if (room && !finished) turnAlert(room.code, `pd:${room.startedAt}:${state.n}:${state.phase}`, myTurn || (state.phase === 'pick' && isPlayer && !state.picks[me]));
    if (fx.n !== state.n) {
      if (fx.n >= 0 && state.n > fx.n && state.log) {
        sfxCard();
        const L = state.log;
        if (L.trigger) bigFlash(`<div class="pd-flash">🎪 마지막 행진!<small>${L.trigger === 'six' ? `${name(L.uid)}님이 6색을 모았어요` : '카드 더미가 다 떨어졌어요'} · 모두 한 번씩 더!</small></div>`, 2400);
      }
      fx.n = state.n;
    }

    const myHand = state.hands[me] || [];
    const preview = ui.sel ? new Set(takenBy(state.parade, ui.sel)) : null;
    const safeFrom = ui.sel ? state.parade.length - val(ui.sel) : Infinity;
    const L = state.log;
    const sc = state.phase === 'done' || finished ? scoreAll(state) : null;

    const collHtml = (u, big) => {
      const cs = state.coll[u];
      if (!cs.length) return '<span class="pd-none">아직 없음</span>';
      return CK.filter((c) => cs.some((x) => col(x) === c)).map((c) => {
        const xs = cs.filter((x) => col(x) === c).sort((a, b) => val(a) - val(b));
        return big
          ? `<div class="pd-stack">${xs.map((x) => cardHtml(x, { small: true })).join('')}</div>`
          : `<span class="pd-chip" style="--pc:${COLORS[c].color}">${COLORS[c].icon}<b>${xs.length}</b><small>${xs.reduce((s, x) => s + val(x), 0)}</small></span>`;
      }).join('');
    };
    const others = state.order.filter((u) => u !== me);
    const seats = others.map((u) => `<div class="pd-op ${u === turnUid && !finished && state.phase !== 'pick' ? 'turn' : ''}">
        <span class="seat-bubble" data-bub="${esc(u)}"></span>
        <span class="pd-face">${faceHtml(players[u] || { name: '?' })}</span>
        <div class="pd-opi"><b>${name(u)}</b><small>손 ${state.hands[u].length}장 · 모은 ${state.coll[u].length}장${state.phase === 'pick' ? (state.picks[u] ? ' · ✓ 골랐어요' : ' · 고르는 중…') : ''}</small>
          <div class="pd-chips">${collHtml(u, false)}</div></div>
      </div>`).join('');

    let banner;
    if (finished || state.phase === 'done') banner = '🎪 퍼레이드 끝! 결과를 확인하세요';
    else if (state.phase === 'pick') banner = state.picks[me] ? '고르기 완료! 다른 사람을 기다리는 중…' : `<b>손에 남은 카드 중 2장</b>을 골라 내 카드에 더해요 <small class="muted">(나머지 2장은 버려요)</small>`;
    else if (myTurn) banner = ui.sel ? `<b>${COLORS[col(ui.sel)].name} ${val(ui.sel)}</b> → <b class="red">${preview.size}장</b>을 가져가요` : `<b>내 차례!</b> 낼 카드를 고르세요${state.phase === 'last' ? ' <small class="muted">· 마지막 행진 (뽑지 않아요)</small>' : ''}`;
    else banner = `<b>${name(turnUid)}</b>님 차례${state.phase === 'last' ? ' · 마지막 행진' : ''}`;

    el.innerHTML = `
      <div class="pd">
        <div class="pd-head"><span>🃏 더미 <b>${state.deck.length}</b>장</span>${state.phase === 'last' ? `<span class="pd-last">🎪 마지막 행진 · 남은 차례 ${state.lastLeft}</span>` : ''}<span>🎪 행렬 <b>${state.parade.length}</b>장</span></div>
        <div class="pd-ops">${seats}</div>
        <div class="nb-banner"><span>${banner}</span></div>
        <div class="pd-road">
          <div class="pd-line">${state.parade.map((x, i) => {
            const cls = preview ? (preview.has(i) ? 'take' : i >= safeFrom ? 'safe' : 'stay') : (L && i === state.parade.length - 1 && !finished ? 'new' : '');
            return `<div class="pd-slot ${cls}">${cardHtml(x)}</div>`;
          }).join('')}${ui.sel ? `<div class="pd-slot ghost">${cardHtml(ui.sel)}</div>` : ''}</div>
          <div class="pd-flow">← 행렬 앞 · · · 맨 끝 →</div>
        </div>
        ${L && !ui.sel ? `<div class="pd-log"><b>${name(L.uid)}</b>님이 ${cardHtml(L.card, { small: true })} 를 내고 ${L.taken.length ? `<span class="pd-took">${L.taken.map((x) => cardHtml(x, { small: true })).join('')}</span> ${L.taken.length}장을 가져갔어요` : '하나도 가져가지 않았어요 👏'}</div>` : ''}
        ${isPlayer ? `
          <div class="pd-mine">
            <span class="seat-bubble" data-bub="${esc(me)}"></span>
            <span class="pd-face me">${faceHtml(players[me] || { name: '?' })}</span>
            <div class="ud-mine-title">🎒 내가 모은 카드 ${state.coll[me].length}장 ${sc ? `· <b>${sc[me].pts}점</b>` : ''}</div>
            <div class="pd-mycoll">${collHtml(me, true)}</div>
          </div>
          ${myHand.length && state.phase !== 'done' && !finished ? `
            <div class="ud-mine-title">✋ 내 손 ${myHand.length}장</div>
            <div class="pd-hand">${myHand.map((x) => {
              const on = state.phase === 'pick' ? ui.picks.includes(x) || (state.picks[me] || []).includes(x) : ui.sel === x;
              return `<button class="pd-cardbtn ${on ? 'on' : ''}" data-card="${x}" ${(!myTurn && state.phase !== 'pick') || state.picks[me] ? 'disabled' : ''}>${cardHtml(x)}</button>`;
            }).join('')}</div>
            ${myTurn ? `<button class="btn primary block" data-play ${ui.sel ? '' : 'disabled'}>${ui.sel ? `🎪 행렬에 내기 (${preview.size}장 가져감)` : '카드를 먼저 고르세요'}</button>` : ''}
            ${state.phase === 'pick' && !state.picks[me] ? `<button class="btn primary block" data-pick ${ui.picks.length === 2 ? '' : 'disabled'}>${ui.picks.length === 2 ? '이 2장으로 확정' : `2장을 골라 주세요 (${ui.picks.length}/2)`}</button>` : ''}
          ` : ''}
          ${chatFormHtml()}` : ''}
        ${sc ? `<div class="pd-score">${state.order.map((u) => `<div><b>${name(u)}</b> ${sc[u].pts}점 <small>(${sc[u].cards}장${sc[u].major.length ? ` · 다수 ${sc[u].major.map((c) => COLORS[c].icon).join('')}` : ''})</small></div>`).join('')}</div>` : ''}
      </div>`;

    el.querySelectorAll('[data-card]').forEach((b) => (b.onclick = () => {
      const x = b.dataset.card;
      if (state.phase === 'pick') {
        ui.picks = ui.picks.includes(x) ? ui.picks.filter((y) => y !== x) : [...ui.picks, x].slice(-2);
      } else if (myTurn) ui.sel = ui.sel === x ? null : x;
      this.render(el, ctx);
    }));
    const $play = el.querySelector('[data-play]');
    if ($play) $play.onclick = () => { if (ui.sel) { const c = ui.sel; ui.sel = null; sendMove({ type: 'play', card: c }); } };
    const $pick = el.querySelector('[data-pick]');
    if ($pick) $pick.onclick = () => sendMove({ type: 'pick', cards: ui.picks });
    bindChat(el);
    // 새로 낸 카드는 손에서 날아오듯
    if (fx.anim !== k) fx.anim = k, el.querySelector('.pd-slot.new')?.animate([{ transform: 'translateY(60px) scale(.6)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.3,.7,.3,1)' });
  },
};
