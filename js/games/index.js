// 게임 목록 — 새 게임은 tictactoe.js 처럼 파일을 만들고 여기에 추가하세요.
//
// 게임 모듈이 갖춰야 할 것:
//   id, name, emoji, minPlayers, maxPlayers, duration, description, rules(문자열 배열)
//   setup(players)                       → 첫 게임 상태
//   move(state, move, uid, playersMap)   → { state, result? }  (잘못된 수는 throw)
//   render(el, ctx)                      → 화면 그리기. ctx = { state, me, players, finished, sendMove }
import tictactoe from './tictactoe.js';

export const GAMES = [
  tictactoe,
  {
    id: 'omok', name: '오목', emoji: '⚫', minPlayers: 2, maxPlayers: 2, duration: '10분',
    description: '다섯 알을 먼저 한 줄로 잇는 사람이 승리', comingSoon: true,
  },
  {
    id: 'liar', name: '라이어 게임', emoji: '🕵️', minPlayers: 3, maxPlayers: 8, duration: '15분',
    description: '혼자 제시어를 모르는 라이어를 찾아라', comingSoon: true,
  },
];

export const getGame = (id) => GAMES.find((g) => g.id === id);
