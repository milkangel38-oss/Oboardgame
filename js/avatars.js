// O게임 오리지널 캐릭터 (직접 그린 SVG) — 프로필 편집에서 고를 수 있어요.
// 저장 형식: 'char:<id>'

const INK = '#2b1d22';

// 공통 얼굴 부품
const eyes = (y = 56, gap = 12, cx = 50) => `
  <ellipse cx="${cx - gap}" cy="${y}" rx="4.6" ry="5.6" fill="${INK}"/>
  <ellipse cx="${cx + gap}" cy="${y}" rx="4.6" ry="5.6" fill="${INK}"/>
  <circle cx="${cx - gap + 1.6}" cy="${y - 2}" r="1.7" fill="#fff"/>
  <circle cx="${cx + gap + 1.6}" cy="${y - 2}" r="1.7" fill="#fff"/>`;
const sleepy = (y = 57, gap = 12, cx = 50) => `
  <path d="M${cx - gap - 5} ${y} q5 5 10 0 M${cx + gap - 5} ${y} q5 5 10 0" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
const blush = (y = 65, gap = 20, cx = 50) => `
  <ellipse cx="${cx - gap}" cy="${y}" rx="5.5" ry="3.2" fill="#ff7c9c" opacity=".55"/>
  <ellipse cx="${cx + gap}" cy="${y}" rx="5.5" ry="3.2" fill="#ff7c9c" opacity=".55"/>`;
const smile = (y = 65, cx = 50) => `<path d="M${cx - 4} ${y} q4 4 8 0" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
const catMouth = (y = 64, cx = 50) => `<path d="M${cx - 6} ${y} q3 3.5 6 0 q3 3.5 6 0" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;

const wrap = (bg, body) =>
  `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="100" height="100" fill="${bg}"/>${body}</svg>`;

export const CHARACTERS = [
  {
    id: 'gumiho', name: '구미호',
    svg: wrap('#ffe3c7', `
      <g fill="#ff9a4a">
        <path d="M18 78 q-16 -20 -4 -40 q6 16 18 24 z"/><path d="M82 78 q16 -20 4 -40 q-6 16 -18 24 z"/>
        <path d="M24 86 q-20 -6 -20 -26 q12 10 26 12 z"/><path d="M76 86 q20 -6 20 -26 q-12 10 -26 12 z"/>
      </g>
      <g fill="#fff"><path d="M14 38 q-4 8 0 14 l6 -6 z"/><path d="M86 38 q4 8 0 14 l-6 -6 z"/></g>
      <path d="M26 40 l4 -24 l16 14 z M74 40 l-4 -24 l-16 14 z" fill="#ff9a4a"/>
      <path d="M30 34 l2 -12 l8 7 z M70 34 l-2 -12 l-8 7 z" fill="#ffc1d0"/>
      <ellipse cx="50" cy="58" rx="30" ry="27" fill="#ff9a4a"/>
      <path d="M22 62 q28 34 56 0 q-10 -8 -28 -2 q-18 -6 -28 2 z" fill="#fff6ec"/>
      ${eyes(54, 12)}${blush(64, 21)}<ellipse cx="50" cy="63" rx="3" ry="2.2" fill="${INK}"/>${catMouth(66)}`),
  },
  {
    id: 'dokkaebi', name: '도깨비',
    svg: wrap('#d7f0ff', `
      <path d="M36 30 l-4 -18 l11 13 z M64 30 l4 -18 l-11 13 z" fill="#ffd84d" stroke="#e0a800" stroke-width="1.5"/>
      <ellipse cx="50" cy="58" rx="31" ry="29" fill="#ff7a6b"/>
      <path d="M22 46 q4 -20 28 -21 q24 1 28 21 q-6 -6 -10 -2 q-4 -8 -9 -2 q-5 -8 -9 -1 q-5 -7 -9 1 q-5 -6 -9 2 q-4 -4 -10 2 z" fill="#3a2a5a"/>
      ${eyes(58, 12)}${blush(68, 21)}
      <path d="M43 68 q7 7 14 0" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M53 69.5 l2 4 l2 -4.6 z" fill="#fff"/>`),
  },
  {
    id: 'ninja', name: '고양이 닌자',
    svg: wrap('#e6e0ff', `
      <path d="M24 42 l2 -26 l18 14 z M76 42 l-2 -26 l-18 14 z" fill="#7d84a8"/>
      <path d="M28 36 l1.5 -13 l9 7 z M72 36 l-1.5 -13 l-9 7 z" fill="#ffc1d0"/>
      <ellipse cx="50" cy="58" rx="31" ry="28" fill="#8e95b8"/>
      <rect x="19" y="38" width="62" height="9" rx="4" fill="#ff4f6e"/>
      <path d="M80 42 q10 -4 14 4 q-8 0 -12 2 M80 44 q8 4 8 12 q-6 -5 -10 -7" fill="#ff4f6e"/>
      ${eyes(55, 12)}
      <path d="M21 63 q29 -6 58 0 q-2 20 -29 22 q-27 -2 -29 -22 z" fill="#3a3358"/>
      <path d="M36 72 h28" stroke="#5a5280" stroke-width="2" stroke-linecap="round"/>`),
  },
  {
    id: 'haetae', name: '해태',
    svg: wrap('#fff2c2', `
      ${Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return `<circle cx="${(50 + Math.cos(a) * 32).toFixed(1)}" cy="${(57 + Math.sin(a) * 30).toFixed(1)}" r="10" fill="#4b8bff"/>`;
      }).join('')}
      <path d="M50 14 l5 14 h-10 z" fill="#ffd84d" stroke="#e0a800" stroke-width="1.5"/>
      <ellipse cx="50" cy="58" rx="28" ry="26" fill="#ffd36b"/>
      <path d="M38 40 q4 -4 8 0 M54 40 q4 -4 8 0" stroke="#e09a1a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      ${eyes(55, 11)}${blush(65, 19)}
      <ellipse cx="50" cy="64" rx="6" ry="4" fill="#e07a3a"/>${smile(70)}`),
  },
  {
    id: 'reaper', name: '꼬마 저승사자',
    svg: wrap('#e7e6f2', `
      <path d="M18 100 q4 -22 32 -22 q28 0 32 22 z" fill="#2a2638"/>
      <ellipse cx="50" cy="60" rx="25" ry="24" fill="#f6f3fb"/>
      <rect x="36" y="16" width="28" height="22" rx="4" fill="#1d1a28"/>
      <ellipse cx="50" cy="38" rx="40" ry="7" fill="#1d1a28"/>
      <path d="M20 40 q30 6 60 0" stroke="#4a4560" stroke-width="1.5" fill="none"/>
      <path d="M30 40 l-2 30 M70 40 l2 30" stroke="#b9a6ff" stroke-width="1.6" stroke-dasharray="2 3"/>
      ${sleepy(60, 10)}${blush(68, 17)}<path d="M47 71 q3 2.5 6 0" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`),
  },
  {
    id: 'moonrabbit', name: '달토끼',
    svg: wrap('#ffeef6', `
      <circle cx="80" cy="20" r="11" fill="#ffe27a"/><circle cx="84" cy="17" r="9" fill="#ffeef6"/>
      <ellipse cx="38" cy="22" rx="8" ry="20" fill="#fff" transform="rotate(-10 38 22)"/>
      <ellipse cx="62" cy="22" rx="8" ry="20" fill="#fff" transform="rotate(10 62 22)"/>
      <ellipse cx="38" cy="24" rx="4" ry="13" fill="#ffc1d0" transform="rotate(-10 38 24)"/>
      <ellipse cx="62" cy="24" rx="4" ry="13" fill="#ffc1d0" transform="rotate(10 62 24)"/>
      <ellipse cx="50" cy="62" rx="29" ry="26" fill="#fff"/>
      ${eyes(59, 12)}${blush(68, 20)}
      <path d="M48 66 l2 2 l2 -2 z" fill="#ff8aa8"/>${catMouth(69)}`),
  },
  {
    id: 'tiger', name: '아기 호랑이',
    svg: wrap('#ffe9c9', `
      <circle cx="24" cy="34" r="11" fill="#ff9d3a"/><circle cx="76" cy="34" r="11" fill="#ff9d3a"/>
      <circle cx="24" cy="34" r="5.5" fill="#ffe3c0"/><circle cx="76" cy="34" r="5.5" fill="#ffe3c0"/>
      <ellipse cx="50" cy="58" rx="31" ry="28" fill="#ff9d3a"/>
      <path d="M44 32 l2 9 l2 -9 M50 30 l0 11 M52 32 l2 9 l2 -9" stroke="${INK}" stroke-width="3" stroke-linecap="round" fill="none"/>
      <path d="M20 56 l8 2 M20 63 l8 0 M80 56 l-8 2 M80 63 l-8 0" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
      <ellipse cx="50" cy="69" rx="15" ry="11" fill="#fff6ea"/>
      ${eyes(54, 12)}${blush(64, 21)}<ellipse cx="50" cy="64" rx="3.4" ry="2.4" fill="${INK}"/>${catMouth(67)}`),
  },
  {
    id: 'panda', name: '판다',
    svg: wrap('#e3f6e6', `
      <circle cx="25" cy="34" r="11" fill="#2b2b33"/><circle cx="75" cy="34" r="11" fill="#2b2b33"/>
      <ellipse cx="50" cy="58" rx="31" ry="28" fill="#fff"/>
      <ellipse cx="37" cy="56" rx="8" ry="10" fill="#2b2b33" transform="rotate(25 37 56)"/>
      <ellipse cx="63" cy="56" rx="8" ry="10" fill="#2b2b33" transform="rotate(-25 63 56)"/>
      <circle cx="38" cy="56" r="3.4" fill="#fff"/><circle cx="62" cy="56" r="3.4" fill="#fff"/>
      <circle cx="38.8" cy="56" r="1.8" fill="${INK}"/><circle cx="62.8" cy="56" r="1.8" fill="${INK}"/>
      ${blush(68, 22)}<ellipse cx="50" cy="66" rx="3.4" ry="2.4" fill="${INK}"/>${catMouth(69)}
      <path d="M70 84 q8 -14 16 -6 l-4 4 q-4 -4 -8 6 z" fill="#5fcf6a"/>`),
  },
  {
    id: 'frog', name: '개구리',
    svg: wrap('#e1fbd6', `
      <ellipse cx="50" cy="64" rx="36" ry="25" fill="#5fcf6a"/>
      <circle cx="34" cy="40" r="13" fill="#5fcf6a"/><circle cx="66" cy="40" r="13" fill="#5fcf6a"/>
      <circle cx="34" cy="40" r="8.5" fill="#fff"/><circle cx="66" cy="40" r="8.5" fill="#fff"/>
      <circle cx="35" cy="41" r="5" fill="${INK}"/><circle cx="67" cy="41" r="5" fill="${INK}"/>
      <circle cx="36.5" cy="39" r="1.8" fill="#fff"/><circle cx="68.5" cy="39" r="1.8" fill="#fff"/>
      ${blush(64, 24)}
      <path d="M32 64 q18 16 36 0" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M44 69 q6 8 12 0 z" fill="#ff7c9c"/>`),
  },
  {
    id: 'ghost', name: '꼬마 유령',
    svg: wrap('#e5eeff', `
      <path d="M22 88 v-34 a28 28 0 0 1 56 0 v34 l-7 -6 l-7 6 l-7 -6 l-7 6 l-7 -6 l-7 6 l-7 -6 z" fill="#fff"/>
      <path d="M22 60 q-10 4 -10 14 q8 -2 10 -6 M78 60 q10 4 10 14 q-8 -2 -10 -6" fill="#fff"/>
      ${eyes(52, 11)}${blush(61, 18)}
      <path d="M44 61 q6 6 12 0" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <path d="M48 63.5 q2 6 5 0 z" fill="#ff7c9c"/>
      <circle cx="82" cy="22" r="2" fill="#9db8ff"/><circle cx="16" cy="30" r="1.5" fill="#9db8ff"/>`),
  },
  {
    id: 'dice', name: '주사위 친구',
    svg: wrap('#ffe0ee', `
      <g transform="rotate(-8 50 54)">
        <rect x="20" y="24" width="60" height="60" rx="14" fill="#fff" stroke="#ff4f9a" stroke-width="3"/>
        <circle cx="31" cy="35" r="3.6" fill="#ff4f9a"/><circle cx="69" cy="35" r="3.6" fill="#ff4f9a"/>
        <circle cx="31" cy="73" r="3.6" fill="#ff4f9a"/><circle cx="69" cy="73" r="3.6" fill="#ff4f9a"/>
        ${eyes(52, 10)}${blush(61, 17)}${smile(61)}
      </g>`),
  },
  {
    id: 'penguin', name: '펭귄',
    svg: wrap('#dcf3ff', `
      <ellipse cx="50" cy="58" rx="32" ry="30" fill="#2d3a5c"/>
      <path d="M50 44 q-6 -10 -16 -6 q-12 6 -10 24 q2 18 26 20 q24 -2 26 -20 q2 -18 -10 -24 q-10 -4 -16 6 z" fill="#fff"/>
      ${eyes(56, 11)}${blush(66, 18)}
      <path d="M44 63 q6 6 12 0 q-6 -3 -12 0 z" fill="#ffa53a"/>
      <path d="M30 26 q20 -12 40 0 q-20 -4 -40 0 z" fill="#ff4f6e"/><circle cx="50" cy="20" r="4" fill="#ff4f6e"/>`),
  },
];

const byId = Object.fromEntries(CHARACTERS.map((c) => [c.id, c]));
export const charSvg = (id) => byId[id]?.svg || '';
export const charName = (id) => byId[id]?.name || '';
