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

// 로비에 왼쪽부터 이 순서대로 세로 열로 나와요
export const CATEGORIES = [
  { id: 'mini', name: '미니게임', icon: '🕹️' },
  { id: 'genius', name: '더 지니어스', icon: '🧠' },
  { id: 'classic', name: '클래식', icon: '♟️' },
];

export const GAMES = [
  { ...tictactoe, category: 'classic' },
  {
    id: 'omok', name: '오목', emoji: '⚫', category: 'classic', minPlayers: 2, maxPlayers: 2, duration: '10분',
    description: '다섯 알을 먼저 한 줄로 잇는 사람이 승리', comingSoon: true,
  },
].map((g) => ({ art: ART[g.id] || '', ...g }));

export const getGame = (id) => GAMES.find((g) => g.id === id);
