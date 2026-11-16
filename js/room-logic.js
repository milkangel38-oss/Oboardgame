// 방(Room) 규칙 — 테스트 모드와 Firebase 모드가 똑같이 이 함수들을 사용합니다.
// 모든 함수는 room 객체를 받아 수정된 room을 돌려줍니다 (null = 방 삭제).
//
// room = {
//   code, gameId, hostId,
//   status: 'waiting' | 'playing' | 'finished',
//   players: { [uid]: { uid, name, photo, ready, order, joinedAt } },
//   game: 게임별 상태 | null,
//   result: { message, winners: [uid], draw?, aborted? } | null,
//   matchId: 몇 번째 판인지,
//   createdAt
// }

function playerEntry(user, order) {
  return { uid: user.uid, name: user.name, photo: user.photo || '', ready: false, order, joinedAt: Date.now() };
}

export function sortedPlayers(room) {
  return Object.values(room.players || {}).sort((a, b) => a.order - b.order);
}

export function newRoom(code, game, user) {
  return {
    code,
    gameId: game.id,
    hostId: user.uid,
    status: 'waiting',
    players: { [user.uid]: playerEntry(user, 0) },
    game: null,
    result: null,
    createdAt: Date.now(),
  };
}

export function join(room, user, game) {
  if (room.players[user.uid]) return room;
  if (room.status !== 'waiting') throw new Error('이미 게임이 진행 중이에요');
  const list = sortedPlayers(room);
  if (list.length >= game.maxPlayers) throw new Error('방이 가득 찼어요');
  const order = list.length ? list[list.length - 1].order + 1 : 0;
  room.players[user.uid] = playerEntry(user, order);
  return room;
}

export function leave(room, uid) {
  const leaving = room.players[uid];
  if (!leaving) return room;
  delete room.players[uid];
  const rest = sortedPlayers(room);
  if (!rest.length) return null; // 마지막 사람이 나가면 방 삭제
  if (room.hostId === uid) room.hostId = rest[0].uid;
  if (room.status === 'playing') {
    room.status = 'finished';
    room.result = { message: `${leaving.name}님이 나가서 게임이 끝났어요`, winners: [], aborted: true };
  }
  return room;
}

export function setReady(room, uid, ready) {
  if (room.status !== 'waiting') return room;
  if (room.players[uid]) room.players[uid].ready = !!ready;
  return room;
}

export function canStart(room, game) {
  const list = sortedPlayers(room);
  if (room.status !== 'waiting') return { ok: false, reason: '이미 시작했어요' };
  if (list.length < game.minPlayers) return { ok: false, reason: `최소 ${game.minPlayers}명이 필요해요` };
  if (list.length > game.maxPlayers) return { ok: false, reason: `최대 ${game.maxPlayers}명까지 가능해요` };
  const notReady = list.filter((p) => p.uid !== room.hostId && !p.ready);
  if (notReady.length) return { ok: false, reason: `${notReady.map((p) => p.name).join(', ')}님이 아직 준비 전이에요` };
  return { ok: true, reason: '' };
}

export function start(room, game, uid) {
  if (room.hostId !== uid) throw new Error('방장만 시작할 수 있어요');
  const check = canStart(room, game);
  if (!check.ok) throw new Error(check.reason);
  room.game = game.setup(sortedPlayers(room));
  room.matchId = (room.matchId || 0) + 1; // 전적 중복 기록 방지용 판 번호
  room.status = 'playing';
  room.result = null;
  return room;
}

export function applyMove(room, game, uid, move) {
  if (room.status !== 'playing') throw new Error('게임 중이 아니에요');
  if (!room.players[uid]) throw new Error('참가자가 아니에요');
  const out = game.move(room.game, move, uid, room.players);
  room.game = out.state;
  if (out.result) {
    room.status = 'finished';
    room.result = out.result;
  }
  return room;
}

export function reset(room, uid) {
  if (room.hostId !== uid) throw new Error('방장만 새 게임을 열 수 있어요');
  room.status = 'waiting';
  room.game = null;
  room.result = null;
  Object.values(room.players).forEach((p) => (p.ready = false));
  return room;
}
