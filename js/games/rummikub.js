// 미니게임: 루미큐브 (2~4명)
// 타일 106개 (1~13 × 4색 × 2벌 + 조커 2), 각자 14개로 시작.
// 같은 숫자·다른 색 3~4개(그룹) 또는 같은 색·연속 숫자 3개 이상(런)을 내려놓아요. 첫 등록은 내 타일로만 30점 이상.
// 등록한 뒤에는 바닥의 타일도 자유롭게 옮겨 새 조합을 만들 수 있어요. 손 타일을 먼저 다 내려놓으면 승리!
import { GARNET } from '../profile.js';
import { soundEvent } from '../sound.js';
import { turnAlert } from './turn-alert.js';

export const COLORS = { r: { name: '빨강', hex: '#e0303e' }, b: { name: '파랑', hex: '#1f6fd6' }, y: { name: '주황', hex: '#e8961a' }, k: { name: '검정', hex: '#1e1e28' } };
const CK = ['r', 'b', 'y', 'k'];
const START = 14;
const FIRST = 30;
const JOKER_PENALTY = 30;
export const rewardsFor = (n) => Array.from({ length: n }, (_, i) => n - i);

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
// 타일 id: 'r7a' (색·숫자·벌) / 'J1', 'J2' (조커)
export const isJ = (id) => id[0] === 'J';
export const colorOf = (id) => id[0];
export const numOf = (id) => Number(id.slice(1, -1));
const tileValue = (id) => (isJ(id) ? JOKER_PENALTY : numOf(id));
export const rackSum = (rack) => rack.reduce((a, t) => a + tileValue(t), 0);

// ── 조합 판정: { ok, kind, order(보여 줄 순서), value(점수) } ──
export function analyze(tiles) {
  const n = tiles.length;
  if (n < 3) return { ok: false, why: '3개 이상이어야 해요' };
  const real = tiles.filter((t) => !isJ(t));
  const jokers = tiles.filter(isJ);
  if (!real.length) return { ok: true, kind: 'run', order: tiles, value: 0 };
  // 그룹: 같은 숫자, 다른 색, 3~4개
  const num0 = numOf(real[0]);
  if (n <= 4 && real.every((t) => numOf(t) === num0) && new Set(real.map(colorOf)).size === real.length) {
    const order = [...real].sort((a, b) => CK.indexOf(colorOf(a)) - CK.indexOf(colorOf(b))).concat(jokers);
    return { ok: true, kind: 'group', order, value: num0 * n };
  }
  // 런: 같은 색, 연속 숫자 (조커로 빈칸 채움)
  const c0 = colorOf(real[0]);
  if (real.every((t) => colorOf(t) === c0)) {
    const nums = real.map(numOf).sort((a, b) => a - b);
    if (new Set(nums).size !== nums.length) return { ok: false, why: '같은 숫자가 겹쳤어요' };
    if (n > 13) return { ok: false, why: '너무 길어요' };
    let lo = nums[0], hi = nums[nums.length - 1];
    const gaps = hi - lo + 1 - nums.length;
    if (gaps > jokers.length) return { ok: false, why: '숫자가 이어지지 않아요' };
    let extra = jokers.length - gaps;
    while (extra > 0 && hi < 13) { hi++; extra--; }
    while (extra > 0 && lo > 1) { lo--; extra--; }
    if (extra > 0) return { ok: false, why: '너무 길어요' };
    const sorted = [...real].sort((a, b) => numOf(a) - numOf(b));
    const js = [...jokers];
    const order = [];
    let value = 0;
    for (let v = lo; v <= hi; v++) {
      const t = sorted.find((x) => numOf(x) === v);
      order.push(t || js.shift());
      value += v;
    }
    return { ok: true, kind: 'run', order, value };
  }
  return { ok: false, why: '같은 숫자·다른 색이거나, 같은 색·연속 숫자여야 해요' };
}

function finish(s, winner, players) {
  const ranking0 = s.order.map((uid) => {
    const left = rackSum(s.racks[uid]);
    return { uid, left };
  });
  const bonus = ranking0.filter((r) => r.uid !== winner).reduce((a, r) => a + r.left, 0);
  const rows = ranking0.map((r) => ({ uid: r.uid, left: r.left, score: winner ? (r.uid === winner ? bonus : -r.left) : -r.left }));
  const rewards = rewardsFor(s.order.length);
  const ranking = rows
    .sort((a, b) => b.score - a.score)
    .map((r, _, all) => { const place = 1 + all.filter((o) => o.score > r.score).length; return { uid: r.uid, score: r.score, left: r.left, place, garnets: rewards[place - 1] || 0 }; });
  const top = ranking.filter((r) => r.place === 1).map((r) => players[r.uid]?.name || '?');
  s.phase = 'done';
  s.final = ranking;
  return {
    message: winner ? `${top.join(', ')}님이 타일을 모두 내려놓았어요! 🀄` : `타일이 다 떨어져 남은 점수가 가장 적은 ${top.join(', ')}님 1등!`,
    winners: ranking.filter((r) => r.place === 1).map((r) => r.uid),
    ranking: ranking.map(({ uid, score, place, garnets }) => ({ uid, score, place, garnets })),
    rewards: Object.fromEntries(ranking.map((r) => [r.uid, r.garnets])),
  };
}
function nextTurn(s, now) {
  const i = s.order.indexOf(s.turn);
  s.turn = s.order[(i + 1) % s.order.length];
  s.turnNo += 1;
  s.deadline = s.turnMs ? now + s.turnMs : 0;
}
function drawTile(s, u, players, now, why) {
  const t = s.pool.pop();
  if (t) { s.racks[u].push(t); s.passes = 0; } else s.passes += 1;
  s.last = { u, text: t ? (why || '타일 1개를 가져갔어요') : '더미가 비어 그냥 넘겼어요', at: now };
  if (!t && s.passes >= s.order.length) return finish(s, null, players); // 아무도 못 내고 더미도 없음
  nextTurn(s, now);
  return null;
}

export default {
  id: 'rummikub',
  name: '루미큐브',
  emoji: '🀄',
  category: 'mini',
  minPlayers: 2,
  maxPlayers: 4,
  duration: '15~30분',
  rewards: [4, 3, 2, 1],
  rewardLabel: '1등 최대 +4',
  description: '숫자 타일로 그룹과 런을 만들어 먼저 다 내려놓기!',
  options: [{ key: 'turnSec', label: '턴 시간(초)', choices: [60, 90, 120, 180], default: 90 }],
  rules: [
    '타일은 1~13 숫자가 4색으로 2벌씩, 그리고 조커 2개예요. 각자 14개로 시작해요.',
    '그룹: 같은 숫자 · 다른 색 3~4개 (예: 빨강7 파랑7 검정7) / 런: 같은 색 · 이어지는 숫자 3개 이상 (예: 파랑3 4 5 6)',
    '조커는 어떤 타일이든 대신할 수 있어요.',
    '첫 등록: 내 손 타일만으로 합이 30점 이상인 조합을 내려놓아야 해요.',
    '첫 등록을 한 다음부터는 바닥의 조합을 나누고 합치고 옮겨서 새 조합을 만들 수 있어요. 차례가 끝날 때 바닥의 모든 조합이 올바르면 돼요.',
    '내 차례에 타일을 하나도 못(안) 내면 더미에서 타일 1개를 가져가요. 턴 시간이 다 돼도 그동안 옮긴 건 되돌리고 1개를 가져가요.',
    '손 타일을 먼저 모두 내려놓으면 승리! 이긴 사람은 다른 사람들 남은 타일 합만큼 +점수, 나머지는 남은 타일 합만큼 −점수 (조커는 30점)',
    '가넷: 2명 → 1등 2, 2등 1 / 3명 → 3·2·1 / 4명 → 4·3·2·1',
  ],

  setup(players, room) {
    const order = shuffle(players.map((p) => p.uid));
    const pool = shuffle([...CK.flatMap((c) => Array.from({ length: 13 }, (_, i) => [`${c}${i + 1}a`, `${c}${i + 1}b`]).flat()), 'J1', 'J2']);
    const racks = {};
    order.forEach((u) => { racks[u] = pool.splice(-START); });
    const turnMs = (Number(room?.options?.turnSec) || 90) * 1000;
    return { order, pool, racks, table: [], melded: {}, turn: order[0], turnNo: 1, turnMs, deadline: Date.now() + turnMs, passes: 0, last: null, phase: 'play' };
  },

  move(state, move, uid, players) {
    if (state.phase !== 'play') throw new Error('__noop');
    const now = Date.now();
    const s = JSON.parse(JSON.stringify(state));
    if (move?.type === 'tick') {
      if (!s.deadline || now < s.deadline) throw new Error('__noop');
      const r = drawTile(s, s.turn, players, now, '시간이 다 되어 타일 1개를 가져갔어요');
      return r ? { state: s, result: r } : { state: s };
    }
    if (uid !== s.turn) throw new Error('내 차례가 아니에요');
    if (move?.type === 'draw') {
      const r = drawTile(s, uid, players, now);
      return r ? { state: s, result: r } : { state: s };
    }
    if (move?.type === 'commit') {
      const table = (move.table || []).filter((g) => g.length);
      const rack = move.rack || [];
      const oldRack = s.racks[uid];
      const oldAll = [...s.table.flat(), ...oldRack].sort();
      const newAll = [...table.flat(), ...rack].sort();
      if (JSON.stringify(oldAll) !== JSON.stringify(newAll)) throw new Error('타일이 맞지 않아요. 되돌리기를 눌러 다시 해 주세요');
      if (!rack.every((t) => oldRack.includes(t))) throw new Error('바닥의 타일은 내 손으로 가져올 수 없어요');
      const played = oldRack.filter((t) => !rack.includes(t));
      if (!played.length) throw new Error('타일을 하나 이상 내려놓아야 해요. 낼 게 없으면 "가져오고 넘기기"를 눌러요');
      const bad = table.map(analyze).findIndex((a) => !a.ok);
      if (bad >= 0) throw new Error(`올바르지 않은 조합이 있어요 (${analyze(table[bad]).why})`);
      if (!s.melded[uid]) {
        // 첫 등록: 바닥은 그대로, 새 조합은 내 타일로만, 합 30점 이상
        const key = (g) => [...g].sort().join(',');
        const oldKeys = s.table.map(key);
        const newOnly = table.filter((g) => !oldKeys.includes(key(g)));
        if (oldKeys.some((k) => !table.map(key).includes(k))) throw new Error('첫 등록 전에는 바닥의 조합을 건드릴 수 없어요');
        if (newOnly.some((g) => g.some((t) => !played.includes(t)))) throw new Error('첫 등록은 내 손 타일로만 해야 해요');
        const pts = newOnly.reduce((a, g) => a + analyze(g).value, 0);
        if (pts < FIRST) throw new Error(`첫 등록은 합이 ${FIRST}점 이상이어야 해요 (지금 ${pts}점)`);
        s.melded[uid] = true;
      }
      s.table = table.map((g) => analyze(g).order);
      s.racks[uid] = rack;
      s.passes = 0;
      s.last = { u: uid, text: `타일 ${played.length}개를 내려놓았어요${rack.length ? ` · 남은 타일 ${rack.length}개` : ''}`, at: now, played };
      if (!rack.length) return { state: s, result: finish(s, uid, players) };
      nextTurn(s, now);
      return { state: s };
    }
    throw new Error('알 수 없는 동작이에요');
  },

  render(el, { state, me, players, finished, sendMove, room }) {
    const name = (u) => esc(players[u]?.name || '나간 사람');
    const isPlayer = state.order.includes(me);
    const myTurn = state.turn === me && state.phase === 'play' && !finished;
    if (room) turnAlert(room.code, `rk:${state.turnNo}`, myTurn);
    if (room && state.last?.played && state.last.u !== me) soundEvent(room.code, `rk:${state.last.at}`, 'ok');

    // 내 차례 동안 손으로 옮겨 보는 판 (보내기 전까지는 나만 봐요)
    const key = `${room?.code}:${state.turnNo}`;
    if (ui.key !== key) { ui.key = key; ui.table = state.table.map((g) => [...g]); ui.rack = [...(state.racks[me] || [])]; ui.sel = null; }
    const mineAtStart = state.racks[me] || [];
    const T = myTurn ? ui.table : state.table;
    const R = myTurn ? ui.rack : mineAtStart;
    const fromRack = (t) => mineAtStart.includes(t);
    const melded = !!state.melded[me];

    const tile = (t, extra = '', attrs = '') => {
      if (isJ(t)) return `<span class="rk-tile joker ${extra}" ${attrs}><i>☺</i></span>`;
      return `<span class="rk-tile ${extra}" style="--tc:${COLORS[colorOf(t)].hex}" ${attrs}><b>${numOf(t)}</b><i></i></span>`;
    };
    const sorted = [...R].sort(ui.sort === 'num'
      ? (a, b) => (isJ(a) ? 99 : numOf(a)) - (isJ(b) ? 99 : numOf(b)) || CK.indexOf(colorOf(a)) - CK.indexOf(colorOf(b))
      : (a, b) => (isJ(a) ? 9 : CK.indexOf(colorOf(a))) - (isJ(b) ? 9 : CK.indexOf(colorOf(b))) || (isJ(a) ? 0 : numOf(a)) - (isJ(b) ? 0 : numOf(b)));

    // 첫 등록 점수 미리 보기
    const startKeys = state.table.map((g) => [...g].sort().join(','));
    const newSets = T.filter((g) => g.length && !startKeys.includes([...g].sort().join(',')));
    const meldPts = newSets.reduce((a, g) => { const r = analyze(g); return a + (r.ok ? r.value : 0); }, 0);
    const playedNow = mineAtStart.filter((t) => !R.includes(t)).length;
    const allOk = T.filter((g) => g.length).every((g) => analyze(g).ok);

    const left = state.deadline ? Math.max(0, state.deadline - Date.now()) : 0;
    const others = state.order.map((u) => `<div class="rk-p ${state.turn === u && !finished ? 'turn' : ''} ${u === me ? 'me' : ''}"><b>${name(u)}</b><span>🀄 ${state.racks[u].length}개</span>${state.melded[u] ? '<em>등록 ✔</em>' : '<em class="no">등록 전</em>'}</div>`).join('');

    let final = '';
    if (finished || state.phase === 'done') {
      const ranking = state.final || [];
      final = `<div class="dm-title" style="color:var(--gold)">🀄 최종 순위</div>
        <ol class="nb-final">${ranking.map((r) => `<li class="${r.uid === me ? 'me' : ''}">
          <span class="nb-place">${r.place <= 3 ? ['🥇', '🥈', '🥉'][r.place - 1] : r.place + '등'}</span>
          <span class="nb-name">${name(r.uid)}<small class="ud-break">남은 타일 ${state.racks[r.uid].length}개 (${r.left}점)</small></span>
          <span class="nb-score">${r.score > 0 ? '+' : ''}${r.score}점</span><span class="nb-reward">${r.garnets ? `${GARNET}+${r.garnets}` : ''}</span></li>`).join('')}</ol>
        <div class="rk-left">${state.order.map((u) => `<div><b>${name(u)}</b> ${state.racks[u].map((t) => tile(t, 'sm')).join('') || '없음 🎉'}</div>`).join('')}</div>`;
    }

    const canTouch = (t) => myTurn && (fromRack(t) || melded);
    el.innerHTML = `<div class="rk">
      ${final}
      <div class="rk-head"><span class="rk-turn ${myTurn ? 'me' : ''}">${finished || state.phase === 'done' ? '게임 끝' : myTurn ? '내 차례!' : `${name(state.turn)}님 차례`}</span>
        ${state.deadline && !finished && state.phase === 'play' ? `<span class="rk-timer"><b data-left>${Math.ceil(left / 1000)}</b>초</span>` : ''}
        <span class="rk-pool">더미 ${state.pool.length}개</span></div>
      <div class="rk-players">${others}</div>
      ${state.last ? `<div class="rk-last"><b>${name(state.last.u)}</b> ${esc(state.last.text)}</div>` : ''}
      <div class="rk-table ${myTurn && ui.sel ? 'dropping' : ''}">
        ${T.map((g, gi) => {
          if (!g.length) return '';
          const a = analyze(g);
          const shown = a.ok ? a.order : g;
          return `<div class="rk-set ${a.ok ? 'ok' : 'bad'} ${myTurn && ui.sel ? 'target' : ''}" data-set="${gi}">
            ${shown.map((t) => tile(t, `${ui.sel === t ? 'sel' : ''} ${myTurn && fromRack(t) ? 'new' : ''} ${canTouch(t) ? 'touch' : ''}`, canTouch(t) ? `data-t="${t}"` : '')).join('')}
            ${!a.ok ? `<small class="rk-why">${esc(a.why)}</small>` : ''}</div>`;
        }).join('')}
        ${myTurn ? `<button class="rk-newset ${ui.sel ? 'on' : ''}" data-newset>${ui.sel ? '＋ 새 조합으로' : '＋ 새 조합'}</button>` : ''}
        ${!T.some((g) => g.length) && !myTurn ? '<p class="hint">아직 바닥에 놓인 조합이 없어요</p>' : ''}
      </div>
      ${myTurn ? `<div class="rk-help">${ui.sel ? '👉 옮길 곳(조합이나 ＋ 새 조합, 또는 내 손)을 누르세요' : melded ? '타일을 눌러 고르고, 옮길 곳을 눌러요 · 바닥 타일도 옮길 수 있어요' : `첫 등록: 내 타일로 30점 이상! 지금 <b class="${meldPts >= FIRST ? 'ok' : ''}">${meldPts}점</b>`}</div>` : ''}
      ${isPlayer ? `<div class="rk-rack ${myTurn && ui.sel && fromRack(ui.sel) && !R.includes(ui.sel) ? 'target' : ''}" data-rack>
        <div class="rk-rack-h"><b>내 타일 ${R.length}개</b><span>${rackSum(R)}점</span>
          <button class="rk-sort ${ui.sort !== 'num' ? 'on' : ''}" data-sort="color">색깔순</button><button class="rk-sort ${ui.sort === 'num' ? 'on' : ''}" data-sort="num">숫자순</button></div>
        <div class="rk-tiles">${sorted.map((t) => tile(t, `${ui.sel === t ? 'sel' : ''} ${myTurn ? 'touch' : ''}`, myTurn ? `data-t="${t}"` : '')).join('')}</div>
      </div>` : ''}
      ${myTurn ? `<div class="rk-btns">
        <button class="rk-b ghost" data-reset ${playedNow || JSON.stringify(ui.table) !== JSON.stringify(state.table) ? '' : 'disabled'}>↩ 되돌리기</button>
        <button class="rk-b draw" data-draw>🀫 가져오고 넘기기</button>
        <button class="rk-b go" data-commit ${playedNow && allOk && (melded || meldPts >= FIRST) ? '' : 'disabled'}>✔ 내려놓기 완료</button>
      </div>` : ''}
    </div>`;

    const rerender = () => this.render(el, { state, me, players, finished, sendMove, room });
    const removeTile = (t) => { ui.rack = ui.rack.filter((x) => x !== t); ui.table = ui.table.map((g) => g.filter((x) => x !== t)); };
    el.querySelectorAll('[data-t]').forEach((b) => (b.onclick = (e) => {
      e.stopPropagation();
      const t = b.dataset.t;
      // 고른 게 있고 다른 조합의 타일을 누르면 → 그 조합으로 옮기기
      if (ui.sel && ui.sel !== t) {
        const gi = ui.table.findIndex((g) => g.includes(t));
        if (gi >= 0) { const s0 = ui.sel; removeTile(s0); ui.table[ui.table.findIndex((g) => g.includes(t))].push(s0); ui.sel = null; return rerender(); }
      }
      ui.sel = ui.sel === t ? null : t;
      rerender();
    }));
    el.querySelectorAll('[data-set]').forEach((d) => (d.onclick = () => {
      if (!ui.sel) return;
      const s0 = ui.sel; const gi = Number(d.dataset.set);
      removeTile(s0); ui.table[gi].push(s0); ui.sel = null; ui.table = ui.table.filter((g) => g.length); rerender();
    }));
    el.querySelector('[data-newset]')?.addEventListener('click', () => { if (!ui.sel) return; const s0 = ui.sel; removeTile(s0); ui.table = ui.table.filter((g) => g.length); ui.table.push([s0]); ui.sel = null; rerender(); });
    el.querySelector('[data-rack]')?.addEventListener('click', () => {
      if (!ui.sel || !myTurn) return;
      if (!fromRack(ui.sel)) { ui.sel = null; return rerender(); } // 바닥 타일은 손으로 못 가져와요
      const s0 = ui.sel; removeTile(s0); ui.rack.push(s0); ui.table = ui.table.filter((g) => g.length); ui.sel = null; rerender();
    });
    el.querySelectorAll('[data-sort]').forEach((b) => (b.onclick = (e) => { e.stopPropagation(); ui.sort = b.dataset.sort; rerender(); }));
    el.querySelector('[data-reset]')?.addEventListener('click', () => { ui.table = state.table.map((g) => [...g]); ui.rack = [...mineAtStart]; ui.sel = null; rerender(); });
    el.querySelector('[data-draw]')?.addEventListener('click', () => { ui.key = ''; sendMove({ type: 'draw' }); });
    el.querySelector('[data-commit]')?.addEventListener('click', () => sendMove({ type: 'commit', table: ui.table.filter((g) => g.length), rack: ui.rack }));

    // 턴 시간
    if (state.deadline && state.phase === 'play' && !finished) {
      const $l = el.querySelector('[data-left]');
      const myIndex = Math.max(0, state.order.indexOf(me));
      let lastTick = 0;
      const iv = setInterval(() => {
        if (!el.isConnected) return clearInterval(iv);
        const l = Math.max(0, state.deadline - Date.now());
        if ($l) { $l.textContent = Math.ceil(l / 1000); $l.parentElement.classList.toggle('hurry', l <= 10000); }
        const n = Date.now();
        if (l <= 0 && n - lastTick > 2000 && n - state.deadline > 400 + (state.turn === me ? 0 : 400 + myIndex * 300)) { lastTick = n; sendMove({ type: 'tick' }, { silent: true }); }
      }, 250);
    }
  },
};
const ui = { key: '', table: [], rack: [], sel: null, sort: 'color' };
