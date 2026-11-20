// 방(Room) 규칙 — 테스트 모드와 Firebase 모드가 똑같이 이 함수들을 사용합니다.
// 모든 함수는 room 객체를 받아 수정된 room을 돌려줍니다 (null = 방 삭제).
//
// room = {
//   code, gameId, hostId,
//   status: 'waiting' | 'playing' | 'finished',
//   players: { [uid]: { uid, name, photo, ready, order, joinedAt } },
//   game: 게임별 상태 | null,
//   result: { message, winners: [uid], ranking?: [{uid, score, place, garnets}], rewards?: {uid: 가넷}, aborted? } | null,
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
  if (room.kicked?.[user.uid]) throw new Error('방장이 내보낸 방이에요');
  if (room.status !== 'waiting') throw new Error('이미 게임이 진행 중이에요');
  const list = sortedPlayers(room);
  if (list.length >= game.maxPlayers) throw new Error('방이 가득 찼어요');
  const order = list.length ? list[list.length - 1].order + 1 : 0;
  room.players[user.uid] = playerEntry(user, order);
  return room;
}

// reason: 'leave'(나가기 버튼) | 'disconnect'(연결 끊김)
export function leave(room, uid, reason = 'leave') {
  const leaving = room.players[uid];
  if (!leaving) return room;
  delete room.players[uid];
  const rest = sortedPlayers(room);
  if (!rest.length) return null; // 마지막 사람이 나가면 방 삭제
  if (room.hostId === uid) room.hostId = rest[0].uid;
  if (room.status === 'playing') {
    room.status = 'finished';
    room.result = {
      message: reason === 'disconnect' ? `${leaving.name}님의 연결이 끊겨 게임이 끝났어요 (가넷 지급 없음)` : `${leaving.name}님이 나가서 게임이 끝났어요 (가넷 지급 없음)`,
      winners: [], aborted: true,
    };
  }
  return room;
}

// ── 접속 확인 (게임 중) ──
// 게임 중인 사람은 몇 초마다 seen 시간을 갱신해요.
// 누군가 오랫동안 갱신이 없으면(창을 닫음, 화면 꺼짐 등) 나간 것으로 보고 게임을 끝내요.
export function heartbeat(room, uid) {
  if (room.status === 'playing' && room.players[uid]) room.players[uid].seen = Date.now();
  return room;
}

export function dropIfGone(room, uid, timeoutMs) {
  const p = room.players[uid];
  if (!p || room.status !== 'playing') return room;
  if (Date.now() - (p.seen || 0) < timeoutMs) return room; // 그새 다시 접속했으면 그대로
  return leave(room, uid, 'disconnect');
}

// 접속이 끊긴 사람 내보내기 (대기 중이든 게임 중이든). 게임 중이면 게임이 끝나요(가넷 없음).
export function dropAbsent(room, uid) {
  return room.players[uid] ? leave(room, uid, 'disconnect') : room;
}

// 방장이 대기 중인 사람을 내보내기 (다시 못 들어와요)
export function kick(room, hostUid, uid) {
  if (room.hostId !== hostUid) throw new Error('방장만 내보낼 수 있어요');
  if (room.status === 'playing') throw new Error('게임 중에는 내보낼 수 없어요');
  if (uid === hostUid || !room.players[uid]) return room;
  delete room.players[uid];
  room.kicked = { ...(room.kicked || {}), [uid]: true };
  return room;
}

export function setReady(room, uid, ready) {
  if (room.status !== 'waiting') return room;
  if (room.players[uid]) room.players[uid].ready = !!ready;
  return room;
}

// 방장이 게임 시작 전에 고르는 설정 (예: 라운드 수)
export function setOption(room, uid, game, key, value) {
  if (room.hostId !== uid) throw new Error('방장만 바꿀 수 있어요');
  if (room.status !== 'waiting') throw new Error('게임 중에는 바꿀 수 없어요');
  const opt = (game.options || []).find((o) => o.key === key);
  if (!opt || !opt.choices.includes(value)) throw new Error('고를 수 없는 값이에요');
  room.options = { ...(room.options || {}), [key]: value };
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

// 게임 방법 영상: 방장이 시작을 누르면 모두에게 영상을 띄우고, 모두 확인(또는 Skip)하면 진짜로 시작해요
export const INTRO_MAX_MS = 90 * 1000;
export function beginIntro(room, game, uid) {
  if (room.hostId !== uid) throw new Error('방장만 시작할 수 있어요');
  const check = canStart(room, game);
  if (!check.ok) throw new Error(check.reason);
  if (!room.intro) room.intro = { at: Date.now(), ack: {} };
  return room;
}
export function ackIntro(room, uid) {
  if (room.status !== 'waiting' || !room.intro || !room.players[uid]) throw new Error('__noop');
  if (room.intro.ack?.[uid]) throw new Error('__noop');
  room.intro.ack = { ...(room.intro.ack || {}), [uid]: true };
  return room;
}
export function introReady(room, now = Date.now()) {
  if (room.status !== 'waiting' || !room.intro) return false;
  const ids = Object.keys(room.players);
  return ids.every((u) => room.intro.ack?.[u]) || now - room.intro.at > INTRO_MAX_MS;
}

export function start(room, game, uid) {
  if (room.hostId !== uid) throw new Error('방장만 시작할 수 있어요');
  const check = canStart(room, game);
  if (!check.ok) throw new Error(check.reason);
  room.game = game.setup(sortedPlayers(room), room);
  room.matchId = (room.matchId || 0) + 1; // 전적 중복 기록 방지용 판 번호
  const now = Date.now();
  Object.values(room.players).forEach((p) => (p.seen = now)); // 접속 확인 시작
  room.status = 'playing';
  room.intro = null;
  room.startedAt = Date.now();
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

// 방 채팅 (방에 들어온 사람끼리만)
export function chat(room, uid, text) {
  const p = room.players[uid];
  if (!p) throw new Error('방에 있는 사람만 채팅할 수 있어요');
  const t = String(text || '').trim().slice(0, 120);
  if (!t) return room;
  room.chat = [...(room.chat || []), { uid, name: p.name, text: t, t: Date.now() }].slice(-50);
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
