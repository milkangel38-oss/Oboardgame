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
