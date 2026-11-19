// 게임 결과 → 가넷·전적 기록 규칙 (서버에서만 실행). 순수 함수라 테스트하기 쉬워요.
// 게임마다: 최소 인원, 한 판에 받을 수 있는 가넷 범위 (게임 파일의 rewards와 맞춰 주세요)
const GAMES = {
  avalon: { min: 5, max: 2, server: true }, // server: 서버가 진행 → 서버가 만든 결과만 인정
  chosung: { min: 2, max: 4 },
  lexio: { min: 3, max: 4 },
  mystery: { min: 2, max: 3 },
  rummikub: { min: 2, max: 4 },
  splendor: { min: 2, max: 3 },
  tichu: { min: 4, max: 2 },
  assassin: { min: 6, max: 5 },
  combo: { min: 2, max: 2, minus: 2 },
  dongsang: { min: 4, max: 10, minus: 10 },
  memorypoker: { min: 2, max: 3 },
  numbers: { min: 4, max: 3 },
  seedpoker: { min: 6, max: 3 },
  stock: { min: 4, max: 5 },
  typing: { min: 6, max: 2 },
  underdog: { min: 2, max: 3 },
};
const BEST_KEYS = { merge: 20000 }; // 혼자 하는 게임 최고 기록: 받을 수 있는 최대 점수
const PER_HOUR = 20;                // 한 시간에 기록할 수 있는 판 수 (조작 방지용 상한, ghist 30개 안에서 셀 수 있게)
const DAY_GARNETS = 150;            // 하루에 받을 수 있는 가넷 상한 (조작 방지)
const RECENT = 30;                  // 같은 판 중복 기록 방지용으로 기억하는 판 수

function err(status, message) { const e = new Error(message); e.status = status; return e; }

// room: 방 문서, prof: 내 프로필 문서(없으면 null), uid: 나
// → 저장할 { data, fields } 또는 null(이미 기록함)
function recordFor(room, prof, uid, now = Date.now(), srv = null) {
  if (!room) throw err(404, '방을 찾을 수 없어요');
  const meta = GAMES[room.gameId];
  if (!meta) throw err(400, '기록하지 않는 게임이에요');
  let result, people, key;
  if (meta.server) {
    // 서버가 진행한 게임: 방 문서(브라우저가 고칠 수 있음)가 아니라 서버 사본(secret/SERVER)의 결과만 믿어요
    if (!srv || !srv.result || !srv.nonce || srv.match !== room.matchId) throw err(409, '서버가 확인한 결과가 아니에요');
    result = srv.result;
    people = new Set(Array.isArray(srv.order) ? srv.order : []);
    key = `${room.code}:${room.matchId}:${srv.nonce}`;
  } else {
    if (room.status !== 'finished' || !room.result || room.result.aborted || !room.matchId) throw err(409, '끝난 게임이 아니에요');
    result = room.result;
    // 인원·참가 여부는 방의 실제 참가자 명단으로만 판단 (순위표의 uid는 누구나 지어낼 수 있어요)
    people = new Set(Object.keys(room.players || {}));
    key = `${room.code}:${room.matchId}`;
  }
  const ranking = Array.isArray(result.ranking) ? result.ranking : [];
  if (!people.has(uid)) throw err(403, '이 게임 참가자가 아니에요');
  if (people.size < meta.min) throw err(409, '인원이 모자란 게임은 기록하지 않아요');
  const raw = result.rewards ? result.rewards[uid] : 0;
  const garnets = raw == null ? 0 : Number(raw);
  if (!Number.isInteger(garnets) || garnets > meta.max || garnets < -(meta.minus || 0)) throw err(422, '보상이 올바르지 않아요');
  const mine = ranking.find((r) => r && r.uid === uid);
  const placeRaw = mine ? Number(mine.place) : (result.winners || []).includes(uid) ? 1 : 0;
  const place = Number.isInteger(placeRaw) && placeRaw >= 0 && placeRaw <= 20 ? placeRaw : 0;

  const p = prof || {};
  const recent = Array.isArray(p.recentMatches) ? p.recentMatches : [];
  if (recent.includes(key) || p.lastMatch === key) return null; // 같은 판을 두 번 기록하지 않음
  const ghist = Array.isArray(p.ghist) ? p.ghist : [];
  if (ghist.filter((h) => h && now - h.at < 3600_000).length >= PER_HOUR) throw err(429, '잠시 후에 다시 기록돼요');

  const day = new Date(now + 9 * 3600_000).toISOString().slice(0, 10); // 한국 날짜
  const rl = p.rl && p.rl.day === day ? p.rl : { day, g: 0 };
  if (garnets > 0 && rl.g + garnets > DAY_GARNETS) throw err(429, '오늘 받을 수 있는 가넷을 다 받았어요');
  const stats = p.stats && typeof p.stats === 'object' ? p.stats : {};
  const g = { plays: 0, wins: 0, garnets: 0, ...(stats[room.gameId] || {}) };
  g.plays += 1;
  if (garnets > 0) g.wins += 1; // 가넷을 받으면 승, 못 받으면 패
  g.garnets += garnets;
  const total = Math.max(0, (Number(p.garnets) || 0) + garnets);
  return {
    data: {
      stats: { ...stats, [room.gameId]: g },
      garnets: total,
      ghist: [{ at: now, game: room.gameId, place, g: garnets, total }, ...ghist].slice(0, 30),
      lastMatch: key,
      recentMatches: [key, ...recent].slice(0, RECENT),
      rl: { day, g: rl.g + Math.max(0, garnets) },
    },
    fields: ['stats', 'garnets', 'ghist', 'lastMatch', 'recentMatches', 'rl'],
    garnets, total,
  };
}

function bestFor(prof, key, score, now = Date.now()) {
  const cap = BEST_KEYS[key];
  if (!cap) throw err(400, '기록하지 않는 게임이에요');
  if (!Number.isInteger(score) || score < 0 || score > cap) throw err(422, '점수가 올바르지 않아요');
  const p = prof || {};
  const bestMap = p.best && typeof p.best === 'object' ? p.best : {};
  const prev = Number(bestMap[key]) || 0;
  if (score <= prev) return { best: prev, write: null };
  const bestAt = p.bestAt && typeof p.bestAt === 'object' ? p.bestAt : {};
  return { best: score, write: { data: { best: { ...bestMap, [key]: score }, bestAt: { ...bestAt, [key]: now } }, fields: ['best', 'bestAt'] } };
}

module.exports = { GAMES, BEST_KEYS, recordFor, bestFor };
