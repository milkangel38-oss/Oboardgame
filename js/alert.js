// 게임 중 잘못된 행동을 했을 때 이유를 알려 주는 알림창
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function showAlert(message, title = '할 수 없어요') {
  document.querySelector('.og-alert')?.remove();
  const $m = document.createElement('div');
  $m.className = 'modal-backdrop og-alert';
  $m.innerHTML = `
    <div class="modal panel og-alert-box" role="alertdialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="og-alert-icon">⚠️</div>
      <h3>${esc(title)}</h3>
      <p>${esc(message)}</p>
      <button class="btn primary block" data-ok>확인</button>
    </div>`;
  document.body.appendChild($m);
  const close = () => { $m.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); close(); } };
  $m.querySelector('[data-ok]').onclick = close;
  $m.onclick = (e) => { if (e.target === $m) close(); };
  document.addEventListener('keydown', onKey);
  $m.querySelector('[data-ok]').focus();
}
