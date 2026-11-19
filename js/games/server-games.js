// 서버가 진행하는 게임 (비밀 정보가 있는 게임). 서버(/api/game)와 테스트 모드가 같은 함수를 써요.
// 방 문서(rooms/{code})에는 공개 정보만, 비밀은 rooms/{code}/secret/SERVER (아무도 못 읽음),
// 각자 알아도 되는 비밀은 rooms/{code}/secret/{uid} (본인만 읽음)에 저장해요.
import * as avalon from './avalon-core.js';

export const SERVER_GAMES = { avalon };
export const isServerGame = (id) => !!SERVER_GAMES[id];

// room: 방 문서, srv: 서버 비밀 문서(없으면 null), uid: 움직인 사람, move: 동작
// → { room: 새 방 문서, server: 새 서버 비밀, mine: {uid: 비밀} }
export function serverApply(room, srv, uid, move) {
  const core = SERVER_GAMES[room?.gameId];
  if (!core) throw new Error('서버가 진행하는 게임이 아니에요');
  if (room.status !== 'playing') throw new Error('게임 중이 아니에요');
  if (!room.players?.[uid]) throw new Error('참가자가 아니에요');
  if (!move || typeof move !== 'object' || typeof move.type !== 'string') throw new Error('알 수 없는 동작이에요');
  const next = JSON.parse(JSON.stringify(room));
  let full, result = null;
  if (move.type === 'deal') {
    // 시작은 한 번만 (같은 판 번호로 이미 나눴으면 무시)
    if (room.game?.phase !== 'deal' || (srv && srv.match === room.matchId)) throw new Error('__noop');
    full = core.deal(room);
  } else {
    if (!srv || srv.match !== room.matchId) throw new Error('게임 준비 중이에요. 잠시 후 다시 해 주세요');
    const out = core.applyMove(core.merge(room.game, srv), move, uid, room.players);
    full = out.state;
    result = out.result || null;
  }
  const { pub, server, mine } = core.split(full);
  next.game = pub;
  if (result) {
    next.status = 'finished';
    next.result = { ...result, by: 'server' };
  }
  return { room: next, server: { ...server, match: room.matchId }, mine };
}
