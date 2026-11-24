import { cardHtml } from '/js/games/parade.js';
import { person, P, move } from './_kit.js';
const c = (id, w = 92, cls = '') => `<div class="pdv ${cls}" style="--w:${w}px">${cardHtml(id)}</div>`;
const ROW = ['b4', 'r9', 'g2', 'k6', 'y1', 'p8'];
const rowItems = (from = 0, extra = {}) => ROW.map((id, i) => ({ h: c(id, 92, extra[i] || ''), x: 250 + i * 112, y: 330, at: from + i * 0.08, pop: true }));
export default {
  meta: { name: '퍼레이드', emoji: '🎪', sub: '보드게임 · 2~6명', pills: ['행렬에서 <b>카드를 적게</b> 가져가라', '<b>점수가 낮을수록</b> 승리!'] },
  scenes: [
    { step: '준비', stepNo: 1, d: 5.6, bg: 'parade', cap: '각자 <i>5장</i> · 가운데에 <i>6장</i>을 늘어놓아 행렬 완성',
      items: [{ h: '<div class="pdv-back"></div>', x: 130, y: 330, pop: true }, ...rowItems(0.6),
        ...[0, 1, 2, 3, 4].map((k) => ({ h: c(['r2', 'y7', 'g5', 'b10', 'p3'][k], 70), x: 470 + k * 78, y: 560, at: 2.2 + k * 0.1, pop: true }))] },
    { step: '카드 내기', stepNo: 2, d: 6, bg: 'parade', cap: '내 차례엔 카드 1장을 행렬 <i>맨 끝</i>에 내요',
      items: [...rowItems(0), { h: c('r3', 92), k: move({ x: 640, y: 600, s: 0.8 }, { x: 922, y: 330, s: 1 }, 1.2, 0.7), at: 0.8 },
        { h: '<div class="tag gold">맨 끝에 놓기!</div>', x: 922, y: 190, at: 2, pop: true }] },
    { step: '안전한 카드', stepNo: 3, d: 6.4, bg: 'parade', cap: '낸 숫자 <i>3</i> → 끝에서 <i>3장</i>은 안전해요',
      items: [...rowItems(0, { 3: 'safe', 4: 'safe', 5: 'safe' }), { h: c('r3', 92), x: 922, y: 330 },
        { h: '<div class="pdv-bracket"><b>🛡 안전 3장</b></div>', x: 698, y: 200, at: 1.4, pop: true }] },
    { step: '가져가기', stepNo: 4, d: 7, bg: 'parade', cap: '나머지 중 <i>같은 색</i>이거나 <i>숫자가 같거나 작은</i> 카드는 내 것!',
      items: [...rowItems(0, { 1: 'take', 2: 'take', 3: 'safe', 4: 'safe', 5: 'safe' }), { h: c('r3', 92), x: 922, y: 330 },
        { h: '<div class="tag red">빨강 = 같은 색</div>', x: 362, y: 200, at: 1.2, pop: true }, { h: '<div class="tag red">2 ≤ 3</div>', x: 474, y: 470, at: 2.2, pop: true },
        { h: '<div class="tag dark">4 > 3 → 그대로</div>', x: 250, y: 470, at: 3.2, pop: true }, { h: '<div class="tag green">그다음 1장을 뽑아요</div>', x: 640, y: 600, at: 4.4, pop: true }] },
    { step: '마지막 행진', stepNo: 5, d: 6.4, bg: 'parade', cap: '<i>6색</i>을 다 모으거나 더미가 떨어지면 → 모두 <i>한 번씩 더!</i>',
      items: [...['r', 'y', 'g', 'b', 'p', 'k'].map((k, i) => ({ h: c(k + (i + 2), 70), x: 330 + i * 104, y: 300, at: 0.3 + i * 0.25, pop: true })),
        { h: '<div class="skv-yoho" style="font-size:54px">🎪 마지막 행진!</div>', x: 640, y: 500, at: 2.2, pop: true }] },
    { step: '2장 고르기', stepNo: 6, d: 6.6, bg: 'parade', cap: '손에 남은 4장 중 <i>2장</i>을 골라 내 카드에 더해요',
      items: [...['y0', 'g1', 'b9', 'k10'].map((id, i) => ({ h: c(id, 100, i < 2 ? 'pick' : 'drop'), x: 400 + i * 160, y: 330, at: 0.2 + i * 0.1, pop: true })),
        { h: '<div class="tag green">✔ 더하기</div>', x: 480, y: 500, at: 1.8, pop: true }, { h: '<div class="tag red">✕ 버리기</div>', x: 800, y: 500, at: 2.4, pop: true }] },
    { step: '점수', stepNo: 7, d: 7.4, bg: 'parade', cap: '색마다 <i>가장 많이</i> 모으면 1장당 1점 · 나머지는 숫자 그대로 · <i>낮을수록 승리!</i>',
      items: [{ h: person(0), x: 340, y: 210 }, { h: `<div class="pdv-fan">${['r8', 'r9', 'r2', 'r6'].map((x) => c(x, 62)).join('')}</div>`, x: 340, y: 380, at: 0.4, pop: true }, { h: '<div class="tag gold">빨강 최다 → 4장 = 4점</div>', x: 340, y: 520, at: 1.4, pop: true },
        { h: person(1), x: 940, y: 210 }, { h: `<div class="pdv-fan">${['r5', 'b7'].map((x) => c(x, 62)).join('')}</div>`, x: 940, y: 380, at: 2.6, pop: true }, { h: '<div class="tag red">5 + 7 = 12점</div>', x: 940, y: 520, at: 3.4, pop: true },
        { h: '<div class="skv-king">👑</div>', x: 340, y: 210, at: 4.6, pop: true }] },
  ],
};
