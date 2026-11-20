import { tileHtml } from '/js/games/lexio.js';
import { person } from './_kit.js';
const t = (id) => `<div class="lxw">${tileHtml(id)}</div>`;
export default {
  meta: { name: '렉시오', emoji: '🀄', sub: '보드게임 · 3~5명', pills: ['칩 <b>100개</b>로 시작', '타일을 먼저 다 내면 승리'] },
  scenes: [
    { step: '타일', stepNo: 1, d: 7, cap: '숫자는 <i>3이 가장 약하고 2가 가장 강해요</i> · 같으면 해 &gt; 달 &gt; 별 &gt; 구름',
      narr: '타일에는 해, 달, 별, 구름 네 가지 무늬와 숫자가 있어요. 3이 가장 약하고, 큰 숫자 다음 1, 그리고 2가 가장 강해요. 숫자가 같으면 해, 달, 별, 구름 순서로 강해요.',
      items: [...['cloud-3', 'star-4', 'moon-8', 'sun-9', 'cloud-1', 'sun-2'].map((id, i) => ({ h: t(id), x: 250 + i * 156, y: 220, at: .3 + i * .25, pop: true })),
        { h: '<div class="t mid">약함 ←────────────→ 강함</div>', x: 640, y: 350, at: 2 },
        ...['sun-7', 'moon-7', 'star-7', 'cloud-7'].map((id, i) => ({ h: t(id), x: 400 + i * 160, y: 470, at: 3.4 + i * .2, pop: true }))] },
    { step: '시작', stepNo: 2, d: 6.5, cap: '<i>구름 3</i>을 가진 사람이 먼저 내요',
      narr: '구름 3을 가진 사람이 먼저 원하는 조합을 내요. 조합은 한 장, 두 장, 세 장, 다섯 장이에요. 네 장은 낼 수 없어요.',
      items: [{ h: person(1), x: 300, y: 280 }, { h: t('cloud-3'), k: [[0, { x: 300, y: 450 }], [1, { x: 300, y: 450 }], [1.8, { x: 640, y: 300 }]] },
        { h: '<div class="panel">싱글 · 페어 · 트리플 · 5장 족보 <i>(4장 ✕)</i></div>', x: 640, y: 500, at: 2.4, pop: true }] },
    { step: '이어 내기', stepNo: 3, d: 7.5, cap: '같은 장수로 <i>더 강하게</i> 내거나 패스!',
      narr: '다음 사람부터 같은 장수로 더 강한 조합을 내거나 패스해요. 나머지 모두가 패스하면 마지막으로 낸 사람이 새로 선이 돼요.',
      items: [{ h: t('star-6'), x: 520, y: 300, at: .2 }, { h: t('moon-6'), x: 600, y: 300, at: .2 },
        { h: t('sun-9'), k: [[0, { x: 640, y: 560 }], [1, { x: 640, y: 560 }], [1.7, { x: 720, y: 290 }]], at: 1 }, { h: t('cloud-9'), k: [[0, { x: 720, y: 560 }], [1, { x: 720, y: 560 }], [1.7, { x: 800, y: 290 }]], at: 1 },
        { h: '<div class="tag gold">페어 9 &gt; 페어 6</div>', x: 760, y: 170, at: 2.2, pop: true },
        { h: '<div class="tag dark">패스</div>', x: 260, y: 300, at: 3.6, pop: true }, { h: '<div class="tag dark">패스</div>', x: 1040, y: 300, at: 4, pop: true }] },
    { step: '정산', stepNo: 4, d: 7, cap: '누군가 다 내면 끝! <i>남은 타일 수 차이</i>만큼 칩을 주고받아요',
      narr: '누군가 타일을 다 내면 라운드가 끝나요. 모두 서로 남은 타일 수 차이만큼 칩을 주고받아요. 2를 들고 있으면 2 하나마다 두 배씩 더 줘야 해요!',
      items: [{ h: person(0), x: 300, y: 280 }, { h: '<div class="tag gold">남은 타일 0개</div>', x: 300, y: 400, at: .3 },
        { h: person(2), x: 900, y: 280 }, { h: '<div class="tag red">남은 타일 4개</div>', x: 900, y: 400, at: .3 },
        { h: '<div class="t mid gold">칩 4개 →</div>', x: 600, y: 280, at: 1.4, pop: true }, { h: '<div class="panel">2를 들고 있으면 <i>2배씩</i> 더!</div>', x: 640, y: 520, at: 3, pop: true }] },
    { step: '결과', stepNo: 5, d: 5, cap: '정한 라운드가 끝나면 <i>칩이 많은 순서</i>로 가넷!',
      narr: '모두 칩 백 개로 시작해요. 정한 라운드가 끝나면 칩이 많은 순서로 가넷을 받아요.',
      items: [{ h: '<div class="panel" style="font-size:32px">칩 순위로 🥇 🥈 🥉 가넷!</div>', x: 640, y: 300, at: .3, pop: true }] },
  ],
};
