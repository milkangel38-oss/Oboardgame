import { person } from './_kit.js';
export default {
  meta: { name: '초성퀴즈', emoji: '🔤', sub: '미니게임 · 2~8명', pills: ['정답 <b>+10</b>', '오답 <b>−5</b>'] },
  scenes: [
    { step: '카테고리', stepNo: 1, d: 6, cap: '카테고리를 고르면 <i>모두에게</i> 보여요',
      narr: '카테고리는 식품, 영화와 드라마, 노래 제목, 속담과 명언이 있어요. 첫 라운드는 방장이 고르고, 그다음은 정답을 맞힌 사람이 골라요.',
      items: ['🍲 식품', '🎬 영화/드라마', '🎵 노래제목', '📜 속담/명언'].map((c, i) => ({ h: `<div class="cat">${c}</div>`, x: 220 + i * 280, y: 300, at: .3 + i * .2, pop: true, on: i === 0 ? 2.2 : 99 })) },
    { step: '맞히기', stepNo: 2, d: 7.5, cap: '초성을 보고 <i>먼저 외친 사람</i>이 정답!',
      narr: '가운데 나온 초성을 보고 정답을 맞혀요. 누구나 먼저 외칠 수 있어요. 맞히면 10점, 틀리면 5점이 깎이고 10초 동안 외칠 수 없어요.',
      items: [{ h: '<div class="cho"><span>ㅅ</span><span>ㅇ</span><span>ㄲ</span></div>', x: 640, y: 210, at: .2, pop: true },
        { h: person(1), x: 330, y: 420 }, { h: '<div class="bubble">새우볶음!</div>', x: 330, y: 330, at: 1.2, pop: true }, { h: '<div class="tag red">−5점</div>', x: 330, y: 530, at: 1.8, pop: true },
        { h: person(2), x: 950, y: 420 }, { h: '<div class="bubble">새우깡!</div>', x: 950, y: 330, at: 3.4, pop: true }, { h: '<div class="tag gold">+10점</div>', x: 950, y: 530, at: 4, pop: true }] },
    { step: '힌트', stepNo: 3, d: 7, cap: '💡 힌트는 <i>모두가 동의</i>해야 받을 수 있어요',
      narr: '힌트 버튼을 누르면 다른 모든 사람에게 동의를 물어요. 한 명이라도 거부하면 받을 수 없고, 모두 동의하면 초성 공개나 관련어 중 하나를 골라요.',
      items: [{ h: '<div class="tag gold" style="font-size:30px">💡 힌트 요청</div>', x: 640, y: 150, at: .3, pop: true },
        ...[0, 1, 2, 3].map((i) => ({ h: person(i), x: 280 + i * 240, y: 330 })),
        ...[0, 1, 2, 3].map((i) => ({ h: '<div class="o s">○</div>', x: 280 + i * 240, y: 450, at: 1.2 + i * .4, pop: true })),
        { h: '<div class="panel">초성 10% · 초성 30% · 관련어 중 하나!</div>', x: 640, y: 560, at: 3.4, pop: true }] },
    { step: '결과', stepNo: 4, d: 5, cap: '점수가 높은 순서로 가넷을 받아요',
      narr: '아무도 못 맞히면 방장이 문제를 넘길 수 있어요. 점수가 높은 순서로 가넷을 받아요.',
      items: [{ h: '<div class="panel" style="font-size:34px">🥇 🥈 🥉 점수 순위로 가넷!</div>', x: 640, y: 300, at: .3, pop: true }] },
  ],
};
