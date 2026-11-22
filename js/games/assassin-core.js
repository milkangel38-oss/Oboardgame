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
export const HUNT_MS = 60000;              // 암전 상태 최대 1분 (아무도 시체를 못 찾으면 불이 켜짐)
export const VOTE_MS = 180000;             // 회의·투표 3분
export const RUNOFF_MS = 60000;            // 동점 결선 투표 1분
export const KILL_CD = 3000;
export const SEND_MS = 100;
export const REWARDS = [5, 4, 3];
export const MAFIA_BOOST = 1.15;           // 마피아는 조금 더 빨라요
export const KICK_MS = 7000;               // 투표로 쫓겨나는 연출 (옥상에서 날아가기 + 글자)
export const REVIVE_MS = 5000;             // 의사 소생 시간
export const SIREN_MS = 6000;              // 경찰 사이렌 표시 시간
export const DASH = 300;                   // 퀵실버 대쉬 거리 (캐릭터 3칸)

// ── 직업 · 스킬 (스킬은 라운드마다 1번) ──
export const ROLES = {
  mafia: { name: '마피아', icon: '🗡', desc: '시작할 때 스킬 3개 중 하나를 골라요' },
  police: { name: '경찰', icon: '🚨', desc: '닿아 있는 사람을 조사해 마피아인지 알아내요 (1번)' },
  doctor: { name: '의사', icon: '🩺', desc: '쓰러진 사람과 닿으면 스킬이 켜져요 · 5초 동안 살려요' },
  detective: { name: '탐정', icon: '🔍', desc: '투표 때 쓰러진 순서를 시체 위 번호로 봐요' },
  lawyer: { name: '변호사', icon: '⚖️', desc: '다른 사람과 붙어 있는 동안은 공격당하지 않아요 · 투표로 시민이 3번 이상 쫓겨나고 마피아가 이기면 +5점 (자동)' },
  coward: { name: '겁쟁이', icon: '😱', desc: '마피아와 마주치면 ‼ 표시가 모두에게 뜨고 반대쪽으로 튕겨 나가요 (자동)' },
  ma: { name: '마동석', icon: '💪', desc: '마피아에게 공격받으면 한 번 반격! 뒤로 밀려나고 마피아는 5초 경직 (자동)' },
  prophet: { name: '예언자', icon: '🔮', desc: '투표 때 한 사람의 직업을 맞히면 +5점' },
};
export const CITIZEN_ROLES = ['police', 'doctor', 'detective', 'lawyer', 'coward', 'ma', 'prophet'];
export const MAFIA_SKILLS = {
  eye: { name: '사륜안', icon: '👁', desc: '1초 동안 어둠이 걷혀 모두가 보여요' },
  blink: { name: '점멸자', icon: '✨', desc: '켜 두면 다음 공격 뒤 맵 정반대편으로 순간이동' },
  reaper: { name: '사신', icon: '☠️', desc: '투표 때 이름을 적어 한 사람을 쓰러뜨려요' },
};
// 마피아 승리: 남은 시민(쓰러지거나 쫓겨나지 않은 사람)이 이만큼 이하 (6명 → 2명, 7~8명 → 3명)
export const needLeft = () => 2;
export const SCARE_MS = 1500;               // 겁쟁이 ‼ 표시 시간

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
  if (kind === 'targets') return { kind, targets: citizens.slice(0, 2) };
  if (kind === 'count') return { kind, n: Math.max(2, state.order.length - 4) };
  return { kind, target: citizens[0] };
}
export function missionText(m, players) {
  const nm = (u) => `${players[u]?.name || '?'}님`;
  if (!m) return '';
  if (m.kind === 'targets') return `${m.targets.map(nm).join(', ')}만 모두 공격하세요 (다른 사람을 공격하면 실패)`;
  if (m.kind === 'count') return `유저를 ${m.n}번 이상 공격하세요`;
  return `${nm(m.target)}이(가) 투표로 쫓겨나게 하세요`;
}
export function missionOk(m, s) {
  const kills = s.kills || [];
  if (m.kind === 'targets') return m.targets.every((u) => kills.includes(u)) && kills.every((u) => m.targets.includes(u));
  if (m.kind === 'count') return kills.length >= m.n;
  return !!(s.outs || {})[m.target];
}

export function newRound(state, roundNo) {
  return {
    ...state, round: roundNo, phase: 'lobby', ready: {}, spawn: spawns(state.order),
    mafia: null, mafiaAt: 0, goAt: 0, mission: null, dead: {}, found: null, votes: {}, advice: {}, runoff: null, runoffAt: 0, firstTally: null, deadline: 0, lastKill: 0, meeting: null,
    roles: {}, outs: {}, reported: {}, kills: [], used: {}, mskill: null, eyeAt: 0, siren: null, counter: null, revive: null, policeHit: null, guess: null, kick: null, outCount: 0, probes: {}, reaped: null, scare: null,
  };
}
export const aliveCitizens = (s) => s.order.filter((u) => u !== s.mafia && !s.dead[u] && !(s.outs || {})[u]);
// 마피아 승리: 공격으로 시민이 2명 이하가 되거나, 투표 뒤 마피아 1 : 시민 1이 되면
// 마피아 승리: 남은 시민이 (인원 − 5)명 이하 — 6명 1명 · 7명 2명 · 8명 3명 (공격으로든 투표로든)
export const winLeft = (n) => Math.max(1, n - 5);
export const mafiaWins = (s) => aliveCitizens(s).length <= winLeft(s.order.length);
// 사신 발동 조건: 투표 때 쓰러진 사람이 1명 ~ (인원 − 5)명
export const reaperOk = (s) => { const d = Object.keys(s.dead || {}).length; return d >= 1 && d <= winLeft(s.order.length); };
export const STUN_MS = 5000;                // 마동석 반격에 맞으면 마피아 5초 경직
const canAct = (s, u) => !s.dead[u] && !(s.outs || {})[u];
export function toVote(state, now, why) {
  const reported = { ...(state.reported || {}) };
  Object.keys(state.dead).forEach((u) => (reported[u] = true)); // 회의가 열리면 쓰러진 사람이 모두 드러나요
  return { ...state, phase: 'vote', deadline: now + VOTE_MS, votes: {}, confirmed: {}, advice: {}, runoff: null, runoffAt: 0, firstTally: null, meeting: why, reported, revive: null, kick: null };
}
// 라운드 끝: outcome = 'caught'(마피아 검거) | 'mafia'(마피아 승리)
export function endRound(state, players, outcome) {
  const mafiaCaught = outcome === 'caught';
  const ok = missionOk(state.mission, state);
  const scores = { ...state.scores };
  const breakdown = {};
  state.order.forEach((u) => {
    const items = [];
    if (u === state.mafia) {
      items.push(mafiaCaught ? ['마피아 검거됨', -5] : ['마피아 승리', 5]);
      if (ok) items.push(['미션 성공', 3]);
    } else {
      items.push(mafiaCaught ? ['마피아 검거', 5] : ['마피아 승리 허용', -5]);
      items.push(state.outs[u] ? ['투표로 쫓겨남', -1] : state.dead[u] ? ['공격받음', -1] : ['생존', 1]);
      if (state.roles[u] === 'lawyer' && !mafiaCaught && state.outCount >= 3) items.push(['변호사 보너스', 5]);
      if (state.roles[u] === 'prophet' && state.guess?.ok) items.push(['예언 적중', 5]);
    }
    breakdown[u] = items;
    scores[u] += items.reduce((a, [, p]) => a + p, 0);
  });
  const caught = mafiaCaught ? state.mafia : null;
  const last = { runoff: state.runoff || null, round: state.round, mafia: state.mafia, mission: state.mission, missionOk: ok, caught, mafiaCaught, tally: state.lastTally || {}, votes: state.votes || {}, dead: Object.keys(state.dead), outs: Object.keys(state.outs), roles: state.roles, mskill: state.mskill, breakdown, guess: state.guess };
  const s = { ...state, phase: 'result', scores, last, deadline: 0, history: [...state.history, { round: state.round, mafia: state.mafia, mafiaCaught }] };
  if (s.round >= s.rounds) {
    const done = { ...s, phase: 'done' };
    return { state: done, result: finalResult(done, players) };
  }
  return { state: s };
}
// 투표 결과: 마피아면 라운드 끝, 시민이면 그 사람만 쫓겨나고 바로 다시 암전
export function resolve(state, players) {
  const tally = {};
  Object.values(state.votes).forEach((t) => (tally[t] = (tally[t] || 0) + 1));
  const max = Math.max(0, ...Object.values(tally));
  const leaders = Object.keys(tally).filter((u) => tally[u] === max);
  const now = Date.now();
  if (!state.runoff && max > 0 && leaders.length >= 2) {
    const runoff = shuffle(leaders).slice(0, 2); // 3명 이상 동점이면 그중 무작위 2명
    return { state: { ...state, runoff, runoffAt: now, firstTally: tally, votes: {}, confirmed: {}, deadline: now + RUNOFF_MS } };
  }
  const caught = max > 0 && leaders.length === 1 ? leaders[0] : null;
  const s0 = { ...state, lastTally: tally };
  if (caught && caught === state.mafia) return endRound(s0, players, 'caught');
  const outs = caught ? { ...state.outs, [caught]: true } : state.outs;
  const s = { ...s0, outs, outCount: (state.outCount || 0) + (caught ? 1 : 0) };
  if (mafiaWins(s)) return endRound(s, players, 'mafia');
  // 계속: 결과 알림 + 쫓겨나는 연출 뒤 바로 암전
  return { state: { ...s, phase: 'hunt', goAt: now + KICK_MS, deadline: now + KICK_MS + HUNT_MS, kick: { uid: caught, at: now, tally, runoff: state.runoff || null }, votes: {}, confirmed: {}, advice: {}, runoff: null, runoffAt: 0, found: null, meeting: null, siren: null } };
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
// 두 사람이 정말 닿아 있는지 (서버는 실시간 위치로 확인, 테스트 모드는 통과)
function touching(pos, strict, state, a, b, target) {
  const pa = livePos(pos, a, state), pb = target || livePos(pos, b, state);
  if (strict && (!pa || !pb)) throw new Error('위치를 확인할 수 없어요. 조금 움직인 뒤 다시 해 보세요');
  if (pa && pb && dist(pa, pb) > MEET + REACH_SLACK) throw new Error('너무 멀어요');
  return pa;
}

export function applyMove(state, move, uid, players, env = {}) {
  const pos = env.positions || null; // 서버가 읽은 실시간 위치 (live/{방})
  const strict = !!env.strict; // 서버: 위치를 꼭 확인 (못 하면 거부) · 테스트 모드: 위치 없이 진행
  const now = Date.now();
  const t = move?.type;
  if (t !== 'tick' && !state.order.includes(uid)) throw new Error('참가자가 아니에요');
  const hostOk = uid === state.host || !players[state.host];
  const going = state.phase === 'hunt' && now >= (state.goAt || 0);

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
    const jobs = shuffle(CITIZEN_ROLES);
    const roles = { [mafia]: 'mafia' };
    shuffle(state.order.filter((u) => u !== mafia)).forEach((u, i) => (roles[u] = jobs[i % jobs.length]));
    return { state: { ...state, phase: 'hunt', mafia, roles, mafiaAt: now, goAt: now + INTRO_MS, mission: makeMission(state, mafia), pastMafia: [...state.pastMafia, mafia], deadline: now + INTRO_MS + HUNT_MS } };
  }
  if (t === 'kill') {
    if (state.phase !== 'hunt' || uid !== state.mafia) throw new Error('__noop');
    if (!going) throw new Error('아직 공격할 수 없어요');
    if (now - (state.lastKill || 0) < KILL_CD) throw new Error('잠시 후에 다시 공격할 수 있어요');
    if (state.counter && state.counter.mafia === uid && now - state.counter.at < STUN_MS) throw new Error('반격당해 잠시 멈췄어요');
    const tg = move.target;
    if (!state.order.includes(tg) || tg === uid || !canAct(state, tg)) throw new Error('공격할 수 없는 대상이에요');
    const pm = touching(pos, strict, state, uid, tg);
    const pt = livePos(pos, tg, state);
    // 변호사: 다른 사람(마피아 말고)과 붙어 있으면 공격당하지 않아요
    if (state.roles[tg] === 'lawyer' && pt) {
      const guard = state.order.some((u) => u !== tg && u !== uid && canAct(state, u) && livePos(pos, u, state) && dist(livePos(pos, u, state), pt) <= MEET + 20);
      if (guard) throw new Error('변호사가 다른 사람과 붙어 있어서 공격할 수 없어요');
    }
    // 마동석: 첫 공격은 반격 (마피아 1초 정지, 마동석은 뒤로 밀려나요)
    if (state.roles[tg] === 'ma' && !state.used[tg]) {
      return { state: { ...state, used: { ...state.used, [tg]: true }, lastKill: now, counter: { mafia: uid, target: tg, at: now, from: pm ? { x: Math.round(pm.x), y: Math.round(pm.y) } : { x: Number(move.mx) || 0, y: Number(move.my) || 0 } } } };
    }
    const at = pt || { x: Number(move.x) || 0, y: Number(move.y) || 0 }; // (테스트 모드에서만 화면 좌표 사용)
    const dead = { ...state.dead, [tg]: { x: Math.round(at.x), y: Math.round(at.y), at: now } };
    let used = state.used;
    if (move.blink && state.mskill === 'blink' && !used[uid]) used = { ...used, [uid]: true }; // 점멸: 화면에서 순간이동
    const revive = state.revive?.by === tg ? null : state.revive; // 소생 중이던 의사가 쓰러지면 취소
    const s = { ...state, dead, used, revive, lastKill: now, kills: [...(state.kills || []), tg] };
    if (mafiaWins(s)) return endRound(s, players, 'mafia');
    return { state: s };
  }
  if (t === 'shout') {
    if (!going || !canAct(state, uid) || uid === state.mafia) throw new Error('__noop');
    // 시민은 누가 쓰러졌는지 몰라요: 가까운 사람에게 상호작용 → 서버가 (아직 발견 안 된) 쓰러진 사람인지 확인
    if (now - (state.shoutAt?.[uid] || 0) < 1000) throw new Error('__miss'); // 1초에 한 번만 살펴볼 수 있어요
    const s0 = { ...state, shoutAt: { ...(state.shoutAt || {}), [uid]: now } };
    const ps = livePos(pos, uid, state);
    const body = state.dead[move.body];
    if (!body || state.reported?.[move.body] || (strict && !ps) || (ps && dist(ps, body) > MEET + REACH_SLACK)) {
      const e = new Error('__miss'); e.state = s0; throw e; // 실패해도 '살펴본 시각'은 기록 (연타 방지)
    }
    return { state: toVote({ ...s0, found: { by: uid, body: move.body, at: now } }, now, 'found') };
  }
  if (t === 'mskill') { // 마피아 스킬 고르기 (한 번)
    if (uid !== state.mafia || state.mskill || !MAFIA_SKILLS[move.pick]) throw new Error('__noop');
    return { state: { ...state, mskill: move.pick } };
  }
  if (t === 'skill') {
    const role = state.roles?.[uid];
    if (!role || state.used[uid]) throw new Error('이번 라운드에 이미 스킬을 썼어요');
    const used = { ...state.used, [uid]: true };
    if (role === 'mafia') {
      if (state.mskill === 'eye') { if (!going) throw new Error('__noop'); return { state: { ...state, used, eyeAt: now } }; }
      if (state.mskill === 'reaper') {
        if (state.phase !== 'vote' || state.runoff) throw new Error('사신은 투표 시간에만 쓸 수 있어요');
        if (!reaperOk(state)) throw new Error(`사신은 쓰러진 사람이 1~${winLeft(state.order.length)}명일 때만 쓸 수 있어요`);
        const tg = move.target;
        if (!state.order.includes(tg) || tg === uid || !canAct(state, tg)) throw new Error('쓰러뜨릴 수 없는 사람이에요');
        const p = livePos(pos, tg, state) || state.spawn?.[tg] || { x: 500, y: 350 };
        const votes = { ...state.votes }; delete votes[tg];
        const confirmed = { ...(state.confirmed || {}) }; delete confirmed[tg];
        Object.keys(votes).forEach((v) => { if (votes[v] === tg) { delete votes[v]; delete confirmed[v]; } }); // 쓰러진 사람에게 한 표는 다시
        const s = { ...state, used, votes, confirmed, dead: { ...state.dead, [tg]: { x: Math.round(p.x), y: Math.round(p.y), at: now, reaper: true } }, reported: { ...state.reported, [tg]: true }, kills: [...(state.kills || []), tg], reaped: { uid: tg, at: now } };
        if (mafiaWins(s)) return endRound(s, players, 'mafia');
        if (s.order.filter((u) => canAct(s, u)).every((u) => confirmed[u])) return resolve(s, players);
        return { state: s };
      }
      throw new Error('__noop');
    }
    if (role === 'detective') { if (state.phase !== 'vote' || !canAct(state, uid)) throw new Error('탐정 스킬은 투표 시간에 쓸 수 있어요'); return { state: { ...state, used } }; }
    if (role === 'prophet') {
      if (state.phase !== 'vote' || !canAct(state, uid)) throw new Error('예언은 투표 시간에 할 수 있어요');
      if (!state.order.includes(move.target) || move.target === uid || !ROLES[move.role]) throw new Error('예언할 사람과 직업을 골라 주세요');
      return { state: { ...state, used, guess: { by: uid, target: move.target, role: move.role, ok: state.roles[move.target] === move.role } } };
    }
    if (role === 'police') {
      if (!going || !canAct(state, uid)) throw new Error('__noop');
      const tg = move.target;
      if (!state.order.includes(tg) || tg === uid || !canAct(state, tg)) throw new Error('__miss');
      touching(pos, strict, state, uid, tg);
      return { state: { ...state, used, policeHit: { at: now, target: tg, hit: tg === state.mafia } } };
    }
    if (role === 'doctor') {
      if (!going || !canAct(state, uid)) throw new Error('__noop');
      const tg = move.target;
      if (!state.dead[tg] || state.dead[tg].reaper) throw new Error('__miss'); // 쓰러진 사람만 (사신에게 당한 사람은 못 살려요)
      touching(pos, strict, state, uid, tg, state.dead[tg]);
      return { state: { ...state, revive: { by: uid, target: tg, at: now } } }; // 5초 뒤 reviveDone으로 완료
    }
    throw new Error('__noop');
  }
  // 경찰·의사: 누군가와 닿으면 자동으로 살펴봐요 (경찰: 마피아면 사이렌 / 의사: 쓰러진 사람인지)
  if (t === 'probe') {
    const role = state.roles?.[uid];
    if (!going || !canAct(state, uid) || !['doctor', 'coward'].includes(role)) throw new Error('__noop');
    const tg = move.target;
    if (!state.order.includes(tg) || tg === uid || state.outs?.[tg]) throw new Error('__noop');
    const prev = state.probes?.[uid];
    if (prev && prev.target === tg && now - prev.at < 1500) throw new Error('__noop');
    touching(pos, strict, state, uid, tg, state.dead[tg] || null);
    const down = !!state.dead[tg];
    const mafia = tg === state.mafia;
    const probes = { ...(state.probes || {}), [uid]: { target: tg, at: now, down } };
    if (role === 'coward' && mafia && !down) { // 겁쟁이: 마피아를 만나면 ‼ (모두에게 보임) + 튕겨 나가요
      const pc = livePos(pos, uid, state) || { x: Number(move.x) || 0, y: Number(move.y) || 0 };
      const pm = livePos(pos, tg, state) || { x: Number(move.mx) || pc.x - 1, y: Number(move.my) || pc.y };
      return { state: { ...state, probes, scare: { uid, at: now, x: Math.round(pc.x), y: Math.round(pc.y), fx: Math.round(pm.x), fy: Math.round(pm.y) } } };
    }
    return { state: { ...state, probes } };
  }
  if (t === 'reviveDone') {
    const r = state.revive;
    if (state.phase !== 'hunt' || !r || r.by !== uid || !state.dead[r.target]) throw new Error('__noop');
    if (now - r.at < REVIVE_MS - 400) throw new Error('__noop');
    touching(pos, strict, state, uid, r.target, state.dead[r.target]);
    const dead = { ...state.dead }; delete dead[r.target];
    const reported = { ...(state.reported || {}) }; delete reported[r.target];
    return { state: { ...state, dead, reported, revive: null, revived: { uid: r.target, at: now }, used: { ...state.used, [uid]: true } } };
  }
  if (t === 'reviveCancel') {
    if (state.revive?.by !== uid) throw new Error('__noop');
    return { state: { ...state, revive: null } };
  }
  if (t === 'advise') {
    if (state.phase !== 'vote') throw new Error('지금은 조언할 수 없어요');
    if (state.runoff) throw new Error('결선 투표에서는 조언할 수 없어요');
    if (canAct(state, uid)) throw new Error('__noop');
    if (!state.order.includes(move.target) || !canAct(state, move.target)) throw new Error('조언할 수 없는 사람이에요');
    return { state: { ...state, advice: { ...(state.advice || {}), [uid]: move.target } } };
  }
  if (t === 'vote') {
    if (state.phase !== 'vote') throw new Error('지금은 투표 시간이 아니에요');
    if (!canAct(state, uid)) throw new Error('쓰러지거나 쫓겨난 사람은 투표할 수 없어요');
    if (!state.order.includes(move.target) || !canAct(state, move.target)) throw new Error('투표할 수 없는 사람이에요');
    if (state.runoff && !state.runoff.includes(move.target)) throw new Error('결선 투표는 동점인 두 사람 중에서만 고를 수 있어요');
    if (move.target === uid) throw new Error('나에게는 투표할 수 없어요');
    if (state.confirmed?.[uid]) throw new Error('이미 투표를 완료했어요');
    return { state: { ...state, votes: { ...state.votes, [uid]: move.target } } };
  }
  if (t === 'confirm') {
    if (state.phase !== 'vote' || !canAct(state, uid)) throw new Error('__noop');
    if (!state.votes[uid]) throw new Error('먼저 마피아라고 생각하는 사람을 골라 주세요');
    const confirmed = { ...(state.confirmed || {}), [uid]: true };
    const s = { ...state, confirmed };
    if (state.order.filter((u) => canAct(state, u)).every((u) => confirmed[u])) return resolve(s, players);
    return { state: s };
  }
  if (t === 'chat') {
    const text = String(move.text || '').trim().slice(0, 60);
    if (!text) throw new Error('__noop');
    if (state.phase === 'dark' || state.phase === 'hunt') throw new Error('불이 꺼진 동안은 채팅할 수 없어요');
    if (state.phase === 'vote' && !canAct(state, uid)) throw new Error('쓰러지거나 쫓겨난 사람은 채팅할 수 없어요');
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
export const SECRET_MOVES = ['deal', 'pickMafia', 'kill', 'next', 'skill', 'mskill', 'reviveDone', 'probe'];
export const needsPositions = (move) => ['kill', 'shout', 'reviveDone', 'probe'].includes(move?.type) || (move?.type === 'skill' && !!move.near);
export function deal(room) {
  const order = Object.keys(room.players || {}).sort((x, y) => (room.players[x].joinedAt || 0) - (room.players[y].joinedAt || 0));
  if (order.length < 6 || order.length > 8) throw new Error('자객 마피아는 6~8명이에요');
  const rounds = Math.min(10, Math.max(3, Number(room?.options?.rounds) || 3));
  const base = { order, host: room.hostId || order[0], rounds, round: 0, scores: Object.fromEntries(order.map((u) => [u, 0])), history: [], pastMafia: [], chat: [], last: null };
  return newRound(base, 1);
}
export function split(full) {
  const { pastMafia, shoutAt, roles, used, mskill, eyeAt, counter, revive, policeHit, guess, lastTally, revived, probes, ...pub } = full;
  const open = ['result', 'done'].includes(full.phase);
  if (!open) { pub.mafia = null; pub.mission = null; pub.lastKill = 0; pub.kills = []; }
  if (full.phase === 'hunt') { // 불이 꺼진 동안 새로 쓰러진 사람은 비밀 (이미 회의에서 드러난 사람만 공개)
    pub.dead = Object.fromEntries(Object.entries(full.dead || {}).filter(([u]) => full.reported?.[u]));
  }
  pub.siren = null;
  if (pub.scare && Date.now() - pub.scare.at > 4000) pub.scare = null;
  const mine = Object.fromEntries(full.order.map((u) => {
    const isM = u === full.mafia;
    const role = (roles || {})[u] || null;
    return [u, {
      mafia: isM,
      role,
      used: !!(used || {})[u],
      mskill: isM ? mskill || null : null,
      eyeAt: isM ? eyeAt || 0 : 0,
      mission: isM ? full.mission : null,
      dead: isM && full.phase === 'hunt' ? full.dead : null,
      deadMe: (full.dead || {})[u] || null,
      lastKill: isM ? full.lastKill || 0 : 0,
      counter: counter && (counter.mafia === u || counter.target === u) ? counter : null,
      revive: revive && (revive.by === u || revive.target === u) ? revive : null,
      policeHit: role === 'police' ? policeHit || null : null,
      guess: guess && guess.by === u ? guess : null,
      revived: revived && revived.uid === u ? revived : null,
      probe: (probes || {})[u] || null,
      spec: (full.dead || {})[u]?.reaper || (full.outs || {})[u] ? { roles: roles || {}, dead: full.dead || {}, mafia: full.mafia } : null, // 관전: 투표로 쫓겨났거나 사신에게 당한(살릴 수 없는) 사람만
      round: full.round, // 라운드가 바뀌면 지난 비밀은 무시해요
    }];
  }));
  return { pub, mine };
}
