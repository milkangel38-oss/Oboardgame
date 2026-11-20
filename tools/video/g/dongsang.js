import { person } from './_kit.js';
const X = [180, 420, 640, 860, 1100];
export default {
  meta: { name: '동상이몽퀴즈', emoji: '💭', sub: '예능 · 4~8명 협동', pills: ['맞히면 모두 <b>+10</b>', '틀리면 모두 <b>−10</b>'] },
  scenes: [
    { step: '정답자', stepNo: 1, d: 5.5, cap: '이야기를 나눠 방장이 <i>정답자</i>를 골라요',
      narr: '모두 준비되면, 이야기를 나눠 방장이 이번 라운드의 정답자를 골라요.',
      items: [{ h: person(0), x: 640, y: 260 }, { h: '<div class="tag gold" style="font-size:28px">🎯 정답자</div>', x: 640, y: 140, at: .6, pop: true },
        ...[1, 2, 3, 4].map((i, k) => ({ h: person(i), x: [240, 420, 860, 1040][k], y: 430 }))] },
    { step: '키워드', stepNo: 2, d: 8, cap: '정답자만 빼고 제시어를 보고, <i>키워드</i>를 하나씩 써요',
      narr: '정답자를 뺀 모두에게 제시어가 공개돼요. 삼십 초 안에 제시어를 떠올릴 수 있는 키워드를 하나씩 써요. 제시어 글자가 들어가면 안 돼요.',
      items: [{ h: '<div class="secret">제시어: 바다</div>', x: 640, y: 120, at: .2, pop: true }, { h: person(0), x: 120, y: 470 }, { h: '<div class="tag dark">🙈 못 봐요</div>', x: 120, y: 370, at: .4 },
        ...[1, 2, 3, 4].map((i, k) => ({ h: person(i), x: 340 + k * 210, y: 300 })),
        ...['파도', '여름', '여름휴가', '파란색'].map((w, k) => ({ h: `<div class="kw">${w}</div>`, x: 340 + k * 210, y: 450, at: 1.6 + k * .5, pop: true }))] },
    { step: '겹치면 숨김', stepNo: 3, d: 7, cap: '키워드가 <i>겹치면</i> 정답자에게 보이지 않아요!',
      narr: '다른 사람과 키워드가 겹치면, 그 키워드들은 정답자에게 보이지 않아요. 서로 안 겹치게 써야 해요!',
      items: [...['파도', '여름', '여름휴가', '파란색'].map((w, k) => ({ h: `<div class="kw">${w}</div>`, flip: k === 1 || k === 2 ? { at: 1.4, h: `<div class="kw hide">${w}</div>` } : null, x: 340 + k * 210, y: 300 })),
        { h: '<div class="tag red">"여름" 겹침 → 둘 다 숨김</div>', x: 525, y: 420, at: 2, pop: true }] },
    { step: '정답', stepNo: 4, d: 7, cap: '정답자가 맞히면 <i>모두 +10점</i>, 틀리면 모두 −10점',
      narr: '모두 제출하면 정답자가 남은 키워드를 보고 정답을 입력해요. 맞히면 모두 10점, 틀리면 모두 10점이 깎이는 협동게임이에요.',
      items: [{ h: person(0), x: 320, y: 300 }, { h: '<div class="kw">파도</div>', x: 640, y: 230, at: .2 }, { h: '<div class="kw">파란색</div>', x: 640, y: 330, at: .4 },
        { h: '<div class="bubble">바다!</div>', x: 320, y: 190, at: 1.6, pop: true }, { h: '<div class="o">○</div>', x: 960, y: 280, at: 2.4, pop: true }, { h: '<div class="tag gold" style="font-size:30px">모두 +10점</div>', x: 960, y: 400, at: 2.8, pop: true }] },
    { step: '결과', stepNo: 5, d: 5, cap: '최종 점수 <i>10점당 가넷 1개</i>를 모두 함께 받아요',
      narr: '최종 팀 점수 10점마다 모두 가넷 한 개를 받아요. 점수가 마이너스면 그만큼 줄어들어요.',
      items: [{ h: '<div class="panel" style="font-size:32px">30점 → 모두 가넷 <i>+3</i><br>−20점 → 모두 가넷 <i>−2</i></div>', x: 640, y: 300, at: .3, pop: true }] },
  ],
};
