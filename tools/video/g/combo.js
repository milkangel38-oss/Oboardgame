const SH = ['circle', 'tri', 'sq'], COL = ['#e8333f', '#f5c518', '#2f6fd6'], BG = ['#f4f1ea', '#9097a3', '#1b1b22'];
const tile = (s, c, b) => {
  const f = COL[c];
  const shape = s === 0 ? `<circle cx="50" cy="50" r="30" fill="${f}"/>` : s === 1 ? `<polygon points="50,18 84,80 16,80" fill="${f}"/>` : `<rect x="22" y="22" width="56" height="56" rx="4" fill="${f}"/>`;
  return `<div class="cbt"><svg viewBox="0 0 100 100"><rect width="100" height="100" fill="${BG[b]}"/>${shape}</svg></div>`;
};
const T = [[0, 0, 0], [1, 2, 1], [2, 1, 0], [0, 1, 1], [1, 0, 2], [2, 2, 2], [0, 2, 2], [1, 1, 0], [2, 0, 1]];
const pos = (i) => ({ x: 480 + (i % 3) * 140, y: 150 + Math.floor(i / 3) * 140 });
const grid = (extra = {}) => T.map((t, i) => ({ h: tile(...t), ...pos(i), ...extra }));
const HAP = [0, 3, 6];
export default {
  meta: { name: '결합', emoji: '🔺', sub: '더 지니어스 · 1:1 데스매치', pills: ['이기면 가넷 <b>+2</b>', '지면 가넷 <b>−2</b>'] },
  scenes: [
    { step: '타일', stepNo: 1, d: 6, cap: '타일 9장에는 <i>도형 · 도형색 · 배경색</i> 3가지 속성이 있어요',
      narr: '타일 아홉 장에는 도형, 도형 색, 배경색, 이렇게 세 가지 속성이 있어요.',
      items: grid().map((it, i) => ({ ...it, at: .2 + i * .1, pop: true })) },
    { step: '합', stepNo: 2, d: 8, cap: '세 속성이 각각 <i>모두 같거나 모두 다른</i> 3장이 <i>[합]</i>!',
      narr: '타일 세 장을 골랐을 때, 세 속성이 각각 모두 같거나 모두 다르면 합이에요. 이 세 장은 도형이 모두 같고, 색과 배경은 모두 달라서 합이에요!',
      items: [...grid(), ...HAP.map((i, k) => ({ h: '<div style="width:132px;height:132px"><div class="box-ring"></div></div>', ...pos(i), at: .8 + k * .4, z: 900 })),
        { h: '<div class="panel" style="text-align:left;font-size:24px">도형: <i>모두 같음</i> ○<br>도형색: <i>모두 다름</i> ○<br>배경색: <i>모두 다름</i> ○</div>', x: 1060, y: 290, at: 2.4, pop: true },
        { h: '<div class="tag gold" style="font-size:30px">합! +1점</div>', x: 200, y: 290, at: 4.2, pop: true }] },
    { step: '결', stepNo: 3, d: 7, cap: '더 이상 합이 없으면 <i>[결!]</i> · 맞으면 <i>+3</i>, 틀리면 <i>−1</i>',
      narr: '더 이상 합이 없다고 생각하면 결을 외쳐요. 맞으면 3점을 얻고 라운드가 끝나요. 틀리면 1점이 깎이고, 10초 동안 외칠 수 없어요.',
      items: [...grid({ s: .9 }), { h: '<div class="tag blue" style="font-size:40px;padding:14px 30px">결!</div>', x: 200, y: 290, at: .5, pop: true },
        { h: '<div class="panel">맞으면 <i>+3점</i> · 라운드 종료<br>틀리면 <i>−1점</i> · 10초 대기</div>', x: 1060, y: 290, at: 1.6, pop: true }] },
    { step: '결과', stepNo: 4, d: 5, cap: '라운드가 끝나고 점수가 높은 사람이 승리!',
      narr: '정한 라운드가 끝나면 점수가 높은 사람이 이겨요. 이기면 가넷 두 개를 얻고, 지면 두 개를 잃어요.',
      items: [{ h: '<div class="panel" style="font-size:34px">승리 가넷 <i>+2</i> &nbsp;·&nbsp; 패배 가넷 <i>−2</i></div>', x: 640, y: 300, at: .3, pop: true }] },
  ],
};
