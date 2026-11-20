// 게임 캐릭터의 얼굴 = 내 프로필 사진 (사진 · 캐릭터 · 이모지 · 이름 첫 글자)
import { charSvg as avatarSvg } from '../avatars.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const BG = ['#ff4f9a', '#ffb02e', '#3ddc84', '#3d7bff', '#9b5cff', '#ff6b4a', '#14c7c7'];

export function faceHtml(p) {
  const photo = p?.photo || '';
  if (photo.startsWith('char:')) { const svg = avatarSvg(photo.slice(5)); if (svg) return `<span class="pf char">${svg}</span>`; }
  if (photo.startsWith('emoji:')) {
    const [, emo, color] = photo.split(':');
    return `<span class="pf emoji" style="background:${/^#[0-9a-f]{6}$/i.test(color) ? color : '#555'}">${esc(emo)}</span>`;
  }
  if (/^(https:|data:image\/)/.test(photo)) return `<img class="pf" src="${esc(photo)}" alt="" referrerpolicy="no-referrer" draggable="false">`;
  const hash = [...(p?.uid || p?.name || '')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return `<span class="pf init" style="background:${BG[hash % BG.length]}">${esc((p?.name || '?')[0])}</span>`;
}

// 몸통(플레이어 색) + 얼굴(프로필 사진)
export function personHtml(color, player, dead = false) {
  return `<span class="pc ${dead ? 'dead' : ''}" style="--hood:${dead ? '#6b6f7a' : color}">
    <svg viewBox="0 0 60 72" aria-hidden="true">
      <ellipse cx="30" cy="68" rx="18" ry="4" fill="rgba(0,0,0,.35)"/>
      <path d="M11 66 Q11 36 30 36 Q49 36 49 66 Z" fill="${dead ? '#6b6f7a' : color}"/>
      <path d="M22 46 L30 54 L38 46" stroke="rgba(0,0,0,.25)" stroke-width="3" fill="none"/>
    </svg>
    <span class="pc-head">${faceHtml(player)}</span>${dead ? '<span class="pc-x">✖</span>' : ''}
  </span>`;
}

// 걷는 사람(비상구 표지판 같은 픽토그램) + 큰 머리(프로필 사진). 이동 중엔 부모에 .walking 클래스
export function walkerHtml(color, player) {
  const id = 'wk' + Math.random().toString(36).slice(2, 7);
  const limb = (cls, x, y1, y2, w) => `<g class="${cls}"><line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/><line x1="${x - w * .22}" y1="${y1 + 2}" x2="${x - w * .22}" y2="${y2 - 2}" stroke="#fff" stroke-opacity=".28" stroke-width="${w * .22}" stroke-linecap="round"/></g>`;
  return `<span class="wk" style="--hood:${color}">
    <svg viewBox="0 0 40 52" aria-hidden="true">
      <defs><linearGradient id="${id}t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".4"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".35"/></linearGradient></defs>
      <ellipse class="wk-sh" cx="20" cy="49.5" rx="11" ry="2.4" fill="rgba(0,0,0,.3)"/>
      <g style="filter:brightness(.6)">${limb('wk-leg b', 20, 30, 47, 8.5)}${limb('wk-arm b', 20, 14, 29, 6.5)}</g>
      <g class="wk-torso"><rect x="12.5" y="10" width="15" height="23" rx="7" fill="${color}"/><rect x="12.5" y="10" width="15" height="23" rx="7" fill="url(#${id}t)"/></g>
      ${limb('wk-leg f', 20, 30, 47, 8.5)}${limb('wk-arm f', 20, 14, 29, 6.5)}
    </svg>
    <span class="wk-head">${faceHtml(player)}</span>
  </span>`;
}
