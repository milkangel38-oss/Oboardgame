import { CHARS } from '/js/games/merge.js';
const pl = (lv, w) => `<div class="planet" style="width:${w}px"><img src="img/planets/p${lv}.webp"></div>`;
export default {
  meta: { name: '동글동글 합체', emoji: '🪐', sub: '미니게임 · 혼자', pills: ['<b>50번</b> 떨어뜨리기', '최고 점수 랭킹'] },
  scenes: [
    { step: '떨어뜨리기', stepNo: 1, d: 6, cap: '천체를 <i>50번</i> 떨어뜨릴 수 있어요',
      narr: '천체를 쉰 번 떨어뜨릴 수 있어요. 떨어뜨린 뒤 모두 멈춰야 다음 천체를 떨어뜨릴 수 있어요.',
      items: [{ h: '<div style="width:380px;height:440px;border-radius:0 0 24px 24px;border:5px solid rgba(255,255,255,.3);border-top:0"></div>', x: 640, y: 330 },
        { h: pl(2, 90), k: [[0, { x: 600, y: 90 }], [1, { x: 600, y: 90 }], [2, { x: 600, y: 500 }]] }, { h: pl(0, 50), k: [[0, { x: 720, y: 90 }], [2.6, { x: 720, y: 90 }], [3.4, { x: 700, y: 520 }]], at: 2.4 }] },
    { step: '합체', stepNo: 2, d: 7, cap: '같은 천체끼리 닿으면 <i>한 단계 큰 천체</i>로 합쳐져요!',
      narr: '같은 천체끼리 닿으면 합쳐져서 한 단계 큰 천체가 돼요. 합칠 때마다 점수를 얻고, 큰 천체를 만들수록 점수가 커져요.',
      items: [{ h: pl(3, 110), k: [[0, { x: 540, y: 300 }], [1, { x: 540, y: 300 }], [1.6, { x: 640, y: 300, o: 0 }]] }, { h: pl(3, 110), k: [[0, { x: 740, y: 300 }], [1, { x: 740, y: 300 }], [1.6, { x: 640, y: 300, o: 0 }]] },
        { h: pl(4, 150), x: 640, y: 300, at: 1.6, pop: true }, { h: '<div class="tag gold" style="font-size:30px">+점수!</div>', x: 640, y: 450, at: 1.9, pop: true }] },
    { step: '11단계', stepNo: 3, d: 7, cap: '별가루 → 운석 → 달 → … → 태양 → <i>블랙홀</i>',
      narr: '천체는 별가루부터 블랙홀까지 열한 단계예요. 떨어지는 건 작은 다섯 가지뿐이고, 큰 천체는 합쳐서만 만들 수 있어요. 블랙홀 둘을 합치면 삼백 점 보너스!',
      items: CHARS.map((ch, i) => ({ h: pl(i, 40 + i * 9) + `<div class="t sm">${ch.name}</div>`, x: 110 + i * 106, y: 300, at: .3 + i * .2, pop: true })) },
    { step: '보너스', stepNo: 4, d: 6, cap: '<i>450점, 1,000점</i>을 넘을 때마다 <i>30번</i> 더!',
      narr: '점수가 사백오십 점, 천 점을 넘을 때마다 서른 번씩 더 떨어뜨릴 수 있어요. 천체가 상자 밖으로 넘친 채 멈추면 게임이 끝나요.',
      items: [{ h: '<div class="t big gold">450점 → +30번</div>', x: 640, y: 230, at: .3, pop: true }, { h: '<div class="t big gold">1,000점 → +30번</div>', x: 640, y: 380, at: 1.4, pop: true }] },
    { step: '랭킹', stepNo: 5, d: 4.5, cap: '최고 점수는 <i>랭킹</i>에 올라가요',
      narr: '최고 점수는 내 프로필에 저장되고 랭킹에 올라가요.',
      items: [{ h: '<div class="panel" style="font-size:34px">🏆 최고 점수 랭킹 도전!</div>', x: 640, y: 300, at: .3, pop: true }] },
  ],
};
