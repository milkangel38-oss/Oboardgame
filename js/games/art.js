// 게임 카드 일러스트 (직접 그린 SVG) — 게임을 추가하면 여기에 그림도 추가하세요.
// viewBox 300x420 기준, 카드 크기에 맞춰 잘려서 보여요.

export const ART = {
  tictactoe: `
<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="ttt-bg" cx="50%" cy="40%" r="75%">
      <stop offset="0" stop-color="#4a2a8a"/><stop offset="1" stop-color="#140b33"/>
    </radialGradient>
    <filter id="ttt-glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="300" height="420" fill="url(#ttt-bg)"/>
  <g stroke="#ffffff" stroke-opacity=".07">
    ${Array.from({ length: 12 }, (_, i) => `<line x1="0" y1="${i * 40}" x2="300" y2="${i * 40}"/>`).join('')}
    ${Array.from({ length: 8 }, (_, i) => `<line x1="${i * 40}" y1="0" x2="${i * 40}" y2="420"/>`).join('')}
  </g>
  <g filter="url(#ttt-glow)" stroke="#3ee6ff" stroke-width="7" stroke-linecap="round">
    <line x1="117" y1="120" x2="117" y2="300"/><line x1="183" y1="120" x2="183" y2="300"/>
    <line x1="60" y1="177" x2="240" y2="177"/><line x1="60" y1="243" x2="240" y2="243"/>
  </g>
  <g filter="url(#ttt-glow)" stroke-width="9" stroke-linecap="round" fill="none">
    <path d="M70 130 l34 34 M104 130 l-34 34" stroke="#ff4f9a"/>
    <path d="M133 196 l34 34 M167 196 l-34 34" stroke="#ff4f9a"/>
    <path d="M196 262 l34 34 M230 262 l-34 34" stroke="#ff4f9a"/>
    <circle cx="216" cy="147" r="17" stroke="#ffd84d"/>
    <circle cx="87" cy="279" r="17" stroke="#ffd84d"/>
  </g>
  <line x1="62" y1="122" x2="238" y2="304" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".85" filter="url(#ttt-glow)"/>
  <g fill="#fff">
    <circle cx="40" cy="70" r="2"/><circle cx="260" cy="90" r="2.5"/><circle cx="250" cy="350" r="2"/><circle cx="35" cy="330" r="1.5"/>
  </g>
</svg>`,

  omok: `
<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="omok-wood" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e2ad62"/><stop offset="1" stop-color="#b47a35"/>
    </linearGradient>
    <radialGradient id="omok-b" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#666"/><stop offset="1" stop-color="#0b0b0b"/></radialGradient>
    <radialGradient id="omok-w" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c9c3b8"/></radialGradient>
  </defs>
  <rect width="300" height="420" fill="#3a2414"/>
  <rect x="-20" y="60" width="340" height="320" fill="url(#omok-wood)" transform="rotate(-6 150 220)"/>
  <g stroke="#5a3a17" stroke-width="2" opacity=".75" transform="rotate(-6 150 220)">
    ${Array.from({ length: 9 }, (_, i) => `<line x1="0" y1="${90 + i * 34}" x2="300" y2="${90 + i * 34}"/>`).join('')}
    ${Array.from({ length: 9 }, (_, i) => `<line x1="${14 + i * 34}" y1="60" x2="${14 + i * 34}" y2="380"/>`).join('')}
  </g>
  <g transform="rotate(-6 150 220)">
    ${[[48, 124], [82, 158], [116, 192], [150, 226], [184, 260]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="15" fill="url(#omok-b)"/>`).join('')}
    ${[[150, 158], [184, 192], [116, 260], [218, 226], [82, 226]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="15" fill="url(#omok-w)"/>`).join('')}
  </g>
</svg>`,

  liar: `
<svg viewBox="0 0 300 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="liar-bg" cx="50%" cy="20%" r="80%"><stop offset="0" stop-color="#7a1f4a"/><stop offset="1" stop-color="#1a0b22"/></radialGradient>
    <linearGradient id="liar-spot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c2" stop-opacity=".55"/><stop offset="1" stop-color="#fff6c2" stop-opacity="0"/></linearGradient>
  </defs>
  <rect width="300" height="420" fill="url(#liar-bg)"/>
  <path d="M130 0 L170 0 L250 330 L50 330 Z" fill="url(#liar-spot)"/>
  ${[[60, 290, '#5fcf6a'], [240, 290, '#3d7bff'], [95, 345, '#ff8a3d'], [205, 345, '#f7a8d0']].map(([x, y, c]) => `
  <g><circle cx="${x}" cy="${y}" r="34" fill="${c}"/>
    <circle cx="${x - 11}" cy="${y - 5}" r="5" fill="#1a1a1a"/><circle cx="${x + 11}" cy="${y - 5}" r="5" fill="#1a1a1a"/>
    <path d="M${x - 9} ${y + 12} q9 7 18 0" stroke="#1a1a1a" stroke-width="3" fill="none" stroke-linecap="round"/></g>`).join('')}
  <g>
    <circle cx="150" cy="250" r="44" fill="#ffd84d"/>
    <rect x="114" y="232" width="72" height="20" rx="10" fill="#1a1a1a"/>
    <circle cx="133" cy="242" r="6" fill="#fff"/><circle cx="167" cy="242" r="6" fill="#fff"/>
    <path d="M136 272 q14 -6 28 0" stroke="#1a1a1a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M112 210 h76 l-8 -22 h-60 z" fill="#2b2b2b"/><rect x="104" y="208" width="92" height="8" rx="4" fill="#2b2b2b"/>
  </g>
  <g font-family="Jua, sans-serif" font-weight="700" fill="#fff">
    <text x="205" y="140" font-size="54" transform="rotate(14 205 140)">?</text>
    <text x="70" y="120" font-size="38" opacity=".8" transform="rotate(-12 70 120)">?</text>
  </g>
</svg>`,
};
