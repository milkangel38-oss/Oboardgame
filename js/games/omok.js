// 미니게임: 오목 (2명) — 15×15 바둑판, 흑이 먼저, 가로·세로·대각선으로 5개 이상 이으면 승리
import { turnAlert, bigFlash } from './turn-alert.js';
import { faceHtml } from './face.js';
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

const ui = { key: '', pick: -1 };
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
    '실수 방지: 칸을 한 번 누르면 미리보기, 같은 칸을 한 번 더 누르면 돌이 놓여요.',
    '판이 가득 차면 무승부. 언제든 기권할 수 있어요.',
    '가넷: 승리한 사람 +1',
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
    if (ui.key !== `${room?.code}:${state.n}`) ui.key = `${room?.code}:${state.n}`, ui.pick = -1;
    if (room) turnAlert(room.code, `om:${room.startedAt}:${state.n}`, myTurn);
    if (fx.n !== state.n) { if (fx.n >= 0 && state.n > fx.n) sfxToken(); fx.n = state.n; }

    const win = new Set(state.win || []);
    const lines = Array.from({ length: N }, (_, k) => `<line x1="0.5" y1="${k + 0.5}" x2="${N - 0.5}" y2="${k + 0.5}"/><line x1="${k + 0.5}" y1="0.5" x2="${k + 0.5}" y2="${N - 0.5}"/>`).join('');
    const stars = STARS.map(([x, y]) => `<circle cx="${x + 0.5}" cy="${y + 0.5}" r=".12"/>`).join('');
    const cells = Array.from(state.board, (v, i) => {
      const stone = v === '1' ? 'b' : v === '2' ? 'w' : '';
      const cls = [stone && `st ${stone}`, i === state.last && 'last', win.has(i) && 'win', ui.pick === i && 'pick'].filter(Boolean).join(' ');
      return `<button class="om-c ${cls}" data-i="${i}" ${stone || !myTurn ? 'tabindex="-1"' : ''}></button>`;
    }).join('');
    const seat = (u, c) => `<div class="om-p ${u === me ? 'me' : ''} ${!finished && u === turnUid ? 'turn' : ''}">
      <span class="om-face">${faceHtml(players[u] || { name: '?' })}<i class="om-stone ${c}"></i></span>
      <b>${name(u)}</b><small>${c === 'b' ? '흑 · 먼저' : '백'}</small></div>`;

    let banner;
    if (finished || state.phase === 'done') {
      const w = state.win ? (state.board[state.win[0]] === '1' ? state.black : state.white) : state.resign ? (state.resign === state.black ? state.white : state.black) : null;
      banner = w ? `<b>${name(w)}</b>님 승리! ${state.resign ? '(상대 기권)' : '🎉 오목 완성'}` : '무승부!';
    } else if (myTurn) banner = ui.pick >= 0 ? '<b>같은 자리를 한 번 더</b> 누르면 돌이 놓여요' : `<b>내 차례!</b> ${myColor === 1 ? '흑돌' : '백돌'}을 놓을 자리를 누르세요`;
    else if (myColor) banner = `<b>${name(turnUid)}</b>님이 생각하는 중…`;
    else banner = `${name(turnUid)}님 차례`;

    el.innerHTML = `
      <div class="om">
        <div class="om-top">${seat(state.black, 'b')}<span class="om-vs">VS<small>${state.n}수</small></span>${seat(state.white, 'w')}</div>
        <div class="nb-banner"><span>${banner}</span></div>
        <div class="om-board ${myTurn ? `can ${myColor === 1 ? 'mb' : 'mw'}` : ''}">
          <svg class="om-grid" viewBox="0 0 ${N} ${N}" preserveAspectRatio="none">${lines}${stars}</svg>
          <div class="om-cells">${cells}</div>
        </div>
        ${myColor && !finished && state.phase === 'play' ? '<button class="btn ghost sm om-resign" data-resign>🏳️ 기권</button>' : ''}
      </div>`;

    el.querySelectorAll('.om-c').forEach((b) => (b.onclick = () => {
      if (!myTurn) return;
      const i = Number(b.dataset.i);
      if (state.board[i] !== '0') return;
      if (ui.pick === i) { ui.pick = -1; sendMove({ type: 'place', i }); return; }
      ui.pick = i; this.render(el, ctx);
    }));
    const $r = el.querySelector('[data-resign]');
    if ($r) $r.onclick = () => { if (confirm('정말 기권할까요?')) sendMove({ type: 'resign' }); };
    if (state.win && !fx.shown) { fx.shown = true; bigFlash('<div class="spl-myturn">오목 완성! 🎉</div>', 1600); }
    if (!state.win) fx.shown = false;
  },
};
