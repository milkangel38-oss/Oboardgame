import { person } from './_kit.js';
export default {
  meta: { name: '미스터리 사인', emoji: '❓', sub: '더 지니어스 · 2~4명', pills: ['숨겨진 규칙 <b>◆</b> 찾기', '정답 <b>+1</b> · 오답 <b>−1</b>'] },
  scenes: [
    { step: '문제', stepNo: 1, d: 5.5, cap: '<i>◆</i>는 숨겨진 규칙이에요. 규칙을 알아내면 승리!',
      narr: '라운드마다 엑스 마름모 와이 문제가 나와요. 마름모는 숨겨진 규칙이에요. 이 규칙을 먼저 알아내는 게임이에요.',
      items: [{ h: '<div class="eq">X <b>◆</b> Y = ?</div>', x: 640, y: 300, at: .3, pop: true }] },
    { step: '힌트 얻기', stepNo: 2, d: 7, cap: '내 차례에 숫자 두 개를 넣으면, <i>결과가 모두에게 힌트</i>로 공개돼요',
      narr: '내 차례가 되면 숫자 두 개를 넣어요. 그 숫자에 규칙을 적용한 결과가 모두에게 힌트로 공개돼요.',
      items: [{ h: person(0), x: 200, y: 300 }, { h: '<div class="bubble">3 하고 5!</div>', x: 200, y: 190, at: .4, pop: true },
        { h: '<div class="hint">3 <b>◆</b> 5 = 8</div>', x: 640, y: 180, at: 1.4, pop: true },
        { h: '<div class="hint">10 <b>◆</b> 2 = 12</div>', x: 640, y: 290, at: 3, pop: true },
        { h: '<div class="hint">7 <b>◆</b> 0 = 7</div>', x: 640, y: 400, at: 4.4, pop: true }] },
    { step: '정답', stepNo: 3, d: 7, cap: '정답은 <i>언제든</i> 낼 수 있어요 · 맞히면 <i>+1</i>, 틀리면 <i>−1</i>',
      narr: '정답은 내 차례가 아니어도 언제든 낼 수 있어요. 맞히면 1점, 틀리면 1점이 깎이지만 다시 도전할 수 있어요.',
      items: [{ h: person(1), x: 330, y: 260 }, { h: '<div class="bubble">곱하기!</div>', x: 330, y: 150, at: .4, pop: true }, { h: '<div class="x s">✕</div>', x: 330, y: 400, at: 1.2, pop: true }, { h: '<div class="tag red">−1점</div>', x: 330, y: 470, at: 1.4, pop: true },
        { h: person(2), x: 950, y: 260, at: 2.4 }, { h: '<div class="bubble">더하기!</div>', x: 950, y: 150, at: 2.8, pop: true }, { h: '<div class="o s">○</div>', x: 950, y: 400, at: 3.6, pop: true }, { h: '<div class="tag gold">+1점</div>', x: 950, y: 470, at: 3.8, pop: true }] },
    { step: '결과', stepNo: 4, d: 6, cap: '정한 라운드가 끝나면 <i>1등 가넷 3개</i>, 2등 1개!',
      narr: '힌트가 열 개 나온 뒤 삼십 초 안에 아무도 못 맞히면 라운드가 끝나요. 정한 라운드가 끝나면 1등은 가넷 세 개, 2등은 한 개를 받아요.',
      items: [{ h: '<div class="panel">힌트 10개 후 <i>30초</i> 안에 못 맞히면 라운드 끝</div>', x: 640, y: 220, at: .3, pop: true },
        { h: '<div class="panel" style="font-size:34px">🥇 가넷 <i>3</i> &nbsp; 🥈 가넷 <i>1</i></div>', x: 640, y: 380, at: 1.4, pop: true }] },
  ],
};
