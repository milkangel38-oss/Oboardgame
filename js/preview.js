import { APP_VERSION } from './config.js';
// 게임 카드 미리보기: PC는 마우스를 올리면, 휴대폰은 카드를 꾹 누르고 있으면 게임 화면 미리보기가 떠요.
// 미리보기 그림은 img/preview/<게임id>.jpg (테스트 모드에서 실제 게임 화면을 찍은 것)
const HOVER_DELAY = 350;
const PRESS_DELAY = 420;
let $pv = null;

function box() {
  if ($pv && $pv.isConnected) return $pv;
  $pv = document.createElement('div');
  $pv.className = 'gpv';
  $pv.hidden = true;
  $pv.innerHTML = '<div class="gpv-card"><div class="gpv-title"></div><div class="gpv-shot"><img alt=""></div><div class="gpv-foot"></div></div>';
  document.body.appendChild($pv);
  return $pv;
}

function show(card, game, mode) {
  const el = box();
  el.querySelector('.gpv-title').textContent = `${game.emoji || '🎮'} ${game.name} 미리보기`;
  el.querySelector('img').src = `img/preview/${game.id}.jpg?v=${APP_VERSION}`; // 버전이 바뀌면 새 그림으로
  el.querySelector('.gpv-foot').textContent = mode === 'touch' ? '손을 떼면 닫혀요' : '클릭하면 방을 만들어요';
  el.classList.toggle('touch', mode === 'touch');
  el.hidden = false;
  if (mode === 'touch') { el.style.left = el.style.top = ''; return; }
  // PC: 카드 옆(오른쪽 → 안 되면 왼쪽)에 띄워요
  const r = card.getBoundingClientRect();
  const w = 270, h = Math.min(560, window.innerHeight - 24);
  let x = r.right + 12;
  if (x + w > window.innerWidth - 8) x = r.left - w - 12;
  if (x < 8) x = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2));
  const y = Math.max(12, Math.min(window.innerHeight - h - 12, r.top + r.height / 2 - h / 2));
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
}
export function hidePreview() { if ($pv) $pv.hidden = true; }

// 카드 하나에 미리보기 연결. 꾹 눌러서 미리보기를 본 직후의 클릭(방 만들기)은 무시해요.
export function bindPreview(card, game) {
  if (game.comingSoon) return;
  let hoverT = 0, pressT = 0, sx = 0, sy = 0;
  card.addEventListener('pointerenter', (e) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(hoverT);
    hoverT = setTimeout(() => show(card, game, 'mouse'), HOVER_DELAY);
  });
  card.addEventListener('pointerleave', (e) => {
    if (e.pointerType !== 'mouse') return;
    clearTimeout(hoverT);
    hidePreview();
  });
  card.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') { clearTimeout(hoverT); hidePreview(); return; }
    sx = e.clientX; sy = e.clientY;
    card.__pvShown = false;
    clearTimeout(pressT);
    pressT = setTimeout(() => { card.__pvShown = true; show(card, game, 'touch'); navigator.vibrate?.(12); }, PRESS_DELAY);
  });
  card.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse' || !pressT) return;
    if (Math.hypot(e.clientX - sx, e.clientY - sy) > 10 && !card.__pvShown) { clearTimeout(pressT); pressT = 0; } // 스크롤이면 취소
  });
  const end = () => { clearTimeout(pressT); pressT = 0; if (card.__pvShown) { hidePreview(); card.__pvUntil = Date.now() + 600; card.__pvShown = false; } };
  card.addEventListener('pointerup', end);
  card.addEventListener('pointercancel', end);
  card.addEventListener('contextmenu', (e) => e.preventDefault()); // 꾹 누를 때 뜨는 기본 메뉴 막기
}
// 방금 꾹 눌러서 미리보기를 봤으면 true (그 클릭은 방 만들기로 치지 않아요)
export const justPreviewed = (card) => (card.__pvUntil || 0) > Date.now();
