// 스플렌더 그림: 보석 6종·금화(사진), 보석 토큰, 카드 배경(단계×보석 15장), 귀족 초상 10명
// 그라데이션은 SPL_DEFS 한 곳에만 정의해요 (화면 맨 위에 한 번 넣기)

export const SPL_DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <radialGradient id="spg-bg" cx=".45" cy=".4" r=".7"><stop offset="0" stop-color="#fbf3e2"/><stop offset="1" stop-color="#d9c39c"/></radialGradient>
</defs></svg>`;

// 보석·금화는 사진 그림(img/splendor/gem-*.webp)을 써요
const gemImg = (c, x = 0, y = 0, w = 40) => `<image href="img/splendor/gem-${c}.webp" x="${x}" y="${y}" width="${w}" height="${w}"/>`;
export const gemSvg = (c, cls = 'gem') => `<svg viewBox="0 0 40 40" class="${cls}">${gemImg(c, 2, 2, 36)}</svg>`;

// 보석 토큰: 테두리 없이 보석(금화) 그림만
export const tokenSvg = (c) => `<svg viewBox="0 0 40 40" class="tok">${gemImg(c, 1, 1, 38)}</svg>`;

// 카드 배경: 단계(1 생산 · 2 도시 · 3 궁정) × 보너스 보석 색마다 다른 그림 15장
// 같은 단계·보석은 그림이 2장 — 카드 id로 늘 같은 쪽을 골라요
const bgVar = (id) => ([...String(id ?? '')].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0) % 2 ? '2' : '';
export const sceneSvg = (color, lv = 2, id) => `<svg viewBox="0 0 50 70" class="spl-scene" preserveAspectRatio="xMidYMid slice"><image href="img/splendor/bg-${lv}${color}${bgVar(id)}.webp" width="50" height="70" preserveAspectRatio="xMidYMid slice"/></svg>`;

export const portraitSvg = (i) => `<svg viewBox="0 0 60 60" class="spl-portrait" preserveAspectRatio="xMidYMin slice"><image href="img/splendor/noble-${i % 10}.webp" width="60" height="60"/></svg>`;
