// 게임 목록 — 새 게임은 numbers.js 처럼 파일을 만들고 여기에 추가하세요.
//
// 게임 모듈이 갖춰야 할 것:
//   id, name, emoji, category('mini'|'genius'|'classic'), minPlayers, maxPlayers, duration, description, rules(문자열 배열)
//   rewards: [1등 가넷, 2등 가넷, ...]
//   setup(players, room)                 → 첫 게임 상태
//   move(state, move, uid, playersMap)   → { state, result? }  (잘못된 수는 throw)
//       result = { message, winners: [uid], ranking: [{uid, score, place, garnets}], rewards: {uid: 가넷} }
//   render(el, ctx)                      → 화면 그리기. ctx = { state, me, players, finished, room, sendMove(move, {silent}) }
// 카드 그림은 art.js 에 게임 id로 추가해요.
import numbers from './numbers.js';
import { ART, CATEGORY_ART } from './art.js';

// 로비에 왼쪽부터 이 순서대로 세로 열로 나와요
export const CATEGORIES = [
  { id: 'mini', name: '미니게임', icon: '🕹️', desc: '가볍게 한 판, 짧고 신나는 게임' },
  { id: 'genius', name: '더 지니어스', icon: '🧠', desc: '심리전과 두뇌 싸움' },
  { id: 'classic', name: '클래식', icon: '♟️', desc: '오목 · 섯다, 언제 해도 재밌는 게임' },
].map((c) => ({ ...c, art: CATEGORY_ART[c.id] || '' }));

export const getCategory = (id) => CATEGORIES.find((c) => c.id === id);

export const GAMES = [
  numbers,
].map((g) => ({ art: ART[g.id] || '', ...g }));

export const getGame = (id) => GAMES.find((g) => g.id === id);
