// 언더독레이스 동물 그림 (옆모습, 오른쪽 = 결승선 방향) + 등번호 조끼
// 모두 직접 그린 그림이에요.
export const NUM_COLOR = { 1: '#d64545', 2: '#ee8a1c', 3: '#d9a514', 4: '#3a9d4f', 5: '#2f6fd6', 6: '#8a4fd0', 7: '#7a5230' };

const S = 'stroke="#2b1d12" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"';
const N = 'stroke="none"';
const bib = (n, x, y) => `<g ${N}><rect x="${x - 8}" y="${y - 7}" width="16" height="14" rx="3" fill="#fff" stroke="${NUM_COLOR[n]}" stroke-width="2"/><text x="${x}" y="${y + 4.5}" text-anchor="middle" font-family="Pretendard, sans-serif" font-weight="900" font-size="12" fill="${NUM_COLOR[n]}">${n}</text></g>`;

const BODY = {
  // 토끼
  1: () => {
    const C = '#c99a6b', L = '#f4e7d6';
    return `
    <path d="M36 58 q-10 10 -26 13 q-3 4 3 6 l28 -6 z" fill="${C}"/>
    <path d="M68 60 l15 14 l7 0 l-15 -17 z" fill="#b5875a"/>
    <ellipse cx="52" cy="50" rx="26" ry="15" fill="${C}"/>
    <ellipse cx="38" cy="53" rx="13" ry="12" fill="${C}"/>
    <path d="M60 60 q10 2 14 -4" fill="${L}" ${N}/>
    <circle cx="25" cy="44" r="6" fill="#fff"/>
    <path d="M83 30 q2 -22 16 -24 q2 8 -10 27 z" fill="#b5875a"/>
    <path d="M77 30 q-7 -22 5 -27 q7 6 2 29 z" fill="${C}"/>
    <path d="M80 26 q-3 -14 2 -18 q3 6 0 18 z" fill="#f2a9b8" ${N}/>
    <ellipse cx="88" cy="40" rx="13" ry="11" fill="${C}"/>
    <ellipse cx="96" cy="44" rx="6" ry="4.5" fill="${L}" ${N}/>
    <circle cx="91" cy="36" r="2.3" fill="#1a1a1a" ${N}/><circle cx="91.8" cy="35.3" r=".8" fill="#fff" ${N}/>
    <circle cx="100.5" cy="41" r="1.9" fill="#e5647e" ${N}/>`;
  },
  // 호랑이
  2: () => {
    const C = '#f08a24', D = '#d9731a';
    return `
    <path d="M26 42 q-16 -2 -18 -20 q4 -3 6 2 q2 12 14 12 z" fill="${C}"/>
    <path d="M14 30 l4 -2 M12 25 l4 -1" fill="none"/>
    <path d="M40 56 l-7 21 l7 0 l8 -19 z" fill="${D}"/>
    <path d="M70 56 l4 21 l7 0 l-3 -21 z" fill="${D}"/>
    <path d="M32 52 l-17 17 l-5 6 l7 1 l21 -19 z" fill="${C}"/>
    <path d="M76 54 l18 14 l4 5 l3 -4 l-18 -18 z" fill="${C}"/>
    <ellipse cx="54" cy="46" rx="32" ry="14" fill="${C}"/>
    <path d="M36 55 q20 9 38 0 q-18 4 -38 0 z" fill="#fff3e0" ${N}/>
    <path d="M40 34 q3 8 -2 14 M50 33 q4 8 -1 15 M60 33 q3 8 0 14 M70 35 q2 6 -1 10 M30 40 q4 6 0 11" fill="none" stroke="#2b1d12" stroke-width="2.6"/>
    <circle cx="86" cy="28" r="4.5" fill="${C}"/>
    <circle cx="92" cy="39" r="13" fill="${C}"/>
    <ellipse cx="101" cy="44" rx="7" ry="5.5" fill="#fff8ee" ${N}/>
    <path d="M84 34 l5 2 M83 40 l5 1 M90 28 l1 4" fill="none" stroke="#2b1d12" stroke-width="2"/>
    <circle cx="95" cy="35" r="2.2" fill="#1a1a1a" ${N}/>
    <path d="M104 40 l3 1 l-2 2 z" fill="#2b1d12"/>`;
  },
  // 판다
  3: () => {
    const W = '#f7f7f4', K = '#232323';
    return `
    <path d="M42 58 l-4 19 l8 0 l5 -17 z" fill="${K}"/>
    <path d="M66 58 l6 19 l8 0 l-6 -19 z" fill="${K}"/>
    <path d="M34 54 l-15 15 l-2 7 l8 0 l17 -18 z" fill="${K}"/>
    <path d="M72 56 l13 13 l2 7 l7 -2 l-14 -20 z" fill="${K}"/>
    <ellipse cx="54" cy="48" rx="28" ry="18" fill="${W}"/>
    <path d="M64 32 q11 2 13 15 q-4 10 -13 12 q-5 -13 0 -27 z" fill="${K}"/>
    <ellipse cx="36" cy="56" rx="10" ry="8" fill="${K}"/>
    <circle cx="26" cy="44" r="3.5" fill="${W}"/>
    <circle cx="80" cy="24" r="5.5" fill="${K}"/><circle cx="93" cy="23" r="5.5" fill="${K}"/>
    <circle cx="88" cy="37" r="14" fill="${W}"/>
    <ellipse cx="94" cy="35" rx="4.8" ry="3.6" fill="${K}" ${N} transform="rotate(-25 94 35)"/>
    <circle cx="95" cy="34.5" r="1.4" fill="#fff" ${N}/>
    <ellipse cx="101.5" cy="41" rx="2.6" ry="1.9" fill="${K}" ${N}/>`;
  },
  // 개구리 (점프)
  4: () => {
    const C = '#4caf50', D = '#2e7d32';
    return `
    <path d="M46 56 q-14 -4 -24 8 q-5 6 -14 8 l-2 5 l19 -3 q12 -6 25 -12 z" fill="${C}"/>
    <path d="M10 76 l-6 2 M12 77 l-3 4" fill="none"/>
    <g transform="rotate(-15 62 46)">
      <ellipse cx="62" cy="46" rx="25" ry="14" fill="${C}"/>
      <ellipse cx="66" cy="53" rx="17" ry="6" fill="#cfe8a8" ${N}/>
      <circle cx="52" cy="40" r="2.6" fill="${D}" ${N}/><circle cx="60" cy="36" r="2" fill="${D}" ${N}/><circle cx="46" cy="46" r="2" fill="${D}" ${N}/>
    </g>
    <path d="M76 52 l12 16 l9 2 l0 -4 l-6 -1 l-10 -16 z" fill="${C}"/>
    <circle cx="78" cy="28" r="7.5" fill="${C}"/>
    <circle cx="80" cy="27.5" r="4" fill="#fff" ${N}/><circle cx="81" cy="27.5" r="2" fill="#111" ${N}/>
    <path d="M82 40 q7 3 12 -3" fill="none"/>`;
  },
  // 펭귄 (뒤뚱 달리기)
  5: () => {
    const K = '#1f2a44', O = '#ff9d1a';
    return `
    <path d="M48 78 l-10 4 l11 2 z" fill="${O}"/>
    <path d="M64 78 l12 3 l-3 -6 z" fill="${O}"/>
    <g transform="rotate(14 58 50)">
      <path d="M46 46 q-18 4 -24 18 q12 -2 24 -10 z" fill="${K}"/>
      <ellipse cx="58" cy="48" rx="18" ry="29" fill="${K}"/>
      <ellipse cx="65" cy="53" rx="11" ry="22" fill="#fff" ${N}/>
      <path d="M58 22 q10 0 14 8" fill="none" stroke="#ffd84d" stroke-width="3"/>
      <circle cx="66" cy="29" r="2.4" fill="#fff" ${N}/><circle cx="66.6" cy="29" r="1.3" fill="#111" ${N}/>
      <path d="M74 30 l12 3 l-12 4 z" fill="${O}"/>
    </g>`;
  },
  // 여우
  6: () => {
    const C = '#e8642c', D = '#3a2418';
    return `
    <path d="M30 44 q-18 -8 -26 3 q8 11 26 6 z" fill="${C}"/>
    <path d="M6 47 q3 -5 8 -6 q-3 6 0 9 q-5 0 -8 -3 z" fill="#fff" ${N}/>
    <path d="M42 54 l-5 22 l7 0 l6 -20 z" fill="${D}"/>
    <path d="M64 54 l5 22 l7 0 l-4 -22 z" fill="${D}"/>
    <path d="M34 52 l-15 16 l2 7 l5 0 l15 -19 z" fill="${D}"/>
    <path d="M70 52 l15 14 l2 7 l5 -2 l-15 -21 z" fill="${D}"/>
    <ellipse cx="52" cy="46" rx="26" ry="12" fill="${C}"/>
    <path d="M70 44 q9 6 4 13 q-7 -2 -9 -9 z" fill="#fff" ${N}/>
    <path d="M80 31 l1 -15 l9 10 z" fill="${C}"/>
    <path d="M83 28 l1 -7 l4 5 z" fill="${D}" ${N}/>
    <path d="M77 32 q10 -7 19 1 l13 8 q-4 5 -13 5 q-12 2 -19 -6 z" fill="${C}"/>
    <path d="M88 42 q9 2 20 0 q-6 4 -15 4 z" fill="#fff" ${N}/>
    <circle cx="92" cy="35" r="2" fill="#1a1a1a" ${N}/>
    <circle cx="108" cy="40" r="2" fill="#1a1a1a" ${N}/>`;
  },
  // 코끼리
  7: () => {
    const G = '#9aa3ad', D = '#838c96';
    return `
    <path d="M22 42 q-6 6 -4 14" fill="none"/>
    <rect x="30" y="54" width="13" height="24" rx="4" fill="${D}" transform="rotate(14 36 54)"/>
    <rect x="70" y="54" width="13" height="24" rx="4" fill="${D}" transform="rotate(-14 76 54)"/>
    <rect x="42" y="56" width="12" height="22" rx="4" fill="${G}" transform="rotate(-8 48 56)"/>
    <rect x="60" y="56" width="12" height="22" rx="4" fill="${G}" transform="rotate(8 66 56)"/>
    <ellipse cx="54" cy="44" rx="32" ry="20" fill="${G}"/>
    <circle cx="88" cy="38" r="15" fill="${G}"/>
    <path d="M98 42 q10 6 7 18 q-1 6 4 8 l-2 5 q-11 -2 -9 -13 q2 -9 -6 -13 z" fill="${G}"/>
    <path d="M80 26 q-15 4 -13 21 q4 9 15 4 q3 -14 -2 -25 z" fill="${D}"/>
    <path d="M97 50 q6 4 11 1" fill="none" stroke="#fffbe6" stroke-width="3.2"/>
    <circle cx="93" cy="34" r="2" fill="#1a1a1a" ${N}/>`;
  },
};
const BIB = { 1: [50, 46], 2: [52, 43], 3: [49, 45], 4: [60, 42], 5: [50, 52], 6: [48, 43], 7: [46, 40] };

export function animalSvg(n, attrs = '') {
  const [bx, by] = BIB[n];
  return `<svg viewBox="0 0 120 90" ${attrs} xmlns="http://www.w3.org/2000/svg"><ellipse cx="58" cy="84" rx="40" ry="4" fill="rgba(0,0,0,.18)"/><g ${S}>${BODY[n]()}</g>${bib(n, bx, by)}</svg>`;
}
