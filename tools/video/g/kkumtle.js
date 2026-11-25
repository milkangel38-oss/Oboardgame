// Duck War 게임 방법 영상
import { P, move } from './_kit.js';
const IMG = '/img/kkumtle/';
const duck = (i, w = 90, flip = false) => `<img class="dwv-duck" src="${IMG}d${i}.webp" style="width:${w}px${flip ? ';transform:scaleX(-1)' : ''}">`;
const icon = (id, h = 64) => `<img class="dwv-ic" src="${IMG}w-${id}.webp" style="height:${h}px">`;
const ground = (w, h, map = 'mountain') => `<div class="dwv-ground" style="width:${w}px;height:${h}px;background-image:url(${IMG}tex-${map}.webp)"></div>`;
const MAPS = [['city', '🏙️ 도시'], ['mountain', '⛰️ 산'], ['sky', '☁️ 하늘'], ['sea', '🌊 바다'], ['snow', '🏔️ 설산'], ['abroad', '🏜️ 해외']];
const tag = (t, c = 'gold') => `<div class="tag ${c}">${t}</div>`;
// 포물선 키프레임
const arc = (x0, y0, x1, y1, h, t0, d, n = 10, extra = {}) => {
  const k = [[0, P(x0, y0, { o: 0, ...extra })], [t0, P(x0, y0, { o: 1, ...extra })]];
  for (let i = 1; i <= n; i++) { const u = i / n; k.push([t0 + d * u, P(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u - h * 4 * u * (1 - u), { o: 1, ...extra, r: (extra.spin || 0) * u })]); }
  return k;
};
const W_ATK = ['shell', 'homing', 'grenade', 'flame', 'mine', 'pistol', 'mg', 'radio', 'chicken'];
const W_MOVE = ['tele', 'drill', 'rope', 'jet', 'chute'];
const W_UTIL = ['ladder', 'pill', 'medkit', 'tornado', 'fog'];
const SP = ['radio', 'chicken', 'jet', 'tornado', 'fog'];

export default {
  meta: { name: 'Duck War', emoji: '🦆', sub: '미니게임 · 2~6명 · 레드팀 vs 블루팀', pills: ['바람을 읽고 <b>조준 · 발사!</b>', '상대 팀을 <b>모두 쓰러뜨리면</b> 승리'] },
  scenes: [
    // 1. 대기방 · 맵
    { step: '대기방', stepNo: 1, d: 10, bg: 'duck', cap: '왼쪽 <i>레드팀</i> · 오른쪽 <i>블루팀</i> · 방장이 <i>맵</i>을 골라요',
      items: [
        { h: `<div class="dwv-team red"><b>레드팀</b><div>${duck(0, 92)}${duck(6, 92)}</div></div>`, x: 330, y: 250, at: 0.2, pop: true },
        { h: '<div class="dwv-vs">VS</div>', x: 640, y: 250, at: 0.9, pop: true },
        { h: `<div class="dwv-team blue"><b>블루팀</b><div>${duck(2, 92, true)}${duck(9, 92, true)}</div></div>`, x: 950, y: 250, at: 1.4, pop: true },
        ...MAPS.map(([m, n], i) => ({ h: `<div class="dwv-map ${m === 'mountain' ? 'pick' : ''}" style="background-image:url(${IMG}bg-${m}.webp)"><span>${n}</span></div>`, x: 228 + i * 165, y: 530, at: 4.4 + i * 0.18, pop: true, on: m === 'mountain' ? 7.6 : undefined })),
        { h: tag('👑 방장이 골라요'), x: 393, y: 455, at: 7.8, pop: true },
      ] },
    // 2. 준비 · 차례 30초
    { step: '차례', stepNo: 2, d: 7.5, bg: 'duck', cap: '모두 준비하면 시작! 두 팀이 <i>번갈아</i> · 한 번에 <i>30초</i>',
      items: [
        { h: duck(0, 130), x: 300, y: 360 }, { h: duck(2, 130, true), x: 980, y: 360 },
        { h: tag('준비 ✔', 'green'), x: 300, y: 225, at: 0.3, pop: true }, { h: tag('준비 ✔', 'green'), x: 980, y: 225, at: 0.6, pop: true },
        { h: '<div class="dwv-big">시작!</div>', x: 640, y: 200, at: 1.6, pop: true, out: 3.2 },
        { h: '<div class="dwv-timer">30</div>', x: 640, y: 330, at: 3.4, pop: true, pulse: true },
        { h: '<div class="dwv-arrow">▼</div>', k: [[0, P(300, 205)], [3.6, P(300, 205)], [5.4, P(300, 205)], [6.0, P(980, 205)]], at: 3.6 },
        { h: tag('⇄ 번갈아 가며', 'dark'), x: 640, y: 470, at: 4.4, pop: true },
      ] },
    // 3. 조이스틱 · 점프
    { step: '조작', stepNo: 3, d: 7, bg: 'duck', cap: '조이스틱으로 <i>걷기 · 조준</i> · 점프 두 번 = <i>뒤로 덤블링!</i>',
      items: [
        { h: ground(1280, 140), x: 640, y: 560, z: 1 },
        { h: '<div class="dwv-joy"><i></i></div>', x: 170, y: 380 },
        { h: '<div class="dwv-knob"></div>', k: [[0, P(170, 380)], [0.6, P(170, 380)], [1.0, P(222, 380)], [2.6, P(222, 380)], [2.9, P(170, 380)]] },
        { h: duck(1, 96), k: [[0, P(470, 444)], [0.8, P(470, 444)], [1.1, P(500, 440, { r: 6 })], [1.4, P(530, 444, { r: -6 })], [1.7, P(560, 440, { r: 6 })], [2.0, P(590, 444, { r: -6 })], [2.3, P(620, 440, { r: 6 })], [2.6, P(650, 444, { r: 0 })],
          [3.6, P(650, 444)], [4.0, P(630, 330, { r: 180 })], [4.4, P(610, 300, { r: 360 })], [4.8, P(590, 444, { r: 360 })]], z: 5 },
        { h: '<div class="dwv-key">점프 ×2</div>', x: 1080, y: 380, at: 3.3, pop: true },
        { h: tag('🤸 덤블링!'), x: 620, y: 230, at: 4.1, pop: true },
      ] },
    // 4. 각도 · 바람
    { step: '각도 · 바람', stepNo: 4, d: 7.5, bg: 'duck', cap: '동그란 원 = <i>조준 각도</i> · 아래 작은 칸 = <i>바람</i> 방향과 세기',
      items: [
        { h: `<div class="dwv-dial"><img src="${IMG}g-dial.webp"></div>`, x: 420, y: 290, at: 0.2, pop: true },
        { h: '<div class="dwv-needle"></div>', k: [[0, P(420, 290, { r: -20 })], [1.2, P(420, 290, { r: -20 })], [2.4, P(420, 290, { r: -55 })], [3.4, P(420, 290, { r: -35 })]], at: 0.4 },
        { h: tag('조준 각도'), x: 420, y: 470, at: 1.4, pop: true },
        { h: `<div class="dwv-wind"><img src="${IMG}g-wind.webp"><i class="l"></i><i class="r"></i></div>`, x: 880, y: 290, at: 3.0, pop: true, on: 4.4 },
        { h: '<div class="dwv-gust">💨 ◀◀◀</div>', x: 790, y: 190, at: 4.6, pop: true },
        { h: tag('왼쪽 바람이 세면 왼쪽이 많이 차요', 'dark'), x: 880, y: 420, at: 5.0, pop: true },
      ] },
    // 5. 파워 · 표시목
    { step: '파워 · 발사', stepNo: 5, d: 9, bg: 'duck', cap: '발사 버튼을 <i>꾹</i> → 파워가 차오르고, 떼면 발사! · <i>표시목</i>으로 힘 조절',
      items: [
        { h: `<div class="dwv-bar"><img src="${IMG}g-bar.webp"></div>`, x: 560, y: 200, at: 0.2, pop: true, z: 5 },
        ...Array.from({ length: 14 }, (_, i) => ({ h: `<div class="dwv-seg" style="background:hsl(${50 - i * 3.6},95%,55%)"></div>`, x: 290 + i * 39, y: 200, at: 0.9 + i * 0.11, z: 4 })),
        { h: `<img class="dwv-pin" src="${IMG}g-mark.webp">`, x: 680, y: 176, at: 5.6, pop: true, z: 6 },
        { h: tag('📍 표시목'), x: 680, y: 100, at: 5.8, pop: true },
        { h: '<div class="dwv-fire">꾹 눌러<br>발사</div>', x: 1110, y: 300, at: 0.4, pop: true, pulse: true },
        { h: ground(1280, 120), x: 640, y: 570, z: 1 },
        { h: duck(0, 90), x: 220, y: 470, z: 5 },
        { h: icon('shell', 40), k: arc(250, 440, 1010, 470, 300, 2.6, 2.0, 14, { r: 60 }), at: 2.6, z: 6 },
        { h: '<div class="dwv-boom"></div>', x: 1010, y: 470, at: 4.6, pop: true, out: 5.4, z: 7 },
        { h: duck(2, 90, true), k: [[0, P(1040, 470)], [4.6, P(1040, 470)], [5.2, P(1110, 400, { r: 30 })], [5.6, P(1120, 470, { r: 0 })]], z: 5 },
      ] },
    // 6. 이동 게이지
    { step: '이동', stepNo: 6, d: 6.5, bg: 'duck', cap: '<i>이동 게이지</i>는 걸을수록 줄어요 · 다 쓰면 더 못 걸어요!',
      items: [
        { h: `<div class="dwv-bar"><img src="${IMG}g-bar.webp"></div>`, x: 640, y: 180, z: 5 },
        ...Array.from({ length: 14 }, (_, i) => ({ h: '<div class="dwv-seg" style="background:linear-gradient(#8fd3ff,#2f7fd8)"></div>', x: 370 + i * 39, y: 180, out: 4.5 - i * 0.26, z: 4 })),
        { h: tag('이동'), x: 300, y: 120 },
        { h: ground(1280, 140), x: 640, y: 560, z: 1 },
        { h: duck(4, 96), k: [[0, P(330, 444)], ...Array.from({ length: 12 }, (_, i) => [0.4 + i * 0.36, P(330 + (i + 1) * 40, i % 2 ? 444 : 440, { r: i % 2 ? -6 : 6 })]), [5.0, P(810, 444, { r: 0 })]], z: 5 },
        { h: tag('0% · 더 못 걸어요!', 'red'), x: 810, y: 300, at: 5.0, pop: true },
      ] },
    // 7. 무기 창
    { step: '무기', stepNo: 7, d: 12, bg: 'duck', cap: '무기 버튼 → <i>공격 · 이동 · 유틸</i> 무기가 한가득!',
      items: [
        { h: '<div class="dwv-panel"></div>', x: 640, y: 320, at: 0.1, pop: true, z: 1 },
        ...[['공격', W_ATK, 175], ['이동', W_MOVE, 320], ['유틸', W_UTIL, 465]].flatMap(([n, ids, y], r) => [
          { h: `<div class="dwv-cat">${n}</div>`, x: 225, y, at: 0.6 + r * 0.6, pop: true, z: 3 },
          ...ids.map((id, i) => ({ h: `<div class="dwv-slot ${SP.includes(id) ? 'sp' : ''}">${icon(id, 58)}</div>`, x: 340 + i * 92, y, at: 0.8 + r * 0.6 + i * 0.08, pop: true, z: 3,
            pulse: ['shell', 'homing', 'grenade', 'rope', 'chute', 'ladder', 'medkit'].includes(id) ? undefined : undefined,
            k: ['shell', 'homing', 'grenade', 'rope', 'chute', 'ladder', 'medkit'].includes(id) ? (() => { const t = { shell: 5.0, homing: 5.6, grenade: 6.2, rope: 7.4, chute: 8.0, ladder: 8.6, medkit: 9.4 }[id]; return [[0, P(340 + i * 92, y)], [t, P(340 + i * 92, y)], [t + 0.2, P(340 + i * 92, y, { s: 1.35 })], [t + 0.5, P(340 + i * 92, y)]]; })() : undefined })),
        ]),
      ] },
    // 8. 한 번 쓰면 끝
    { step: '주의', stepNo: 8, d: 5.5, bg: 'duck', cap: '무엇이든 <i>한 번 쓰면</i> 차례가 끝나요!',
      items: [
        { h: ground(1280, 140), x: 640, y: 560, z: 1 },
        { h: duck(7, 110), x: 380, y: 434, z: 5 },
        { h: icon('grenade', 46), k: arc(420, 400, 860, 470, 200, 0.6, 1.2, 10, { r: 0, spin: 540 }), at: 0.6, z: 6 },
        { h: '<div class="dwv-boom"></div>', x: 860, y: 460, at: 1.9, pop: true, out: 2.7, z: 7 },
        { h: '<div class="dwv-big red">1번 사용 = 차례 끝!</div>', x: 640, y: 210, at: 2.4, pop: true },
        { h: tag('⏭ 다음 차례', 'dark'), x: 640, y: 320, at: 3.4, pop: true },
      ] },
    // 9. 특수무기 · 로켓배송
    { step: '특수무기', stepNo: 9, d: 10, bg: 'duck', cap: '<i>특수무기</i>는 로켓배송 헬기가 떨어뜨리는 <i>보급 상자</i>를 먹어야 써요',
      items: [
        ...SP.map((id, i) => ({ h: `<div class="dwv-slot sp lock">${icon(id, 58)}<b>🔒</b></div>`, x: 420 + i * 110, y: 150, at: 0.3 + i * 0.25, pop: true, on: 8.4 })),
        { h: ground(1280, 130), x: 640, y: 565, z: 1 },
        { h: duck(3, 92), k: [[0, P(380, 452)], [6.6, P(380, 452)], [6.9, P(420, 448, { r: 6 })], [7.2, P(460, 452, { r: -6 })], [7.5, P(500, 448, { r: 6 })], [7.8, P(530, 452, { r: 0 })]], z: 5 },
        { h: `<img src="${IMG}heli.webp" style="width:240px">`, k: [[0, P(-200, 300)], [3.0, P(-200, 300)], [5.0, P(560, 290)], [7.4, P(1500, 280)]], at: 3.0, z: 8 },
        { h: `<img src="${IMG}crate-air.webp" style="width:70px">`, k: [[0, P(560, 340, { o: 0 })], [5.0, P(560, 340, { o: 0 })], [5.05, P(560, 330, { o: 1 })], [6.6, P(560, 440, { o: 1 })], [7.7, P(560, 440, { o: 1 })], [7.9, P(560, 440, { o: 0 })]], z: 6 },
        { h: tag('📦 특수무기 획득!'), x: 560, y: 330, at: 7.9, pop: true },
      ] },
    // 10. 폭발 · 바다
    { step: '폭발', stepNo: 10, d: 7, bg: 'duck', cap: '쾅! 땅이 <i>와르르</i> 부서지고 오리는 날아가요 · 바다에 빠지면 <i>탈락!</i>',
      items: [
        { h: '<div class="dwv-sea"></div>', x: 640, y: 610, z: 1 },
        { h: `<div class="dwv-cliff" style="background-image:url(${IMG}tex-mountain.webp)"></div>`, x: 470, y: 520, z: 2 },
        { h: '<div class="dwv-hole"></div>', x: 610, y: 432, at: 1.25, z: 3 },
        { h: icon('shell', 40), k: arc(120, 150, 600, 420, 80, 0.2, 1.0, 8, { r: 120 }), at: 0.2, out: 1.2, z: 6 },
        { h: '<div class="dwv-boom"></div>', x: 610, y: 420, at: 1.2, pop: true, out: 2.0, z: 7 },
        { h: duck(8, 90), k: [[0, P(660, 380)], [1.25, P(660, 380)], ...Array.from({ length: 10 }, (_, i) => { const u = (i + 1) / 10; return [1.25 + u * 1.8, P(660 + u * 360, 380 - 260 * 4 * u * (1 - u) + u * 220, { r: u * 540 })]; })], z: 5, out: 3.1 },
        { h: '<div class="dwv-splash">💦</div>', x: 1020, y: 590, at: 3.0, pop: true },
        { h: tag('퐁당! 탈락', 'red'), x: 1020, y: 470, at: 3.4, pop: true },
      ] },
    // 11. 오리백숙
    { step: '쓰러지면', stepNo: 11, d: 5, bg: 'duck', cap: '체력이 다 떨어진 오리는… <i>오리백숙</i> 🍲',
      items: [
        { h: ground(1280, 140), x: 640, y: 560, z: 1 },
        { h: duck(11, 120), x: 640, y: 420, out: 1.6, z: 4 },
        { h: '<div class="dwv-hp"><s></s></div>', x: 640, y: 330, out: 1.6 },
        { h: '<div class="dwv-boom white"></div>', x: 640, y: 420, at: 1.5, pop: true, out: 2.2, z: 7 },
        { h: `<img src="${IMG}pot.webp" style="width:220px">`, x: 640, y: 420, at: 1.9, pop: true, z: 5 },
        { h: '<div class="dwv-steam">♨️</div>', x: 640, y: 290, at: 2.4, pop: true, pulse: true },
      ] },
    // 12. 승리 · 딜량
    { step: '승리', stepNo: 12, d: 10, bg: 'duck', cap: '상대 팀을 모두 쓰러뜨리면 <i>라운드 승리!</i> · 끝나면 <i>딜량</i> 공개',
      items: [
        { h: '<div class="dwv-big">🏆 레드팀 라운드 승리!</div>', x: 640, y: 150, at: 0.3, pop: true },
        { h: '<div class="dwv-score"><b class="r">2</b> : <b class="b">1</b></div>', x: 640, y: 250, at: 2.0, pop: true },
        { h: `<div class="dwv-res red"><h5>레드팀</h5><p><span>하나</span><em>딜 <b>186</b></em></p><p><span>두리</span><em>딜 <b>142</b></em></p></div>`, x: 470, y: 420, at: 5.6, pop: true },
        { h: `<div class="dwv-res blue"><h5>블루팀</h5><p><span>세찌</span><em>딜 <b>120</b></em></p><p><span>네모</span><em>딜 <b>64</b></em></p></div>`, x: 810, y: 420, at: 6.0, pop: true },
      ] },
  ],
};
