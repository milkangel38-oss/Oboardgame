// 스플렌더 그림: 보석 6종·금화(사진), 보석 토큰, 카드 배경(단계별 그림), 귀족 초상 10명
// 그라데이션은 SPL_DEFS 한 곳에만 정의해요 (화면 맨 위에 한 번 넣기)

export const SPL_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <radialGradient id="spg-bg" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#fbf3e2"/><stop offset="1" stop-color="#d9c39c"/></radialGradient>
</defs></svg>`;

// 보석·금화는 사진 그림(img/splendor/gem-*.webp)을 써요
const gemImg = (c, x = 0, y = 0, w = 40) => `<image href="img/splendor/gem-${c}.webp" x="${x}" y="${y}" width="${w}" height="${w}"/>`;
export const gemSvg = (c, cls = 'gem') => `<svg viewBox="0 0 40 40" class="${cls}">${gemImg(c, 2, 2, 36)}</svg>`;

const RING = { w: '#e8ecf4', u: '#2f6fd6', g: '#2f9e5b', r: '#d6334a', k: '#2a2428', gold: '#f5c32c' };
// 보석 토큰: 색 테두리 + 베이지 바탕 + 큰 보석
export const tokenSvg = (c) => `<svg viewBox="0 0 40 40" class="tok">
  <circle cx="20" cy="20" r="19" fill="${RING[c]}"/><circle cx="20" cy="20" r="19" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1"/>
  <circle cx="20" cy="20" r="15.5" fill="url(#spg-bg)"/>
  ${c === 'gold' ? gemImg('gold', 4.5, 4.5, 31) : gemImg(c, 7, 7, 26)}</svg>`;

// 카드 배경: 단계별 그림 한 장(1단계 광산 · 2단계 공방 · 3단계 궁전)에서 카드마다 다른 부분을 보여 줘요
const SCENE_W = { 1: 680, 2: 684, 3: 760 };
export const sceneSvg = (i, lv = 2) => {
  const w = (70 * SCENE_W[lv]) / 420, x = -((i * 37) % 7) / 6 * (w - 50);
  return `<svg viewBox="0 0 50 70" class="spl-scene" preserveAspectRatio="xMidYMid slice"><image href="img/splendor/lv${lv}.webp" x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="70"/></svg>`;
};

export const portraitSvg = (i) => `<svg viewBox="0 0 60 60" class="spl-portrait"><image href="img/splendor/noble-${i % 10}.webp" width="60" height="60"/></svg>`;
