// 미니게임: 오목 (2명) — 15×15 바둑판, 흑이 먼저, 가로·세로·대각선으로 5개 이상 이으면 승리
import { turnAlert, bigFlash } from './turn-alert.js';
import { sitHtml, chatFormHtml, bindChat } from './sit.js';
import { sfxToken } from '../sound.js';

const N = 15;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const STARS = [[3, 3], [3, 11], [11, 3], [11, 11], [7, 7]];
const DIRS = [[1, 0], [0, 1], [1, 1], [1, -1]];

// idx 자리에 color 돌을 놓았을 때 5개 이상 이어진 줄 (없으면 null)
export function fiveLine(board, idx, color) {
  const x0 = idx % N, y0 = Math.floor(idx / N);
  for (const [dx, dy] of DIRS) {
    const line = [idx];
    for (const s of [1, -1]) {
      let x = x0 + dx * s, y = y0 + dy * s;
      while (x >= 0 && y >= 0 && x < N && y < N && board[y * N + x] === color) { line.push(y * N + x); x += dx * s; y += dy * s; }
    }
    if (line.length >= 5) return line;
  }
  return null;
}

// 열린 3: 한 수 더 두면 양쪽이 빈 4(.XXXX.)가 되는 줄
function openThreeDir(board, idx, color, dx, dy) {
  const x0 = idx % N, y0 = Math.floor(idx / N);
  const cell = (k) => { const x = x0 + dx * k, y = y0 + dy * k; if (x < 0 || y < 0 || x >= N || y >= N) return -1; const v = board[y * N + x]; return k === 0 || v === color ? 1 : v === '0' ? 0 : -1; };
  const arr = {}; for (let k = -5; k <= 5; k++) arr[k] = cell(k);
  // 이미 4개 이상 이어졌으면 3이 아니에요
  let run = 1; for (const s of [1, -1]) for (let k = s; arr[k] === 1; k += s) run++;
  if (run >= 4) return false;
  for (let e = -4; e <= 4; e++) {
    if (e === 0 || arr[e] !== 0) continue;
    const a = { ...arr, [e]: 1 };
    for (let st = -5; st <= 0; st++) {
      if (st + 5 > 5) continue;
      if (a[st] !== 0 || a[st + 5] !== 0) continue;
      let ok = true; for (let k = st + 1; k <= st + 4; k++) if (a[k] !== 1) ok = false;
      if (ok && st + 1 <= 0 && 0 <= st + 4 && st + 1 <= e && e <= st + 4) return true;
    }
  }
  return false;
}
// 33: 한 수로 열린 3이 두 줄 이상 생기면 금지 (5목을 만드는 수는 괜찮아요)
export function isDoubleThree(board, idx, color) {
  return DIRS.filter(([dx, dy]) => openThreeDir(board, idx, String(color), dx, dy)).length >= 2;
}

function result(state, players, winner, why) {
  const order = [state.black, state.white];
  if (!winner) {
    return { message: '무승부! 판이 가득 찼어요', winners: [], ranking: order.map((uid) => ({ uid, score: 0, place: 1, garnets: 0 })), rewards: {} };
  }
  const loser = order.find((u) => u !== winner);
  return {
    message: `${players[winner]?.name || '?'}님 승리! ${why}`,
    winners: [winner],
    ranking: [{ uid: winner, score: 1, place: 1, garnets: 1 }, { uid: loser, score: 0, place: 2, garnets: 0 }],
    rewards: { [winner]: 1, [loser]: 0 },
  };
}

const fx = { n: -1 };

export default {
  id: 'omok',
  name: '오목',
  emoji: '⚫',
  category: 'mini',
  minPlayers: 2,
  maxPlayers: 2,
  duration: '5~15분',
  rewards: [1],
  rewardLabel: '승리 +1',
  description: '다섯 개를 먼저 잇는 사람이 승리! 1:1 두뇌 대결',
  rules: [
    '2명이 흑돌과 백돌을 나눠 가지고, 흑돌이 먼저 둬요. (흑·백은 무작위)',
    '번갈아 가며 15×15 판의 빈 교차점에 돌을 하나씩 놓아요.',
    '가로·세로·대각선 중 한 줄로 돌 5개 이상을 먼저 이으면 승리!',
    '33 금지: 한 수로 열린 3(막히지 않은 3)이 두 줄 동시에 생기는 자리에는 둘 수 없어요. (흑·백 모두)',
    '판이 가득 차면 무승부. 언제든 기권할 수 있어요.',
    '단판 승부! 이긴 사람 가넷 +1 (진 사람은 없어요)',
  ],

  setup(players) {
    const [a, b] = players.map((p) => p.uid).sort(() => Math.random() - 0.5);
    return { black: a, white: b, board: '0'.repeat(N * N), turn: 1, n: 0, last: -1, win: null, phase: 'play' };
  },

  move(state, move, uid, players) {
    if (state.phase !== 'play') throw new Error('__noop');
    const color = uid === state.black ? 1 : uid === state.white ? 2 : 0;
    if (!color) throw new Error('참가자가 아니에요');
    if (move?.type === 'resign') {
      const winner = color === 1 ? state.white : state.black;
      const s = { ...state, phase: 'done', resign: uid };
      return { state: s, result: result(s, players, winner, '(상대 기권)') };
    }
    if (move?.type !== 'place') throw new Error('알 수 없는 동작이에요');
    if (color !== state.turn) throw new Error('내 차례가 아니에요');
    const i = Number(move.i);
    if (!Number.isInteger(i) || i < 0 || i >= N * N) throw new Error('판 밖이에요');
    if (state.board[i] !== '0') throw new Error('이미 돌이 있어요');
    const board = state.board.slice(0, i) + color + state.board.slice(i + 1);
    if (!fiveLine(board, i, String(color)) && isDoubleThree(state.board, i, color)) throw new Error('33은 둘 수 없어요 (열린 3이 두 줄)');
    const s = { ...state, board, last: i, n: state.n + 1, turn: color === 1 ? 2 : 1 };
    const line = fiveLine(board, i, String(color));
    if (line) {
      const done = { ...s, phase: 'done', win: line };
      return { state: done, result: result(done, players, uid, `(${line.length}목 완성)`) };
    }
    if (!board.includes('0')) { const done = { ...s, phase: 'done' }; return { state: done, result: result(done, players, null) }; }
    return { state: s };
  },

  render(el, ctx) {
    const { state, me, players, finished, sendMove, room } = ctx;
    const name = (u) => esc(players[u]?.name || '나간 사람');
    const myColor = me === state.black ? 1 : me === state.white ? 2 : 0;
    const turnUid = state.turn === 1 ? state.black : state.white;
    const myTurn = !finished && state.phase === 'play' && myColor === state.turn;
    if (room) turnAlert(room.code, `om:${room.startedAt}:${state.n}`, myTurn);
    if (fx.n !== state.n) { if (fx.n >= 0 && state.n > fx.n) sfxToken(); fx.n = state.n; }

    const win = new Set(state.win || []);
    const lines = Array.from({ length: N }, (_, k) => `<line x1="0.5" y1="${k + 0.5}" x2="${N - 0.5}" y2="${k + 0.5}"/><line x1="${k + 0.5}" y1="0.5" x2="${k + 0.5}" y2="${N - 0.5}"/>`).join('');
    const stars = STARS.map(([x, y]) => `<circle cx="${x + 0.5}" cy="${y + 0.5}" r=".12"/>`).join('');
    const cells = Array.from(state.board, (v, i) => {
      const stone = v === '1' ? 'b' : v === '2' ? 'w' : '';
      const ban = myTurn && !stone && isDoubleThree(state.board, i, myColor) && !fiveLine(state.board.slice(0, i) + myColor + state.board.slice(i + 1), i, String(myColor));
      const cls = [stone && `st ${stone}`, i === state.last && 'last', win.has(i) && 'win', ban && 'ban'].filter(Boolean).join(' ');
      return `<button class="om-c ${cls}" data-i="${i}" tabindex="-1"></button>`;
    }).join('');
    const seat = (u, c, side) => sitHtml(players[u], {
      uid: u, robe: c === 'b' ? '#2b2f3a' : '#e8e2d2', trim: c === 'b' ? '#e8e2d2' : '#3d4f7a', me: u === me, turn: !finished && u === turnUid,
      badge: `<i class="om-stone ${c}"></i>`, label: c === 'b' ? '흑 · 먼저' : '백',
      up: side === 'top',
    }).replace('class="sit ', `class="sit jg-sit ${side === 'top' ? 'jg-top' : 'jg-bot'} `);
    // 나는 항상 아래 (관전자는 흑이 아래)
    const bottomU = myColor === 2 ? state.white : state.black;
    const topU = bottomU === state.black ? state.white : state.black;
    const colorOf = (u) => (u === state.black ? 'b' : 'w');

    let banner;
    if (finished || state.phase === 'done') {
      const w = state.win ? (state.board[state.win[0]] === '1' ? state.black : state.white) : state.resign ? (state.resign === state.black ? state.white : state.black) : null;
      banner = w ? `<b>${name(w)}</b>님 승리! ${state.resign ? '(상대 기권)' : '🎉 오목 완성'}` : '무승부!';
    } else if (myTurn) banner = `<b>내 차례!</b> ${myColor === 1 ? '흑돌' : '백돌'}을 놓을 자리를 누르세요 <small class="muted">· ✕ 자리는 33 금지</small>`;
    else if (myColor) banner = `<b>${name(turnUid)}</b>님이 생각하는 중…`;
    else banner = `${name(turnUid)}님 차례`;

    el.innerHTML = `
      <div class="om om2">
        <div class="nb-banner"><span>${banner} <small class="jg-n">${state.n}수</small></span></div>
        <div class="om-room om-room2">
          ${seat(topU, colorOf(topU), 'top')}
          <div class="om-board ${myTurn ? `can ${myColor === 1 ? 'mb' : 'mw'}` : ''}">
            <svg class="om-grid" viewBox="0 0 ${N} ${N}" preserveAspectRatio="none">${lines}${stars}</svg>
            <div class="om-cells">${cells}</div>
          </div>
          ${seat(bottomU, colorOf(bottomU), 'bot')}
        </div>
        ${myColor && !finished && state.phase === 'play' ? '<button class="btn ghost sm om-resign" data-resign>🏳️ 기권</button>' : ''}
        ${myColor ? chatFormHtml() : ''}
      </div>`;

    el.querySelectorAll('.om-c').forEach((b) => (b.onclick = () => {
      if (!myTurn || b.classList.contains('ban')) return;
      const i = Number(b.dataset.i);
      if (state.board[i] !== '0') return;
      b.classList.add('st', myColor === 1 ? 'b' : 'w');
      sendMove({ type: 'place', i });
    }));
    const $r = el.querySelector('[data-resign]');
    if ($r) $r.onclick = () => { if (confirm('정말 기권할까요?')) sendMove({ type: 'resign' }); };
    bindChat(el);
    if (state.win && !fx.shown) { fx.shown = true; bigFlash('<div class="spl-myturn">오목 완성! 🎉</div>', 1600); }
    if (!state.win) fx.shown = false;
  },
};
