// 예시 게임: 틱택토 (2인)
const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

export default {
  id: 'tictactoe',
  name: '틱택토',
  emoji: '⭕',
  minPlayers: 2,
  maxPlayers: 2,
  duration: '3분',
  description: '가로·세로·대각선 한 줄을 먼저 만들면 승리',
  rules: [
    '선공(X)은 무작위로 정해져요.',
    '번갈아 가며 빈 칸에 표시를 둬요.',
    '같은 표시 3개를 한 줄로 먼저 만들면 승리!',
    '칸이 다 찼는데 줄이 없으면 무승부예요.',
  ],

  setup(players) {
    const [a, b] = Math.random() < 0.5 ? [players[0], players[1]] : [players[1], players[0]];
    return {
      board: Array(9).fill(''),
      marks: { [a.uid]: 'X', [b.uid]: 'O' },
      order: [a.uid, b.uid],
      turn: a.uid,
      last: -1,
      line: [],
    };
  },

  move(state, move, uid, players) {
    if (state.turn !== uid) throw new Error('내 차례가 아니에요');
    const i = move?.index;
    if (!(i >= 0 && i < 9) || state.board[i]) throw new Error('둘 수 없는 칸이에요');

    const board = [...state.board];
    board[i] = state.marks[uid];
    const next = { ...state, board, last: i, turn: state.order.find((u) => u !== uid) };

    const line = LINES.find(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]);
    if (line) {
      next.line = line;
      return { state: next, result: { message: `${players[uid].name}님 승리! 🎉`, winners: [uid] } };
    }
    if (board.every(Boolean)) {
      return { state: next, result: { message: '무승부예요! 🤝', winners: [] } };
    }
    return { state: next };
  },

  render(el, { state, me, players, finished, sendMove }) {
    const myMark = state.marks[me];
    const turnName = players[state.turn]?.name || '';
    const status = finished
      ? ''
      : state.turn === me
        ? `<b>내 차례</b>예요 · 나는 <b>${myMark || '관전'}</b>`
        : `${escapeHtml(turnName)}님 차례 · 나는 <b>${myMark || '관전'}</b>`;

    el.innerHTML = `
      <div class="ttt">
        <div class="ttt-status">${status}</div>
        <div class="ttt-board ${!finished && state.turn === me ? 'my-turn' : ''}">
          ${state.board.map((v, i) => `
            <button class="ttt-cell ${v ? 'mark-' + v : ''} ${state.line.includes(i) ? 'win' : ''} ${state.last === i ? 'last' : ''}"
              data-i="${i}" ${v || finished || state.turn !== me ? 'disabled' : ''}
              aria-label="${i + 1}번 칸 ${v || '빈 칸'}">${v}</button>`).join('')}
        </div>
      </div>`;
    el.querySelectorAll('.ttt-cell').forEach((b) => {
      b.onclick = () => sendMove({ index: Number(b.dataset.i) });
    });
  },
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
