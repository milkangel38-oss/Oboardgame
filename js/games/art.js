// 게임 카드 일러스트 (직접 그린 SVG) — 게임을 추가하면 여기에 그림도 추가하세요.
// viewBox 300x420 기준, 카드 크기에 맞춰 잘려서 보여요.

import { HANDSOME, GOOFY } from './typing.js';
import { animalSvg } from './underdog-art.js';

const nest = (svg, x, y, w, h) => svg.replace('<svg viewBox="0 0 120 150"', `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 120 150"`);

export const ART = {
  // 그림 이어그리기: 예능 스튜디오 칸막이와 화이트보드
  drawrelay: (() => {
    const bulbs = Array.from({ length: 13 }, (_, i) => `<circle cx="${12 + i * 23}" cy="22" r="5" fill="${i % 2 ? '#ffd84d' : '#ff5fa2'}"/>`).join('');
    const seat = (x, c) => `<g transform="translate(${x} 250)"><circle cx="0" cy="0" r="17" fill="#ffe0c2"/><path d="M-24 58 Q-22 20 0 20 Q22 20 24 58 Z" fill="${c}"/><circle cx="-6" cy="-3" r="2.2" fill="#333"/><circle cx="6" cy="-3" r="2.2" fill="#333"/><path d="M-6 7 Q0 12 6 7" stroke="#333" stroke-width="2" fill="none"/></g>`;
    return `<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="drg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a0f6a"/><stop offset="1" stop-color="#ff4f9a"/></linearGradient></defs>
  <rect width="300" height="420" fill="url(#drg)"/>${bulbs}
  <path d="M60 40 L20 420 M240 40 L280 420" stroke="rgba(255,255,255,.08)" stroke-width="60"/>
  <rect x="50" y="62" width="200" height="140" rx="10" fill="#fff" stroke="#c9c9d6" stroke-width="6"/>
  <path d="M90 170 Q110 90 150 120 T210 110" stroke="#1d1d24" stroke-width="6" fill="none" stroke-linecap="round"/><circle cx="150" cy="150" r="22" stroke="#1d1d24" stroke-width="5" fill="none"/>
  <rect x="-10" y="318" width="320" height="110" fill="#2a1a4a"/>
  ${seat(55, '#e8443a')}${seat(150, '#2f6fe0')}${seat(245, '#2fae5f')}
  <rect x="98" y="222" width="7" height="110" fill="#ffd84d"/><rect x="195" y="222" width="7" height="110" fill="#ffd84d"/>
  <rect x="-10" y="318" width="320" height="10" fill="#ffd84d"/></svg>`;
  })(),
  // 퍼레이드: 줄지어 선 색색의 카드
  parade: (() => {
    const C = [['#e0384a', '🥁', 7], ['#f2b821', '🎺', 2], ['#2fae5f', '🎈', 9], ['#2f7fe0', '⭐', 4], ['#8a4fd8', '🚩', 0], ['#3a3a46', '🎩', 10]];
    const cards = C.map(([c, ic, v], i) => `<g transform="translate(${28 + i * 42} ${150 + Math.sin(i) * 14}) rotate(${(i - 2.5) * 6})"><rect width="64" height="96" rx="8" fill="#fffaf0" stroke="${c}" stroke-width="5"/><text x="9" y="22" font-size="17" font-weight="900" fill="${c}">${v}</text><text x="32" y="62" font-size="28" text-anchor="middle">${ic}</text></g>`).join('');
    return `<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="pdg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1050"/><stop offset="1" stop-color="#6a1f5c"/></linearGradient></defs>
  <rect width="300" height="420" fill="url(#pdg)"/>
  ${Array.from({ length: 14 }, (_, i) => `<path d="M${i * 24} 40 l12 26 l12 -26 z" fill="${['#e0384a', '#f2b821', '#2fae5f', '#2f7fe0'][i % 4]}"/>`).join('')}
  <path d="M0 40 Q150 70 300 40" stroke="#fff" stroke-width="2" fill="none" opacity=".5"/>
  ${cards}
  <rect y="320" width="300" height="100" fill="#3a1236"/><path d="M0 320 h300" stroke="#f2b821" stroke-width="3" stroke-dasharray="14 10"/></svg>`;
  })(),
  // 오목: 나무 바둑판 위 흑백 돌
  omok: (() => {
    const g = Array.from({ length: 9 }, (_, k) => `<line x1="30" y1="${70 + k * 34}" x2="270" y2="${70 + k * 34}"/><line x1="${30 + k * 30}" y1="70" x2="${30 + k * 30}" y2="342"/>`).join('');
    const st = (x, y, w) => `<circle cx="${30 + x * 30}" cy="${70 + y * 34}" r="13" fill="url(#${w ? 'ow' : 'ob'})"/>`;
    return `<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="ob" cx=".35" cy=".3"><stop offset="0" stop-color="#666"/><stop offset="1" stop-color="#0a0a0a"/></radialGradient><radialGradient id="ow" cx=".35" cy=".3"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c9c4b8"/></radialGradient></defs>
  <rect width="300" height="420" fill="#2a1a0e"/><rect x="14" y="54" width="272" height="304" rx="8" fill="#e0b870"/>
  <g stroke="#5a3a18" stroke-width="1.6">${g}</g>
  ${st(2, 2)}${st(3, 3)}${st(4, 4)}${st(5, 5)}${st(6, 6)}${st(3, 2, 1)}${st(4, 3, 1)}${st(2, 4, 1)}${st(5, 4, 1)}${st(6, 5, 1)}
  <line x1="90" y1="138" x2="210" y2="274" stroke="#ff4f6e" stroke-width="5" stroke-linecap="round" opacity=".8"/></svg>`;
  })(),
  // 장기: 나무판 위 초·한 장수
  janggi: (() => {
    const g = Array.from({ length: 9 }, (_, k) => `<line x1="${40 + k * 27.5}" y1="40" x2="${40 + k * 27.5}" y2="380"/>`).join('') + Array.from({ length: 10 }, (_, k) => `<line x1="40" y1="${40 + k * 37.8}" x2="260" y2="${40 + k * 37.8}"/>`).join('');
    const pc = (x, y, t, col, s = 22) => `<g transform="translate(${x} ${y})"><polygon points="${[0, 1, 2, 3, 4, 5, 6, 7].map((k) => { const a = Math.PI / 8 + k * Math.PI / 4; return `${(Math.cos(a) * s).toFixed(1)},${(Math.sin(a) * s).toFixed(1)}`; }).join(' ')}" fill="#f3dca8" stroke="${col}" stroke-width="3"/><text y="${s * 0.36}" text-anchor="middle" font-size="${s}" font-weight="900" fill="${col}" font-family="serif">${t}</text></g>`;
    return `<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="420" fill="#3a2412"/><rect x="20" y="22" width="260" height="376" rx="8" fill="#e6c27e"/>
  <g stroke="#6a4520" stroke-width="1.5">${g}<line x1="122.5" y1="40" x2="177.5" y2="115.6"/><line x1="177.5" y1="40" x2="122.5" y2="115.6"/><line x1="122.5" y1="304.4" x2="177.5" y2="380"/><line x1="177.5" y1="304.4" x2="122.5" y2="380"/></g>
  ${pc(150, 77.8, '漢', '#c8102e', 28)}${pc(67.5, 40, '車', '#c8102e')}${pc(122.5, 191, '包', '#c8102e')}${pc(232.5, 153, '馬', '#c8102e')}
  ${pc(150, 342, '楚', '#0a7a3a', 28)}${pc(232.5, 380, '車', '#0a7a3a')}${pc(177.5, 229, '包', '#0a7a3a')}${pc(67.5, 266, '卒', '#0a7a3a', 17)}</svg>`;
  })(),
  // 동글동글 합체: 별이 빛나는 상자 속에 쌓인 행성들
  merge: (() => {
    const put = (lv, x, y, sz) => { const S = sz * 1.6; return `<image href="img/planets/p${lv}.webp" x="${x - S / 2}" y="${y - S / 2}" width="${S}" height="${S}"/>`; };
    const stars = [[30, 40], [80, 20], [250, 30], [270, 120], [20, 160], [120, 110], [200, 90], [60, 260], [280, 260]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 ? 1.2 : 2}" fill="#fff" opacity=".8"/>`).join('');
    return `<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="420" fill="#120c2e"/><circle cx="90" cy="120" r="150" fill="#5a2a8a" opacity=".35"/><circle cx="230" cy="320" r="150" fill="#1e4a9a" opacity=".35"/>${stars}
  <rect x="40" y="80" width="220" height="300" rx="10" fill="rgba(255,255,255,.06)" stroke="#e8cf8a" stroke-width="3"/>
  ${put(9, 100, 318, 112)}${put(8, 205, 330, 96)}${put(6, 212, 248, 70)}${put(4, 118, 236, 58)}${put(3, 162, 205, 48)}${put(2, 82, 198, 38)}${put(1, 215, 192, 30)}${put(0, 245, 208, 24)}${put(10, 150, 58, 84)}
</svg>`;
  })(),

  // 아발론: 달밤의 성 + 원탁 + 검과 단검
  avalon: `
<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="avSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1236"/><stop offset="1" stop-color="#3a1f4a"/></linearGradient></defs>
  <rect width="300" height="420" fill="url(#avSky)"/>
  <circle cx="230" cy="70" r="30" fill="#f6eec8"/><circle cx="242" cy="62" r="26" fill="#0d1236" opacity=".25"/>
  <g fill="#1a1530">
    <rect x="60" y="120" width="180" height="140"/>
    ${[60, 90, 120, 150, 180, 210].map((x) => `<rect x="${x}" y="110" width="18" height="14"/>`).join('')}
    <rect x="40" y="90" width="40" height="170"/><rect x="220" y="90" width="40" height="170"/>
    <polygon points="40,90 60,50 80,90"/><polygon points="220,90 240,50 260,90"/>
    <rect x="125" y="70" width="50" height="60"/><polygon points="125,70 150,25 175,70"/>
  </g>
  <rect x="138" y="200" width="24" height="60" rx="12" fill="#f2c86a" opacity=".85"/>
  <ellipse cx="150" cy="335" rx="110" ry="38" fill="#6b4a2a"/><ellipse cx="150" cy="328" rx="110" ry="38" fill="#8a6234"/>
  <g transform="translate(118 300) rotate(-25)"><rect x="-3" y="-60" width="7" height="62" fill="#dfe6f2"/><rect x="-14" y="0" width="28" height="6" rx="2" fill="#3d7bff"/><rect x="-2.5" y="6" width="5" height="16" fill="#5a3a22"/></g>
  <g transform="translate(184 300) rotate(25)"><rect x="-3" y="-44" width="6" height="46" fill="#dfe6f2"/><rect x="-11" y="0" width="22" height="5" rx="2" fill="#ff4f6e"/><rect x="-2.5" y="5" width="5" height="12" fill="#3a1a12"/></g>
</svg>`,

  // 루미큐브: 나무 받침대 위 숫자 타일들 (직접 그린 타일)
  rummikub: `
<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="420" fill="#1f5a46"/>
  <rect x="0" y="0" width="300" height="420" fill="url(#rkFelt)" opacity=".25"/>
  <defs><pattern id="rkFelt" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#0c3326"/></pattern></defs>
  ${[['#e0303e', 7], ['#1f6fd6', 7], ['#1e1e28', 7], ['#e8961a', 7]].map(([c, n], i) => `<g transform="translate(${34 + i * 60} 70) rotate(${(i - 1.5) * 5})"><rect width="50" height="70" rx="7" fill="#fbf6e9" stroke="#c9bfa3" stroke-width="2"/><text x="25" y="46" text-anchor="middle" font-family="'Black Han Sans', sans-serif" font-size="34" fill="${c}">${n}</text><circle cx="25" cy="58" r="3" fill="${c}"/></g>`).join('')}
  ${[3, 4, 5, 6].map((n, i) => `<g transform="translate(${40 + i * 56} 200)"><rect width="50" height="70" rx="7" fill="#fbf6e9" stroke="#c9bfa3" stroke-width="2"/><text x="25" y="46" text-anchor="middle" font-family="'Black Han Sans', sans-serif" font-size="34" fill="#1f6fd6">${n}</text><circle cx="25" cy="58" r="3" fill="#1f6fd6"/></g>`).join('')}
  <g transform="translate(125 300) rotate(8)"><rect width="50" height="70" rx="7" fill="#fbf6e9" stroke="#c9bfa3" stroke-width="2"/><circle cx="25" cy="32" r="15" fill="#e0303e"/><circle cx="20" cy="29" r="2" fill="#fff"/><circle cx="30" cy="29" r="2" fill="#fff"/><path d="M18 36 Q25 42 32 36" stroke="#fff" stroke-width="2" fill="none"/></g>
  <rect x="10" y="380" width="280" height="22" rx="6" fill="#8a5a2a"/>
</svg>`,


  // 폭풍의 증권시장: 번개 치는 밤하늘 아래 오르내리는 주가 그래프 + 거래소 건물
  stock: `
<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="sxSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1030"/><stop offset="1" stop-color="#23164a"/></linearGradient></defs>
  <rect width="300" height="420" fill="url(#sxSky)"/>
  <path d="M60 30 L48 70 L62 70 L50 110" stroke="#ffe07a" stroke-width="5" fill="none" stroke-linejoin="round"/>
  <path d="M240 20 L228 55 L242 55 L232 90" stroke="#ffe07a" stroke-width="4" fill="none" stroke-linejoin="round" opacity=".8"/>
  <g transform="translate(70 250)">
    <polygon points="80,-60 170,-20 -10,-20" fill="#c9a85a"/>
    <rect x="0" y="-20" width="160" height="12" fill="#e8cf8a"/>
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="${10 + i * 32}" y="-6" width="14" height="90" fill="#e9e3d0"/>`).join('')}
    <rect x="-6" y="84" width="172" height="14" fill="#c9a85a"/>
    <text x="80" y="-30" text-anchor="middle" font-family="'Black Han Sans', sans-serif" font-size="13" fill="#3a2a10">증권거래소</text>
  </g>
  <polyline points="10,220 50,180 80,200 120,130 150,160 190,90 230,120 290,60" fill="none" stroke="#3ddc84" stroke-width="6" stroke-linejoin="round"/>
  <polyline points="10,250 60,240 100,270 140,230 190,260 240,215 290,240" fill="none" stroke="#ff4f6e" stroke-width="4" stroke-linejoin="round" opacity=".85"/>
  <circle cx="290" cy="60" r="7" fill="#3ddc84"/>
  <text x="150" y="395" text-anchor="middle" font-family="'Black Han Sans', sans-serif" font-size="30" fill="#ffe07a">▲ ▼</text>
</svg>`,

  // 동상이몽퀴즈: 화이트보드를 든 세 사람 + 가운데 물음표
  dongsang: `
<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="420" fill="#123a2a"/>
  <circle cx="150" cy="150" r="160" fill="#1c5a40" opacity=".6"/>
  ${[[60, '#ff4f6e', '빨강'], [150, '#3d7bff', '사과'], [240, '#ffb02e', '과일']].map(([x, c, w], i) => `<g transform="translate(${x} ${i === 1 ? 250 : 270})">
    <rect x="-38" y="-150" width="76" height="46" rx="5" fill="#fdfdfb" stroke="#b9bcc4" stroke-width="3"/>
    <text y="-119" text-anchor="middle" font-family="'Black Han Sans', sans-serif" font-size="20" fill="#1a1033">${i === 1 ? '✖' : w}</text>
    <path d="M-22 -104 L-16 -60 M22 -104 L16 -60" stroke="#ffe0bd" stroke-width="6" stroke-linecap="round"/>
    <path d="M-30 40 Q-30 -10 0 -10 Q30 -10 30 40Z" fill="${c}"/>
    <circle cy="-32" r="24" fill="#ffe0bd"/>
    <path d="M-25 -28 Q-26 -60 0 -60 Q26 -60 25 -28 Q20 -46 0 -46 Q-20 -46 -25 -28Z" fill="${c}"/>
    <circle cx="-8" cy="-30" r="3" fill="#2a2030"/><circle cx="8" cy="-30" r="3" fill="#2a2030"/></g>`).join('')}
  <text x="150" y="380" text-anchor="middle" font-family="'Black Han Sans', sans-serif" font-size="64" fill="#3ddc84" opacity=".9">?</text>
</svg>`,

  // 자객 마피아: 어두운 저택 바닥 + 손전등 빛 + 두건 쓴 자객 실루엣
  assassin: `
<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="amL" cx=".5" cy=".55" r=".45"><stop offset="0" stop-color="#ffe7a8" stop-opacity=".55"/><stop offset="1" stop-color="#ffe7a8" stop-opacity="0"/></radialGradient></defs>
  <rect width="300" height="420" fill="#07070f"/>
  ${Array.from({ length: 12 }, (_, i) => `<rect x="0" y="${i * 36}" width="300" height="35" fill="#151223"/>`).join('')}
  <circle cx="150" cy="240" r="170" fill="url(#amL)"/>
  <g transform="translate(150 250)">
    <ellipse cy="78" rx="46" ry="9" fill="rgba(0,0,0,.5)"/>
    <path d="M-44 76 Q-44 6 0 6 Q44 6 44 76Z" fill="#2b2140"/>
    <circle cy="-24" r="38" fill="#ffe0bd"/>
    <path d="M-40 -18 Q-42 -72 0 -72 Q42 -72 40 -18 Q32 -50 0 -50 Q-32 -50 -40 -18Z" fill="#2b2140"/>
    <path d="M-36 -26 Q0 -10 36 -26 L36 -36 Q0 -20 -36 -36Z" fill="#120d1f"/>
    <circle cx="-13" cy="-26" r="5" fill="#2a2030"/><circle cx="13" cy="-26" r="5" fill="#2a2030"/>
    <g transform="translate(52 22) rotate(35)"><rect x="-4" y="-46" width="8" height="44" rx="2" fill="#dfe6f2"/><rect x="-12" y="-4" width="24" height="6" rx="2" fill="#c9a85a"/><rect x="-3" y="2" width="6" height="16" rx="2" fill="#5a3a22"/></g>
  </g>
  <text x="70" y="110" font-size="34">💀</text><text x="215" y="150" font-size="30">❗</text>
</svg>`,

  // 기억포커: 남색 카드 뒷면 격자 + 뒤집힌 카드 한 장
  memorypoker: `
<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="420" fill="#0f1a3a"/>
  ${'ABCDEFGHIJKLMNOP'.split('').map((l, i) => `<g transform="translate(${18 + (i % 4) * 68} ${60 + Math.floor(i / 4) * 86})"><rect width="58" height="78" rx="6" fill="#16264f" stroke="#c9a85a" stroke-width="1.5" opacity=".9"/><text x="29" y="50" text-anchor="middle" font-family="Georgia, serif" font-size="34" fill="#c9a85a">${l}</text></g>`).join('')}
  <g transform="translate(150 220) rotate(-8)"><rect x="-44" y="-62" width="88" height="124" rx="8" fill="#fffdf6" stroke="#d8cfb8" stroke-width="2"/><text x="-32" y="-34" font-family="'Black Han Sans', sans-serif" font-size="26" fill="#d23a3a">A</text><text y="22" text-anchor="middle" font-size="58" fill="#d23a3a">♥</text></g>
</svg>`,

  // 스플렌더: 빛나는 보석 더미
  splendor: `
<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="spA-bg" cx=".5" cy=".55" r=".75"><stop offset="0" stop-color="#5a2a7a"/><stop offset="1" stop-color="#140a24"/></radialGradient></defs>
  <rect width="300" height="420" fill="url(#spA-bg)"/>
  ${[['#2f6fd6', '#173a7a', 95, 220, 1.4], ['#d6334a', '#7a1222', 200, 215, 1.5], ['#2f9e5b', '#175c33', 150, 290, 1.7], ['#f4f6fb', '#9aa6bd', 70, 310, 1.1], ['#3a3340', '#120e16', 235, 305, 1.2]].map(([f, d, x, y, k]) => `<g transform="translate(${x} ${y}) scale(${k * 2.2})"><path d="M-12 -8h24l8 12-20 22-20-22z" fill="${f}" stroke="${d}" stroke-width="1.4" stroke-linejoin="round"/><path d="M-20 4h40M-12 -8l6 12 6 22 6-22 6-12M-6 4l6-12 6 12" fill="none" stroke="${d}" stroke-width=".8" opacity=".7"/><path d="M-9 -5l3 5" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".75"/></g>`).join('')}
  <g transform="translate(150 150)"><circle r="26" fill="#ffe27a" stroke="#a87a10" stroke-width="3"/><path d="M0 -12l3.6 7.5 8.2 1-6 5.6 1.6 8.1L0 6.2-7.4 10.2-5.8 2.1-11.8-3.5-3.6-4.5z" fill="#c99412"/></g>
  ${[[60, 120], [240, 110], [120, 80], [200, 160], [40, 230], [260, 250]].map(([x, y]) => `<path d="M${x} ${y - 6}l1.5 4.5 4.5 1.5-4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5z" fill="#fff" opacity=".8"/>`).join('')}
</svg>`,

  // 렉시오: 나무 탁자 위 숫자 타일들
  lexio: `
<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="lxA-w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b3f1d"/><stop offset="1" stop-color="#2e1a0b"/></linearGradient></defs>
  <rect width="300" height="420" fill="url(#lxA-w)"/>
  <ellipse cx="150" cy="250" rx="140" ry="110" fill="#1f6b45" stroke="#0f3a26" stroke-width="6"/>
  ${[['2', '#e0452e', -24, 90, 170], ['1', '#2f9e5b', -8, 130, 160], ['15', '#e0a11a', 8, 170, 160], ['3', '#2f5fb8', 22, 210, 172]].map(([n, c, r, x, y]) => `<g transform="translate(${x} ${y}) rotate(${r})"><rect x="-26" y="-38" width="52" height="76" rx="9" fill="#fffaf0" stroke="#c9b48a" stroke-width="2"/><text y="2" text-anchor="middle" font-family="'Black Han Sans', sans-serif" font-size="30" fill="${c}">${n}</text><circle cy="24" r="6" fill="${c}"/></g>`).join('')}
  ${[['#e0452e', 80, 300], ['#2f9e5b', 120, 310], ['#e0a11a', 160, 312], ['#2f5fb8', 200, 304]].map(([c, x, y]) => `<g transform="translate(${x} ${y})"><circle r="13" fill="${c}"/><circle r="8" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="3 3"/></g>`).join('')}
</svg>`,

  // 초성퀴즈: 칠판 위 초성 타일
  chosung: `
<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <rect width="300" height="420" fill="#1f4a3a"/>
  <rect x="14" y="100" width="272" height="230" rx="10" fill="#24563f" stroke="#8a5a2b" stroke-width="10"/>
  <g font-family="'Black Han Sans', sans-serif" text-anchor="middle">
    ${[['ㅊ', 70, 190, '#ffd84d'], ['ㅅ', 150, 190, '#ff8fb8'], ['ㅋ', 230, 190, '#7cc4ff'], ['ㅈ', 110, 280, '#9ef0a8'], ['?', 190, 280, '#fff']].map(([t, x, y, c]) => `<g transform="translate(${x} ${y})"><rect x="-34" y="-50" width="68" height="68" rx="12" fill="#fffdf6" stroke="${c}" stroke-width="5"/><text y="4" font-size="46" fill="#24302a">${t}</text></g>`).join('')}
  </g>
  <g transform="translate(150 376)"><circle r="34" fill="#ffd84d"/><text y="14" text-anchor="middle" font-family="'Black Han Sans', sans-serif" font-size="38" fill="#3a2400">!</text></g>
</svg>`,

  // 티츄: 붉은 하늘 아래 용 + 펼친 카드
  tichu: `
<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="tcA-bg" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="#e8452a"/><stop offset=".6" stop-color="#8a1a2a"/><stop offset="1" stop-color="#2a0a18"/></radialGradient></defs>
  <rect width="300" height="420" fill="url(#tcA-bg)"/>
  <circle cx="150" cy="130" r="70" fill="#ffd27a" opacity=".35"/>
  <path d="M40 200 C70 120 120 150 140 110 C160 70 140 40 180 30 C220 22 250 52 238 82 C228 104 206 94 196 108 C184 128 214 150 190 178 C166 206 110 210 40 200 Z" fill="#2f9e5b"/>
  <path d="M180 30 l-10 -22 l22 16 z M212 30 l8 -24 l4 28 z" fill="#ffc23a"/>
  <circle cx="214" cy="56" r="7" fill="#ffd84d"/><circle cx="216" cy="56" r="3" fill="#111"/>
  <path d="M238 82 q22 6 18 26" stroke="#ff4f2a" stroke-width="4" fill="none"/>
  <path d="M80 180 q20 -16 40 0 M110 196 q20 -16 40 0" stroke="#1f7a40" stroke-width="5" fill="none"/>
  <g transform="translate(150 330)">
    ${[-36, -18, 0, 18, 36].map((r, i) => `<g transform="rotate(${r}) translate(0 -70)"><rect x="-26" y="-36" width="52" height="72" rx="6" fill="#fffdf6" stroke="#d8cfb8"/><text x="-18" y="-16" font-family="'Black Han Sans', sans-serif" font-size="18" fill="${['#23232b', '#d23a3a', '#2f6fd6', '#2f9e5b', '#d23a3a'][i]}">${['10', 'J', 'Q', 'K', 'A'][i]}</text><text x="0" y="16" text-anchor="middle" font-size="22" fill="${['#23232b', '#d23a3a', '#2f6fd6', '#2f9e5b', '#d23a3a'][i]}">${['♠', '♥', '♦', '♣', '♥'][i]}</text></g>`).join('')}
  </g>
</svg>`,

  // 스컬킹: 달밤의 해적선 + 해골 깃발
  skullking: `
<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="skA-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d0b2a"/><stop offset=".6" stop-color="#2a1d5a"/><stop offset="1" stop-color="#4a2a6a"/></linearGradient></defs>
  <rect width="300" height="420" fill="url(#skA-sky)"/>
  <circle cx="220" cy="80" r="40" fill="#fff4c9"/><circle cx="234" cy="72" r="38" fill="#141039" opacity=".25"/>
  <g fill="#fff" opacity=".8"><circle cx="40" cy="50" r="1.5"/><circle cx="90" cy="30" r="1"/><circle cx="140" cy="70" r="1.4"/><circle cx="270" cy="160" r="1"/><circle cx="60" cy="140" r="1.2"/></g>
  <g transform="translate(150 250)">
    <path d="M-6 -150 V20" stroke="#3a2412" stroke-width="7"/><path d="M60 -110 V20" stroke="#3a2412" stroke-width="6"/>
    <path d="M-2 -140 C30 -130 34 -70 -2 -50 Z" fill="#e9dcc0"/><path d="M-10 -140 C-50 -128 -54 -66 -10 -50 Z" fill="#d8c8a8"/>
    <path d="M64 -100 C88 -92 90 -50 64 -38 Z" fill="#e9dcc0"/>
    <path d="M-2 -40 C30 -32 34 0 -2 8 Z" fill="#e9dcc0"/><path d="M-10 -40 C-44 -32 -46 0 -10 8 Z" fill="#d8c8a8"/>
    <path d="M-6 -150 h-34 l6 10 l-6 10 h34 z" fill="#111"/><circle cx="-22" cy="-142" r="4" fill="#f2efe6"/><path d="M-30 -136 l16 8 M-14 -136 l-16 8" stroke="#f2efe6" stroke-width="2"/>
    <path d="M-110 20 H110 L90 70 H-86 Z" fill="#5a3418"/><path d="M-110 20 H110 L106 32 H-106 Z" fill="#7a4a22"/>
    <g fill="#f5c32c"><circle cx="-60" cy="44" r="5"/><circle cx="-30" cy="44" r="5"/><circle cx="0" cy="44" r="5"/><circle cx="30" cy="44" r="5"/><circle cx="60" cy="44" r="5"/></g>
  </g>
  <path d="M0 330 Q40 316 80 330 T160 330 T240 330 T320 330 V420 H0 Z" fill="#1c3a7a"/>
  <path d="M0 350 Q40 336 80 350 T160 350 T240 350 T320 350 V420 H0 Z" fill="#14295a"/>
  <path d="M0 330 Q40 316 80 330 T160 330 T240 330 T320 330" fill="none" stroke="#7ab8ff" stroke-width="2" opacity=".6"/>
</svg>`,

  // 언더독레이스: 결승선을 향해 달리는 동물들 + 다크호스
  underdog: `
<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ud-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a8be0"/><stop offset=".55" stop-color="#9ad7ff"/><stop offset=".56" stop-color="#4caf50"/><stop offset="1" stop-color="#2e7d32"/></linearGradient>
    <pattern id="ud-chk" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="#111"/><rect x="8" y="8" width="8" height="8" fill="#111"/><rect x="8" width="8" height="8" fill="#fff"/><rect y="8" width="8" height="8" fill="#fff"/></pattern>
  </defs>
  <rect width="300" height="420" fill="url(#ud-sky)"/>
  <g fill="#fff" opacity=".85"><ellipse cx="60" cy="70" rx="34" ry="12"/><ellipse cx="230" cy="54" rx="40" ry="13"/></g>
  <path d="M0 250 Q150 225 300 250 L300 420 L0 420 Z" fill="#b5793f"/>
  <path d="M0 300 Q150 278 300 300" stroke="#fff" stroke-width="3" stroke-dasharray="10 8" fill="none" opacity=".7"/>
  <rect x="236" y="150" width="20" height="160" fill="url(#ud-chk)"/>
  <rect x="234" y="140" width="24" height="14" rx="3" fill="#c81d38"/>
  ${[[7, 0, 300, 70], [5, 40, 292, 66], [3, 70, 300, 70], [6, 110, 284, 72], [4, 4, 214, 70], [1, 60, 206, 72], [2, 120, 200, 82]].map(([n, x, y, w]) =>
    animalSvg(n, `x="${x}" y="${y}" width="${w}" height="${w * .75}"`)).join('')}
  <g transform="translate(36 290)"><circle r="13" fill="#1d1640" stroke="#ffd84d" stroke-width="2"/><text y="5" text-anchor="middle" font-size="13">🌑</text></g>
</svg>`,

  // 시드포커: 검정·금색 테이블 위 숫자카드, 금빛 시드카드, 칩
  seedpoker: `
<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="sp-bg" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#3a3a3a"/><stop offset=".55" stop-color="#161616"/><stop offset="1" stop-color="#050505"/></radialGradient>
    <linearGradient id="sp-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".5" stop-color="#d4a640"/><stop offset="1" stop-color="#7a5212"/></linearGradient>
    <filter id="sp-sh"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-opacity=".6"/></filter>
  </defs>
  <rect width="300" height="420" fill="url(#sp-bg)"/>
  <ellipse cx="150" cy="215" rx="150" ry="95" fill="#123d27" opacity=".55"/>
  ${[[-24, 98, '3'], [0, 150, '15'], [24, 202, '7']].map(([r, x, n]) => `
  <g transform="translate(${x} 168) rotate(${r})" filter="url(#sp-sh)">
    <rect x="-30" y="-44" width="60" height="88" rx="8" fill="#fbf8f0"/>
    <rect x="-25" y="-39" width="50" height="78" rx="5" fill="none" stroke="#1c1c1c" stroke-width="1.5"/>
    <text x="0" y="15" text-anchor="middle" font-family="'Black Han Sans', 'Jua', sans-serif" font-size="${n.length > 1 ? 34 : 42}" fill="#1c1c1c">${n}</text>
  </g>`).join('')}
  ${[[44, 166, '12'], [256, 164, '9']].map(([x, y, n]) => `
  <g transform="translate(${x} ${y})" filter="url(#sp-sh)">
    <rect x="-24" y="-34" width="48" height="68" rx="7" fill="url(#sp-gold)"/>
    <text x="0" y="12" text-anchor="middle" font-family="'Black Han Sans', 'Jua', sans-serif" font-size="28" fill="#3a2400">${n}</text>
    <text x="0" y="-18" text-anchor="middle" font-size="12">🌱</text>
  </g>`).join('')}
  <g filter="url(#sp-sh)">
    ${[0, 1, 2, 3].map((i) => `<ellipse cx="236" cy="${300 - i * 7}" rx="20" ry="7" fill="${i % 2 ? '#c81d38' : '#e8e8ee'}" stroke="#222" stroke-width="1"/>`).join('')}
    ${[0, 1, 2].map((i) => `<ellipse cx="66" cy="${306 - i * 7}" rx="20" ry="7" fill="${i % 2 ? '#e8e8ee' : '#2f6bff'}" stroke="#222" stroke-width="1"/>`).join('')}
  </g>
</svg>`,

  // 타이핑 퀴즈: 스튜디오 조명 아래 잘생긴팀 vs 못생긴팀 캐릭터 + 말풍선 + 키보드
  typing: `
<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="tq-bg" cx="50%" cy="35%" r="80%"><stop offset="0" stop-color="#6b2fb8"/><stop offset=".6" stop-color="#2a0f52"/><stop offset="1" stop-color="#12062a"/></radialGradient>
    <linearGradient id="tq-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c2" stop-opacity=".45"/><stop offset="1" stop-color="#fff6c2" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="300" height="420" fill="url(#tq-bg)"/>
  <path d="M60 0 L100 0 L150 300 L10 300 Z" fill="url(#tq-beam)"/>
  <path d="M200 0 L240 0 L290 300 L150 300 Z" fill="url(#tq-beam)"/>
  <rect x="22" y="228" width="116" height="60" rx="10" fill="#1d3f9e" stroke="#3ee6ff" stroke-width="3"/>
  <rect x="162" y="228" width="116" height="60" rx="10" fill="#9e5a10" stroke="#ffb02e" stroke-width="3"/>
  ${nest(HANDSOME, 30, 108, 100, 125)}
  ${nest(GOOFY, 170, 108, 100, 125)}
  <text x="150" y="196" text-anchor="middle" font-family="'Black Han Sans', sans-serif" font-size="34" fill="#ff4f9a" stroke="#fff" stroke-width="1.5">VS</text>
  <g transform="translate(30 350)">
    ${Array.from({ length: 2 }, (_, r) => Array.from({ length: 8 }, (_, c) => `<rect x="${c * 30 + r * 10}" y="${r * 26}" width="26" height="22" rx="5" fill="#ece6ff" stroke="#9b8fd0" stroke-width="2"/>`).join('')).join('')}
  </g>
</svg>`,

  // 결합 (데스매치): 붉은 경고 줄무늬 + 결합 타일 + 교차한 칼
  combo: `
<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="cb-bg" cx="50%" cy="45%" r="75%"><stop offset="0" stop-color="#5a0a14"/><stop offset=".6" stop-color="#22040a"/><stop offset="1" stop-color="#070103"/></radialGradient>
    <pattern id="cb-stripe" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="13" height="26" fill="#ff1f3d" opacity=".08"/></pattern>
    <filter id="cb-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="cb-sh"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity=".6"/></filter>
  </defs>
  <rect width="300" height="420" fill="url(#cb-bg)"/>
  <rect width="300" height="420" fill="url(#cb-stripe)"/>
  <!-- 교차한 칼 -->
  <g opacity=".55" stroke="#c9c9d6" stroke-width="7" stroke-linecap="round">
    <line x1="40" y1="330" x2="260" y2="90"/><line x1="260" y1="330" x2="40" y2="90"/>
  </g>
  <g fill="#d4a640"><rect x="22" y="322" width="40" height="10" rx="4" transform="rotate(-47 42 327)"/><rect x="238" y="322" width="40" height="10" rx="4" transform="rotate(47 258 327)"/></g>
  <!-- 결합 타일 3×3 -->
  <g transform="translate(150 196) rotate(-6)" filter="url(#cb-sh)">
    ${[[0, 0, 0], [1, 1, 1], [2, 2, 2], [1, 0, 2], [0, 2, 1], [2, 1, 0], [2, 0, 1], [1, 2, 0], [0, 1, 2]].map(([sh, co, bg], i) => {
      const x = (i % 3) * 46 - 69, y = Math.floor(i / 3) * 46 - 69;
      const fill = ['#e8333f', '#ffc928', '#2f6bff'][co];
      const base = ['#f4f1ea', '#8d8b96', '#1c1b24'][bg];
      const shp = sh === 0 ? `<circle cx="${x + 21}" cy="${y + 21}" r="12" fill="${fill}"/>`
        : sh === 1 ? `<polygon points="${x + 21},${y + 7} ${x + 35},${y + 33} ${x + 7},${y + 33}" fill="${fill}"/>`
        : `<rect x="${x + 9}" y="${y + 9}" width="24" height="24" rx="2" fill="${fill}"/>`;
      return `<rect x="${x}" y="${y}" width="42" height="42" rx="6" fill="${base}" stroke="${[0, 4, 8].includes(i) ? '#ffd84d' : '#000'}" stroke-width="${[0, 4, 8].includes(i) ? 3 : 1}"/>${shp}`;
    }).join('')}
  </g>
</svg>`,

  // 미스터리 사인: 어두운 배경에 빛나는 ◆ 기호와 힌트 식들
  mystery: `
<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="ms-bg" cx="50%" cy="42%" r="75%"><stop offset="0" stop-color="#4a4a4a"/><stop offset=".5" stop-color="#1f1f1f"/><stop offset="1" stop-color="#080808"/></radialGradient>
    <linearGradient id="ms-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".5" stop-color="#d4a640"/><stop offset="1" stop-color="#7a5212"/></linearGradient>
    <filter id="ms-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="300" height="420" fill="url(#ms-bg)"/>
  <g font-family="'Black Han Sans', 'Jua', sans-serif" fill="#fff" opacity=".16" font-size="20">
    <text x="22" y="92">5 ◆ 2 = 12</text><text x="170" y="118">4 ◆ 4 = 16</text>
    <text x="40" y="300">9 ◆ 1 = 18</text><text x="168" y="328">3 ◆ 7 = 14</text><text x="70" y="372">8 ◆ 6 = 28</text>
  </g>
  <g transform="translate(150 158)">
    <rect x="-36" y="-36" width="72" height="72" rx="10" transform="rotate(45)" fill="#160c08" stroke="url(#ms-gold)" stroke-width="5" filter="url(#ms-glow)"/>
    <text x="0" y="17" text-anchor="middle" font-family="'Black Han Sans', 'Jua', sans-serif" font-size="50" fill="#e0364f" filter="url(#ms-glow)">?</text>
    <text x="-100" y="16" text-anchor="middle" font-family="'Black Han Sans', 'Jua', sans-serif" font-size="46" fill="#f3e2b0">7</text>
    <text x="100" y="16" text-anchor="middle" font-family="'Black Han Sans', 'Jua', sans-serif" font-size="46" fill="#f3e2b0">3</text>
  </g>
  <g stroke="url(#ms-gold)" stroke-width="2" opacity=".7"><path d="M30 150 h70"/><path d="M200 250 h70"/></g>
</svg>`,

  // 숫자눈치게임: 흩어진 숫자들 + 9·9(겹침)·7(득점) 카드
  numbers: `
<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="nb-bg" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="#3b1f7a"/><stop offset="1" stop-color="#120a2c"/></radialGradient>
    <filter id="nb-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="nb-sh"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-opacity=".5"/></filter>
  </defs>
  <rect width="300" height="420" fill="url(#nb-bg)"/>
  <g font-family="'Black Han Sans', 'Jua', sans-serif" text-anchor="middle">
    ${[
      [40, 70, 64, '#ff4f9a', -14, '3'], [250, 60, 58, '#3ee6ff', 12, '8'], [150, 40, 40, '#ffd84d', 0, '5'],
      [30, 200, 52, '#7cff8a', 10, '1'], [275, 190, 60, '#ff8a3d', -10, '4'], [60, 330, 70, '#3ee6ff', 8, '6'],
      [250, 340, 66, '#ff4f9a', -16, '2'], [150, 380, 44, '#c69bff', 4, '0'], [110, 120, 34, '#fff', -6, '1'], [200, 130, 30, '#fff', 14, '6'],
    ].map(([x, y, sz, c, r, t]) => `<text x="${x}" y="${y}" font-size="${sz}" fill="${c}" opacity=".32" transform="rotate(${r} ${x} ${y})">${t}</text>`).join('')}
  </g>
  ${[[-22, 92, '9', true], [0, 150, '7', false], [22, 208, '9', true]].map(([rot, x, n, dupe]) => `
  <g transform="translate(${x} ${dupe ? 160 : 150}) rotate(${rot}) scale(.88)" filter="url(#nb-sh)">
    <rect x="-34" y="-50" width="68" height="100" rx="10" fill="#fff"/>
    <rect x="-29" y="-45" width="58" height="90" rx="7" fill="${dupe ? '#ffe3ea' : '#fff6cf'}" stroke="${dupe ? '#ff4f6e' : '#ffb800'}" stroke-width="2"/>
    <text x="0" y="22" font-size="64" font-family="'Black Han Sans', 'Jua', sans-serif" text-anchor="middle" fill="${dupe ? '#ff4f6e' : '#e08a00'}">${n}</text>
    ${dupe ? '<path d="M-24 -38 L24 38 M24 -38 L-24 38" stroke="#ff2d55" stroke-width="5" stroke-linecap="round" opacity=".85"/>' : ''}
  </g>`).join('')}
</svg>`,
};

// ───────── 분류 배너 그림 (가로로 넓은 배너, viewBox 600x200) ─────────
const gem = (x, y, r, rot = 0) => `
  <g transform="translate(${x} ${y}) rotate(${rot})">
    <polygon points="0,${-r} ${r * 0.87},${-r * 0.5} ${r * 0.87},${r * 0.5} 0,${r} ${-r * 0.87},${r * 0.5} ${-r * 0.87},${-r * 0.5}" fill="#8f0f22"/>
    <polygon points="0,${-r} ${r * 0.87},${-r * 0.5} 0,0" fill="#e0364f"/>
    <polygon points="${r * 0.87},${-r * 0.5} ${r * 0.87},${r * 0.5} 0,0" fill="#b5172f"/>
    <polygon points="0,${-r} ${-r * 0.87},${-r * 0.5} 0,0" fill="#ff6b7d"/>
    <polygon points="0,0 ${r * 0.87},${r * 0.5} 0,${r}" fill="#6d0a19"/>
    <circle cx="${-r * 0.3}" cy="${-r * 0.55}" r="${r * 0.12}" fill="#fff" opacity=".8"/>
  </g>`;

export const CATEGORY_ART = {
  // 보드게임: 나무 테이블 위 보드판, 주사위, 말, 카드
  board: `
<svg viewBox="0 0 600 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cbd-wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a4a22"/><stop offset="1" stop-color="#3e2210"/></linearGradient>
    <filter id="cbd-sh"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity=".5"/></filter>
  </defs>
  <rect width="600" height="200" fill="url(#cbd-wood)"/>
  ${Array.from({ length: 9 }, (_, i) => `<path d="M0 ${12 + i * 24} q300 ${i % 2 ? 8 : -8} 600 0" stroke="#000" stroke-opacity=".12" stroke-width="2" fill="none"/>`).join('')}
  <g transform="translate(330 30) rotate(-6)" filter="url(#cbd-sh)">
    <rect width="190" height="130" rx="8" fill="#f3e2b0"/>
    ${Array.from({ length: 8 }, (_, i) => `<rect x="${12 + i * 21}" y="12" width="18" height="18" rx="3" fill="${['#ff4f6e', '#ffd84d', '#3ee6ff', '#5fcf6a'][i % 4]}"/><rect x="${12 + i * 21}" y="100" width="18" height="18" rx="3" fill="${['#5fcf6a', '#ff4f6e', '#ffd84d', '#3ee6ff'][i % 4]}"/>`).join('')}
    ${Array.from({ length: 3 }, (_, i) => `<rect x="12" y="${35 + i * 21}" width="18" height="18" rx="3" fill="${['#3ee6ff', '#5fcf6a', '#ff4f6e'][i]}"/><rect x="159" y="${35 + i * 21}" width="18" height="18" rx="3" fill="${['#ffd84d', '#3ee6ff', '#5fcf6a'][i]}"/>`).join('')}
    <text x="95" y="76" text-anchor="middle" font-family="'Black Han Sans', sans-serif" font-size="26" fill="#7a4a22">START</text>
  </g>
  <g filter="url(#cbd-sh)">
    <g transform="translate(540 120) rotate(14)"><rect x="-22" y="-22" width="44" height="44" rx="9" fill="#fff"/><circle cx="-10" cy="-10" r="4.5" fill="#c81d38"/><circle cx="10" cy="10" r="4.5" fill="#c81d38"/><circle cx="0" cy="0" r="4.5" fill="#c81d38"/></g>
    <g transform="translate(290 150) rotate(-18)"><rect x="-18" y="-18" width="36" height="36" rx="8" fill="#fff"/><circle cx="-8" cy="-8" r="4" fill="#222"/><circle cx="8" cy="8" r="4" fill="#222"/><circle cx="8" cy="-8" r="4" fill="#222"/><circle cx="-8" cy="8" r="4" fill="#222"/></g>
    ${[['#ff4f6e', 420, 120], ['#3d7bff', 455, 112], ['#ffd84d', 385, 105]].map(([c, x, y]) => `<g transform="translate(${x} ${y})"><circle cy="-22" r="9" fill="${c}"/><path d="M-9 0 q9 -26 18 0 z" fill="${c}"/><ellipse cy="2" rx="13" ry="5" fill="${c}"/></g>`).join('')}
    <g transform="translate(560 40) rotate(10)"><rect x="-26" y="-36" width="52" height="72" rx="6" fill="#fff"/><rect x="-21" y="-31" width="42" height="62" rx="4" fill="#ff4f9a"/><text y="8" text-anchor="middle" font-family="'Black Han Sans', sans-serif" font-size="24" fill="#fff">O</text></g>
  </g>
</svg>`,

  mini: `
<svg viewBox="0 0 600 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cm-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5b2bd6"/><stop offset=".55" stop-color="#c2338f"/><stop offset="1" stop-color="#ff8a3d"/></linearGradient>
    <linearGradient id="cm-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd84d" stop-opacity=".0"/><stop offset="1" stop-color="#ffd84d" stop-opacity=".45"/></linearGradient>
  </defs>
  <rect width="600" height="200" fill="url(#cm-bg)"/>
  <g stroke="url(#cm-floor)" stroke-width="2">
    ${Array.from({ length: 7 }, (_, i) => `<line x1="0" y1="${130 + i * 12}" x2="600" y2="${130 + i * 12}"/>`).join('')}
    ${Array.from({ length: 15 }, (_, i) => `<line x1="${300 + (i - 7) * 18}" y1="130" x2="${300 + (i - 7) * 90}" y2="210"/>`).join('')}
  </g>
  <g fill="#fff" opacity=".8"><circle cx="250" cy="30" r="2"/><circle cx="560" cy="24" r="2.5"/><circle cx="420" cy="18" r="1.6"/><circle cx="330" cy="70" r="1.6"/></g>
  <g transform="translate(420 70)">
    <rect x="-46" y="40" width="92" height="34" rx="10" fill="#1f1640"/>
    <rect x="-46" y="40" width="92" height="10" rx="5" fill="#3a2a70"/>
    <rect x="-5" y="2" width="10" height="44" rx="5" fill="#d8d3ef"/>
    <circle cx="0" cy="0" r="18" fill="#ff4f6e"/><circle cx="-6" cy="-6" r="5" fill="#fff" opacity=".6"/>
    <circle cx="30" cy="57" r="8" fill="#3ee6ff"/><circle cx="-28" cy="57" r="8" fill="#ffd84d"/>
  </g>
  <g fill="#ffd84d" stroke="#c98a00" stroke-width="3">
    <circle cx="530" cy="120" r="20"/><circle cx="505" cy="78" r="14"/><circle cx="330" cy="120" r="12"/>
  </g>
  <g fill="#c98a00"><rect x="526" y="110" width="8" height="20" rx="3"/><rect x="502" y="71" width="6" height="14" rx="2"/></g>
  <g fill="#3ee6ff" transform="translate(548 26) scale(3)">
    <rect x="3" y="0" width="1" height="2"/><rect x="2" y="2" width="3" height="1"/><rect x="0" y="3" width="7" height="1"/>
    <rect x="1" y="4" width="5" height="1"/><rect x="2" y="5" width="3" height="1"/><rect x="1" y="6" width="2" height="1"/><rect x="4" y="6" width="2" height="1"/>
  </g>
  <g fill="#ff6b9d" transform="translate(300 34) scale(3)">
    <rect x="1" y="0" width="2" height="1"/><rect x="4" y="0" width="2" height="1"/><rect x="0" y="1" width="7" height="2"/><rect x="1" y="3" width="5" height="1"/><rect x="2" y="4" width="3" height="1"/><rect x="3" y="5" width="1" height="1"/>
  </g>
</svg>`,

  genius: `
<svg viewBox="0 0 600 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="cg-bg" cx="72%" cy="40%" r="75%"><stop offset="0" stop-color="#5a5a5a"/><stop offset=".45" stop-color="#262626"/><stop offset="1" stop-color="#0a0a0a"/></radialGradient>
    <linearGradient id="cg-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".45" stop-color="#d4a640"/><stop offset="1" stop-color="#7a5212"/></linearGradient>
    <filter id="cg-blur"><feGaussianBlur stdDeviation="12"/></filter>
    <filter id="cg-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="600" height="200" fill="url(#cg-bg)"/>
  <g filter="url(#cg-blur)" opacity=".55">
    <ellipse cx="470" cy="120" rx="120" ry="70" fill="#000"/>
    <ellipse cx="380" cy="40" rx="90" ry="30" fill="#7a7a7a"/>
  </g>
  <path d="M430 200 q10 -60 60 -78 q40 -14 70 6 q24 16 40 72 z" fill="#111"/>
  <path d="M470 150 q20 -22 52 -18" stroke="#3a3a3a" stroke-width="5" fill="none" stroke-linecap="round"/>
  <g stroke="url(#cg-gold)" stroke-width="2" fill="none" opacity=".75">
    <path d="M300 30 h120 l20 20 h140"/><path d="M300 176 h90 l18 -18 h170"/>
    <circle cx="300" cy="30" r="3" fill="#d4a640"/><circle cx="300" cy="176" r="3" fill="#d4a640"/>
  </g>
  <g filter="url(#cg-glow)">
    ${gem(400, 104, 26, 8)}${gem(470, 64, 15, -14)}${gem(352, 70, 11, 20)}${gem(540, 118, 18, 30)}
  </g>
  <g fill="#d4a640" opacity=".6"><circle cx="440" cy="150" r="2"/><circle cx="330" cy="130" r="1.6"/><circle cx="560" cy="40" r="2"/></g>
</svg>`,

  // 예능: 방송 스튜디오 — 조명, 무대, 레트로 TV, ON AIR 사인
  variety: `
<svg viewBox="0 0 600 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="cv-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a0f52"/><stop offset="1" stop-color="#0d0624"/></linearGradient>
    <linearGradient id="cv-beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c2" stop-opacity=".55"/><stop offset="1" stop-color="#fff6c2" stop-opacity="0"/></linearGradient>
    <linearGradient id="cv-curtain" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a0f2e"/><stop offset=".5" stop-color="#c2224d"/><stop offset="1" stop-color="#7a0f2e"/></linearGradient>
    <linearGradient id="cv-screen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff4f9a"/><stop offset=".5" stop-color="#9b5cff"/><stop offset="1" stop-color="#3ee6ff"/></linearGradient>
    <filter id="cv-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="600" height="200" fill="url(#cv-bg)"/>
  <!-- 무대 커튼 -->
  ${Array.from({ length: 8 }, (_, i) => `<rect x="${250 + i * 44}" y="0" width="44" height="150" fill="url(#cv-curtain)" opacity=".85"/>`).join('')}
  <path d="M250 0 h352 v22 q-22 14 -44 0 q-22 14 -44 0 q-22 14 -44 0 q-22 14 -44 0 q-22 14 -44 0 q-22 14 -44 0 q-22 14 -44 0 q-22 14 -44 0 z" fill="#ffd84d" opacity=".9"/>
  <!-- 무대 바닥 -->
  <path d="M220 150 h390 v60 h-420 z" fill="#3a1f6b"/>
  <path d="M220 150 h390" stroke="#ffd84d" stroke-width="3"/>
  ${Array.from({ length: 10 }, (_, i) => `<circle cx="${236 + i * 38}" cy="160" r="3" fill="#fff3b0" filter="url(#cv-glow)"/>`).join('')}
  <!-- 조명 -->
  <path d="M300 0 L340 0 L420 150 L250 150 Z" fill="url(#cv-beam)"/>
  <path d="M520 0 L556 0 L590 150 L450 150 Z" fill="url(#cv-beam)" opacity=".7"/>
  <!-- 레트로 TV -->
  <g transform="translate(395 58)">
    <path d="M-16 -30 L-34 -54 M16 -30 L34 -54" stroke="#d8d3ef" stroke-width="4" stroke-linecap="round"/>
    <circle cx="-34" cy="-54" r="4" fill="#ff4f9a"/><circle cx="34" cy="-54" r="4" fill="#3ee6ff"/>
    <rect x="-62" y="-32" width="124" height="94" rx="18" fill="#ffb02e" stroke="#7a4a00" stroke-width="3"/>
    <rect x="-52" y="-22" width="84" height="74" rx="12" fill="url(#cv-screen)"/>
    <text x="-10" y="26" text-anchor="middle" font-family="'Black Han Sans', 'Jua', sans-serif" font-size="34" fill="#fff" filter="url(#cv-glow)">O</text>
    <circle cx="46" cy="-6" r="6" fill="#7a4a00"/><circle cx="46" cy="14" r="6" fill="#7a4a00"/>
    <rect x="-42" y="62" width="10" height="12" fill="#7a4a00"/><rect x="32" y="62" width="10" height="12" fill="#7a4a00"/>
  </g>
  <!-- ON AIR -->
  <g transform="translate(528 46)" filter="url(#cv-glow)">
    <rect x="-44" y="-17" width="88" height="34" rx="8" fill="#e0233f" stroke="#ffd0d6" stroke-width="2"/>
    <text x="0" y="8" text-anchor="middle" font-family="'Black Han Sans', 'Jua', sans-serif" font-size="20" fill="#fff" letter-spacing="2">ON AIR</text>
  </g>
  <!-- 반짝이 -->
  <g fill="#ffd84d" filter="url(#cv-glow)">
    <path d="M470 120 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 z"/><path d="M290 100 l3 6 6 3 -6 3 -3 6 -3 -6 -6 -3 6 -3 z"/>
  </g>
</svg>`,
};
