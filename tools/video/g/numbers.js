import { person, P, move } from './_kit.js';
const col = (n) => (n === '' ? '' : n % 2 ? 'blk' : 'wht');
const nc = (n, c = '') => `<div class="ncard ${c || col(n)}">${n}</div>`;
const X = [280, 520, 760, 1000], plays = [9, 6, 9, 4];
const people = (extra = {}) => X.map((x, i) => ({ h: person(i), x, y: 150, ...extra }));
const seq = (order, at = 0) => order.map((p, k) => ({ h: `<div class="seqno ${k ? '' : 'g'}">${k + 1}</div>`, x: X[p] - 80, y: 150, at: at + k * 0.15, pop: true }));
export default {
  meta: { name: '숫자눈치게임', emoji: '🔢', sub: '보드게임 · 4~8명', pills: ['카드 <b>0~9</b> 10장', '총 <b>10라운드</b>'] },
  scenes: [
    { step: '준비', stepNo: 1, d: 6, cap: '카드 <i>0~9</i> 10장 · 홀수는 <i>검정</i>, 짝수는 <i>흰색</i>',
      narr: '모두 0부터 9까지 숫자카드 열 장을 가지고 시작해요. 홀수는 검은 카드, 0을 포함한 짝수는 흰 카드예요.',
      items: Array.from({ length: 10 }, (_, i) => ({ h: nc(i), x: 190 + i * 100, y: 330, at: 0.3 + i * 0.12, pop: true })) },
    { step: '선 정하기', stepNo: 2, d: 6, cap: '가넷이 <i>가장 많은 사람</i>이 1라운드 선 플레이어를 정해요',
      narr: '처음에는 가넷을 가장 많이 가진 사람이 1라운드 선 플레이어를 정해요.',
      items: [...people(), { h: '<div class="tag gold">👑 가넷 최다</div>', x: X[0], y: 290, at: .4, pop: true },
        { h: '<div class="tag dark">누가 먼저 낼까?</div>', x: 640, y: 420, at: 1.2, pop: true },
        { h: '<div style="width:150px;height:200px"><div class="box-ring"></div></div>', x: X[2], y: 150, at: 2.6, pulse: true },
        { h: '<div class="tag green">선 플레이어!</div>', x: X[2], y: 300, at: 2.9, pop: true }] },
    { step: '차례대로 내기', stepNo: 3, d: 8, cap: '선부터 <i>입장 순서대로</i> 한 명씩, <i>30초</i> 안에 골라서 제출',
      narr: '선 플레이어부터 입장 순서대로 한 명씩, 내 차례에 삼십 초 안에 카드를 골라 제출해요. 숫자는 숨겨지지만, 카드 색은 모두에게 보여요!',
      items: [...people(), ...seq([2, 3, 0, 1], .2),
        ...[2, 3, 0, 1].map((p, k) => ({ h: nc('', 'back'), k: move({ x: X[p], y: 220, s: .4 }, { x: X[p], y: 400, s: 1 }, 1.2 + k * 1.1), at: 1.2 + k * 1.1 })),
        ...[2, 3, 0, 1].map((p, k) => ({ h: `<div class="ncard sm ${col(plays[p])}"></div>`, x: X[p] + 70, y: 520, at: 1.8 + k * 1.1, pop: true })),
        { h: '<div class="tag dark">⏱ 30초</div>', x: 640, y: 620, at: .6, pop: true }] },
    { step: '공개', stepNo: 4, d: 7.5, cap: '가장 큰 숫자가 <i>겹치면 무효!</i> 그다음 큰 숫자가 이겨요',
      narr: '모두 내면 동시에 공개! 가장 큰 숫자를 낸 사람이 10점을 얻어요. 가장 큰 숫자가 겹치면 무효, 겹치지 않은 그다음 큰 숫자가 이겨요.',
      items: [...people(), ...X.map((x, i) => ({ h: nc('', 'back'), flip: { at: 0.5, h: nc(plays[i]) }, x, y: 400 })),
        { h: '<div class="x s">✕</div>', x: X[0] + 52, y: 335, at: 2.4, pop: true, z: 999 }, { h: '<div class="x s">✕</div>', x: X[2] + 52, y: 335, at: 2.4, pop: true, z: 999 },
        { h: '<div class="tag red">9 겹침 → 무효</div>', x: 520, y: 530, at: 2.6, pop: true },
        { h: '<div style="width:120px;height:150px"><div class="box-ring"></div></div>', x: X[1], y: 400, at: 4.2, pulse: true },
        { h: '<div class="tag gold">+10점</div>', x: X[1], y: 60, at: 4.6, pop: true }] },
    { step: '다음 선', stepNo: 5, d: 5.5, cap: '라운드 <i>승자</i>가 다음 라운드 <i>선 플레이어</i>',
      narr: '점수를 얻은 사람이 다음 라운드의 선 플레이어가 돼요.',
      items: [...people(), ...seq([1, 2, 3, 0], .6), { h: '<div class="tag green">2라운드 선!</div>', x: X[1], y: 300, at: 1.2, pop: true }] },
    { step: '시간 초과', stepNo: 6, d: 5.5, cap: '시간 안에 못 내면 <i>가장 작은 숫자</i>가 자동으로 나가요',
      narr: '내 차례에 시간 안에 내지 못하면, 남은 카드 중 가장 작은 숫자가 자동으로 나가요.',
      items: [{ h: person(3), x: 400, y: 300 }, { h: '<div class="tag dark">⏱ 0초</div>', x: 400, y: 160, at: .2 },
        ...[1, 4, 8].map((n, i) => ({ h: nc(n), x: 640 + i * 110, y: 300, at: .3, out: i ? 999 : 1.5 })),
        { h: nc(1), k: move({ x: 640, y: 300 }, { x: 640, y: 470 }, 1.6), at: 1.5, z: 900 }, { h: '<div class="tag red">자동으로 1 제출</div>', x: 900, y: 480, at: 2.3, pop: true }] },
    { step: '결과', stepNo: 7, d: 5, cap: '<i>10라운드</i> 후 점수 순위로 가넷을 받아요',
      narr: '열 라운드가 끝나면 점수 순위로, 1등 가넷 세 개, 2등 두 개, 3등 한 개를 받아요!',
      items: [{ h: '<div class="panel" style="font-size:34px">🥇 가넷 <i>3</i> &nbsp; 🥈 가넷 <i>2</i> &nbsp; 🥉 가넷 <i>1</i></div>', x: 640, y: 320, at: .3, pop: true }] },
  ],
};
