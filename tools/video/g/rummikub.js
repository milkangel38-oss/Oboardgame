import { person } from './_kit.js';
const C = { r: '#e0303e', b: '#1f6fd6', y: '#e8961a', k: '#1e1e28' };
const t = (c, n) => c === 'J' ? '<div class="rkw"><span class="rk-tile joker red"><i>☺</i></span></div>' : `<div class="rkw"><span class="rk-tile" style="--tc:${C[c]}"><b class="${n > 9 ? 'n2' : ''}">${n}</b><i></i></span></div>`;
const row = (arr, x0, y, at0 = 0, gap = 68) => arr.map(([c, n], i) => ({ h: t(c, n), x: x0 + i * gap, y, at: at0 + i * .15, pop: true }));
export default {
  meta: { name: '루미큐브', emoji: '🀫', sub: '미니게임 · 2~4명', pills: ['타일 <b>14개</b>로 시작', '먼저 다 내면 승리'] },
  scenes: [
    { step: '타일', stepNo: 1, d: 5.5, cap: '1~13 숫자가 <i>4색</i>으로 2벌씩, 그리고 <i>조커</i> 2개',
      narr: '타일은 1부터 13까지 숫자가 네 가지 색으로 두 벌씩 있고, 조커가 두 개 있어요. 각자 열네 개로 시작해요.',
      items: row([['r', 1], ['b', 5], ['y', 9], ['k', 13], ['J', 0]], 500, 300, .3, 80) },
    { step: '조합', stepNo: 2, d: 8, cap: '<i>그룹</i>: 같은 숫자 · 다른 색 &nbsp; <i>런</i>: 같은 색 · 이어지는 숫자',
      narr: '조합은 두 가지예요. 같은 숫자, 다른 색 세 개에서 네 개는 그룹, 같은 색으로 이어지는 숫자 세 개 이상은 런이에요. 조커는 어떤 타일이든 대신해요.',
      items: [{ h: '<div class="tag gold">그룹</div>', x: 260, y: 170, at: .2 }, ...row([['r', 7], ['b', 7], ['k', 7]], 420, 170, .4),
        { h: '<div class="tag gold">런</div>', x: 260, y: 320, at: 2 }, ...row([['b', 3], ['b', 4], ['b', 5], ['b', 6]], 420, 320, 2.2),
        { h: '<div class="tag gold">조커</div>', x: 260, y: 470, at: 4.2 }, ...row([['y', 10], ['J', 0], ['y', 12]], 420, 470, 4.4)] },
    { step: '첫 등록', stepNo: 3, d: 6.5, cap: '처음엔 내 타일만으로 <i>합 30점 이상</i>을 내려놓아야 해요',
      narr: '처음 내려놓을 때는 내 손 타일만으로 합이 삼십 점 이상인 조합을 내야 해요. 못 내면 더미에서 타일 하나를 가져가요.',
      items: [...row([['r', 10], ['b', 10], ['k', 10]], 520, 280, .3), { h: '<div class="t big gold">= 30점 ✓</div>', x: 640, y: 430, at: 1.6, pop: true }] },
    { step: '재배치', stepNo: 4, d: 7, cap: '그다음부턴 바닥 조합을 <i>나누고 합치고 옮겨서</i> 새 조합을 만들어요',
      narr: '첫 등록을 한 다음부터는 바닥의 조합을 나누고, 합치고, 옮겨서 새 조합을 만들 수 있어요. 차례가 끝날 때 모든 조합이 올바르면 돼요.',
      items: [...row([['b', 3], ['b', 4], ['b', 5], ['b', 6]], 420, 250, .2),
        { h: t('b', 6), k: [[0, { x: 624, y: 250 }], [1.5, { x: 624, y: 250 }], [2.3, { x: 560, y: 420 }]], at: 0, z: 900 },
        ...row([['r', 6], ['y', 6]], 628, 420, 1), { h: '<div class="tag gold">새 그룹 완성!</div>', x: 640, y: 530, at: 3, pop: true }] },
    { step: '승리', stepNo: 5, d: 6, cap: '손 타일을 <i>먼저 모두</i> 내려놓으면 승리!',
      narr: '손 타일을 먼저 모두 내려놓으면 이겨요. 이긴 사람은 다른 사람들의 남은 타일 합만큼 점수를 얻고, 나머지는 그만큼 잃어요. 조커는 삼십 점이에요.',
      items: [{ h: person(0), x: 640, y: 260 }, { h: '<div class="t big gold">승리! 🎉</div>', x: 640, y: 420, at: .6, pop: true }] },
  ],
};
