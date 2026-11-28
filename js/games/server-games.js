// 서버가 진행하는 게임 (비밀 정보가 있는 게임). 서버(/api/game)와 테스트 모드가 같은 함수를 써요.
// 진짜 게임 상태는 전부 rooms/{code}/secret/SERVER (아무도 못 읽음)에 있고,
// 방 문서(rooms/{code}).game에는 그 공개 사본만, 각자 알아도 되는 비밀은 secret/{uid} (본인만 읽음)에 저장해요.
// → 방 문서의 game은 브라우저가 고쳐도 서버는 무시해요 (서버는 자기 사본으로만 진행).
import * as avalon from './avalon-core.js';
import * as memorypoker from './memorypoker-core.js';
import * as assassin from './assassin-core.js';
import * as stock from './stock-core.js';

export const SERVER_GAMES = { avalon, memorypoker, assassin, stock };
export const isServerGame = (id) => !!SERVER_GAMES[id];

const nonce = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// room: 방 문서, srv: 서버 비밀 문서(없으면 null), uid: 움직인 사람, move: 동작
// → { room: 새 방 문서, server: 새 서버 비밀, mine: {uid: 비밀} }
export function serverApply(room, srv, uid, move, env = {}) {
  const core = SERVER_GAMES[room?.gameId];
  if (!core) throw new Error('서버가 진행하는 게임이 아니에요');
  if (room.status !== 'playing') throw new Error('게임 중이 아니에요');
  if (!room.players?.[uid]) throw new Error('참가자가 아니에요');
  if (!move || typeof move !== 'object' || typeof move.type !== 'string') throw new Error('알 수 없는 동작이에요');
  const next = JSON.parse(JSON.stringify(room));
  let full, result = null, id;
  if (move.type === 'deal') {
    // 새 판 시작: 방장이 연 '나눠 주기 전' 상태(아직 nonce 없음)일 때만. 서버가 처음부터 새로 만들어요.
    if (room.game?.phase !== 'deal' || room.game?.nonce) throw new Error('__noop');
    full = core.deal(room);
    id = nonce();
  } else {
    // 진행: 서버 사본과 방의 판(nonce·판 번호)이 같아야 해요. 방 문서의 game 내용은 쓰지 않아요.
    if (!srv?.full || !room.game?.nonce || srv.nonce !== room.game.nonce || srv.match !== room.matchId) throw new Error('게임 준비 중이에요. 잠시 후 다시 해 주세요');
    if (srv.result || srv.full.phase === 'done') throw new Error('게임이 끝났어요');
    if (!srv.full.order.includes(uid)) throw new Error('참가자가 아니에요');
    let out;
    try { out = core.applyMove(srv.full, move, uid, room.players, env); }
    catch (e) { if (e.state) e.server = { ...srv, full: e.state }; throw e; } // 실패해도 남길 서버 상태 (예: 살펴본 시각)
    full = out.state;
    result = out.result || null;
    id = srv.nonce;
  }
  const { pub, mine } = core.split(full);
  next.game = { ...pub, nonce: id };
  // 바뀐 것만 저장해요 (안 바뀐 문서를 다시 쓰면 '수정 시각'으로 몰래 일어난 일(공격 시각 등)이 드러나요)
  const prevMine = move.type === 'deal' || !srv?.full ? {} : core.split(srv.full).mine;
  Object.values(prevMine).forEach((m) => (m.nonce = id));
  Object.values(mine).forEach((m) => (m.nonce = id));
  const changedMine = Object.keys(mine).filter((u) => JSON.stringify(mine[u]) !== JSON.stringify(prevMine[u]));
  const roomChanged = JSON.stringify(next.game) !== JSON.stringify(room.game) || !!result;
  if (result) {
    next.status = 'finished';
    next.result = { ...result, by: 'server' };
  }
  const server = { full, match: room.matchId, nonce: id, order: full.order, result: result || null };
  return { room: next, server, mine, changedMine, roomChanged, mineChanged: changedMine.length > 0 };
}

// 인장 기록용: 서버 사본에 남은 결과 (방 문서의 result는 믿지 않아요)
export function serverResult(room, srv) {
  if (!srv?.result || !srv.nonce || srv.match !== room?.matchId) return null;
  return { result: srv.result, order: srv.order || [], key: `${room.code}:${room.matchId}:${srv.nonce}` };
}
