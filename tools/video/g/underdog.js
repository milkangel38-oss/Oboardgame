import { animalSvg, NUM_COLOR } from '/js/games/underdog-art.js';
import { CARDS, cardArt } from '/js/games/underdog.js';
import { person } from './_kit.js';
const A = (n) => `<div class="ani">${animalSvg(n, '', true)}</div>`;
const order = [3, 5, 1, 7, 2, 6, 4];
const lane = (o = order, extra = {}) => o.map((n, i) => ({ h: A(n), x: 180 + i * 150, y: 300, ...extra }));
const cd = (i) => `<div class="udw">${cardArt(CARDS[i])}</div>`;
const numCard = CARDS.findIndex((c) => c.kind === 'num' && c.animal === 3);
export default {
  meta: { name: '언더독레이스', emoji: '🏇', sub: '보드게임 · 2~6명', pills: ['동물 <b>7마리</b> 경주', '내 티켓 동물을 앞으로!'] },
  scenes: [
    { step: '경주', stepNo: 1, d: 6.5, cap: '동물 7마리가 결승선을 향해 경주! 꼴찌로 시작한 동물이 <i>🌑 다크호스</i>',
      narr: '동물 일곱 마리가 결승선을 향해 한 줄로 경주해요. 오른쪽이 결승선이고, 시작할 때 꼴찌인 동물이 다크호스예요.',
      items: [...lane().map((it, i) => ({ ...it, at: .2 + i * .15, pop: true })), { h: '<div class="tag dark">🌑 다크호스</div>', x: 180, y: 180, at: 1.8, pop: true }, { h: '<div class="t mid gold">FINISH →</div>', x: 1150, y: 440, at: 1.4 }] },
    { step: '티켓', stepNo: 2, d: 6.5, cap: '동물 <i>티켓</i>을 몰래 받아요 · 내 티켓 동물이 앞서야 점수가 높아요',
      narr: '동물 티켓을 몰래 받아요. 내 티켓 동물이 앞서야 점수가 높아요. 그리고 말을 움직이는 액션카드를 받아요.',
      items: [{ h: person(0), x: 260, y: 300 }, { h: A(5), x: 520, y: 260, at: .6, pop: true }, { h: A(2), x: 700, y: 260, at: 1, pop: true }, { h: '<div class="tag gold">🎫 내 티켓</div>', x: 610, y: 380, at: 1.4 },
        ...[0, 8, 14].map((ci, k) => ({ h: cd(ci), x: 900 + k * 120, y: 300, at: 2.4 + k * .25, pop: true }))] },
    { step: '액션카드', stepNo: 3, d: 7.5, cap: '내 차례엔 액션카드 1장을 내고 <i>효과대로 말을 옮겨요</i>',
      narr: '내 차례에는 액션카드 한 장을 공개하고, 효과대로 말을 옮겨요. 이 카드는 3번 동물을 한 칸 앞으로 보내요.',
      items: [{ h: cd(numCard), x: 640, y: 150, at: .2, pop: true },
        ...order.map((n, i) => ({ h: A(n), k: n === 3 ? [[0, { x: 180 + i * 150, y: 330 }], [1.6, { x: 180 + i * 150, y: 330 }], [2.4, { x: 180 + (i + 1) * 150, y: 330 }]] : n === 5 ? [[0, { x: 180 + i * 150, y: 330 }], [1.6, { x: 180 + i * 150, y: 330 }], [2.4, { x: 180 + (i - 1) * 150, y: 330 }]] : [[0, { x: 180 + i * 150, y: 330 }]] }))] },
    { step: '다크호스 토큰', stepNo: 4, d: 6.5, cap: '🌑 토큰: 다크호스가 <i>3등 안</i>이면 +5, 아니면 −3',
      narr: '카드를 내기 전에 다크호스 토큰을 가져올 수 있어요. 경주가 끝났을 때 다크호스가 3등 안이면 5점, 아니면 3점을 잃어요.',
      items: [{ h: A(3), x: 460, y: 300, at: .2 }, { h: '<div class="t big">🌑</div>', x: 760, y: 280, at: .8, pop: true }, { h: '<div class="panel">3등 안 <i>+5</i> &nbsp; 4등 이하 <i>−3</i></div>', x: 640, y: 470, at: 1.6, pop: true }] },
    { step: '점수', stepNo: 5, d: 7, cap: '카드를 다 쓰면 끝! 티켓 동물 순위 점수 <i>10 · 8 · 6 · 4 · 3 · 2 · 1</i>',
      narr: '모두 액션카드를 다 쓰면 경주가 끝나요. 내 티켓 동물의 순위대로 1등 10점, 2등 8점, 3등 6점처럼 점수를 받고, 토큰 점수를 더해요.',
      items: [...lane([4, 6, 2, 7, 1, 5, 3]).map((it, i) => ({ ...it, x: 1080 - i * 150, at: .2 })),
        ...[10, 8, 6, 4, 3, 2, 1].map((p, i) => ({ h: `<div class="tag ${i < 3 ? 'gold' : 'dark'}">${i + 1}등 ${p}점</div>`, x: 1080 - i * 150, y: 430, at: .8 + i * .15, pop: true }))] },
  ],
};
