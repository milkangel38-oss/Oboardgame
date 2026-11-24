import { censor } from './badwords.js';
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
  return { uid: user.uid, name: user.name, photo: user.photo || '', garnets: Math.max(0, Math.floor(Number(user.garnets) || 0)), ready: false, order, joinedAt: Date.now() };
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
  if (room.intro) throw new Error('곧 게임이 시작돼요. 다음 판에 들어와 주세요');
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
  if (room.intro) room.intro = null; // 영상 보는 중에 누가 나가면 대기실로 돌아가요
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
  if (room.intro) room.intro = null;
  return room;
}

export function setReady(room, uid, ready) {
  if (room.status !== 'waiting') return room;
  if (room.intro && !ready) return room; // 영상 보는 중엔 준비 취소 안 돼요
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
export const INTRO_MAX_MS = 120 * 1000;
export function beginIntro(room, game, uid) {
  if (room.hostId !== uid) throw new Error('방장만 시작할 수 있어요');
  const check = canStart(room, game);
  if (!check.ok) throw new Error(check.reason);
  if (!room.intro || introReady(room)) room.intro = { at: Date.now(), ack: {} };
  return room;
}
// 시작에 실패하면(누가 빠지거나 준비가 풀림) 영상을 닫고 대기실로 돌아가요
export function cancelIntro(room) {
  if (!room.intro) throw new Error('__noop');
  room.intro = null;
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

// 방장 '다시하기' 투표: 방장이 요청하면 모두 동의해야 다시 시작해요 (한 명이라도 거절하거나 30초가 지나면 취소)
export const RESTART_VOTE_MS = 30 * 1000;
export function requestRestart(room, uid) {
  if (!room.players[uid]) throw new Error('참가자가 아니에요');
  if (room.status === 'waiting') throw new Error('아직 시작하지 않은 게임이에요');
  // 게임 중 '다시하기'는 방장만, 끝난 뒤 '한 번 더 하기'는 누구나 요청할 수 있어요
  if (room.status === 'playing' && room.hostId !== uid) throw new Error('게임 중 다시하기는 방장만 요청할 수 있어요');
  if (room.restartVote && Date.now() - room.restartVote.at < RESTART_VOTE_MS) throw new Error('이미 다시하기 동의를 기다리는 중이에요');
  room.restartVote = { at: Date.now(), by: uid, again: room.status === 'finished', yes: { [uid]: true } };
  room.restartDenied = null;
  return room;
}
export function voteRestart(room, uid, yes) {
  const v = room.restartVote;
  if (!v || !room.players[uid] || v.yes?.[uid]) throw new Error('__noop');
  if (yes) v.yes = { ...(v.yes || {}), [uid]: true };
  else { room.restartVote = null; room.restartDenied = { by: uid, name: room.players[uid].name, at: Date.now() }; }
  return room;
}
export function cancelRestart(room, why = 'timeout') {
  if (!room.restartVote) throw new Error('__noop');
  room.restartVote = null;
  room.restartDenied = { by: '', name: '', why, at: Date.now() };
  return room;
}
export function restartReady(room) {
  const v = room.restartVote;
  return !!v && Object.keys(room.players).every((u) => v.yes?.[u]);
}

// 방장 '다시하기': 같은 사람들로 처음부터 다시 (영상·준비 없이 바로)
// 서버가 진행하는 게임은 게임 중에 상태를 못 바꾸니, 먼저 '중단'으로 끝낸 뒤 새로 시작해요 (두 번에 나눠 저장)
export function abortForRestart(room, uid) {
  if (room.hostId !== uid) throw new Error('방장만 다시 시작할 수 있어요');
  if (room.status !== 'playing') throw new Error('__noop');
  room.status = 'finished';
  room.result = { aborted: true, message: '방장이 게임을 다시 시작하고 있어요…' };
  return room;
}
export function restart(room, game, uid) {
  if (room.hostId !== uid) throw new Error('방장만 다시 시작할 수 있어요');
  if (room.status === 'waiting') throw new Error('아직 시작하지 않은 게임이에요');
  const list = sortedPlayers(room);
  if (list.length < game.minPlayers) throw new Error(`최소 ${game.minPlayers}명이 필요해요`);
  if (list.length > game.maxPlayers) throw new Error(`최대 ${game.maxPlayers}명까지 가능해요`);
  room.game = game.setup(list, room);
  room.matchId = (room.matchId || 0) + 1;
  const now = Date.now();
  Object.values(room.players).forEach((p) => (p.seen = now));
  room.status = 'playing';
  room.intro = null;
  room.restartVote = null;
  room.startedAt = now;
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
  const t = censor(String(text || '').trim().slice(0, 120));
  if (!t) return room;
  room.chat = [...(room.chat || []), { uid, name: p.name, text: t, t: Date.now() }].slice(-50);
  return room;
}

export function reset(room, uid) {
  if (room.hostId !== uid) throw new Error('방장만 새 게임을 열 수 있어요');
  room.status = 'waiting';
  room.restartVote = null;
  room.intro = null;
  room.game = null;
  room.result = null;
  Object.values(room.players).forEach((p) => (p.ready = false));
  return room;
}
