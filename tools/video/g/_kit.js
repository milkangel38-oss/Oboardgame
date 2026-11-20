import { personHtml } from '/js/games/face.js';
export const COLS = ['#ff4f6e', '#3d7bff', '#3ddc84', '#ffb02e', '#b26bff', '#2ee6d6', '#ff8ad8', '#e8cf8a'];
export const NAMES = ['나', '하나', '두리', '세찌', '네모', '다섯', '여섯', '칠이'];
export const person = (i, name = NAMES[i]) => `<div class="person">${personHtml(COLS[i % COLS.length], { name, uid: 'u' + i })}</div><div class="pname">${name}</div>`;
// 원 둘레 자리 (0번 = 맨 아래)
export const ring = (n, cx = 640, cy = 300, rx = 520, ry = 250) => Array.from({ length: n }, (_, i) => { const a = Math.PI / 2 + (i / n) * Math.PI * 2; return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry }; });
export const P = (x, y, o = {}) => ({ x, y, s: 1, r: 0, ...o });
// 이동: from → to (t초에 출발, d초 동안)
export const move = (from, to, t, d = 0.6, extra = []) => [[0, P(from.x, from.y, from)], [t, P(from.x, from.y, from)], [t + d, P(to.x, to.y, to)], ...extra];
export const coin = '<div class="chipi"><i class="sp-coin"></i></div>';
