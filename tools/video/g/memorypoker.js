import { cardHtml } from '/js/games/tichu.js';
import { person } from './_kit.js';
const L = 'ABCDEFGHIJKLMNOP'.split('');
const CARDS = ['s14', 'h7', 'd10', 'c3', 'h13', 's9', 'd14', 'c12', 's5', 'h11', 'd2', 'c8', 'h14', 's12', 'd6', 'c14'];
const pos = (i) => ({ x: 340 + (i % 4) * 100, y: 120 + Math.floor(i / 4) * 125 });
const back = (i) => `<div class="mpb"><span class="mp-back"><b>${L[i]}</b></span></div>`;
const face = (i) => `<div class="tc">${cardHtml(CARDS[i])}</div>`;
const shared = ['h12', 'h10', 's11'];
export default {
  meta: { name: '기억포커', emoji: '🃏', sub: '더 지니어스 · 2~4명', pills: ['카드 <b>16장</b> 외우기', '승리 <b>+10점</b>'] },
  scenes: [
    { step: '외우기', stepNo: 1, d: 7, cap: '<i>20초</i> 동안 카드 16장의 숫자·무늬와 <i>알파벳 위치</i>를 외워요',
      narr: '매 라운드 카드 열여섯 장이 에이부터 피까지 자리에 놓여요. 이십 초 동안 앞면이 공개되니, 숫자와 무늬, 그리고 알파벳 위치를 함께 외우세요!',
      items: [...L.map((_, i) => ({ h: back(i), flip: { at: .4 + i * .05, h: face(i) }, ...pos(i) })), { h: '<div class="tag dark" style="font-size:30px">⏱ 20초</div>', x: 1010, y: 300, at: .8, pop: true }] },
    { step: '공유 카드', stepNo: 2, d: 6.5, cap: '카드가 뒤집히고, 모두가 함께 쓰는 <i>공유 카드 3장</i>이 공개돼요',
      narr: '시간이 지나면 카드가 모두 뒤집히고, 모두가 함께 쓰는 공유 카드 세 장이 공개돼요.',
      items: [...L.map((_, i) => ({ h: back(i), ...pos(i) })), { h: '<div class="t gold sm">공유 카드</div>', x: 1010, y: 110, at: .6 },
        ...shared.map((c, k) => ({ h: `<div class="tc">${cardHtml(c)}</div>`, x: 920 + k * 90, y: 210, at: .8 + k * .3, pop: true }))] },
    { step: '2곳 고르기', stepNo: 3, d: 7.5, cap: '<i>30초</i> 안에 2곳을 골라 공유 카드와 함께 <i>5장 포커 족보</i>를 만들어요',
      narr: '삼십 초 안에 두 곳을 골라 내 말을 올려요. 공유 카드 세 장과 내가 고른 두 장, 이렇게 다섯 장으로 포커 족보를 만들어요. 다른 사람과 같은 카드를 골라도 돼요.',
      items: [...L.map((_, i) => ({ h: back(i), ...pos(i), flip: (i === 4 || i === 12) ? { at: 3.2, h: face(i) } : null })),
        ...shared.map((c, k) => ({ h: `<div class="tc">${cardHtml(c)}</div>`, x: 920 + k * 90, y: 210 })),
        { h: '<div class="marker" style="background:#ff4f6e"></div>', ...pos(4), at: 1, pop: true, z: 999 }, { h: '<div class="marker" style="background:#ff4f6e"></div>', ...pos(12), at: 1.6, pop: true, z: 999 },
        { h: '<div class="tag gold" style="font-size:28px">♥ 플러시!</div>', x: 1010, y: 400, at: 4.2, pop: true }] },
    { step: '승부', stepNo: 4, d: 6.5, cap: '가장 높은 족보를 만든 사람이 <i>+10점</i>!',
      narr: '가장 높은 족보를 만든 사람이 이겨서 10점을 얻어요. 족보가 완전히 같으면 같이 이겨요.',
      items: [{ h: '<div class="panel" style="font-size:22px;text-align:left">하이카드 &lt; 원페어 &lt; 투페어 &lt; 트리플 &lt; 스트레이트<br>&lt; <i>플러시</i> &lt; 풀하우스 &lt; 포카드 &lt; 스트레이트 플러시</div>', x: 640, y: 160, at: .3, pop: true },
        ...[0, 1, 2].map((i) => ({ h: person(i), x: 400 + i * 240, y: 380 })), { h: '<div class="tag gold">+10점</div>', x: 400, y: 270, at: 1.8, pop: true }] },
    { step: '결과', stepNo: 5, d: 5, cap: '점수 순위로 가넷을 받아요',
      narr: '모든 라운드가 끝나면 점수 순위로 가넷을 받아요. 네 명이면 1등 세 개, 2등 두 개, 3등 한 개예요.',
      items: [{ h: '<div class="panel" style="font-size:32px">4명 → 🥇 <i>3</i> &nbsp; 🥈 <i>2</i> &nbsp; 🥉 <i>1</i></div>', x: 640, y: 300, at: .3, pop: true }] },
  ],
};
