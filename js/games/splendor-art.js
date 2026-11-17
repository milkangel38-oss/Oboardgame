// 스플렌더 그림: 보석 6종, 보석 토큰, 카드 배경(중세 풍경), 귀족 초상 — 모두 직접 그린 그림
// 그라데이션은 SPL_DEFS 한 곳에만 정의해요 (화면 맨 위에 한 번 넣기)

export const SPL_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <linearGradient id="spg-w" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#e3e9f4"/><stop offset="1" stop-color="#a9b6cc"/></linearGradient>
  <radialGradient id="spg-u" cx=".38" cy=".35" r=".75"><stop offset="0" stop-color="#9cc4ff"/><stop offset=".45" stop-color="#2f6fd6"/><stop offset="1" stop-color="#0b2a6e"/></radialGradient>
  <linearGradient id="spg-r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff8a96"/><stop offset=".5" stop-color="#d6223c"/><stop offset="1" stop-color="#6a0816"/></linearGradient>
  <linearGradient id="spg-k" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a5f5a"/><stop offset=".5" stop-color="#3a2a28"/><stop offset="1" stop-color="#120c0c"/></linearGradient>
  <linearGradient id="spg-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8ff5b5"/><stop offset=".5" stop-color="#1fa85a"/><stop offset="1" stop-color="#0a4a24"/></linearGradient>
  <linearGradient id="spg-y" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6b0"/><stop offset=".5" stop-color="#f5c32c"/><stop offset="1" stop-color="#a86a08"/></linearGradient>
  <radialGradient id="spg-bg" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#fbf3e2"/><stop offset="1" stop-color="#d9c39c"/></radialGradient>
</defs></svg>`;

// ── 보석 (viewBox 0 0 40 40) ──
const GEMS = {
  // 다이아몬드: 브릴리언트 컷
  w: `<path d="M9 14 15 7h10l6 7-11 20z" fill="url(#spg-w)" stroke="#8a97ae" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M9 14h22M15 7l-2 7 7 20 7-20-2-7M13 14l7-7 7 7M20 7v7" fill="none" stroke="#8a97ae" stroke-width=".8"/>
      <path d="M15.5 9l-1.8 3.5" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><path d="M31 6l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z" fill="#fff"/>`,
  // 사파이어: 타원형 커팅
  u: `<ellipse cx="20" cy="20" rx="14" ry="11" fill="url(#spg-u)" stroke="#0b2a6e" stroke-width="1.2" transform="rotate(-18 20 20)"/>
      <ellipse cx="20" cy="20" rx="8" ry="5.6" fill="none" stroke="#9cc4ff" stroke-width=".9" opacity=".8" transform="rotate(-18 20 20)"/>
      <path d="M8 23l6-3M32 17l-6 3M14 11l3 4M26 29l-3-4" stroke="#0b2a6e" stroke-width=".8" opacity=".7"/>
      <ellipse cx="15" cy="15" rx="3.2" ry="1.8" fill="#fff" opacity=".75" transform="rotate(-30 15 15)"/>`,
  // 루비: 쿠션 컷
  r: `<rect x="8" y="8" width="24" height="24" rx="7" fill="url(#spg-r)" stroke="#5a0612" stroke-width="1.2" transform="rotate(8 20 20)"/>
      <rect x="14" y="14" width="12" height="12" rx="3" fill="none" stroke="#ff9aa6" stroke-width=".9" opacity=".8" transform="rotate(8 20 20)"/>
      <path d="M10 10l5 5M30 10l-5 5M10 30l5-5M30 30l-5-5" stroke="#5a0612" stroke-width=".8" opacity=".7" transform="rotate(8 20 20)"/>
      <path d="M13 12.5l3.5-1.4" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>`,
  // 오닉스: 직사각 스텝 컷
  k: `<rect x="6" y="11" width="28" height="18" rx="2" fill="url(#spg-k)" stroke="#0a0606" stroke-width="1.2"/>
      <rect x="11" y="14.5" width="18" height="11" rx="1" fill="#2a1e1c" stroke="#8a706a" stroke-width=".8"/>
      <path d="M6 11l5 3.5M34 11l-5 3.5M6 29l5-3.5M34 29l-5-3.5" stroke="#8a706a" stroke-width=".8"/>
      <path d="M13 16.5h7" stroke="#c9b0a8" stroke-width="1.3" stroke-linecap="round" opacity=".8"/>`,
  // 에메랄드: 팔각 에메랄드 컷
  g: `<path d="M13 8h14l6 6v12l-6 6H13l-6-6V14z" fill="url(#spg-g)" stroke="#0a4a24" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M16 13h8l4 4v6l-4 4h-8l-4-4v-6z" fill="none" stroke="#a8ffcc" stroke-width=".9" opacity=".75"/>
      <path d="M13 8l3 5M27 8l-3 5M33 14l-5 3M33 26l-5-3M27 32l-3-5M13 32l3-5M7 26l5-3M7 14l5 3" stroke="#0a4a24" stroke-width=".8" opacity=".7"/>
      <path d="M15.5 10.5h6" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".75"/>`,
  // 황금 보석: 삼각(트릴리언) 컷
  gold: `<path d="M20 5l15 26H5z" fill="url(#spg-y)" stroke="#8a5a06" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M20 13l7 12H13z" fill="none" stroke="#fff6b0" stroke-width=".9"/>
      <path d="M20 5v8M35 31l-8-6M5 31l8-6" stroke="#8a5a06" stroke-width=".8" opacity=".7"/>
      <path d="M17 11l-2.2 4" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".85"/>`,
};
export const gemSvg = (c, cls = 'gem') => `<svg viewBox="0 0 40 40" class="${cls}">${GEMS[c]}</svg>`;

const RING = { w: '#e8ecf4', u: '#2f6fd6', g: '#2f9e5b', r: '#d6334a', k: '#2a2428', gold: '#f5c32c' };
// 보석 토큰: 색 테두리 + 베이지 바탕 + 큰 보석
export const tokenSvg = (c) => `<svg viewBox="0 0 40 40" class="tok">
  <circle cx="20" cy="20" r="19" fill="${RING[c]}"/><circle cx="20" cy="20" r="19" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1"/>
  <circle cx="20" cy="20" r="15.5" fill="url(#spg-bg)"/>
  <g transform="translate(20 20) scale(.78) translate(-20 -20)">${GEMS[c]}</g></svg>`;

// ── 카드 배경: 중세 풍경 (viewBox 0 0 50 70) ──
const SCENES = [
  // 성
  `<path d="M0 52 Q25 44 50 52V70H0z" fill="#9bb87a"/><rect x="12" y="26" width="26" height="24" fill="#c9b9a0"/>
   <rect x="8" y="18" width="9" height="32" fill="#b8a88c"/><rect x="33" y="18" width="9" height="32" fill="#b8a88c"/>
   <path d="M7 18l5.5-7 5.5 7zM32 18l5.5-7 5.5 7z" fill="#a0525a"/><path d="M12.5 11V6l4 1.5-4 1.5" fill="#d6334a" stroke="#6a4a3a" stroke-width=".5"/>
   <path d="M21 50v-9a4 4 0 0 1 8 0v9z" fill="#6a4a3a"/><path d="M12 26h2v-2h2v2h2v-2h2v2h2v-2h2v2h2v-2h2v2h2v-2h2v2h2" fill="none" stroke="#b8a88c" stroke-width="2"/>`,
  // 범선
  `<path d="M0 48 Q12 45 25 48 T50 48V70H0z" fill="#7aa8c8"/><path d="M10 46h30l-5 7H15z" fill="#8a5a3a"/>
   <path d="M25 46V14" stroke="#6a4a3a" stroke-width="1.2"/><path d="M25 16q12 8 0 18zM25 34q9 5 0 11z" fill="#f2ead8"/><path d="M25 18q-10 7 0 15z" fill="#e8dcc4"/>
   <path d="M25 14l6 2-6 2" fill="#d6334a"/><path d="M4 58q4-2 8 0M30 62q4-2 8 0" stroke="#fff" stroke-width=".8" fill="none" opacity=".7"/>`,
  // 마을 (반목조 집)
  `<path d="M0 54h50v16H0z" fill="#a8b88a"/><rect x="5" y="34" width="16" height="20" fill="#f0e2c4"/><path d="M3 35l10-11 10 11z" fill="#8a4a3a"/>
   <path d="M5 40h16M13 34v20M5 34l16 20M21 34L5 54" stroke="#6a4a3a" stroke-width=".9"/><rect x="26" y="30" width="19" height="24" fill="#e8d6b0"/>
   <path d="M24 31l11.5-12 11.5 12z" fill="#7a3a30"/><path d="M26 38h19M35.5 30v24" stroke="#6a4a3a" stroke-width=".9"/><rect x="31" y="45" width="6" height="9" fill="#6a4a3a"/>`,
  // 풍차
  `<path d="M0 52 Q25 47 50 52V70H0z" fill="#c9b86a"/><path d="M20 52l3-24h4l3 24z" fill="#e8dcc4"/><path d="M19 28h12l-6-6z" fill="#8a5a3a"/>
   <g transform="translate(25 26)" stroke="#6a4a3a" stroke-width=".8"><path d="M0 0l-16-12 3-2 15 13zM0 0l12-16 2 3-13 15zM0 0l16 12-3 2-15-13zM0 0l-12 16-2-3 13-15z" fill="#f2ead8"/></g>
   <circle cx="25" cy="26" r="1.6" fill="#6a4a3a"/><path d="M0 60h50M0 65h50" stroke="#a8984a" stroke-width=".8"/>`,
  // 보석 광산
  `<path d="M0 22 Q15 8 30 18 T50 14V70H0z" fill="#8a7a6a"/><path d="M16 56V40a9 9 0 0 1 18 0v16z" fill="#2a2018"/>
   <path d="M14 56V40a11 11 0 0 1 22 0v16" fill="none" stroke="#6a4a2a" stroke-width="3"/><path d="M0 60h50" stroke="#5a4a3a" stroke-width="1.5"/>
   <rect x="6" y="52" width="12" height="7" fill="#7a5a3a"/><circle cx="9" cy="60" r="2" fill="#3a2a1a"/><circle cx="15" cy="60" r="2" fill="#3a2a1a"/>
   <path d="M8 52l2-3 2 3M12 52l2-4 2 4" fill="#5ab0e0"/><path d="M38 30l2 3-2 3-2-3zM10 30l1.5 2.5-1.5 2.5-1.5-2.5z" fill="#d6334a" opacity=".8"/>`,
  // 성당
  `<path d="M0 56h50v14H0z" fill="#9bb87a"/><rect x="13" y="30" width="24" height="26" fill="#d8ccb4"/><path d="M11 31l14-14 14 14z" fill="#7a6a5a"/>
   <rect x="21" y="8" width="8" height="22" fill="#c9bca0"/><path d="M20 9l5-7 5 7z" fill="#6a5a4a"/><path d="M25 1v-1M23.5 0.5h3" stroke="#e0a11a" stroke-width="1"/>
   <circle cx="25" cy="38" r="4" fill="#5a8ac8" stroke="#6a5a4a" stroke-width=".8"/><path d="M25 34v8M21 38h8" stroke="#6a5a4a" stroke-width=".6"/>
   <path d="M21 56v-8a4 4 0 0 1 8 0v8z" fill="#6a4a3a"/>`,
];
export const sceneSvg = (i) => `<svg viewBox="0 0 50 70" class="spl-scene" preserveAspectRatio="xMidYMid slice">${SCENES[i % SCENES.length]}</svg>`;

// ── 귀족 초상 (viewBox 0 0 60 60) ──
const SKIN = ['#f3d2b0', '#e8b890', '#f6dcc4', '#d9a57a', '#f0c8a0'];
const PORTRAITS = [
  // 왕: 왕관 + 수염
  (s) => `<path d="M14 60c0-12 7-17 16-17s16 5 16 17z" fill="#8a1a2a"/><path d="M22 46l8 6 8-6" fill="#f2ead8"/>
    <ellipse cx="30" cy="30" rx="10" ry="12" fill="${s}"/><path d="M20 32q10 16 20 0q-2 10-10 11q-8-1-10-11z" fill="#8a6a4a"/>
    <path d="M19 22l3-9 4 6 4-8 4 8 4-6 3 9z" fill="#f5c32c" stroke="#a87a10" stroke-width=".8"/><circle cx="30" cy="12" r="1.6" fill="#d6334a"/>
    <circle cx="26" cy="29" r="1.2" fill="#2a1a10"/><circle cx="34" cy="29" r="1.2" fill="#2a1a10"/>`,
  // 왕비: 티아라 + 긴 머리
  (s) => `<path d="M14 60c0-12 7-17 16-17s16 5 16 17z" fill="#2f4a9a"/><path d="M18 30q-2 20 4 26M42 30q2 20-4 26" stroke="#a8743a" stroke-width="6" fill="none"/>
    <ellipse cx="30" cy="30" rx="10" ry="12" fill="${s}"/><path d="M19 28q1-12 11-12t11 12q-4-6-11-6t-11 6z" fill="#a8743a"/>
    <path d="M22 18l3-4 2.5 3 2.5-5 2.5 5 2.5-3 3 4z" fill="#e8ecf4" stroke="#9aa6bd" stroke-width=".6"/><circle cx="30" cy="13" r="1.3" fill="#2f6fd6"/>
    <circle cx="26" cy="30" r="1.2" fill="#2a1a10"/><circle cx="34" cy="30" r="1.2" fill="#2a1a10"/><path d="M27 36q3 2 6 0" stroke="#b5503a" stroke-width="1" fill="none"/>`,
  // 기사: 투구
  (s) => `<path d="M14 60c0-12 7-17 16-17s16 5 16 17z" fill="#7a8494"/><path d="M14 60c0-12 7-17 16-17s16 5 16 17" fill="none" stroke="#4a5260" stroke-width="1"/>
    <path d="M19 33q0-17 11-17t11 17v6H19z" fill="#9aa4b4" stroke="#4a5260" stroke-width="1"/><rect x="21" y="27" width="18" height="3" rx="1" fill="#1a1a22"/>
    <path d="M30 16v23" stroke="#4a5260" stroke-width="1"/><path d="M30 16q4-8 10-6q-4 2-6 8" fill="#d6334a"/>`,
  // 주교: 미트라
  (s) => `<path d="M14 60c0-12 7-17 16-17s16 5 16 17z" fill="#f2ead8"/><path d="M28 43h4v17h-4z" fill="#e0a11a"/>
    <ellipse cx="30" cy="31" rx="10" ry="12" fill="${s}"/><path d="M21 23q9-22 18 0z" fill="#f2ead8" stroke="#c9b48a" stroke-width=".8"/>
    <path d="M30 6v17M26 14h8" stroke="#e0a11a" stroke-width="1.6"/><circle cx="26" cy="31" r="1.2" fill="#2a1a10"/><circle cx="34" cy="31" r="1.2" fill="#2a1a10"/>
    <path d="M26 37q4 2 8 0" stroke="#8a5a3a" stroke-width="1" fill="none"/>`,
  // 귀부인: 원뿔 모자(에넹)
  (s) => `<path d="M14 60c0-12 7-17 16-17s16 5 16 17z" fill="#2f9e5b"/><path d="M22 43q8 6 16 0" fill="#f2ead8"/>
    <ellipse cx="30" cy="31" rx="9.5" ry="11.5" fill="${s}"/><path d="M21 24L40 2l-1 22z" fill="#c8306a" stroke="#8a1a4a" stroke-width=".8"/>
    <path d="M40 2q8 14 4 30" stroke="#f2ead8" stroke-width="1.4" fill="none" opacity=".9"/><circle cx="26.5" cy="31" r="1.2" fill="#2a1a10"/><circle cx="33.5" cy="31" r="1.2" fill="#2a1a10"/>
    <path d="M27.5 37q2.5 1.6 5 0" stroke="#b5503a" stroke-width="1" fill="none"/>`,
  // 영주: 깃털 모자
  (s) => `<path d="M14 60c0-12 7-17 16-17s16 5 16 17z" fill="#5a3a7a"/><path d="M22 45h16l-8 6z" fill="#e0a11a"/>
    <ellipse cx="30" cy="31" rx="10" ry="12" fill="${s}"/><path d="M24 36q6 4 12 0" stroke="#5a3a2a" stroke-width="2" fill="none"/>
    <path d="M16 22q14-10 28 0q-14 4-28 0z" fill="#3a2a4a"/><path d="M38 18q10-12 14-6q-6 0-12 8" fill="#d6334a"/>
    <circle cx="26" cy="30" r="1.2" fill="#2a1a10"/><circle cx="34" cy="30" r="1.2" fill="#2a1a10"/>`,
];
const BACKS = [['#3a2a5a', '#5a4a7a'], ['#5a2a2a', '#8a4a3a'], ['#1f3a5a', '#3a6a8a'], ['#2a4a2a', '#4a7a4a'], ['#4a3a1a', '#8a6a3a']];
export const portraitSvg = (i) => { const [bg, ring] = BACKS[Math.floor(i / 2) % BACKS.length]; return `<svg viewBox="0 0 60 60" class="spl-portrait"><rect width="60" height="60" fill="${bg}"/><circle cx="30" cy="34" r="27" fill="${ring}"/>${PORTRAITS[i % PORTRAITS.length](SKIN[i % SKIN.length])}</svg>`; };
