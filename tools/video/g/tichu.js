import { cardHtml } from '/js/games/tichu.js';
import { person, ring } from './_kit.js';
const c = (id, cls = '') => `<div class="tc ${cls}">${cardHtml(id)}</div>`;
const S = [{ x: 640, y: 520 }, { x: 180, y: 300 }, { x: 640, y: 110 }, { x: 1100, y: 300 }];
const team = (i) => (i % 2 ? '🔵' : '🔴');
const seats = () => S.map((p, i) => ({ h: person(i) + `<div class="t sm">${team(i)}</div>`, ...p }));
export default {
  meta: { name: '티츄', emoji: '🐉', sub: '보드게임 · 4명 2:2 팀전', pills: ['마주 앉은 사람이 <b>파트너</b>', '<b>1000점</b> 먼저 도착'] },
  scenes: [
    { step: '팀', stepNo: 1, d: 6, cap: '4명이 <i>2:2 팀전</i> · 마주 앉은 사람이 내 파트너예요',
      narr: '네 명이 두 명씩 팀을 이뤄요. 마주 앉은 사람이 내 파트너예요.',
      items: [...seats(), { h: '<div class="t mid red">🔴 빨강팀</div>', x: 640, y: 300, at: 1.4, pop: true }] },
    { step: '특수 카드', stepNo: 2, d: 7.5, cap: '숫자 카드 2~A + 특수 카드 <i>참새 · 개 · 주작 · 용</i>',
      narr: '카드는 숫자 2부터 에이스까지 네 무늬, 그리고 특수 카드 참새, 개, 주작, 용이 있어요. 참새를 가진 사람이 첫 트릭을 시작하고, 용은 가장 높은 싱글 카드예요.',
      items: [...['mj', 'dog', 'ph', 'dr'].map((id, i) => ({ h: `<div class="tc" style="width:130px">${cardHtml(id)}</div>`, x: 310 + i * 220, y: 280, at: .3 + i * .3, pop: true })),
        ...['참새 = 1', '개: 선 넘기기', '주작: 만능', '용: 최강'].map((t, i) => ({ h: `<div class="tag dark">${t}</div>`, x: 310 + i * 220, y: 450, at: 1.8 + i * .3, pop: true }))] },
    { step: '티츄 선언', stepNo: 3, d: 7, cap: '1등으로 나갈 자신이 있으면 <i>티츄!</i> 성공 +100, 실패 −100',
      narr: '처음 여덟 장을 보고 그랜드 티츄를, 첫 카드를 내기 전에는 티츄를 선언할 수 있어요. 1등으로 나가면 백 점, 못 하면 백 점을 잃어요. 그랜드 티츄는 이백 점이에요.',
      items: [...seats(), { h: '<div class="bubble" style="font-size:30px">티츄!</div>', x: 640, y: 410, at: .6, pop: true },
        { h: '<div class="panel">티츄 <i>±100</i> &nbsp; 그랜드 티츄 <i>±200</i></div>', x: 640, y: 290, at: 1.8, pop: true }] },
    { step: '트릭', stepNo: 4, d: 8, cap: '앞사람과 <i>같은 조합 · 같은 장수</i>로 더 높게 내거나 패스!',
      narr: '앞사람과 같은 조합, 같은 장수로 더 높게 내거나 패스해요. 나머지가 모두 패스하면 마지막에 낸 사람이 트릭을 가져가요.',
      items: [...seats(), { h: c('s7'), x: 590, y: 300, at: .3 }, { h: c('h7'), x: 610, y: 305, at: .3 },
        { h: c('d10'), k: [[0, { x: 180, y: 300 }], [1.5, { x: 180, y: 300 }], [2.2, { x: 670, y: 290 }]], at: 1.5 }, { h: c('c10'), k: [[0, { x: 180, y: 300 }], [1.5, { x: 180, y: 300 }], [2.2, { x: 690, y: 295 }]], at: 1.5 },
        { h: '<div class="tag gold">페어 10 &gt; 페어 7</div>', x: 640, y: 420, at: 2.6, pop: true },
        { h: '<div class="tag dark">패스</div>', x: 640, y: 210, at: 4, pop: true }, { h: '<div class="tag dark">패스</div>', x: 1100, y: 420, at: 4.5, pop: true }] },
    { step: '폭탄', stepNo: 5, d: 6, cap: '💣 <i>폭탄</i>은 언제든 낼 수 있고 무엇이든 이겨요',
      narr: '같은 숫자 네 장, 또는 같은 무늬로 이어진 다섯 장은 폭탄이에요. 내 차례가 아니어도 언제든 낼 수 있고, 무엇이든 이겨요.',
      items: [...['s9', 'h9', 'd9', 'c9'].map((id, i) => ({ h: c(id), x: 520 + i * 80, y: 280, at: .3 + i * .15, pop: true })), { h: '<div class="t big">💣</div>', x: 640, y: 440, at: 1.2, pop: true }] },
    { step: '점수', stepNo: 6, d: 7, cap: '5 = <i>5점</i>, 10·K = <i>10점</i>, 용 <i>+25</i>, 주작 <i>−25</i> · 목표 점수에 먼저 닿으면 승리',
      narr: '세 명이 나가면 판이 끝나요. 5는 5점, 10과 킹은 10점, 용은 25점, 주작은 마이너스 25점이에요. 같은 팀이 1, 2등으로 나가면 원투로 이백 점! 목표 점수에 먼저 닿은 팀이 이겨요.',
      items: [...['s5', 'h10', 'd13', 'dr', 'ph'].map((id, i) => ({ h: c(id), x: 380 + i * 130, y: 230, at: .3 + i * .2, pop: true })),
        ...['5점', '10점', '10점', '+25', '−25'].map((t, i) => ({ h: `<div class="tag gold">${t}</div>`, x: 380 + i * 130, y: 350, at: 1.4 + i * .2, pop: true })),
        { h: '<div class="panel">같은 팀 1·2등 = <i>원투 200점!</i></div>', x: 640, y: 480, at: 3.2, pop: true }] },
  ],
};
