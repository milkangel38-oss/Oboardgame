import { walkerHtml } from '/js/games/face.js';
import { COLS, NAMES } from './_kit.js';
const W = (i, w = 110) => `<div style="width:${w}px">${walkerHtml(COLS[i], { name: NAMES[i], uid: 'u' + i })}</div>`;
const logo = (c, w = 90) => `<div class="logo" style="width:${w}px"><img src="img/stock/co${c}.webp"></div>`;
const NM = ['태양전자', '한강건설', '은하제약', '청해해운', '별빛통신'];
export default {
  meta: { name: '폭풍의 증권시장', emoji: '📈', sub: '더 지니어스 · 4~8명', pills: ['현금 <b>10,000원</b>으로 시작', '<b>2라운드</b>'] },
  scenes: [
    { step: '회사', stepNo: 1, d: 6.5, cap: '5개 회사 주식 · 모두 주당 <i>2,000원</i>에서 시작해요',
      narr: '모두 현금 만 원으로 시작해요. 시장에는 다섯 회사의 주식이 있고, 모두 주당 이천 원에서 시작해요.',
      items: NM.flatMap((n, c) => [{ h: logo(c, 120), x: 240 + c * 200, y: 230, at: .3 + c * .2, pop: true }, { h: `<div class="t sm">${n}</div>`, x: 240 + c * 200, y: 330, at: .5 + c * .2 }, { h: '<div class="price">2,000</div>', x: 240 + c * 200, y: 400, at: 1.6 }]) },
    { step: '정보교환', stepNo: 2, d: 8, cap: '두 명씩 <i>정보교환소</i>에서 같은 봉투를 골라 정보 3장을 받아요',
      narr: '라운드 전에 두 명씩 정보교환소에 들어가요. 둘이 의논해서 같은 봉투를 고르면, 주가 변동 정보 세 장을 함께 받아요. 정보는 모두 진짜예요!',
      items: [{ h: W(0), x: 300, y: 330 }, { h: W(1), x: 980, y: 330 }, ...[0, 1, 2, 3].map((i) => ({ h: `<div class="env">${i + 1}</div>`, x: 460 + i * 120, y: 220, at: .4 + i * .15, pop: true })),
        { h: '<div style="width:136px;height:100px"><div class="box-ring"></div></div>', x: 700, y: 220, at: 2, pop: true },
        ...[['1:10', 0, '+300', 'up'], ['1:25', 3, '−200', 'dn'], ['1:40', 1, '+500', 'up']].map(([t, c, d, cl], k) => ({ h: `<div class="icard">${t} ${NM[c]} <b class="${cl}">${d}</b></div>`, x: 640, y: 380 + k * 62, at: 3 + k * .4, pop: true }))] },
    { step: '대화', stepNo: 3, d: 6.5, cap: '광장을 돌아다니며 <i>비밀 대화</i> · 나눌지, 숨길지, 거짓말할지는 자유!',
      narr: '광장을 자유롭게 돌아다니며 채팅해요. 다른 사람 옆에 가면 둘만의 비밀 대화를 할 수 있어요. 정보를 나눌지, 숨길지, 거짓말할지는 자유예요.',
      items: [{ h: W(0), k: [[0, { x: 300, y: 340 }], [.4, { x: 300, y: 340 }], [2, { x: 560, y: 340 }]] }, { h: W(2), x: 660, y: 340 }, { h: '<div class="bubble">은하제약 오른대… 🤫</div>', x: 610, y: 210, at: 2.6, pop: true }] },
    { step: '거래', stepNo: 4, d: 7.5, cap: '<i>번호표</i>를 뽑고, 내 번호가 불리면 <i>거래소</i>로 가서 사고팔아요',
      narr: '거래는 증권거래소에서만 할 수 있어요. 번호표를 뽑고, 내 번호가 불리면 십 초 안에 거래소 문으로 가서 입장해요. 한 회사 주식은 일곱 주까지 가질 수 있어요.',
      items: [{ h: '<div class="t big">🎫 7번!</div>', x: 400, y: 220, at: .3, pop: true }, { h: '<div class="t mid">📢 7번 손님!</div>', x: 880, y: 220, at: 1.4, pop: true },
        { h: logo(2, 100), x: 520, y: 400, at: 2.6 }, { h: '<div class="tag" style="background:#ff4f6e;color:#fff;font-size:28px">사기</div>', x: 700, y: 400, at: 3, pop: true }, { h: '<div class="tag blue" style="font-size:28px">팔기</div>', x: 840, y: 400, at: 3.2, pop: true }] },
    { step: '주가 변동', stepNo: 5, d: 6.5, cap: '게임 시각 <i>5분마다</i> 주가가 바뀌어요',
      narr: '게임 시각 오 분, 실제로는 일 분마다 주가가 바뀌어요. 정보대로 오를 주식을 미리 사 두세요!',
      items: [{ h: logo(2, 120), x: 480, y: 300 }, { h: '<div class="price">2,000</div>', x: 720, y: 300, out: 1.6 }, { h: '<div class="price" style="color:#ff6b7a">2,500 ▲</div>', x: 740, y: 300, at: 1.8, pop: true }] },
    { step: '결과', stepNo: 6, d: 5.5, cap: '2라운드가 끝나면 주식을 현금화해서 <i>현금이 많은 순서</i>로 순위!',
      narr: '두 라운드가 끝나면 보유 주식을 마지막 주가로 현금화해서, 현금이 많은 순서로 가넷을 받아요.',
      items: [{ h: '<div class="panel" style="font-size:32px">💰 현금 순위로 🥇 🥈 🥉 가넷!</div>', x: 640, y: 300, at: .3, pop: true }] },
  ],
};
