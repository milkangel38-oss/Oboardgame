import { personHtml } from '/js/games/face.js';
const P = (i, c, n) => `<div class="person">${personHtml(c, { name: n, uid: 'u' + i })}</div><div class="pname">${n}</div>`;
const L = [['#ff4f9a', '하나'], ['#ff4f9a', '두리'], ['#ff4f9a', '세찌']], R = [['#3d7bff', '네모'], ['#3d7bff', '다섯'], ['#3d7bff', '여섯']];
const teams = () => [...L.map(([c, n], i) => ({ h: P(i, c, n), x: 150 + i * 120, y: 330 })), ...R.map(([c, n], i) => ({ h: P(i + 3, c, n), x: 890 + i * 120, y: 330 }))];
export default {
  meta: { name: '타이핑 퀴즈', emoji: '⌨️', sub: '예능 · 6~10명 팀전', pills: ['잘생긴팀 vs 못생긴팀', '이긴 팀 가넷 <b>+2</b>'] },
  scenes: [
    { step: '팀', stepNo: 1, d: 5.5, cap: '<i>잘생긴팀</i>과 <i>못생긴팀</i>으로 나뉘어요',
      narr: '참가자를 무작위로 잘생긴팀과 못생긴팀으로 나눠요. 라운드마다 두 팀에서 한 명씩 설명자가 나와요.',
      items: [...teams(), { h: '<div class="tag" style="background:#ff4f9a;color:#fff;font-size:26px">😎 잘생긴팀</div>', x: 270, y: 170, at: .4, pop: true }, { h: '<div class="tag blue" style="font-size:26px">🤪 못생긴팀</div>', x: 1010, y: 170, at: .7, pop: true }] },
    { step: '설명', stepNo: 2, d: 7.5, cap: '두 설명자는 같은 제시어를 보고 <i>설명을 타이핑</i>해요',
      narr: '두 설명자는 같은 제시어를 보고 설명을 타이핑해요. 설명자 말고는 아무도 제시어를 볼 수 없고, 제시어나 그 일부는 쓸 수 없어요.',
      items: [...teams(), { h: '<div class="secret">제시어: 번아웃</div>', x: 640, y: 140, at: .3, pop: true },
        { h: '<div class="bubble">일을 너무 많이 해서 지친 상태</div>', x: 270, y: 220, at: 1.4, pop: true }, { h: '<div class="bubble">에너지가 다 타버림</div>', x: 1010, y: 220, at: 2.4, pop: true },
        { h: '<div class="tag red">"아웃" ✕ 쓸 수 없어요</div>', x: 640, y: 480, at: 3.6, pop: true }] },
    { step: '함정단어', stepNo: 3, d: 6.5, cap: '🪤 상대 설명자용 <i>함정단어</i>를 최대 3개 설치!',
      narr: '라운드 시작 후 이십 초 동안, 설명자는 상대 설명자가 쓸 것 같은 함정단어를 세 개까지 설치해요. 상대가 그 단어를 쓰면 설명할 수 없어요.',
      items: [...teams(), { h: '<div class="tag dark">🪤 지친 · 피곤 · 회사</div>', x: 1010, y: 200, at: .4, pop: true }, { h: '<div class="bubble">회사에서…</div>', x: 270, y: 200, at: 2, pop: true }, { h: '<div class="tag red">함정단어입니다!</div>', x: 270, y: 480, at: 2.6, pop: true }] },
    { step: '정답', stepNo: 4, d: 6.5, cap: '먼저 맞힌 사람의 팀이 <i>1점</i>! 틀리면 팀 전체 10초 금지',
      narr: '설명자 말고 누구나 정답을 외칠 수 있어요. 먼저 맞힌 사람의 팀이 1점! 틀리면 그 팀 전체가 십 초 동안 정답을 외칠 수 없어요.',
      items: [...teams(), { h: '<div class="bubble">번아웃!</div>', x: 270, y: 220, at: .6, pop: true }, { h: '<div class="tag" style="background:#ff4f9a;color:#fff;font-size:28px">잘생긴팀 +1점</div>', x: 270, y: 480, at: 1.2, pop: true }] },
    { step: '결과', stepNo: 5, d: 4.5, cap: '이긴 팀 모두 <i>가넷 +2</i>!',
      narr: '모든 라운드가 끝나면 이긴 팀 모두 가넷 두 개를 받아요.',
      items: [{ h: '<div class="panel" style="font-size:34px">🏆 이긴 팀 모두 가넷 <i>+2</i></div>', x: 640, y: 300, at: .3, pop: true }] },
  ],
};
