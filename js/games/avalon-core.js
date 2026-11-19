// 아발론 규칙 (순수 함수) — 서버(/api/game)와 테스트 모드가 함께 써요. 화면 코드는 avalon.js.
// 비밀(역할·진행 중인 투표·원정 카드)은 서버만 알고, 방 문서에는 공개 정보만 저장해요.
export const SIZES = {
  5: [2, 3, 2, 3, 3], 6: [2, 3, 4, 3, 4], 7: [2, 3, 3, 4, 4],
  8: [3, 4, 4, 5, 5], 9: [3, 4, 4, 5, 5], 10: [3, 4, 4, 5, 5],
};
export const EVIL_COUNT = { 5: 2, 6: 2, 7: 3, 8: 3, 9: 3, 10: 4 };
export const failsNeeded = (n, q) => (n >= 7 && q === 3 ? 2 : 1); // 7명 이상 4번째 원정은 실패 2장 필요
export const WIN_GARNETS = 2;

export const ROLES = {
  merlin: { name: '멀린', team: 'good', icon: '🧙', desc: '악 팀이 누구인지 알아요 (모드레드 빼고). 하지만 들키면 암살당해요!' },
  percival: { name: '퍼시벌', team: 'good', icon: '🛡️', desc: '멀린과 모르가나 두 사람을 알지만, 누가 진짜 멀린인지는 몰라요.' },
  servant: { name: '아서의 충신', team: 'good', icon: '⚔️', desc: '아무 정보도 없어요. 대화와 투표로 악 팀을 찾아내세요.' },
  assassin: { name: '암살자', team: 'evil', icon: '🗡️', desc: '악 팀 동료를 알아요. 정의 팀이 원정 3번을 성공하면 멀린을 지목해 암살할 수 있어요.' },
  morgana: { name: '모르가나', team: 'evil', icon: '🔮', desc: '악 팀 동료를 알아요. 퍼시벌에게는 멀린처럼 보여요.' },
  mordred: { name: '모드레드', team: 'evil', icon: '👑', desc: '악 팀 동료를 알아요. 멀린도 모드레드가 악 팀인 걸 몰라요.' },
  oberon: { name: '오베론', team: 'evil', icon: '🌑', desc: '악 팀이지만 동료를 모르고, 동료들도 오베론을 몰라요.' },
  minion: { name: '모드레드의 하수인', team: 'evil', icon: '💀', desc: '악 팀 동료를 알아요. 원정을 몰래 실패시키세요.' },
};
export const ROLE_SETS = ['기본 (멀린·암살자)', '퍼시벌·모르가나 추가', '+ 모드레드', '+ 모드레드·오베론'];

const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

export function dealRoles(order, setName) {
  const n = order.length;
  const evilN = EVIL_COUNT[n];
  const lvl = Math.max(0, ROLE_SETS.indexOf(setName));
  const evil = ['assassin'];
  const good = ['merlin'];
  if (lvl >= 1) { good.push('percival'); evil.push('morgana'); }
  if (lvl >= 2) evil.push('mordred');
  if (lvl >= 3) evil.push('oberon');
  const evilRoles = evil.slice(0, evilN);
  while (evilRoles.length < evilN) evilRoles.push('minion');
  const goodRoles = good.slice(0, n - evilN);
  while (goodRoles.length < n - evilN) goodRoles.push('servant');
  const deck = shuffle([...evilRoles, ...goodRoles]);
  return Object.fromEntries(order.map((u, i) => [u, deck[i]]));
}
// 내가 아는 정보
export function knowledge(roles, me) {
  const r = roles[me];
  const others = Object.keys(roles).filter((u) => u !== me);
  if (r === 'merlin') return { label: '악 팀', who: others.filter((u) => ROLES[roles[u]].team === 'evil' && roles[u] !== 'mordred') };
  if (r === 'percival') return { label: '멀린 또는 모르가나', who: others.filter((u) => ['merlin', 'morgana'].includes(roles[u])) };
  if (ROLES[r].team === 'evil' && r !== 'oberon') return { label: '악 팀 동료', who: others.filter((u) => ROLES[roles[u]].team === 'evil' && roles[u] !== 'oberon') };
  return { label: '', who: [] };
}

function endGame(s, winner, how, players) {
  s.phase = 'done';
  s.winner = winner;
  s.how = how;
  const ranking = s.order.map((uid) => {
    const win = ROLES[s.roles[uid]].team === winner;
    return { uid, score: win ? 1 : 0, place: win ? 1 : 2, garnets: win ? WIN_GARNETS : 0 };
  });
  return {
    message: winner === 'good' ? '⚔️ 정의 팀 승리!' : '🗡️ 악 팀 승리!',
    winners: ranking.filter((r) => r.place === 1).map((r) => r.uid),
    ranking,
    rewards: Object.fromEntries(ranking.map((r) => [r.uid, r.garnets])),
  };
}
const nextLeader = (s) => s.order[(s.order.indexOf(s.leader) + 1) % s.order.length];

export function applyMove(state, move, uid, players) {
  const s = JSON.parse(JSON.stringify(state));
  const n = s.order.length;
  const t = move?.type;
  if (!s.order.includes(uid)) throw new Error('참가자가 아니에요');
  if (t === 'seen') {
    if (s.phase !== 'role') throw new Error('__noop');
    s.seen[uid] = true;
    if (s.order.every((u) => s.seen[u])) { s.phase = 'propose'; s.turnNo += 1; }
    return { state: s };
  }
  if (t === 'propose') {
    if (s.phase !== 'propose') throw new Error('지금은 원정대를 고를 때가 아니에요');
    if (uid !== s.leader) throw new Error('대표만 원정대를 고를 수 있어요');
    const team = [...new Set(move.team || [])].filter((u) => s.order.includes(u));
    const need = SIZES[n][s.quest];
    if (team.length !== need) throw new Error(`원정대는 ${need}명이에요 (지금 ${team.length}명)`);
    s.team = team;
    s.votes = {};
    s.phase = 'vote';
    s.turnNo += 1;
    return { state: s };
  }
  if (t === 'vote') {
    if (s.phase !== 'vote') throw new Error('지금은 투표할 때가 아니에요');
    s.votes[uid] = !!move.ok;
    if (!s.order.every((u) => u in s.votes)) return { state: s };
    const yes = s.order.filter((u) => s.votes[u]).length;
    const pass = yes * 2 > n;
    s.lastVote = { quest: s.quest, leader: s.leader, team: s.team, votes: s.votes, pass, at: Date.now() };
    s.history.push({ kind: 'vote', ...s.lastVote });
    if (pass) { s.phase = 'quest'; s.plays = {}; s.rejects = 0; }
    else {
      s.rejects += 1;
      if (s.rejects >= 5) return { state: s, result: endGame(s, 'evil', 'rejects', players) };
      s.leader = nextLeader(s);
      s.team = [];
      s.phase = 'propose';
    }
    s.turnNo += 1;
    return { state: s };
  }
  if (t === 'play') {
    if (s.phase !== 'quest') throw new Error('지금은 원정 카드를 낼 때가 아니에요');
    if (!s.team.includes(uid)) throw new Error('원정대만 카드를 낼 수 있어요');
    if (uid in s.plays) throw new Error('이미 냈어요');
    const fail = !!move.fail;
    if (fail && ROLES[s.roles[uid]].team === 'good') throw new Error('정의 팀은 성공 카드만 낼 수 있어요');
    s.plays[uid] = fail;
    if (!s.team.every((u) => u in s.plays)) return { state: s };
    const fails = Object.values(s.plays).filter(Boolean).length;
    const ok = fails < failsNeeded(n, s.quest);
    s.results.push(ok);
    s.lastQuest = { quest: s.quest, team: s.team, fails, ok, at: Date.now() };
    s.history.push({ kind: 'quest', ...s.lastQuest });
    s.plays = {};
    const wins = s.results.filter(Boolean).length, losses = s.results.length - wins;
    if (losses >= 3) return { state: s, result: endGame(s, 'evil', 'quests', players) };
    if (wins >= 3) { s.phase = 'assassin'; s.turnNo += 1; return { state: s }; }
    s.quest += 1;
    s.leader = nextLeader(s);
    s.team = [];
    s.phase = 'propose';
    s.turnNo += 1;
    return { state: s };
  }
  if (t === 'chat') {
    const text = String(move.text || '').trim().slice(0, 60);
    if (!text) throw new Error('__noop');
    s.chat = [...(s.chat || []), { u: uid, text, at: Date.now() }].slice(-40);
    return { state: s };
  }
  if (t === 'assassinate') {
    if (s.phase !== 'assassin') throw new Error('__noop');
    if (s.roles[uid] !== 'assassin') throw new Error('암살자만 지목할 수 있어요');
    const tg = move.target;
    if (!s.order.includes(tg) || tg === uid) throw new Error('다른 사람을 골라 주세요'); // 누구든 지목 가능 (정의 팀만 고를 수 있게 하면 오베론이 드러나요)
    s.target = tg;
    const hit = s.roles[tg] === 'merlin';
    return { state: s, result: endGame(s, hit ? 'evil' : 'good', hit ? 'assassin' : 'quests', players) };
  }
  throw new Error('알 수 없는 동작이에요');
}

// ── 서버 진행용 ──
// 게임 시작(서버): 역할을 나눠 주고 처음 상태를 만들어요. 순서는 방 참가자 명단에서 서버가 정해요.
export function deal(room) {
  const order = shuffle(Object.keys(room.players || {}));
  if (order.length < 5 || order.length > 10) throw new Error('아발론은 5~10명이에요');
  const roles = dealRoles(order, room?.options?.roles || ROLE_SETS[1]);
  return {
    order, roles, phase: 'role', seen: {}, quest: 0, results: [], leader: order[0], team: [], votes: {}, rejects: 0,
    plays: {}, lastVote: null, lastQuest: null, turnNo: 1, history: [], target: null, chat: [],
  };
}
// 전체 상태 → 공개 상태 + 서버 비밀 + 사람별 비밀
export function split(full) {
  const { roles, votes, plays, ...pub } = full;
  const done = full.phase === 'done';
  pub.voted = Object.fromEntries(Object.keys(votes || {}).map((u) => [u, true])); // 누가 투표했는지만
  pub.played = Object.fromEntries(Object.keys(plays || {}).map((u) => [u, true])); // 누가 카드를 냈는지만
  if (done) pub.roles = roles; // 끝나면 모두 공개
  const mine = Object.fromEntries(full.order.map((u) => [u, { role: roles[u], know: knowledge(roles, u), vote: u in (votes || {}) ? votes[u] : null }]));
  return { pub, server: { roles, votes: votes || {}, plays: plays || {} }, mine };
}
export function merge(pub, server) {
  const { voted, played, ...rest } = pub;
  return { ...rest, roles: server.roles, votes: server.votes || {}, plays: server.plays || {} };
}
