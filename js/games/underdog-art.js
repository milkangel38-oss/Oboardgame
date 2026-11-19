// 언더독레이스 동물 그림: 도자기 피규어 사진(img/underdog/a1~a7.webp, 오른쪽 = 결승선 방향) + 경주 번호
export const NUM_COLOR = { 1: '#d64545', 2: '#ee8a1c', 3: '#d9a514', 4: '#3a9d4f', 5: '#2f6fd6', 6: '#8a4fd0', 7: '#7a5230' };

const badge = (n) => `<g transform="translate(11 11)"><circle r="9.5" fill="#fdfaf2" stroke="${NUM_COLOR[n]}" stroke-width="2.4"/><text y="4.6" text-anchor="middle" font-family="Pretendard, sans-serif" font-weight="900" font-size="13" fill="${NUM_COLOR[n]}">${n}</text></g>`;

export function animalSvg(n, attrs = '', num = false) {
  return `<svg viewBox="0 0 120 90" ${attrs} xmlns="http://www.w3.org/2000/svg"><ellipse cx="60" cy="86" rx="40" ry="3.2" fill="rgba(0,0,0,.22)"/><image href="img/underdog/a${n}.webp" x="0" y="0" width="120" height="90"/>${num ? badge(n) : ''}</svg>`;
}
