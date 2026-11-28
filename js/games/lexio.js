// 보드게임: 렉시오 (3~5명) — 숫자 타일로 하는 클라이밍 게임
// 타일: 해·달·별·구름 4무늬 × 숫자 (3명 1~9 / 4명 1~13 / 5명 1~15), 3명 12개 · 4명 13개 · 5명 12개씩
// 숫자 순서: 3 < 4 < … < 최대 숫자 < 1 < 2 (2가 가장 강함) · 무늬 순서: ☀해 > 🌙달 > ⭐별 > ☁구름
// 족보: 싱글 · 페어 · 트리플 · 5장(스트레이트 < 플러시 < 풀하우스 < 포카드 < 스트레이트 플러시)
// 누가 다 털면 라운드 끝: 남은 타일 수 차이만큼 칩을 주고받아요 (2를 들고 있으면 2개마다 2배)
import { turnAlert } from './turn-alert.js';
import { GARNET } from '../profile.js';

export const SUITS = ['cloud', 'star', 'moon', 'sun']; // 약한 → 강한
const SUIT = {
  sun: { name: '해', color: '#ff5d5d' },
  moon: { name: '달', color: '#f5c842' },
  star: { name: '별', color: '#3fd98a' },
  cloud: { name: '구름', color: '#7fb4ff' },
};
const START_CHIPS = 100;
const handSize = (n) => (n === 4 ? 13 : 12);
export const maxNum = (n) => (n === 3 ? 9 : n === 4 ? 13 : 15);
export const rewardsFor = (n) => (n <= 3 ? [2, 1] : n === 4 ? [3, 2, 1] : [4, 3, 2, 1]);

export const tileOf = (id) => { const [s, num] = id.split('-'); return { id, suit: s, num: Number(num) }; };
export const deckFor = (n) => SUITS.flatMap((s) => Array.from({ length: maxNum(n) }, (_, i) => `${s}-${i + 1}`));
// 숫자 세기: 3 → 0 … N → N-3, 1 → N-2, 2 → N-1
export const rankVal = (num, N) => (num >= 3 ? num - 3 : num === 1 ? N - 2 : N - 1);
const suitVal = (s) => SUITS.indexOf(s);
export const tileKey = (id, N) => { const t = tileOf(id); return rankVal(t.num, N) * 4 + suitVal(t.suit); };

const TYPE_NAME = { 1: '스트레이트', 2: '플러시', 3: '풀하우스', 4: '포카드', 5: '스트레이트 플러시' };

// 낸 타일 분석 → { size, cat, key, name } (같은 장수끼리 key가 크면 이김)
export function analyze(ids, N) {
  if (!ids?.length || new Set(ids).size !== ids.length) return null;
  const ts = ids.map(tileOf);
  const n = ts.length;
  const top = Math.max(...ids.map((id) => tileKey(id, N)));
  const sameNum = ts.every((t) => t.num === ts[0].num);
  const label = (num) => String(num);
  if (n === 1) return { size: 1, cat: 0, key: top, name: `싱글 ${label(ts[0].num)}` };
  if (n === 2 && sameNum) return { size: 2, cat: 0, key: top, name: `페어 ${label(ts[0].num)}` };
  if (n === 3 && sameNum) return { size: 3, cat: 0, key: top, name: `트리플 ${label(ts[0].num)}` };
  if (n !== 5) return null;

  const nums = ts.map((t) => t.num).sort((a, b) => a - b);
  const cnt = {};
  nums.forEach((x) => (cnt[x] = (cnt[x] || 0) + 1));
  const groups = Object.entries(cnt).map(([k, v]) => [Number(k), v]).sort((a, b) => b[1] - a[1]);
  const flush = ts.every((t) => t.suit === ts[0].suit);
  // 스트레이트: 1~N에서 이어진 5개, 또는 (N-3, N-2, N-1, N, 1)
  let sv = -1;
  const distinct = groups.length === 5;
  if (distinct) {
    const s = nums.join(',');
    if (s === '1,2,3,4,5') sv = 1000;                 // 가장 강한 스트레이트
    else if (s === '2,3,4,5,6') sv = 999;             // 두 번째
    else if (s === [1, N - 3, N - 2, N - 1, N].join(',')) sv = 998; // 1을 맨 위로
    else if (nums[4] - nums[0] === 4) sv = nums[4];   // 나머지는 가장 큰 숫자로
  }
  const straight = sv >= 0;
  // 같은 스트레이트끼리는 가장 강한 타일의 무늬로
  const topSuit = suitVal(tileOf(ids.reduce((a, b) => (tileKey(a, N) > tileKey(b, N) ? a : b))).suit);
  let cat = 0, inner = 0;
  if (straight && flush) { cat = 5; inner = sv * 10 + topSuit; }
  else if (groups[0][1] === 4) { cat = 4; inner = rankVal(groups[0][0], N); }
  else if (groups[0][1] === 3 && groups[1][1] === 2) { cat = 3; inner = rankVal(groups[0][0], N); }
  else if (flush) { cat = 2; inner = top; }
  else if (straight) { cat = 1; inner = sv * 10 + topSuit; }
  else return null;
  return { size: 5, cat, key: cat * 100000 + inner, name: TYPE_NAME[cat] };
}
export const beats = (c, top) => !!c && (!top || (c.size === top.size && c.key > top.key));

// 라운드 정산: 타일이 많은 사람이 적은 사람에게 차이만큼 (2 한 개마다 2배)
export function settle(order, hands) {
  const pay = Object.fromEntries(order.map((u) => [u, 0]));
  const lines = [];
  order.forEach((a) => order.forEach((b) => {
    const ca = hands[a].length, cb = hands[b].length;
    if (ca <= cb) return;
    const twos = hands[a].filter((id) => tileOf(id).num === 2).length;
    const amt = (ca - cb) * 2 ** twos;
    pay[a] -= amt; pay[b] += amt;
    lines.push({ from: a, to: b, amt, twos });
  }));
  return { pay, lines };
}

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

function deal(state) {
  const n = state.order.length;
  const deck = shuffle(deckFor(n));
  const hands = {};
  state.order.forEach((u) => (hands[u] = deck.splice(0, handSize(n))));
  const lead = state.order.findIndex((u) => hands[u].includes('cloud-3')); // 구름 3을 가진 사람이 선
  return { ...state, phase: 'play', hands, turn: lead, top: null, last: null, passes: 0, lastPlay: null, roundLog: null };
}

function finalResult(state, players) {
  const rewards = rewardsFor(state.order.length);
  const ranking = state.order
    .map((uid) => ({ uid, score: state.chips[uid] }))
    .sort((a, b) => b.score - a.score)
    .map((r, _, all) => {
      const place = 1 + all.filter((o) => o.score > r.score).length;
      return { ...r, place, garnets: rewards[place - 1] || 0 };
    });
  const top = ranking.filter((r) => r.place === 1).map((r) => players[r.uid]?.name || '?');
  return {
    message: `${top.join(', ')}님 1등! 칩 ${ranking[0].score}개`,
    winners: ranking.filter((r) => r.place === 1).map((r) => r.uid),
    ranking,
    rewards: Object.fromEntries(ranking.map((r) => [r.uid, r.garnets])),
  };
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ── 타일 그림: 흑대리석 타일(img/tiles/lx-black.webp) + 무늬 문장(img/tiles/lx-*.webp) ──
export function tileHtml(id, size = '') {
  const t = tileOf(id);
  return `<span class="lx-tile ${size} s-${t.suit}" style="--lc:${SUIT[t.suit].color}"><b>${t.num}</b><img src="img/tiles/lx-${t.suit}.webp" alt="${SUIT[t.suit].name}" draggable="false" /></span>`;
}

let ui = { key: '', sel: [] };

export default {
  id: 'lexio',
  name: '렉시오',
  emoji: '🀄',
  category: 'board',
  minPlayers: 3,
  maxPlayers: 5,
  duration: '20~40분',
  rewards: [4, 3, 2, 1],
  rewardLabel: '1등 최대 +4',
  description: '숫자 타일 클라이밍! 먼저 다 털어라',
  options: [{ key: 'rounds', label: '라운드 수', choices: [1, 2, 3, 4, 5], default: 3 }],
  rules: [
    '타일: ☀해 · 🌙달 · ⭐별 · ☁구름 4가지 무늬 × 숫자. 3명은 1~9(12개씩), 4명은 1~13(13개씩), 5명은 1~15(12개씩) 받아요.',
    '숫자 순서: 3이 가장 약하고 4, 5 … 최대 숫자, 그다음 1, 그리고 2가 가장 강해요. 숫자가 같으면 ☀해 > 🌙달 > ⭐별 > ☁구름.',
    '☁구름 3을 가진 사람이 먼저 원하는 조합을 내요. 그다음 사람부터 같은 장수로 더 강한 조합을 내거나 패스해요.',
    '조합: 싱글(1장) · 페어(같은 숫자 2장) · 트리플(3장) · 5장 족보. 4장은 낼 수 없어요.',
    '5장 족보: 스트레이트 < 플러시 < 풀하우스 < 포카드(4장 + 아무 1장) < 스트레이트 플러시.',
    '스트레이트는 가장 큰 숫자로 비교해요. 단, 1·2·3·4·5가 가장 강하고 그다음이 2·3·4·5·6, 그다음이 (최대 숫자까지 이어진 4장)+1이에요.',
    '패스해도 다음 바퀴에 다시 낼 수 있어요. 나머지 모두가 이어서 패스하면 마지막으로 낸 사람이 새로 선이 돼요.',
    '누군가 타일을 다 내면 라운드 끝! 모든 사람이 서로 남은 타일 수 차이만큼 칩을 주고받아요. 2를 들고 있으면 2 한 개마다 2배씩 더 줘야 해요.',
    `모두 칩 ${START_CHIPS}개로 시작해요. 방장이 고른 라운드(1~5)를 모두 진행한 뒤 칩이 많은 순서로 순위를 정해요.`,
    '인장: 3명 → 1등 2 · 2등 1 / 4명 → 1등 3 · 2등 2 · 3등 1 / 5명 → 1등 4 · 2등 3 · 3등 2 · 4등 1',
  ],

  setup(players, room) {
    const order = shuffle(players.map((p) => p.uid));
    const rounds = [1, 2, 3, 4, 5].includes(Number(room?.options?.rounds)) ? Number(room.options.rounds) : 3;
    return deal({ order, N: maxNum(order.length), rounds, round: 1, chips: Object.fromEntries(order.map((u) => [u, START_CHIPS])), history: [] });
  },

  move(state, move, uid, players) {
    if (move?.type === 'tick') throw new Error('__noop');
    const idx = state.order.indexOf(uid);
    if (idx < 0) throw new Error('참가자가 아니에요');

    if (move.type === 'play') {
      if (state.phase !== 'play') throw new Error('지금은 낼 수 없어요');
      if (state.turn !== idx) throw new Error('내 차례가 아니에요');
      const hand = state.hands[uid];
      const cards = move.cards || [];
      if (!cards.length || !cards.every((c) => hand.includes(c))) throw new Error('가지고 있는 타일을 골라 주세요');
      const combo = analyze(cards, state.N);
      if (!combo) throw new Error('낼 수 없는 조합이에요 (1·2·3·5장만)');
      if (state.top && combo.size !== state.top.size) throw new Error(`바닥과 같은 ${state.top.size}장을 내야 해요`);
      if (!beats(combo, state.top)) throw new Error('바닥보다 강한 조합을 내야 해요');
      const hands = { ...state.hands, [uid]: hand.filter((c) => !cards.includes(c)) };
      let s = { ...state, hands, top: combo, last: uid, passes: 0, lastPlay: { uid, cards, name: combo.name } };
      if (!hands[uid].length) {
        // 라운드 끝 → 정산
        const { pay, lines } = settle(s.order, hands);
        const chips = Object.fromEntries(s.order.map((u) => [u, s.chips[u] + pay[u]]));
        const log = { round: s.round, winner: uid, left: Object.fromEntries(s.order.map((u) => [u, hands[u].length])), twos: Object.fromEntries(s.order.map((u) => [u, hands[u].filter((c) => tileOf(c).num === 2).length])), pay, lines };
        s = { ...s, chips, history: [...s.history, log], roundLog: log, phase: 'roundEnd', turn: -1 };
        if (s.round >= s.rounds) { // 정한 라운드를 모두 마치면 끝
          const done = { ...s, phase: 'done' };
          return { state: done, result: finalResult(done, players) };
        }
        return { state: s };
      }
      s.turn = (idx + 1) % s.order.length;
      return { state: s };
    }

    if (move.type === 'pass') {
      if (state.phase !== 'play' || state.turn !== idx) throw new Error('내 차례가 아니에요');
      if (!state.top) throw new Error('선은 패스할 수 없어요');
      const passes = state.passes + 1;
      if (passes >= state.order.length - 1) {
        // 나머지 모두 패스 → 마지막으로 낸 사람이 새 선
        return { state: { ...state, top: null, passes: 0, turn: state.order.indexOf(state.last), lastPlay: { ...state.lastPlay, cleared: true } } };
      }
      return { state: { ...state, passes, turn: (idx + 1) % state.order.length } };
    }

    if (move.type === 'next') {
      if (state.phase !== 'roundEnd') throw new Error('__noop');
      return { state: deal({ ...state, round: state.round + 1 }) };
    }
    throw new Error('알 수 없는 동작이에요');
  },

  render(el, ctx) {
    const { state, me, players, finished, sendMove, room } = ctx;
    const name = (u) => esc(players[u]?.name || '나간 사람');
    const isPlayer = state.order.includes(me);
    const N = state.N;
    const turnUid = state.turn >= 0 ? state.order[state.turn] : null;
    const myTurn = state.phase === 'play' && turnUid === me;
    turnAlert(room?.code, `lx:${state.round}:${Object.values(state.hands).map((h) => h.length).join()}:${state.passes}:${state.turn}`, myTurn && !finished);
    const key = `${room?.code}:${state.round}:${(state.hands[me] || []).length}:${state.last}:${state.passes}`;
    if (ui.key !== key) ui = { key, sel: [] };

    const chipsTable = (withRound) => `
      <table class="sk-table lx-table">
        <thead><tr><th>플레이어</th><th>타일</th>${withRound ? '<th>정산</th>' : ''}<th>칩</th></tr></thead>
        <tbody>${state.order.map((u) => {
          const lg = state.roundLog;
          const left = withRound ? lg.left[u] : (state.hands[u] || []).length;
          return `<tr class="${u === me ? 'me' : ''} ${u === turnUid ? 'turn' : ''}">
            <td>${u === turnUid ? '▶ ' : ''}${name(u)}</td>
            <td>${left}${withRound && lg.twos[u] ? `<small> (2 × ${lg.twos[u]})</small>` : ''}</td>
            ${withRound ? `<td class="${lg.pay[u] >= 0 ? 'up' : 'dn'}">${lg.pay[u] > 0 ? '+' : ''}${lg.pay[u]}</td>` : ''}
            <td><b>${state.chips[u]}</b></td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;

    if (finished) {
      const ranking = room?.result?.ranking || finalResult(state, players).ranking;
      el.innerHTML = `
        <div class="lx">
          <div class="dm-title" style="color:var(--gold)">🀄 최종 순위</div>
          <ol class="nb-final">
            ${ranking.map((r) => `<li class="${r.uid === me ? 'me' : ''}">
              <span class="nb-place">${r.place <= 3 ? ['🥇', '🥈', '🥉'][r.place - 1] : r.place + '등'}</span>
              <span class="nb-name">${name(r.uid)}</span>
              <span class="nb-score">칩 ${r.score}</span>
              <span class="nb-reward">${r.garnets ? `${GARNET}+${r.garnets}` : ''}</span>
              <div class="sk-hist">${state.history.map((h) => `<span class="${h.pay[r.uid] >= 0 ? 'up' : 'dn'}">R${h.round} 남은 ${h.left[r.uid]}개 <b>${h.pay[r.uid] > 0 ? '+' : ''}${h.pay[r.uid]}</b></span>`).join('')}</div>
            </li>`).join('')}
          </ol>
        </div>`;
      return;
    }

    const rankSort = (ids) => [...ids].sort((a, b) => tileKey(a, N) - tileKey(b, N));
    const hand = rankSort(state.hands[me] || []);
    const combo = analyze(ui.sel, N);
    const ok = myTurn && combo && beats(combo, state.top);

    let banner, action = '';
    if (state.phase === 'roundEnd') {
      const lg = state.roundLog;
      banner = `<span><b>${name(lg.winner)}</b>님이 타일을 다 냈어요! ${lg.round}라운드 끝</span>`;
      action = `<div class="lx-lines">${lg.lines.length ? lg.lines.map((l) => `<span>${name(l.from)} → ${name(l.to)} <b>${l.amt}</b>${l.twos ? ` <small>(2가 ${l.twos}개라 ×${2 ** l.twos})</small>` : ''}</span>`).join('') : '<span>주고받을 칩이 없어요</span>'}</div>
        <button class="btn primary block" data-next>다음 라운드 (${state.round + 1}/${state.rounds}) ▶</button>`;
    } else {
      banner = myTurn
        ? `<span><b>내 차례!</b> ${state.top ? `${state.top.size}장 · ${esc(state.top.name)}보다 강하게 내거나 패스` : '선이에요. 원하는 조합을 내세요'}</span>`
        : `<span><b>${name(turnUid)}</b>님 차례</span>`;
      if (isPlayer) action = `
        <div class="tc-preview">${ui.sel.length ? (combo ? `${esc(combo.name)}${myTurn && !ok ? ' · <span class="dn">지금은 못 내요</span>' : ''}` : '<span class="dn">족보가 아니에요 (1·2·3·5장)</span>') : '<span class="muted">낼 타일을 눌러 고르세요</span>'}</div>
        <div class="tc-acts">
          <button class="btn primary" data-play ${ok ? '' : 'disabled'}>내기</button>
          <button class="btn" data-pass ${myTurn && state.top ? '' : 'disabled'}>패스</button>
        </div>`;
    }

    const lp = state.lastPlay;
    el.innerHTML = `
      <div class="lx">
        <div class="sk-head"><span class="sk-round">${state.round}<small>/${state.rounds}라운드</small></span><span class="sk-cards">${state.order.length}명 · 숫자 1~${N}</span></div>
        ${chipsTable(state.phase === 'roundEnd')}
        <div class="lx-floor">
          ${lp ? `<div class="lx-floor-tiles ${lp.cleared ? 'cleared' : ''}">${lp.cards.map((c) => tileHtml(c)).join('')}</div>
            <div class="tc-floor-t"><b>${name(lp.uid)}</b> · ${esc(lp.name)}${lp.cleared ? ' · <span class="gold">모두 패스! 새 선</span>' : state.passes ? ` · 패스 ${state.passes}명` : ''}</div>`
            : '<div class="tc-floor-t">☁구름 3을 가진 사람부터 시작해요</div>'}
        </div>
        <div class="nb-banner">${banner}</div>
        ${action}
        ${isPlayer && hand.length && state.phase === 'play' ? `
          <div class="ud-mine-title">🀄 내 타일 ${hand.length}개</div>
          <div class="lx-hand">${hand.map((c) => `<button class="lx-btn ${ui.sel.includes(c) ? 'sel' : ''}" data-c="${c}">${tileHtml(c)}</button>`).join('')}</div>` : ''}
        ${guideHtml(N)}
      </div>`;

    el.querySelectorAll('[data-c]').forEach((b) => (b.onclick = () => {
      const c = b.dataset.c;
      ui.sel = ui.sel.includes(c) ? ui.sel.filter((x) => x !== c) : [...ui.sel, c];
      ui.key = key;
      const y = window.scrollY; this.render(el, ctx); window.scrollTo(0, y);
    }));
    el.querySelector('[data-play]')?.addEventListener('click', () => sendMove({ type: 'play', cards: ui.sel }));
    el.querySelector('[data-pass]')?.addEventListener('click', () => sendMove({ type: 'pass' }));
    el.querySelector('[data-next]')?.addEventListener('click', () => sendMove({ type: 'next' }));
    const $g = el.querySelector('.tc-guide');
    if ($g) $g.ontoggle = () => (guideOpen = $g.open);
  },
};

let guideOpen = false;
function guideHtml(N) {
  const ex = (...ids) => `<span class="tc-ex">${ids.map((c) => tileHtml(c, 'xs')).join('')}</span>`;
  const order = [...Array.from({ length: N - 2 }, (_, i) => i + 3), 1, 2];
  return `<details class="tc-guide" ${guideOpen ? 'open' : ''}><summary>📜 족보 · 이기는 순서</summary>
    <div class="tc-gsec"><div class="tc-gt">숫자 순서 (약함 → 강함)</div><div class="tc-order">${order.join(' < ')}</div></div>
    <div class="tc-gsec"><div class="tc-gt">무늬 순서 (숫자가 같을 때)</div><div class="tc-order">☁구름 < ⭐별 < 🌙달 < ☀해</div></div>
    <div class="tc-gsec"><div class="tc-gt">족보 <small>바닥과 같은 장수로 더 강해야 이겨요 · 4장은 낼 수 없어요</small></div>
      <div class="tc-grow"><b>싱글</b><span>타일 1개</span>${ex('sun-7')}</div>
      <div class="tc-grow"><b>페어</b><span>같은 숫자 2개</span>${ex('star-5', 'moon-5')}</div>
      <div class="tc-grow"><b>트리플</b><span>같은 숫자 3개</span>${ex('cloud-8', 'star-8', 'sun-8')}</div>
    </div>
    <div class="tc-gsec bomb"><div class="tc-gt">5장 족보 <small>아래로 갈수록 강해요</small></div>
      <div class="tc-grow"><b>스트레이트</b><span>이어진 숫자 5개. 가장 강한 건 1·2·3·4·5, 그다음 2·3·4·5·6</span>${ex('star-3', 'sun-4', 'cloud-5', 'moon-6', 'star-7')}</div>
      <div class="tc-grow"><b>플러시</b><span>같은 무늬 5개 · 가장 강한 타일로 비교</span>${ex('moon-3', 'moon-6', 'moon-8', 'moon-9', 'moon-1')}</div>
      <div class="tc-grow"><b>풀하우스</b><span>트리플 + 페어 · 트리플 숫자로 비교</span>${ex('sun-4', 'star-4', 'cloud-4', 'moon-9', 'sun-9')}</div>
      <div class="tc-grow"><b>포카드</b><span>같은 숫자 4개 + 아무 1개</span>${ex('sun-6', 'moon-6', 'star-6', 'cloud-6', 'sun-3')}</div>
      <div class="tc-grow"><b>스트레이트 플러시</b><span>같은 무늬로 이어진 5개 · 가장 강해요</span>${ex('sun-4', 'sun-5', 'sun-6', 'sun-7', 'sun-8')}</div>
    </div>
    <div class="tc-gsec"><div class="tc-gt">칩 정산</div><div class="tc-gnote">라운드가 끝나면 모든 사람이 서로 남은 타일 수 차이만큼 칩을 주고받아요. 2를 들고 있으면 2 한 개마다 2배 (2개면 4배)!</div></div>
  </details>`;
}
