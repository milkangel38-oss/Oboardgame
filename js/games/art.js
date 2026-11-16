// 게임 카드 일러스트 (직접 그린 SVG) — 게임을 추가하면 여기에 그림도 추가하세요.
// viewBox 300x420 기준, 카드 크기에 맞춰 잘려서 보여요.

export const ART = {
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

  classic: `
<svg viewBox="0 0 600 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="cc-felt" cx="70%" cy="40%" r="80%"><stop offset="0" stop-color="#2f7a52"/><stop offset="1" stop-color="#123d27"/></radialGradient>
    <linearGradient id="cc-wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8b86a"/><stop offset="1" stop-color="#b47a35"/></linearGradient>
    <radialGradient id="cc-b" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#666"/><stop offset="1" stop-color="#0b0b0b"/></radialGradient>
    <radialGradient id="cc-w" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#cfc8bb"/></radialGradient>
    <filter id="cc-sh"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-opacity=".45"/></filter>
  </defs>
  <rect width="600" height="200" fill="url(#cc-felt)"/>
  <g transform="rotate(-8 360 110)" filter="url(#cc-sh)">
    <rect x="270" y="30" width="190" height="190" rx="6" fill="url(#cc-wood)"/>
    <g stroke="#5a3a17" stroke-width="1.6" opacity=".7">
      ${Array.from({ length: 9 }, (_, i) => `<line x1="282" y1="${46 + i * 20}" x2="448" y2="${46 + i * 20}"/><line x1="${286 + i * 20}" y1="38" x2="${286 + i * 20}" y2="210"/>`).join('')}
    </g>
    ${[[306, 66], [326, 86], [346, 106], [366, 126], [386, 146]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8.5" fill="url(#cc-b)"/>`).join('')}
    ${[[346, 86], [366, 106], [326, 126], [406, 126], [306, 106]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="8.5" fill="url(#cc-w)"/>`).join('')}
  </g>
  <g transform="translate(452 46) rotate(-10)" filter="url(#cc-sh)">
    <rect width="62" height="96" rx="6" fill="#fffdf6"/><rect x="4" y="4" width="54" height="88" rx="4" fill="#ffefe0"/>
    <rect x="4" y="4" width="54" height="56" rx="4" fill="#d9362b"/>
    <circle cx="31" cy="34" r="17" fill="#fffbe8"/>
    <path d="M4 92 v-36 q14 -14 27 -4 q14 -12 27 4 v36 z" fill="#1b1b1b"/>
    <rect x="40" y="8" width="13" height="22" rx="2" fill="#fff" stroke="#d9362b" stroke-width="1.5"/>
    <text x="46.5" y="24" font-size="13" font-family="serif" font-weight="700" text-anchor="middle" fill="#d9362b">光</text>
  </g>
  <g transform="translate(530 44) rotate(10)" filter="url(#cc-sh)">
    <rect width="62" height="96" rx="6" fill="#fffdf6"/><rect x="4" y="4" width="54" height="88" rx="4" fill="#fff3d6"/>
    <circle cx="40" cy="24" r="13" fill="#e2332a"/>
    <path d="M8 92 q6 -40 22 -50 q-6 22 4 50 z" fill="#1d5e2e"/>
    <path d="M14 70 q8 -10 22 -6 q-10 2 -14 12 z M24 52 q10 -8 22 -2 q-10 0 -16 8 z" fill="#2f8a43"/>
    <path d="M30 86 q2 -22 16 -30 l6 4 q-10 6 -12 26 z" fill="#fff"/><circle cx="50" cy="56" r="3" fill="#e2332a"/>
    <rect x="9" y="8" width="13" height="22" rx="2" fill="#fff" stroke="#d9362b" stroke-width="1.5"/>
    <text x="15.5" y="24" font-size="13" font-family="serif" font-weight="700" text-anchor="middle" fill="#d9362b">光</text>
  </g>
</svg>`,
};
