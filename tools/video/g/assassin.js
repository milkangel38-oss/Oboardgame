import { COLS, NAMES } from './_kit.js';
const BODY = {"cover": {"w": 162, "h": 420, "hx": 87, "hy": 28, "hr": 28}, "mafia": {"w": 196, "h": 420, "hx": 116, "hy": 24, "hr": 24}, "police": {"w": 173, "h": 420, "hx": 91, "hy": 30, "hr": 30}, "doctor": {"w": 169, "h": 420, "hx": 91, "hy": 30, "hr": 30}, "detective": {"w": 204, "h": 420, "hx": 88, "hy": 31, "hr": 31}, "lawyer": {"w": 240, "h": 420, "hx": 154, "hy": 30, "hr": 30}, "ma": {"w": 195, "h": 420, "hx": 114, "hy": 28, "hr": 28}, "prophet": {"w": 208, "h": 420, "hx": 105, "hy": 30, "hr": 29}, "coward": {"w": 163, "h": 420, "hx": 118, "hy": 32, "hr": 32}};
const H = 170;
// 직업 몸통 + 얼굴(이름 첫 글자 동그라미)
const fig = (i, key = 'cover', extra = '') => { const b = BODY[key]; const w = H * b.w / b.h, r = H * b.hr / b.h * 2.1;
  return `<div style="position:relative;width:${w}px;height:${H}px;${extra}"><img src="/img/assassin/body-${key}.webp" style="width:100%;height:100%;filter:drop-shadow(0 4px 4px rgba(0,0,0,.6))"><span style="position:absolute;left:${H * b.hx / b.h / w * 100}%;top:${b.hy / b.h * 100}%;width:${r}px;height:${r}px;transform:translate(-50%,-50%);border-radius:50%;background:${COLS[i % COLS.length]};box-shadow:0 0 0 3px #fff;display:grid;place-items:center;color:#fff;font-weight:900;font-size:${r * .55}px">${NAMES[i][0]}</span></div><div class="pname">${NAMES[i]}</div>`; };
const map = (m, dim = 0) => ({ h: `<div style="width:1280px;height:720px;background:url(/img/assassin/bg-${m}.webp) center/cover;filter:brightness(${1 - dim})"></div>`, x: 640, y: 360, z: 0 });
const dark = (x, y) => ({ h: `<div class="dark-ov" style="--sx:${x}px;--sy:${y}px"></div>`, x: 640, y: 360, z: 2000 });
const P = [{ x: 260, y: 300 }, { x: 520, y: 430 }, { x: 800, y: 280 }, { x: 1030, y: 450 }, { x: 400, y: 560 }, { x: 760, y: 580 }];
const crowd = (key = () => 'cover', extra = {}) => P.map((p, i) => ({ h: fig(i, key(i)), ...p, z: 100 + p.y, ...extra }));
const ROLE = ['mafia', 'police', 'doctor', 'detective', 'lawyer', 'ma'];
export default {
  meta: { name: '자객 마피아', emoji: '🗡️', sub: '예능 · 6~8명', pills: ['불 꺼진 저택의 <b>마피아</b>', '직업마다 <b>스킬</b>'] },
  scenes: [
    { step: '직업', stepNo: 1, d: 6, cap: '불이 꺼지면 한 명은 몰래 <i>마피아</i> · 나머지는 각자 <i>직업</i>',
      narr: '모두 준비하면 불이 꺼지고, 한 명이 몰래 마피아가 돼요. 나머지는 각자 특별한 직업을 받아요.',
      items: [map("mansion"), ...crowd((i) => "cover", { out: 1.3 }), { h: '<div style="width:1280px;height:720px;background:rgba(0,0,0,.55)"></div>', x: 640, y: 360, at: 1.2, z: 1500 },
        ...[0, 1, 2, 3, 4, 5].map((i) => ({ h: fig(i, ROLE[i]), x: 170 + i * 190, y: 330, at: 1.6 + i * .25, pop: true, z: 1600 })),
        { h: '<div class="tag red" style="font-size:24px">🗡 마피아</div>', x: 170, y: 470, at: 2, pop: true, z: 1700 }] },
    { step: '어둠', stepNo: 2, d: 8, cap: '어둠 속엔 <i>나만</i> 보여요 · 마피아는 <i>공격</i>, 시민은 <i>시체발견!</i>',
      narr: '어둠 속에서는 내 캐릭터만 보여요. 마피아는 마주친 사람을 공격하고, 시민은 쓰러진 사람을 찾아 시체발견을 외쳐요.',
      items: [map('alley'), { h: fig(0, 'mafia'), k: [[0, { x: 380, y: 380 }], [1.4, { x: 560, y: 380 }]], z: 500 }, { h: fig(2), k: [[0, { x: 680, y: 390, r: 0 }], [2, { x: 680, y: 390, r: 0 }], [2.5, { x: 700, y: 450, r: -85 }]], z: 400 },
        { h: '<div class="t big">🗡️</div>', x: 620, y: 240, at: 1.6, out: 2.6, pop: true, z: 2500 }, dark(620, 380),
        { h: fig(3), k: [[0, { x: 1000, y: 390 }], [4, { x: 1000, y: 390 }], [5.4, { x: 790, y: 400 }]], z: 600, at: 3.6 },
        { h: '<div class="t big red">시체발견!</div>', x: 820, y: 170, at: 5.6, pop: true, z: 2600 }] },
    { step: '회의·투표', stepNo: 3, d: 5, cap: '불이 켜지면 회의 · <i>마피아라고 생각하는 사람</i>에게 투표',
      narr: '불이 켜지면 회의를 하고, 마피아라고 생각하는 사람에게 투표해요.',
      items: [map('mansion', .25), ...[0, 1, 3, 4, 5].map((i, k) => ({ h: fig(i), x: 200 + k * 220, y: 300, z: 200 })),
        ...[4, 0, 1, 0, 0].map((v, k) => ({ h: `<div class="tag ${k === 0 ? 'red' : 'dark'}" style="font-size:22px">${v}표</div>`, x: 200 + k * 220, y: 470, at: 1.4 + k * .2, pop: true, z: 300 }))] },
    { step: '추방', stepNo: 4, d: 7, cap: '마피아를 뽑으면 <i>시민 승리!</i> 시민을 뽑으면 그 사람만 <i>추방</i>',
      narr: '마피아를 뽑으면 시민 승리! 시민을 뽑으면 그 사람만 쫓겨나고, 다시 불이 꺼져요.',
      items: [{ h: '<div style="width:1280px;height:720px;background:url(/img/assassin/eject-bg.webp) center/cover"></div>', x: 640, y: 360, z: 0 },
        { h: '<img src="/img/assassin/eject.webp" style="height:300px;filter:drop-shadow(0 0 4px #fff)">', k: [[0, { x: 300, y: 400, s: .9, r: 0 }], [.6, { x: 300, y: 400, s: .9, r: 0 }], [1.2, { x: 520, y: 300, s: 1, r: 120 }], [2.4, { x: 900, y: 220, s: .45, r: 420 }], [3.2, { x: 1100, y: 170, s: .1, r: 600 }]], z: 100, out: 3.3 },
        { h: '<div class="t mid">하나님은 시민이었어요.</div>', x: 640, y: 600, at: 3.4, pop: true, z: 200 }] },
    { step: '마피아 승리', stepNo: 5, d: 7, cap: '시민이 너무 적게 남으면 <i>마피아 승리!</i>',
      narr: '시민이 너무 적게 남으면 마피아 승리! 여섯 명이면 한 명, 여덟 명이면 세 명 남았을 때예요.',
      items: [map('casino', .3), { h: fig(0, 'mafia'), x: 520, y: 360, z: 300, pulse: true }, { h: fig(1), x: 760, y: 360, z: 300 },
        { h: '<div class="tag dark" style="font-size:26px">6명 → 1명 · 7명 → 2명 · 8명 → 3명</div>', x: 640, y: 580, at: 1.4, pop: true, z: 400 },
        { h: '<div class="t big red">🗡 마피아 승리!</div>', x: 640, y: 140, at: 3, pop: true, z: 400 }] },
    { step: '스킬', stepNo: 6, d: 6.5, cap: '직업마다 <i>스킬</i> · 버튼이나 <i>Ctrl</i> 키로 라운드마다 <i>1번</i>',
      narr: '직업마다 스킬이 있어요. 스킬 버튼이나 컨트롤 키로, 라운드마다 한 번 쓸 수 있어요.',
      items: [map('gallery', .35), ...['police', 'doctor', 'detective', 'coward', 'prophet'].map((r, k) => ({ h: fig(k + 1, r), x: 220 + k * 210, y: 310, at: .3 + k * .25, pop: true, z: 200 })),
        { h: '<div style="width:120px;height:120px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,#7cc3ff,#2f6fd6);color:#fff;font-size:26px;font-weight:900;box-shadow:0 6px 0 #173a7a,0 0 20px rgba(61,123,255,.6)">스킬</div>', x: 520, y: 560, at: 2, pop: true, z: 300 },
        { h: '<div class="tag dark" style="font-size:30px">⌨ Ctrl</div>', x: 760, y: 560, at: 2.4, pop: true, z: 300 }] },
    { step: '결과', stepNo: 7, d: 4.5, cap: '모든 라운드 후 <i>점수 순위</i>로 가넷',
      narr: '모든 라운드가 끝나면 점수 순위로 가넷을 받아요!',
      items: [{ h: '<div class="panel" style="font-size:34px">🥇 가넷 <i>5</i> &nbsp; 🥈 가넷 <i>4</i> &nbsp; 🥉 가넷 <i>3</i></div>', x: 640, y: 320, at: .3, pop: true }] },
  ],
};
