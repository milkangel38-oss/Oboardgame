// 게임 카드 일러스트 (직접 그린 SVG) — 게임을 추가하면 여기에 그림도 추가하세요.
// viewBox 300x420 기준, 카드 크기에 맞춰 잘려서 보여요.

import { HANDSOME, GOOFY } from './typing.js';

const nest = (svg, x, y, w, h) => svg.replace('<svg viewBox="0 0 120 150"', `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 120 150"`);

export const ART = {
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
