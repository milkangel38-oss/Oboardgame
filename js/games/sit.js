// 양반다리로 앉은 캐릭터 (얼굴 = 프로필) + 자리 말풍선 채팅 — 오목·장기에서 같이 써요
import { faceHtml } from './face.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// robe: 두루마기 색, trim: 깃·고름 색
export function sitHtml(player, { robe = '#3d4f7a', trim = '#f2ead8', uid = '', label = '', badge = '', turn = false, me = false, up = false } = {}) {
  return `<div class="sit ${turn ? 'turn' : ''} ${me ? 'me' : ''} ${up ? 'up' : ''}">
    <span class="seat-bubble" data-bub="${esc(uid)}"></span>
    <div class="sit-fig">
      <svg viewBox="0 0 120 110" aria-hidden="true">
        <ellipse cx="60" cy="104" rx="54" ry="6" fill="rgba(0,0,0,.35)"/>
        <ellipse cx="60" cy="96" rx="50" ry="10" fill="#8a3a2a"/><ellipse cx="60" cy="94" rx="46" ry="8" fill="#a8483a"/>
        <path d="M14 92 Q16 74 40 72 L80 72 Q104 74 106 92 Q84 100 60 100 Q36 100 14 92 Z" fill="${robe}" filter="brightness(.85)"/>
        <path d="M30 90 Q44 80 60 84 Q76 80 90 90 Q74 96 60 94 Q46 96 30 90 Z" fill="${robe}" filter="brightness(.7)"/>
        <path d="M36 76 Q34 44 48 34 L72 34 Q86 44 84 76 Z" fill="${robe}"/>
        <path d="M50 34 L60 52 L70 34" fill="none" stroke="${trim}" stroke-width="4"/>
        <path d="M60 52 l-6 14 M60 52 l7 12" stroke="#c8343a" stroke-width="3" stroke-linecap="round"/>
        <path d="M38 50 Q26 64 34 80 L44 80 Q40 66 46 56 Z" fill="${robe}" filter="brightness(.9)"/>
        <path d="M82 50 Q94 64 86 80 L76 80 Q80 66 74 56 Z" fill="${robe}" filter="brightness(.9)"/>
        <ellipse cx="39" cy="82" rx="7" ry="5" fill="#f0c49a"/><ellipse cx="81" cy="82" rx="7" ry="5" fill="#f0c49a"/>
      </svg>
      <span class="sit-face">${faceHtml(player || { name: '?' })}${badge}</span>
    </div>
    <b class="sit-name">${esc(player?.name || '나간 사람')}</b>
    ${label ? `<small class="sit-label">${label}</small>` : ''}
  </div>`;
}

// 맨 아래 채팅창 → 방 채팅으로 보내면 자리 캐릭터 위 말풍선으로 떠요
const chat = { draft: '', focus: false };
export const chatFormHtml = () => '<form class="sp-chat sit-chat"><input maxlength="60" placeholder="💬 채팅 (내 캐릭터 말풍선으로 떠요)" autocomplete="off" enterkeyhint="send"><button class="btn sm primary">전송</button></form>';
export function bindChat(el) {
  const $cf = el.querySelector('.sit-chat');
  if (!$cf) return;
  const $in = $cf.querySelector('input');
  $in.value = chat.draft;
  $in.oninput = () => (chat.draft = $in.value);
  $in.onfocus = () => (chat.focus = true);
  $in.onblur = () => setTimeout(() => { if ($in.isConnected) chat.focus = false; }, 0);
  if (chat.focus) $in.focus({ preventScroll: true });
  $cf.onsubmit = (e) => {
    e.preventDefault();
    const text = $in.value.trim();
    const $g = document.querySelector('.gchat');
    if (!text || !$g) return;
    $g.querySelector('input').value = text;
    $g.requestSubmit();
    chat.draft = ''; $in.value = '';
  };
}
