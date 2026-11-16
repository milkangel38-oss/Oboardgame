// 더 지니어스 · 데스매치: 결합 (2명)
// - 타일 9장. 각 타일은 도형(원·세모·네모) / 도형 색(빨강·노랑·파랑) / 배경색(흰·회·검) 3가지 속성
// - "합": 세 속성이 각각 "모두 같거나 모두 다른" 타일 3장 → +1점 (오답·중복은 감점 없음)
// - "결": 남은 합이 없을 때 외치면 +3점, 라운드 종료 / 틀리면 -1점
// - 합이든 결이든 틀리면 10초 동안 답을 외칠 수 없어요
// - 방장이 정한 라운드(5~7) 후 승자 가넷 +2, 패자 가넷 -2
import { GARNET } from '../profile.js';

const LOCK_MS = 10000;
const REVEAL_MS = 6000;
const REWARD = 2;

export const SHAPES = ['원', '세모', '네모'];
export const COLORS = ['빨강', '노랑', '파랑'];
export const BGS = ['흰색', '회색', '검정'];
const COLOR_HEX = ['#e8333f', '#ffc928', '#2f6bff'];
const BG_HEX = ['#f4f1ea', '#8d8b96', '#1c1b24'];

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// 세 값이 모두 같거나 모두 다르면 OK
const okAttr = (a, b, c) => (a === b && b === c) || (a !== b && b !== c && a !== c);
export function isHap(t1, t2, t3) {
  return ['s', 'c', 'b'].every((k) => okAttr(t1[k], t2[k], t3[k]));
}
export const keyOf = (idx) => [...idx].sort((a, b) => a - b).join('-');

export function allHaps(tiles) {
  const out = [];
  for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) for (let k = j + 1; k < 9; k++) {
    if (isHap(tiles[i], tiles[j], tiles[k])) out.push(`${i}-${j}-${k}`);
  }
  return out;
}

// 27가지 타일 중 9장을 뽑되 합이 1~10개가 되도록
export function makeBoard() {
  const all = [];
  for (let s = 0; s < 3; s++) for (let c = 0; c < 3; c++) for (let b = 0; b < 3; b++) all.push({ s, c, b });
  for (let tries = 0; tries < 500; tries++) {
    const pool = [...all];
    const tiles = [];
    for (let i = 0; i < 9; i++) tiles.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    const n = allHaps(tiles).length;
    if (n >= 1 && n <= 10) return tiles;
  }
  return all.slice(0, 9);
}

function newRound(state, roundNo) {
  return { ...state, round: roundNo, phase: 'play', tiles: makeBoard(), found: [], log: [], winner: '', revealUntil: 0 };
}

const logPush = (state, entry) => [...state.log, entry].slice(-5);

export function result(order, scores, players) {
  const [a, b] = order;
  const sa = scores[a] || 0, sb = scores[b] || 0;
  if (sa === sb) {
    return {
      message: '무승부! 가넷 변화가 없어요',
      winners: [], draw: true,
      ranking: order.map((u) => ({ uid: u, score: scores[u] || 0, place: 1, garnets: 0 })),
      rewards: { [a]: 0, [b]: 0 },
    };
  }
  const [w, l] = sa > sb ? [a, b] : [b, a];
  return {
    message: `${players[w]?.name || '?'}님 데스매치 승리! 🏆`,
    winners: [w],
    ranking: [
      { uid: w, score: scores[w] || 0, place: 1, garnets: REWARD },
      { uid: l, score: scores[l] || 0, place: 2, garnets: -REWARD },
    ],
    rewards: { [w]: REWARD, [l]: -REWARD },
  };
}

function tileSvg(t) {
  const fill = COLOR_HEX[t.c];
  const shape = t.s === 0 ? `<circle cx="50" cy="50" r="30" fill="${fill}"/>`
    : t.s === 1 ? `<polygon points="50,16 86,80 14,80" fill="${fill}"/>`
    : `<rect x="20" y="20" width="60" height="60" rx="4" fill="${fill}"/>`;
  return `<svg viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" fill="${BG_HEX[t.b]}"/>${shape}</svg>`;
}
export const tileLabel = (t) => `${BGS[t.b]} 배경 ${COLORS[t.c]} ${SHAPES[t.s]}`;

// 합 하나를 타일 그림 3장 + 번호로
function hapChip(key, tiles, extraClass = '', who = '') {
  const idx = key.split('-').map(Number);
  return `<span class="cb-hap-chip ${extraClass}">
    <span class="cb-mini">${idx.map((i) => `<span class="cb-mini-tile">${tileSvg(tiles[i])}</span>`).join('')}</span>
    <span class="cb-hap-num">${idx.map((i) => i + 1).join('·')}</span>${who ? `<small>${who}</small>` : ''}
  </span>`;
}

// 고른 타일 (화면을 다시 그려도 유지)
let picked = [];
let pickedKey = '';

export default {
  id: 'combo',
  name: '결합',
  emoji: '⚔️',
  category: 'genius',
  deathmatch: true,
  minPlayers: 2,
  maxPlayers: 2,
  duration: '10~15분',
  rewards: [REWARD, -REWARD],
  rewardLabel: `승자 +${REWARD}`,
  description: '합을 찾고 결을 외쳐라! 지면 가넷을 잃는다',
  options: [
    { key: 'rounds', label: '라운드 수', choices: [5, 6, 7], default: 5 },
  ],
  rules: [
    '⚔ 1:1 데스매치! 이긴 사람은 가넷 +2개, 진 사람은 가넷 −2개!',
    '타일 9장에는 도형(원·세모·네모), 도형 색(빨강·노랑·파랑), 배경색(흰색·회색·검정)이 있어요.',
    '세 속성이 각각 "모두 같거나 모두 다른" 타일 3장이 [합]이에요.',
    '타일 3장을 골라 [합!]을 외치면 +1점. 틀리거나 이미 나온 합이면 감점은 없어요.',
    '더 이상 합이 없다고 생각하면 [결!]을 외쳐요. 맞으면 +3점과 함께 라운드 종료, 틀리면 −1점.',
    '합이든 결이든 틀리면 10초 동안 답을 외칠 수 없어요.',
    '판마다 합은 1개 이상 10개 이하로 나와요. 방장이 라운드 수(5~7)를 정해요.',
  ],

  setup(players, room) {
    const ids = players.map((p) => p.uid);
    const h = Math.max(0, ids.indexOf(room?.hostId));
    const order = [...ids.slice(h), ...ids.slice(0, h)];
    const rounds = Math.min(7, Math.max(5, Number(room?.options?.rounds) || 5));
    return newRound({ rounds, order, scores: Object.fromEntries(order.map((u) => [u, 0])), lockUntil: {} }, 1);
  },

  move(state, move, uid, players) {
    const now = Date.now();
    const lockedFor = Math.max(0, (state.lockUntil?.[uid] || 0) - now);
    const lock = (s) => ({ ...s, lockUntil: { ...s.lockUntil, [uid]: now + LOCK_MS } });

    if (move?.type === 'hap' || move?.type === 'gyeol') {
      if (state.phase !== 'play') throw new Error('지금은 외칠 수 없어요');
      if (!state.order.includes(uid)) throw new Error('참가자가 아니에요');
      if (lockedFor > 0) throw new Error(`${Math.ceil(lockedFor / 1000)}초 뒤에 다시 외칠 수 있어요`);
    }

    if (move?.type === 'hap') {
      const idx = (move.tiles || []).map(Number);
      if (idx.length !== 3 || new Set(idx).size !== 3 || idx.some((i) => !(i >= 0 && i < 9))) throw new Error('타일 3장을 골라 주세요');
      const key = keyOf(idx);
      const label = key.split('-').map((i) => Number(i) + 1).join('·');
      const already = state.found.some((f) => f.key === key);
      const t = state.tiles;
      if (!already && isHap(t[idx[0]], t[idx[1]], t[idx[2]])) {
        return { state: { ...state, scores: { ...state.scores, [uid]: state.scores[uid] + 1 }, found: [...state.found, { key, by: uid }], log: logPush(state, { uid, text: `${label} 합! +1`, ok: true }) } };
      }
      return { state: lock({ ...state, log: logPush(state, { uid, text: `${label} ${already ? '이미 나온 합' : '합 아님'} (10초 대기)`, ok: false }) }) };
    }

    if (move?.type === 'gyeol') {
      const remaining = allHaps(state.tiles).filter((k) => !state.found.some((f) => f.key === k));
      if (remaining.length === 0) {
        const scores = { ...state.scores, [uid]: state.scores[uid] + 3 };
        return { state: { ...state, scores, phase: 'reveal', winner: uid, revealUntil: now + REVEAL_MS, log: logPush(state, { uid, text: '결! +3', ok: true }) } };
      }
      return { state: lock({ ...state, scores: { ...state.scores, [uid]: state.scores[uid] - 1 }, log: logPush(state, { uid, text: '결 실패 −1 (10초 대기)', ok: false }) }) };
    }

    if (move?.type === 'tick') {
      if (state.phase === 'reveal' && now >= state.revealUntil) {
        if (state.round >= state.rounds) {
          return { state: { ...state, phase: 'done' }, result: result(state.order, state.scores, players) };
        }
        return { state: newRound(state, state.round + 1) };
      }
      throw new Error('__noop');
    }

    throw new Error('알 수 없는 동작이에요');
  },

  render(el, { state, me, players, finished, sendMove, room }) {
    const name = (u) => esc(players[u]?.name || '나간 사람');
    const isPlayer = state.order.includes(me);
    const roundKey = `${room?.code}:${state.round}`;
    if (pickedKey !== roundKey) { picked = []; pickedKey = roundKey; }

    if (finished) {
      const ranking = room?.result?.ranking || [];
      el.innerHTML = `
        <div class="cb">
          <div class="dm-title">⚔ DEATH MATCH 결과</div>
          <ol class="nb-final">
            ${ranking.map((r) => `<li class="${r.uid === me ? 'me' : ''}">
              <span class="nb-place">${room?.result?.draw ? '🤝' : r.place === 1 ? '🏆' : '💀'}</span>
              <span class="nb-name">${name(r.uid)}</span>
              <span class="nb-score">${r.score}점</span>
              <span class="nb-reward ${r.garnets < 0 ? 'minus' : ''}">${r.garnets ? `${GARNET}${r.garnets > 0 ? '+' : '−'}${Math.abs(r.garnets)}` : '±0'}</span>
            </li>`).join('')}
          </ol>
        </div>`;
      return;
    }

    const foundKeys = new Set(state.found.map((f) => f.key));
    const reveal = state.phase === 'reveal';
    const all = reveal ? allHaps(state.tiles) : [];
    const lockLeft = () => Math.max(0, (state.lockUntil?.[me] || 0) - Date.now());

    el.innerHTML = `
      <div class="cb">
        <div class="nb-top">
          <span class="nb-round">ROUND <b>${state.round}</b> / ${state.rounds}</span>
          <span class="dm-chip">⚔ DEATH MATCH</span>
        </div>
        <div class="cb-vs">
          ${state.order.map((u, i) => `
            ${i === 1 ? '<span class="cb-vs-mark">VS</span>' : ''}
            <span class="cb-player ${u === me ? 'me' : ''}" data-lock="${u}">
              <b>${name(u)}</b><i>${state.scores[u]}</i><small class="cb-lock"></small>
            </span>`).join('')}
        </div>

        <div class="cb-board ${reveal ? 'reveal' : ''}">
          ${state.tiles.map((t, i) => `
            <button class="cb-tile ${picked.includes(i) ? 'picked' : ''}" data-i="${i}" ${!isPlayer || reveal ? 'disabled' : ''} aria-label="${i + 1}번 ${tileLabel(t)}">
              ${tileSvg(t)}<span class="cb-num">${i + 1}</span>
            </button>`).join('')}
        </div>

        ${reveal ? `
          <div class="nb-banner"><span><b>${name(state.winner)}</b>님 <span class="gold">결! +3점</span> · 이번 판의 합 ${all.length}개</span></div>
          <div class="cb-found all">${all.map((k) => hapChip(k, state.tiles, foundKeys.has(k) ? 'got' : 'miss', foundKeys.has(k) ? '찾음' : '놓침')).join('')}</div>`
        : isPlayer ? `
          <div class="cb-actions">
            <button class="btn primary big cb-hap" data-hap>합! <small>(${picked.length}/3)</small></button>
            <button class="btn big cb-gyeol" data-gyeol>결!</button>
          </div>
          <div class="cb-lockmsg" data-lockmsg></div>` : ''}

        <div class="ms-hints-title">나온 합 ${state.found.length}개</div>
        <div class="cb-found">${state.found.length
          ? state.found.map((f) => hapChip(f.key, state.tiles, f.by === me ? 'mine' : '', name(f.by))).join('')
          : '<em>아직 없어요</em>'}</div>
        ${state.log.length ? `<ul class="cb-log">${state.log.slice().reverse().map((l) => `<li class="${l.ok ? 'ok' : 'bad'}"><b>${name(l.uid)}</b> ${esc(l.text)}</li>`).join('')}</ul>` : ''}
      </div>`;

    const $hap = el.querySelector('[data-hap]');
    const $gyeol = el.querySelector('[data-gyeol]');
    const paintPick = () => {
      el.querySelectorAll('.cb-tile').forEach((b) => b.classList.toggle('picked', picked.includes(Number(b.dataset.i))));
      if ($hap) $hap.querySelector('small').textContent = `(${picked.length}/3)`;
    };
    el.querySelectorAll('.cb-tile').forEach((b) => {
      b.onclick = () => {
        const i = Number(b.dataset.i);
        picked = picked.includes(i) ? picked.filter((x) => x !== i) : picked.length < 3 ? [...picked, i] : picked;
        paintPick();
      };
    });
    if ($hap) $hap.onclick = () => {
      if (picked.length !== 3) return;
      const tiles = picked;
      picked = []; // 보내기 전에 비워야 바로 다시 그려진 화면에도 선택이 남지 않아요
      paintPick();
      sendMove({ type: 'hap', tiles });
    };
    if ($gyeol) $gyeol.onclick = () => sendMove({ type: 'gyeol' });

    // 잠금 카운트다운 + 라운드 넘김 신호
    const $msg = el.querySelector('[data-lockmsg]');
    const myIndex = Math.max(0, state.order.indexOf(me));
    let lastTick = 0;
    const update = () => {
      if (!el.isConnected) return clearInterval(timer);
      const now = Date.now();
      state.order.forEach((u) => {
        const left = Math.max(0, (state.lockUntil?.[u] || 0) - now);
        const $l = el.querySelector(`[data-lock="${u}"] .cb-lock`);
        if ($l) $l.textContent = left ? `🔒${Math.ceil(left / 1000)}` : '';
      });
      const left = lockLeft();
      if ($hap) $hap.disabled = left > 0 || picked.length !== 3;
      if ($gyeol) $gyeol.disabled = left > 0;
      if ($msg) $msg.textContent = left ? `오답! ${Math.ceil(left / 1000)}초 뒤에 다시 외칠 수 있어요` : '';
      if (reveal && now >= state.revealUntil && now - lastTick > 2000 && now - state.revealUntil > 300 + myIndex * 350) {
        lastTick = now;
        sendMove({ type: 'tick' }, { silent: true });
      }
    };
    el.querySelectorAll('.cb-tile').forEach((b) => b.addEventListener('click', update));
    const timer = setInterval(update, 250);
    update();
  },
};
