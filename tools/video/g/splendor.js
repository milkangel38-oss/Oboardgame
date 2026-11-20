import { gemSvg, tokenSvg, sceneSvg, portraitSvg } from '/js/games/splendor-art.js';
import { person } from './_kit.js';
const G = ['w', 'u', 'g', 'r', 'k'];
const gem = (c, w = 64) => `<div class="gem60" style="width:${w}px">${tokenSvg(c).replace('<svg', `<svg style="width:${w}px;height:${w}px"`)}</div>`;
const card = (bonus, lv, pts, cost) => `<div class="vsc">${sceneSvg(bonus, lv)}<div class="top"><span>${pts || ''}</span>${gemSvg(bonus)}</div><div class="cost">${cost.map(([c, n]) => `<span>${gemSvg(c)}${n}</span>`).join('')}</div></div>`;
export default {
  meta: { name: '스플렌더', emoji: '💎', sub: '보드게임 · 2~4명', pills: ['보석을 모아 카드 사기', '<b>15점</b> 먼저 달성'] },
  scenes: [
    { step: '보석', stepNo: 1, d: 6, cap: '보석 5색 + <i>황금(조커)</i>',
      narr: '보석은 다이아몬드, 사파이어, 에메랄드, 루비, 오닉스 다섯 가지 색이 있고, 황금은 어떤 보석이든 대신하는 조커예요.',
      items: [...G.map((c, i) => ({ h: gem(c, 96), x: 300 + i * 140, y: 290, at: .3 + i * .2, pop: true })), { h: gem('gold', 96), x: 1000, y: 290, at: 1.5, pop: true }] },
    { step: '내 차례', stepNo: 2, d: 9, cap: '내 차례엔 <i>하나만</i>: 다른 색 3개 · 같은 색 2개 · 예약 · 카드 사기',
      narr: '내 차례에는 네 가지 중 하나만 해요. 서로 다른 색 보석 세 개 가져오기, 같은 색 보석 두 개 가져오기, 카드를 예약하고 황금 받기, 그리고 카드 사기예요.',
      items: [{ h: '<div class="tag dark">① 다른 색 3개</div>', x: 260, y: 150, at: .2 }, ...['w', 'g', 'r'].map((c, i) => ({ h: gem(c), x: 180 + i * 80, y: 250, at: .5 + i * .15, pop: true })),
        { h: '<div class="tag dark">② 같은 색 2개</div>', x: 560, y: 150, at: 1.4 }, ...[0, 1].map((i) => ({ h: gem('u'), x: 520 + i * 80, y: 250, at: 1.7 + i * .15, pop: true })),
        { h: '<div class="tag dark">③ 예약 + 황금</div>', x: 830, y: 150, at: 2.6 }, { h: card('k', 1, 0, [['w', 2], ['r', 1]]), x: 800, y: 330, at: 2.9, pop: true }, { h: gem('gold', 56), x: 890, y: 260, at: 3.2, pop: true },
        { h: '<div class="tag dark">④ 카드 사기</div>', x: 1090, y: 150, at: 3.8 }, { h: card('g', 2, 2, [['u', 3], ['w', 2]]), x: 1090, y: 330, at: 4.1, pop: true }] },
    { step: '보너스', stepNo: 3, d: 7.5, cap: '산 카드는 그 색 보석을 <i>영구 할인</i>해 줘요',
      narr: '산 카드는 그 색 보석 하나를 계속 할인해 줘요. 보너스가 쌓이면 보석 없이도 카드를 살 수 있어요. 손에 든 보석은 열 개까지예요.',
      items: [...[0, 1, 2].map((i) => ({ h: card('u', 1, 0, [['w', 1], ['k', 2]]), x: 300 + i * 70, y: 300, at: .3 + i * .3, pop: true })),
        { h: '<div class="t mid">→ 사파이어 −3</div>', x: 640, y: 300, at: 1.4, pop: true }, { h: card('w', 2, 2, [['u', 3]]), x: 960, y: 300, at: 2.4, pop: true }, { h: '<div class="tag gold">보석 없이 구매!</div>', x: 960, y: 450, at: 3.2, pop: true }] },
    { step: '귀족', stepNo: 4, d: 6, cap: '👑 보너스가 귀족 조건을 채우면 자동으로 찾아와 <i>+3점</i>',
      narr: '카드 보너스가 귀족 조건을 채우면 차례 끝에 귀족이 자동으로 찾아와 삼 점을 줘요.',
      items: [{ h: `<div class="noble">${portraitSvg(2)}<b>3</b></div>`, x: 640, y: 280, at: .3, pop: true }, { h: '<div class="tag gold" style="font-size:30px">+3점</div>', x: 640, y: 440, at: 1.2, pop: true }] },
    { step: '승리', stepNo: 5, d: 6, cap: '누군가 <i>15점</i>이 되면 그 바퀴까지 하고 끝!',
      narr: '누군가 십오 점 이상이 되면 그 바퀴를 마저 하고 게임이 끝나요. 점수가 같으면 산 카드가 적은 사람이 이겨요.',
      items: [{ h: person(0), x: 640, y: 250 }, { h: '<div class="t big gold">15점 달성!</div>', x: 640, y: 420, at: .6, pop: true }] },
  ],
};
