// 언더독레이스 동물 그림: 실사풍 옆모습 (오른쪽 = 결승선 방향) + 경주 번호천
// 모두 직접 그린 그림이에요. 굵은 외곽선 없이 그라데이션 음영과 털 결로 사실감을 냈어요.
export const NUM_COLOR = { 1: '#d64545', 2: '#ee8a1c', 3: '#d9a514', 4: '#3a9d4f', 5: '#2f6fd6', 6: '#8a4fd0', 7: '#7a5230' };

const lg = (id, stops, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="0" y1="0" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
const rg = (id, stops, cx = .4, cy = .35) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r=".7">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</radialGradient>`;
const eye = (x, y, r = 2.4, iris = '#2a1608') => `<circle cx="${x}" cy="${y}" r="${r + .6}" fill="#1a0f06"/><circle cx="${x}" cy="${y}" r="${r}" fill="${iris}"/><circle cx="${x}" cy="${y}" r="${r * .5}" fill="#050302"/><circle cx="${x + r * .35}" cy="${y - r * .4}" r="${r * .32}" fill="#fff" opacity=".9"/>`;
const fur = (d, c, w = .8, o = .45) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" opacity="${o}"/>`;
// 경주 번호천 (안장 천)
const cloth = (n, x, y, rot = 0) => `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M-9 -6 h18 l-1 13 q-8 3 -16 0 z" fill="#fdfaf2" stroke="${NUM_COLOR[n]}" stroke-width="2"/><text x="0" y="5" text-anchor="middle" font-family="Pretendard, sans-serif" font-weight="900" font-size="11" fill="${NUM_COLOR[n]}">${n}</text></g>`;

const BODY = {
  // 1 토끼 (산토끼, 도약)
  1: () => `
    <defs>${lg('u1b', [[0, '#8a6038'], [.45, '#b98a5a'], [1, '#ecdcc2']])}${lg('u1e', [[0, '#a87a4c'], [1, '#6e4a2a']], 1, 0)}${lg('u1d', [[0, '#6b4a2c'], [1, '#8f6a45']])}</defs>
    <path d="M40 58 C32 66 22 71 10 73 L9 76 C22 77 32 73 44 64 Z" fill="url(#u1d)"/>
    <path d="M78 54 C82 62 87 68 93 72 L95 70 C90 64 86 58 83 52 Z" fill="url(#u1d)"/>
    <path d="M24 49 C23 39 36 31 53 33 C66 34 76 37 83 42 C87 47 84 55 77 59 C66 64 49 64 39 62 C30 60 25 56 24 49 Z" fill="url(#u1b)"/>
    ${fur('M34 38 q3 -1 6 0 M44 35 q3 -1 6 0 M56 35 q3 0 6 1 M66 37 q3 0 5 2 M40 42 q4 -1 7 0', '#5a3c20')}
    <path d="M28 46 C24 57 29 66 40 66 C49 66 51 57 46 48 C41 43 32 42 28 46 Z" fill="#b08254"/>
    <path d="M37 64 C29 70 18 75 3 77 L3 80 C20 81 33 76 45 66 Z" fill="#a37a50"/>
    <path d="M3 77 L3 80 C9 80 14 79 18 78 Z" fill="#f1e6d4"/>
    <path d="M75 53 C79 63 87 71 97 75 L98 72 C91 67 84 59 81 51 Z" fill="#b48a5e"/>
    <circle cx="24" cy="45" r="5.5" fill="#f7f2ea"/><circle cx="23" cy="44" r="3" fill="#fff"/>
    <path d="M90 33 C92 20 98 11 105 8 C106 15 101 26 95 35 Z" fill="url(#u1e)"/>
    <path d="M85 34 C82 20 85 9 91 4 C95 9 94 22 92 35 Z" fill="#b48a5e"/>
    <path d="M87 31 C85 21 87 12 90 8 C92 13 92 22 91 31 Z" fill="#d9a08a" opacity=".7"/>
    <path d="M79 41 C80 33 90 29 99 32 C106 35 109 41 105 46 C99 51 88 51 82 48 Z" fill="#b48a5e"/>
    <path d="M96 44 C101 44 105 45 106 47 C101 50 95 50 91 48 Z" fill="#efe3cf"/>
    ${eye(95, 38, 2.3, '#4a2a0e')}
    <path d="M106 42 l2 1.4 l-2 1.4 z" fill="#5a3326"/>
    ${fur('M104 45 l9 -2 M104 46 l9 1 M103 47 l8 3', '#3a2a1a', .5, .6)}
    ${cloth(1, 55, 44, -4)}`,

  // 2 호랑이 (질주)
  2: () => `
    <defs>${lg('u2b', [[0, '#c4560f'], [.35, '#ec8a2a'], [.7, '#f4a65a'], [.85, '#f4e6d2'], [1, '#fbf5ec']])}${lg('u2h', [[0, '#d26a1a'], [.6, '#f09a3e'], [1, '#f6e8d4']])}</defs>
    <path d="M40 56 C38 64 36 70 34 77 L39 78 C42 71 45 64 47 58 Z" fill="#a34c10"/>
    <path d="M70 56 C74 63 78 70 80 77 L85 76 C83 69 79 61 76 55 Z" fill="#a34c10"/>
    <path d="M24 43 C16 42 10 36 7 27 C6 23 9 22 10 25 C13 32 18 37 26 38 Z" fill="#e07a22"/>
    ${fur('M10 28 l3 -1 M12 32 l3 -2 M16 36 l2 -2', '#1d0d04', 2, 1)}
    <path d="M7 27 C6 23 9 22 10 25 Z" fill="#1d0d04"/>
    <path d="M22 45 C23 36 38 31 56 32 C71 33 83 33 89 38 C93 44 91 52 85 55 C71 60 50 60 36 58 C26 56 21 51 22 45 Z" fill="url(#u2b)"/>
    <g fill="#1d0d04" opacity=".92"><path d="M32 35 l3.2 0 q1 7 -2 11 q-1 -8 -3.2 -11z"/><path d="M41 33 l3.2 0 q1.5 7 -2 13 q-1 -10 -3.2 -13z"/><path d="M50 32 l3.2 0 q1.5 7 -2.5 14 q-1 -11 -3.2 -14z"/><path d="M59 32 l3.2 0 q1.5 7 -2 14 q-1 -11 -3.2 -14z"/><path d="M68 33 l3.2 0 q1 7 -2 12 q-1 -9 -3.2 -12z"/><path d="M76 35 l3.2 0 q1 7 -1.5 9 q-1 -6 -3.2 -9z"/><path d="M24 41 l2.5 -1 q3 5 1 11 q-1 -6 -3.5 -10z"/><path d="M45 58 l3 0 q0 -4 2 -7 q-4 3 -5 7z"/><path d="M62 58 l3 0 q0 -4 2 -6 q-4 2 -5 6z"/></g>
    <path d="M30 50 C24 59 17 66 8 70 L9 74 C20 71 30 64 39 56 Z" fill="#e07a22"/>
    <path d="M8 70 L9 74 L4 74 Q3 71 8 70 Z" fill="#f6ead8"/>
    <path d="M76 51 C82 59 90 65 101 68 L101 72 C89 71 79 64 72 57 Z" fill="#ea8a30"/>
    <path d="M101 68 L101 72 L106 72 Q106 68 101 68 Z" fill="#f6ead8"/>
    ${fur('M33 52 l3 4 M76 55 l4 4', '#1d0d04', 2, .9)}
    <path d="M87 29 C86 24 90 22 93 26 Z" fill="#c4560f"/><path d="M88 28 C88 25 90 24 91.5 26.5 Z" fill="#f6e8d4"/>
    <path d="M84 36 C88 29 100 27 106 32 C111 36 112 43 108 47 C102 52 91 52 86 46 Z" fill="url(#u2h)"/>
    <path d="M100 41 C105 40 110 42 111 45 C107 50 99 50 95 47 Z" fill="#fbf5ec"/>
    <g fill="#1d0d04"><path d="M90 31 q2 3 1 6 q2 -3 -1 -6z"/><path d="M86 39 q4 1 6 3 q-4 0 -6 -3z"/><path d="M95 30 q1 2 0 4 q2 -2 0 -4z"/></g>
    ${eye(98, 36, 2.1, '#c99a1a')}
    <path d="M108 41 q3 0 3 2 q-2 1 -4 0 z" fill="#b25a4a"/>
    ${fur('M106 45 l9 -1 M106 46 l9 2 M105 47 l7 4', '#fff', .5, .9)}
    ${cloth(2, 56, 43, -2)}`,

  // 3 판다 (뒤뚱 달리기)
  3: () => `
    <defs>${lg('u3b', [[0, '#fbfaf5'], [.7, '#ebe7dc'], [1, '#c9c4b6']])}${lg('u3k', [[0, '#2c2c2c'], [1, '#0e0e0e']])}</defs>
    <path d="M42 58 C40 66 39 71 38 77 L46 78 C47 71 49 65 50 60 Z" fill="#0b0b0b"/>
    <path d="M66 58 C69 65 71 71 72 77 L80 76 C79 69 76 62 73 57 Z" fill="#0b0b0b"/>
    <path d="M25 48 C25 36 41 28 58 30 C72 31 82 36 86 43 C88 52 82 60 72 62 C56 66 40 64 32 60 C27 57 25 53 25 48 Z" fill="url(#u3b)"/>
    ${fur('M34 34 q3 -1 6 0 M46 31 q3 -1 6 0 M30 40 q2 -2 5 -2', '#b8b2a2', .9, .8)}
    <path d="M63 31 C73 32 81 38 83 46 C83 54 78 60 72 62 C66 58 62 48 63 31 Z" fill="url(#u3k)"/>
    <path d="M30 51 C26 59 20 66 13 70 L15 75 C24 71 33 64 40 57 C38 53 34 50 30 51 Z" fill="url(#u3k)"/>
    <path d="M72 54 C77 62 83 68 92 72 L91 76 C81 74 73 67 67 60 Z" fill="url(#u3k)"/>
    <ellipse cx="26" cy="47" rx="3.5" ry="3" fill="#f3f0e6"/>
    <path d="M79 24 C77 18 84 15 87 20 C86 23 82 25 79 24 Z" fill="#141414"/>
    <path d="M91 21 C91 15 98 15 99 20 C98 23 94 24 91 21 Z" fill="#141414"/>
    <path d="M77 36 C77 26 86 20 95 22 C104 24 109 32 107 40 C105 47 98 50 90 49 C82 48 77 44 77 36 Z" fill="url(#u3b)"/>
    <path d="M92 30 C97 28 101 31 100 35 C99 39 94 40 92 37 C90 35 90 32 92 30 Z" fill="#161616"/>
    ${eye(96, 33.5, 1.4, '#2a1a10')}
    <path d="M104 40 C107 40 109 42 107 44 C105 45 102 44 102 42 Z" fill="#1a1a1a"/>
    ${fur('M100 46 q3 1 5 0', '#3a3a3a', .7, .8)}
    ${cloth(3, 50, 45, 0)}`,

  // 4 개구리 (점프)
  4: () => `
    <defs>${lg('u4b', [[0, '#3f7d2a'], [.5, '#62a83a'], [.85, '#a9cf6a'], [1, '#e9eec2']])}${lg('u4l', [[0, '#4f8f30'], [1, '#2f5f1c']])}</defs>
    <path d="M50 54 C40 52 30 56 24 62 C18 68 10 70 3 70 L2 73 C12 74 22 72 30 66 C38 62 46 62 54 60 Z" fill="url(#u4l)"/>
    <path d="M3 70 l-2 -3 M3 71 l-3 1 M2 73 l-2 3" stroke="#2f5f1c" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M38 52 C46 38 64 30 80 30 C90 30 98 35 99 41 C99 48 92 54 82 57 C68 61 52 62 42 60 C36 58 35 55 38 52 Z" fill="url(#u4b)"/>
    <g fill="#2f5a1c" opacity=".75"><ellipse cx="56" cy="42" rx="4" ry="2.6"/><ellipse cx="66" cy="37" rx="3" ry="2"/><ellipse cx="48" cy="49" rx="3" ry="2"/><ellipse cx="72" cy="45" rx="2.6" ry="1.8"/></g>
    <path d="M44 46 C40 52 34 60 26 64 L28 67 C38 64 47 58 52 52 Z" fill="#5a9a36"/>
    <path d="M84 52 C88 60 92 66 98 70 L101 68 C97 64 92 58 89 51 Z" fill="#5a9a36"/>
    <path d="M98 70 l4 -1 M99 70 l3 2" stroke="#3f7d2a" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M68 39 C74 40 86 41 96 41" fill="none" stroke="#c9b45a" stroke-width="1" opacity=".7"/>
    <circle cx="85" cy="31" r="6.5" fill="#4f8f30"/>
    <circle cx="86" cy="30.5" r="4.6" fill="#c9a12a"/><ellipse cx="86" cy="30.5" rx="3.6" ry="1.6" fill="#0a0a0a"/><circle cx="87.4" cy="29.2" r=".9" fill="#fff"/>
    <path d="M86 45 C91 47 96 46 99 43" fill="none" stroke="#2f5a1c" stroke-width="1"/>
    <circle cx="97" cy="37" r=".9" fill="#1e3a10"/>
    ${cloth(4, 62, 46, -12)}`,

  // 5 펭귄 (아델리 펭귄, 뒤뚱 질주)
  5: () => `
    <defs>${lg('u5k', [[0, '#3a3f4a'], [1, '#101318']], 1, 0)}${lg('u5w', [[0, '#ffffff'], [1, '#dfe3ea']], 1, 0)}</defs>
    <path d="M46 74 C42 77 38 79 34 80 L46 81 Z" fill="#e6a39a"/>
    <path d="M62 74 C66 77 72 79 76 79 L64 72 Z" fill="#e6a39a"/>
    <g transform="rotate(16 58 50)">
      <path d="M44 48 C34 52 26 58 22 66 C30 64 38 59 46 54 Z" fill="#14171d"/>
      <path d="M58 18 C68 18 74 26 75 36 C77 50 74 64 66 74 C60 79 52 78 47 72 C40 62 39 46 42 34 C44 25 50 18 58 18 Z" fill="url(#u5k)"/>
      <path d="M64 30 C71 34 73 44 72 56 C71 66 67 72 61 75 C57 70 56 58 57 46 C58 38 60 33 64 30 Z" fill="url(#u5w)"/>
      <circle cx="66" cy="27" r="3.4" fill="#fff"/>${eye(66, 27, 1.5, '#1a1a1a')}
      <path d="M72 29 C77 29 82 31 84 32 C80 33 76 33 72 33 Z" fill="#1a1a1a"/>
      <path d="M73 31.5 C77 31.5 80 32 82 32.5" stroke="#d67a5a" stroke-width=".8" fill="none"/>
      ${fur('M50 30 q2 6 1 12 M54 26 q1 6 1 10', '#5a6070', .6, .6)}
    </g>
    ${cloth(5, 51, 47, 16)}`,

  // 6 여우 (붉은여우, 질주)
  6: () => `
    <defs>${lg('u6b', [[0, '#b8471a'], [.45, '#e0712e'], [.8, '#eb9a5e'], [1, '#f5e9da']])}${lg('u6t', [[0, '#c45622'], [.75, '#e47f3e'], [1, '#f2e2cf']], 1, 0)}</defs>
    <path d="M40 54 C38 62 36 70 34 77 L38 78 C41 71 44 63 46 56 Z" fill="#1f130c"/>
    <path d="M66 54 C70 62 74 70 76 77 L80 76 C78 68 75 60 71 53 Z" fill="#1f130c"/>
    <path d="M27 44 C18 40 9 41 3 46 C1 49 3 52 7 52 C15 53 22 52 29 49 Z" fill="url(#u6t)"/>
    <path d="M3 46 C1 49 3 52 7 52 C8 49 7 47 3 46 Z" fill="#fbf7f0"/>
    ${fur('M10 45 q4 1 7 0 M14 49 q4 0 7 -1', '#8a3610', .7, .6)}
    <path d="M24 45 C25 37 39 33 54 34 C66 35 76 36 81 40 C85 45 83 51 77 54 C65 58 47 58 36 55 C28 53 24 50 24 45 Z" fill="url(#u6b)"/>
    ${fur('M34 37 q3 -1 6 0 M46 35 q3 -1 6 0 M58 35 q3 0 5 1', '#7a2c0c', .8, .5)}
    <path d="M31 49 C25 57 18 64 10 68 L12 72 C21 68 30 61 38 54 Z" fill="#c45622"/>
    <path d="M12 72 L10 68 L6 70 Q8 73 12 72 Z" fill="#1f130c"/><path d="M28 55 C24 60 20 64 16 67 L14 69 L18 66 C22 62 26 58 30 54 Z" fill="#1f130c" opacity=".85"/>
    <path d="M73 49 C79 56 87 62 97 65 L97 69 C86 68 77 61 70 54 Z" fill="#c45622"/>
    <path d="M86 62 C90 64 94 65 97 65 L97 69 C92 69 88 67 84 65 Z" fill="#1f130c"/>
    <path d="M76 44 C80 48 82 52 80 56 C76 54 73 50 73 45 Z" fill="#f7efe4"/>
    <path d="M84 33 L85 21 L92 30 Z" fill="#b8471a"/><path d="M85.5 31 L86 24 L90 30 Z" fill="#2a1a10"/>
    <path d="M90 32 L94 21 L98 32 Z" fill="#c45622"/>
    <path d="M80 39 C84 32 94 30 100 34 C104 36 110 39 115 41 C112 44 106 46 99 47 C91 48 84 46 80 39 Z" fill="url(#u6b)"/>
    <path d="M96 45 C102 45 108 44 113 42 C109 46 102 48 96 47 Z" fill="#fbf7f0"/>
    ${eye(95, 37, 1.8, '#a8661a')}
    <circle cx="114.5" cy="41" r="1.6" fill="#120a06"/>
    ${fur('M110 43 l7 0 M110 44 l7 2', '#2a1a10', .45, .6)}
    ${cloth(6, 54, 41, -2)}`,

  // 7 코끼리 (아프리카코끼리, 뛰는 중)
  7: () => `
    <defs>${lg('u7b', [[0, '#7d858d'], [.5, '#9aa2aa'], [1, '#6c737a']])}${lg('u7e', [[0, '#8a9198'], [1, '#666d74']], 1, 0)}</defs>
    <path d="M22 40 C18 44 17 50 19 56" fill="none" stroke="#6c737a" stroke-width="2"/><path d="M19 55 l-1 4 l3 -1 z" fill="#3a3e42"/>
    <path d="M34 56 C32 63 30 70 27 77 L36 78 C38 71 40 64 42 58 Z" fill="#5f666c"/>
    <path d="M70 56 C73 63 76 70 79 77 L88 76 C85 69 81 61 78 55 Z" fill="#5f666c"/>
    <path d="M20 42 C20 28 36 20 56 21 C72 22 84 26 88 34 C92 44 88 54 80 58 C66 64 44 64 32 60 C24 57 20 50 20 42 Z" fill="url(#u7b)"/>
    ${fur('M30 30 q6 -3 12 -3 M44 26 q8 -2 14 0 M28 46 q3 4 8 6 M62 56 q6 1 12 -2 M36 40 q4 2 8 2', '#5a6066', .8, .55)}
    <path d="M42 56 C42 64 42 70 41 77 L50 78 C51 71 52 64 52 58 Z" fill="url(#u7b)"/>
    <path d="M62 56 C64 63 66 70 67 77 L76 76 C75 69 73 62 71 56 Z" fill="url(#u7b)"/>
    ${fur('M43 66 h8 M43 70 h8 M64 66 h8 M65 70 h8', '#5a6066', .6, .6)}
    <path d="M41 77 h9 v2 h-9 z M67 77 h9 v2 h-9 z" fill="#c9c2b0"/>
    <path d="M78 30 C82 22 94 20 100 26 C106 32 106 42 103 48 C104 54 108 60 112 64 C113 66 112 68 110 67 C104 64 98 58 96 52 C90 52 82 48 79 42 Z" fill="url(#u7b)"/>
    ${fur('M103 52 q2 1 4 0 M105 56 q2 1 4 0 M107 60 q2 1 3 0', '#5a6066', .6, .7)}
    <path d="M80 26 C70 26 66 36 68 46 C70 54 76 58 84 56 C88 48 88 36 84 28 Z" fill="url(#u7e)"/>
    ${fur('M72 34 q3 6 2 12 M76 32 q3 8 2 16', '#55606a', .6, .5)}
    <path d="M99 48 C104 52 110 52 114 49 C111 54 104 55 99 51 Z" fill="#f4edd9"/>
    ${eye(95, 33, 1.5, '#2a1a10')}
    ${fur('M92 31 q3 -2 6 0', '#454a50', .6, .7)}
    ${cloth(7, 50, 38, 0)}`,
};

export function animalSvg(n, attrs = '') {
  return `<svg viewBox="0 0 120 90" ${attrs} xmlns="http://www.w3.org/2000/svg"><ellipse cx="58" cy="84" rx="42" ry="3.5" fill="rgba(0,0,0,.2)"/>${BODY[n]()}</svg>`;
}
