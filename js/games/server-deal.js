// 서버 진행 게임의 '나눠 주기' 공통 처리
// 게임 시작 직후(phase 'deal') 방장이 바로 서버에 요청하고, 그대로면 다른 사람도 5초·15초·30초 뒤 다시 요청해요.
// 서버는 판마다 한 번만 나눠 주고, 마지막 시도까지 실패하면 오류를 보여 줘요.
const deals = {};
export function dealing(el, { state, room, me, sendMove }, text = '카드를 나눠 주는 중…') {
  if (state.phase !== 'deal') {
    const d = deals[`${room?.code}:${room?.matchId}`];
    if (d?.timer) { clearTimeout(d.timer); d.timer = 0; d.tries = 99; } // 받았으면 재시도 멈춤
    return false;
  }
  const k = `${room?.code}:${room?.matchId}`;
  const d = (deals[k] ||= { first: Date.now(), tries: 0, timer: 0 });
  const waits = room?.hostId === me ? [0, 5000, 15000, 30000] : [5000, 15000, 30000];
  const tryDeal = () => {
    d.timer = 0;
    if (d.tries >= waits.length) return;
    d.tries += 1;
    const last = d.tries >= waits.length;
    sendMove({ type: 'deal' }, { silent: !last }); // 마지막 시도가 실패하면 오류를 보여 줘요
    if (!last) d.timer = setTimeout(tryDeal, Math.max(0, d.first + waits[d.tries] - Date.now()));
  };
  if (room && !d.timer && d.tries < waits.length) d.timer = setTimeout(tryDeal, Math.max(0, d.first + waits[d.tries] - Date.now()));
  el.innerHTML = `<div class="sv-deal"><span class="sv-spin"></span>${text}</div>`;
  return true;
}
