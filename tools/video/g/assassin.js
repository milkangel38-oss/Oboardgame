import { person, ring } from './_kit.js';
const pts = [{ x: 300, y: 220 }, { x: 560, y: 380 }, { x: 820, y: 200 }, { x: 980, y: 420 }, { x: 420, y: 470 }, { x: 700, y: 520 }];
const chars = (extra = {}) => pts.map((p, i) => ({ h: person(i), ...p, ...extra }));
const dark = (x, y) => `<div class="dark-ov" style="--sx:${x}px;--sy:${y}px"></div>`;
export default {
  meta: { name: '자객 마피아', emoji: '🗡️', sub: '예능 · 6~8명', pills: ['어둠 속 마피아 찾기', '조이스틱으로 이동'] },
  scenes: [
    { step: '마피아', stepNo: 1, d: 6.5, cap: '불이 꺼지면 1명이 몰래 <i>마피아</i>가 되고 비밀 미션을 받아요',
      narr: '맵 안에서 조이스틱으로 움직여요. 불이 꺼지면 한 명이 몰래 마피아가 되고 비밀 미션을 받아요.',
      items: [...chars(), { h: dark(560, 380), x: 640, y: 360, at: 2, z: 2000 }, { h: '<div class="tag red" style="font-size:26px">🗡 당신은 마피아!</div>', x: 560, y: 260, at: 3, pop: true, z: 2500 }] },
    { step: '어둠', stepNo: 2, d: 7, cap: '어둠 속에선 <i>내 캐릭터만</i> 보여요 · 닿아 있을 때만 이름이 보여요',
      narr: '어둠 속에서는 내 캐릭터만 보여요. 누군가와 몸이 닿아 있는 동안에만 서로의 이름이 보여요. 마피아인지는 알 수 없어요.',
      items: [{ h: person(0), k: [[0, { x: 400, y: 360 }], [.5, { x: 400, y: 360 }], [2.2, { x: 580, y: 360 }]] }, { h: person(3), x: 680, y: 360, at: 2.2 },
        { h: dark(630, 360), x: 640, y: 360, z: 2000 }, { h: '<div class="tag">✋ 세찌</div>', x: 680, y: 250, at: 2.6, pop: true, z: 2500 }] },
    { step: '공격', stepNo: 3, d: 7, cap: '마피아는 마주친 순간 <i>공격!</i> 쓰러진 사람은 움직일 수 없어요',
      narr: '마피아는 마주친 순간 상호작용 버튼으로 공격해요. 공격받은 사람은 그 자리에 쓰러져 움직이거나 채팅할 수 없어요.',
      items: [{ h: person(0), x: 560, y: 360 }, { h: person(2), k: [[0, { x: 680, y: 360, r: 0 }], [1.6, { x: 680, y: 360, r: 0 }], [2.2, { x: 700, y: 400, r: 80 }]] },
        { h: '<div class="t big">🗡️</div>', x: 620, y: 300, at: 1.2, pop: true, z: 2500 }, { h: dark(620, 360), x: 640, y: 360, z: 2000 }] },
    { step: '시체발견', stepNo: 4, d: 6.5, cap: '쓰러진 사람을 살펴보면 <i>"시체발견!"</i> 불이 켜지고 모두 멈춰요',
      narr: '누군가와 닿았을 때 상호작용을 눌러 살펴보세요. 쓰러진 사람이면 시체발견을 외치고, 불이 켜지며 모두 멈춰요.',
      items: [...chars().map((it, i) => i === 2 ? { ...it, r: 80 } : it), { h: '<div class="t big red">시체발견!</div>', x: 640, y: 120, at: .5, pop: true }] },
    { step: '투표', stepNo: 5, d: 8, cap: '3분 동안 추리하고 <i>마피아라고 생각하는 사람</i>에게 투표!',
      narr: '삼 분 동안 채팅으로 추리하고, 마피아라고 생각하는 사람에게 투표해요. 모두 투표완료를 누르면 결과가 나와요. 마피아를 잡으면 시민 모두 5점, 못 잡으면 마피아가 5점!',
      items: [...[0, 1, 3, 4, 5].map((i, k) => ({ h: person(i), x: 200 + k * 220, y: 280 })), ...[0, 1, 3, 4, 5].map((i, k) => ({ h: `<div class="tag ${k === 0 ? 'red' : 'dark'}">${k === 0 ? '4표' : k === 2 ? '1표' : '0표'}</div>`, x: 200 + k * 220, y: 400, at: 1.4 + k * .2, pop: true })),
        { h: '<div class="tag gold" style="font-size:28px">마피아 검거! 시민 +5</div>', x: 640, y: 510, at: 3.6, pop: true }] },
  ],
};
