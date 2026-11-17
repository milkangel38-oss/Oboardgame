// 내 차례가 되면 화면 가운데에 "내 차례!"를 크게 띄워요 (차례가 돌아오는 게임 공용)
let lastShown = '';

export function bigFlash(html, ms = 2200, cls = '') {
  document.querySelector('.spl-flash')?.remove();
  const $f = document.createElement('div');
  $f.className = `spl-flash ${cls}`;
  $f.innerHTML = html;
  document.body.appendChild($f);
  $f.onclick = () => $f.remove();
  setTimeout(() => $f.remove(), ms);
}

// key: 차례마다 달라지는 값 (같은 차례에 화면을 다시 그려도 한 번만 떠요)
export function turnAlert(roomCode, key, myTurn, delay = 0) {
  if (!roomCode || !myTurn) return;
  const k = `${roomCode}|${key}`;
  if (k === lastShown) return;
  lastShown = k;
  setTimeout(() => bigFlash('<div class="spl-myturn">내 차례!</div>', 1500, 'turn'), delay);
}
