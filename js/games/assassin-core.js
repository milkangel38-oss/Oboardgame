// 자객 마피아 규칙 (순수 함수) — 서버(/api/game)와 테스트 모드가 함께 써요. 화면 코드는 assassin.js.
// 마피아가 누구인지·미션·누가 공격당했는지는 서버만 알아요 (마피아 본인은 자기 정보를, 공격받은 사람은 자기가 쓰러진 것만 알아요).
// 공격·시체발견은 서버가 실시간 위치(live/{방})로 정말 닿아 있었는지 확인해요.
export const W = 1000, H = 700;           // 맵 크기(좌표)
export const R = 50;                       // 캐릭터 반지름 (화면 폭의 10%)
export const MEET = 62;                    // 이 거리 안이면 "만남"
export const SPEED = 230;                  // 초당 이동 거리
export const SLOW = 0.35;                  // 만났을 때 1초 동안 속도 배율
export const SLOW_MS = 500;
export const INTRO_MS = 6500;              // 마피아 선정 연출
export const HUNT_MS = 180000;             // 암전 상태 최대 3분 (아무도 시체를 못 찾으면 불이 켜짐)
export const VOTE_MS = 180000;             // 회의·투표 3분
export const RUNOFF_MS = 60000;            // 동점 결선 투표 1분
export const KILL_CD = 3000;
export const SEND_MS = 100;
export const REWARDS = [5, 4, 3];

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export function spawns(order) {
  const pts = {};
  order.forEach((u) => {
    let p, tries = 0;
    do { p = { x: 70 + Math.random() * (W - 140), y: 80 + Math.random() * (H - 150) }; tries++; }
    while (tries < 200 && Object.values(pts).some((q) => dist(p, q) < 170));
    pts[u] = { x: Math.round(p.x), y: Math.round(p.y) };
  });
  return pts;
}

// ── 미션 ──
export function makeMission(state, mafia) {
  const citizens = shuffle(state.order.filter((u) => u !== mafia));
  const kind = ['targets', 'count', 'frame'][Math.floor(Math.random() * 3)];
  if (kind === 'targets') return { kind, targets: citizens.slice(0, 2 + Math.floor(Math.random() * 2)) };
  if (kind === 'count') { const max = Math.max(4, citizens.length - 1); return { kind, n: 4 + Math.floor(Math.random() * (max - 3)) }; }
  return { kind, target: citizens[0] };
}
export function missionText(m, players) {
  const nm = (u) => `${players[u]?.name || '?'}님`;
  if (!m) return '';
  if (m.kind === 'targets') return `${m.targets.map(nm).join(', ')}만 모두 공격하세요 (다른 사람을 공격하면 실패)`;
  if (m.kind === 'count') return `유저를 ${m.n}명 이상 공격하세요`;
  return `${nm(m.target)}이(가) 의심받아 가장 많은 표를 받게 하세요`;
}
export function missionOk(m, dead, caught) {
  if (m.kind === 'targets') return m.targets.every((u) => dead[u]) && Object.keys(dead).every((u) => m.targets.includes(u));
  if (m.kind === 'count') return Object.keys(dead).length >= m.n;
  return caught === m.target;
}

export function newRound(state, roundNo) {
  return {
    ...state, round: roundNo, phase: 'lobby', ready: {}, spawn: spawns(state.order),
    mafia: null, mafiaAt: 0, mission: null, dead: {}, found: null, votes: {}, advice: {}, runoff: null, runoffAt: 0, firstTally: null, deadline: 0, lastKill: 0, meeting: null,
  };
}
export const aliveCitizens = (s) => s.order.filter((u) => u !== s.mafia && !s.dead[u]);
export function toVote(state, now, why) {
  return { ...state, phase: 'vote', deadline: now + VOTE_MS, votes: {}, advice: {}, runoff: null, runoffAt: 0, firstTally: null, meeting: why };
}
export function resolve(state, players) {
  const tally = {};
  Object.values(state.votes).forEach((t) => (tally[t] = (tally[t] || 0) + 1));
  const max = Math.max(0, ...Object.values(tally));
  const leaders = Object.keys(tally).filter((u) => tally[u] === max);
  if (!state.runoff && max > 0 && leaders.length >= 2) {
    const now = Date.now();
    const runoff = shuffle(leaders).slice(0, 2); // 3명 이상 동점이면 그중 무작위 2명
    return { state: { ...state, runoff, runoffAt: now, firstTally: tally, votes: {}, deadline: now + RUNOFF_MS } };
  }
  const caught = max > 0 && leaders.length === 1 ? leaders[0] : null;
  const mafiaCaught = caught === state.mafia;
  const ok = missionOk(state.mission, state.dead, caught);
  const scores = { ...state.scores };
  const breakdown = {};
  state.order.forEach((u) => {
    const items = [];
    if (u === state.mafia) {
      items.push(mafiaCaught ? ['마피아 검거됨', -5] : ['마피아 생존', 5]);
      if (ok) items.push(['미션 성공', 3]);
    } else {
      items.push(mafiaCaught ? ['마피아 검거', 5] : ['검거 실패', -5]);
      items.push(state.dead[u] ? ['공격받음', -1] : ['생존', 1]);
    }
    breakdown[u] = items;
    scores[u] += items.reduce((a, [, p]) => a + p, 0);
  });
  const last = { runoff: state.runoff || null, round: state.round, mafia: state.mafia, mission: state.mission, missionOk: ok, caught, mafiaCaught, tally, votes: state.votes, dead: Object.keys(state.dead), breakdown };
  const s = { ...state, phase: 'result', scores, last, deadline: 0, history: [...state.history, { round: state.round, mafia: state.mafia, mafiaCaught }] };
  if (s.round >= s.rounds) {
    const done = { ...s, phase: 'done' };
    return { state: done, result: finalResult(done, players) };
  }
  return { state: s };
}
export function finalResult(state, players) {
  const ranking = state.order
    .map((uid) => ({ uid, score: state.scores[uid] }))
    .sort((a, b) => b.score - a.score)
    .map((r, _, all) => {
      const place = 1 + all.filter((o) => o.score > r.score).length;
      return { ...r, place, garnets: REWARDS[place - 1] || 0 };
    });
  const top = ranking.filter((r) => r.place === 1).map((r) => players[r.uid]?.name || '?');
  return {
    message: `${top.join(', ')}님 1등! 🗡`,
    winners: ranking.filter((r) => r.place === 1).map((r) => r.uid),
    ranking,
    rewards: Object.fromEntries(ranking.map((r) => [r.uid, r.garnets])),
  };
}

export const REACH_SLACK = 70; // 위치 전송 지연을 고려한 여유 거리
const livePos = (pos, u, state) => {
  const p = pos?.[u];
  return p && p.r === state.round && Number.isFinite(p.x) && Number.isFinite(p.y) ? p : null;
};

export function applyMove(state, move, uid, players, env = {}) {
  const pos = env.positions || null; // 서버가 읽은 실시간 위치 (live/{방}) — 있으면 거리 확인
  const now = Date.now();
  const t = move?.type;
  if (t !== 'tick' && !state.order.includes(uid)) throw new Error('참가자가 아니에요');
  const hostOk = uid === state.host || !players[state.host];

  if (t === 'ready') {
    if (state.phase !== 'lobby') throw new Error('__noop');
    const ready = { ...state.ready, [uid]: move.on !== false };
    if (state.order.every((u) => ready[u])) return { state: { ...state, ready, phase: 'dark' } };
    return { state: { ...state, ready } };
  }
  if (t === 'pickMafia') {
    if (state.phase !== 'dark') throw new Error('지금은 마피아를 고를 수 없어요');
    if (!hostOk) throw new Error('방장만 마피아를 고를 수 있어요');
    let pool = state.order.filter((u) => !state.pastMafia.includes(u));
    if (!pool.length) pool = state.order;
    const mafia = pool[Math.floor(Math.random() * pool.length)];
    return { state: { ...state, phase: 'hunt', mafia, mafiaAt: now, mission: makeMission(state, mafia), pastMafia: [...state.pastMafia, mafia], deadline: now + INTRO_MS + HUNT_MS } };
  }
  if (t === 'kill') {
    if (state.phase !== 'hunt' || uid !== state.mafia) throw new Error('__noop');
    if (now < state.mafiaAt + INTRO_MS) throw new Error('아직 공격할 수 없어요');
    if (now - (state.lastKill || 0) < KILL_CD) throw new Error('잠시 후에 다시 공격할 수 있어요');
    const tg = move.target;
    if (!state.order.includes(tg) || tg === uid || state.dead[tg]) throw new Error('공격할 수 없는 대상이에요');
    const pm = livePos(pos, uid, state), pt = livePos(pos, tg, state);
    if (pm && pt && dist(pm, pt) > MEET + REACH_SLACK) throw new Error('너무 멀어요'); // 실제로 닿아 있어야 공격
    const at = pt || { x: Number(move.x) || 0, y: Number(move.y) || 0 };
    const dead = { ...state.dead, [tg]: { x: Math.round(at.x), y: Math.round(at.y), at: now } };
    const s = { ...state, dead, lastKill: now };
    if (aliveCitizens(s).length <= 1) return { state: toVote(s, now, 'auto') };
    return { state: s };
  }
  if (t === 'shout') {
    if (state.phase !== 'hunt' || uid === state.mafia || state.dead[uid]) throw new Error('__noop');
    if (now < state.mafiaAt + INTRO_MS) throw new Error('__noop');
    // 시민은 누가 쓰러졌는지 몰라요: 가까운 사람에게 상호작용 → 서버가 쓰러진 사람인지 확인
    if (!state.dead[move.body]) throw new Error('__miss');
    const ps = livePos(pos, uid, state);
    if (ps && dist(ps, state.dead[move.body]) > MEET + REACH_SLACK) throw new Error('__miss');
    return { state: toVote({ ...state, found: { by: uid, body: move.body, at: now } }, now, 'found') };
  }
  if (t === 'advise') {
    if (state.phase !== 'vote') throw new Error('지금은 조언할 수 없어요');
    if (state.runoff) throw new Error('결선 투표에서는 조언할 수 없어요');
    if (!state.dead[uid]) throw new Error('__noop');
    if (!state.order.includes(move.target) || state.dead[move.target]) throw new Error('조언할 수 없는 사람이에요');
    return { state: { ...state, advice: { ...(state.advice || {}), [uid]: move.target } } };
  }
  if (t === 'vote') {
    if (state.phase !== 'vote') throw new Error('지금은 투표 시간이 아니에요');
    if (state.dead[uid]) throw new Error('공격당한 사람은 투표할 수 없어요');
    if (!state.order.includes(move.target) || state.dead[move.target]) throw new Error('투표할 수 없는 사람이에요');
    if (state.runoff && !state.runoff.includes(move.target)) throw new Error('결선 투표는 동점인 두 사람 중에서만 고를 수 있어요');
    if (move.target === uid) throw new Error('나에게는 투표할 수 없어요');
    const votes = { ...state.votes, [uid]: move.target };
    const s = { ...state, votes };
    if (state.order.filter((u) => !state.dead[u]).every((u) => votes[u])) return resolve(s, players);
    return { state: s };
  }
  if (t === 'chat') {
    const text = String(move.text || '').trim().slice(0, 60);
    if (!text) throw new Error('__noop');
    if (state.phase === 'dark' || state.phase === 'hunt') throw new Error('불이 꺼진 동안은 채팅할 수 없어요');
    if (state.phase === 'vote' && state.dead[uid]) throw new Error('공격당한 사람은 채팅할 수 없어요');
    return { state: { ...state, chat: [...(state.chat || []), { u: uid, text, at: now }].slice(-30) } };
  }
  if (t === 'next') {
    if (state.phase !== 'result') throw new Error('__noop');
    if (!hostOk) throw new Error('방장만 다음 라운드를 시작할 수 있어요');
    return { state: newRound(state, state.round + 1) };
  }
  if (t === 'tick') {
    if (state.phase === 'hunt' && now >= state.deadline) return { state: toVote(state, now, 'time') };
    if (state.phase === 'vote' && now >= state.deadline) return resolve(state, players);
    throw new Error('__noop');
  }
  throw new Error('알 수 없는 동작이에요');
}

// ── 서버 진행용 ──
export const SECRET_MOVES = ['deal', 'pickMafia', 'kill', 'next'];
export const needsPositions = (move) => ['kill', 'shout'].includes(move?.type);
export function deal(room) {
  const order = Object.keys(room.players || {}).sort((x, y) => (room.players[x].joinedAt || 0) - (room.players[y].joinedAt || 0));
  if (order.length < 6 || order.length > 8) throw new Error('자객 마피아는 6~8명이에요');
  const rounds = Math.min(10, Math.max(3, Number(room?.options?.rounds) || 3));
  const base = { order, host: room.hostId || order[0], rounds, round: 0, scores: Object.fromEntries(order.map((u) => [u, 0])), history: [], pastMafia: [], chat: [], last: null };
  return newRound(base, 1);
}
export function split(full) {
  const { pastMafia, ...pub } = full;
  const open = ['result', 'done'].includes(full.phase);
  if (!open) { pub.mafia = null; pub.mission = null; pub.lastKill = 0; }
  if (full.phase === 'hunt') pub.dead = {}; // 불이 꺼진 동안 누가 쓰러졌는지는 비밀 (회의가 시작되면 공개)
  const mine = Object.fromEntries(full.order.map((u) => {
    const isM = u === full.mafia;
    return [u, {
      mafia: isM,
      mission: isM ? full.mission : null,
      dead: isM && full.phase === 'hunt' ? full.dead : null,
      deadMe: (full.dead || {})[u] || null,
      lastKill: isM ? full.lastKill || 0 : 0,
    }];
  }));
  return { pub, mine };
}
