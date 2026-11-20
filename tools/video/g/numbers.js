import { person, P, move } from './_kit.js';
const nc = (n, c = '') => `<div class="ncard ${c}">${n}</div>`;
const X = [280, 520, 760, 1000], who = [0, 1, 2, 3], plays = [9, 7, 9, 5];
const people = (extra = {}) => X.map((x, i) => ({ h: person(i), x, y: 150, ...extra }));
export default {
  meta: { name: '숫자눈치게임', emoji: '🔢', sub: '미니게임 · 4~8명', pills: ['카드 <b>0~9</b> 10장', '총 <b>10라운드</b>'] },
  scenes: [
    { step: '준비', stepNo: 1, d: 5.5, cap: '모두 <i>0~9 숫자카드 10장</i>을 가지고 시작해요',
      narr: '모두 0부터 9까지, 숫자카드 열 장을 가지고 시작해요.',
      items: Array.from({ length: 10 }, (_, i) => ({ h: nc(i), x: 190 + i * 100, y: 330, at: 0.3 + i * 0.12, pop: true })) },
    { step: '몰래 내기', stepNo: 2, d: 6.5, cap: '매 라운드 <i>15초 안에</i> 카드 한 장을 몰래 내요',
      narr: '매 라운드, 십오 초 안에 카드 한 장을 몰래 내요. 시간이 끝나면 모두 동시에 공개돼요!',
      items: [...people(), { h: '<div class="tag dark">⏱ 15초</div>', x: 640, y: 560, at: 0.4, pop: true },
        ...X.map((x, i) => ({ h: nc('', 'back'), k: move({ x, y: 220, s: .4 }, { x, y: 400, s: 1 }, 1 + i * .5), at: 1 + i * .5 }))] },
    { step: '공개', stepNo: 3, d: 7.5, cap: '가장 큰 숫자가 <i>겹치면 무효!</i> 그다음 큰 숫자가 이겨요',
      narr: '가장 큰 숫자를 낸 사람이 점수를 얻어요. 그런데 가장 큰 숫자가 겹치면 무효! 겹치지 않은 그다음 큰 숫자가 이겨요.',
      items: [...people(), ...X.map((x, i) => ({ h: nc('', 'back'), flip: { at: 0.5, h: nc(plays[i]) }, x, y: 400 })),
        { h: '<div class="x s">✕</div>', x: X[0] + 52, y: 335, at: 2.4, pop: true, z: 999 }, { h: '<div class="x s">✕</div>', x: X[2] + 52, y: 335, at: 2.4, pop: true, z: 999 },
        { h: '<div class="tag red">9 겹침 → 무효</div>', x: 520, y: 530, at: 2.6, pop: true },
        { h: '<div style="width:120px;height:150px"><div class="box-ring"></div></div>', x: X[1], y: 400, at: 4.2, pulse: true },
        { h: '<div class="tag gold">+10점</div>', x: X[1], y: 60, at: 4.6, pop: true }] },
    { step: '시간 초과', stepNo: 4, d: 5.5, cap: '시간 안에 못 내면 <i>가장 작은 숫자</i>가 자동으로 나가요',
      narr: '시간 안에 내지 못하면, 남은 카드 중 가장 작은 숫자가 자동으로 나가요.',
      items: [{ h: person(3), x: 400, y: 300 }, { h: '<div class="tag dark">⏱ 0초</div>', x: 400, y: 160, at: .2 },
        ...[1, 4, 8].map((n, i) => ({ h: nc(n), x: 640 + i * 110, y: 300, at: .3, out: i ? 999 : 1.5 })),
        { h: nc(1), k: move({ x: 640, y: 300 }, { x: 640, y: 470 }, 1.6), at: 1.5, z: 900 }, { h: '<div class="tag red">자동으로 1 제출</div>', x: 900, y: 480, at: 2.3, pop: true }] },
    { step: '결과', stepNo: 5, d: 5, cap: '<i>10라운드</i> 후 점수 순위로 가넷을 받아요',
      narr: '열 라운드가 끝나면 점수 순위로, 1등 가넷 세 개, 2등 두 개, 3등 한 개를 받아요!',
      items: [{ h: '<div class="panel" style="font-size:34px">🥇 가넷 <i>3</i> &nbsp; 🥈 가넷 <i>2</i> &nbsp; 🥉 가넷 <i>1</i></div>', x: 640, y: 320, at: .3, pop: true }] },
  ],
};
