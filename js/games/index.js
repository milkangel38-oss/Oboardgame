// 게임 목록 — 새 게임은 tictactoe.js 처럼 파일을 만들고 여기에 추가하세요.
//
// 게임 모듈이 갖춰야 할 것:
//   id, name, emoji, category, minPlayers, maxPlayers, duration, description, rules(문자열 배열)
//   setup(players)                       → 첫 게임 상태
//   move(state, move, uid, playersMap)   → { state, result? }  (잘못된 수는 throw)
//       result = { message, winners: [uid], draw?: true }
//   render(el, ctx)                      → 화면 그리기. ctx = { state, me, players, finished, sendMove }
// 카드 그림은 art.js 에 게임 id로 추가해요.
import tictactoe from './tictactoe.js';
import { ART } from './art.js';

export const CATEGORIES = {
  mini: { name: '미니 게임', icon: '🕹️' },
  board: { name: '보드게임', icon: '🎲' },
  party: { name: '파티 게임', icon: '🎭' },
};

export const GAMES = [
  tictactoe,
  {
    id: 'omok', name: '오목', emoji: '⚫', category: 'board', minPlayers: 2, maxPlayers: 2, duration: '10분',
    description: '다섯 알을 먼저 한 줄로 잇는 사람이 승리', comingSoon: true,
  },
  {
    id: 'liar', name: '라이어 게임', emoji: '🕵️', category: 'party', minPlayers: 3, maxPlayers: 8, duration: '15분',
    description: '혼자 제시어를 모르는 라이어를 찾아라', comingSoon: true,
  },
].map((g) => ({ category: 'mini', art: ART[g.id] || '', ...g }));

export const getGame = (id) => GAMES.find((g) => g.id === id);
