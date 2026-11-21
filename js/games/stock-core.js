// 폭풍의 증권시장 규칙 (순수 함수) — 서버(/api/game)와 테스트 모드가 함께 써요. 화면 코드는 stock.js.
// 서버만 아는 것: 봉투 속 주가 변동 정보, 모두의 현금·주식, 남은 주식 수, 1:1 대화, 정보교환소 대화·봉투 선택.
// 각자는 자기 지갑·받은 정보·자기 대화만, 남은 주식 수는 거래소 안에 있을 때만 받아요.
export const COMPANIES = [
  { name: '태양전자', emoji: '☀️', color: '#ffb02e' },
  { name: '한강건설', emoji: '🏗️', color: '#3d7bff' },
  { name: '은하제약', emoji: '💊', color: '#b26bff' },
  { name: '청해해운', emoji: '🚢', color: '#2ee6d6' },
  { name: '별빛통신', emoji: '📡', color: '#ff4f6e' },
];
export const START_CASH = 10000;
export const START_PRICE = 2000;
export const MAX_HOLD = 7;
export const TICKS = 12;            // 라운드당 주가 변동 횟수 (게임 시각 5분 × 12 = 60분)
export const TICK_MS = 60000;       // 게임 시각 5분 = 실제 1분 (라운드당 12분)
export const XCALL_MS = 30000;      // 정보교환소: 차례가 되면 30초 안에 둘 다 입장
export const XSTAY_MS = 20000;      // 정보교환소에 머무는 시간 (봉투 고르기)
export const WINDOWS = 1;           // 거래소 창구 수
export const CALL_MS = 10000;       // 번호가 불리면 10초 안에 입장
export const STAY_MS = 30000;       // 거래소에 머무는 시간
export const TALK = 125;            // 이만큼 가까우면 '대화하기'
export const W = 1000, H = 700, R = 50;
export const DOOR = { x: 500, y: 175 };
export const KIOSK = { x: 208, y: 628 };
export const XCHG = { x: 222, y: 330 };
export const NEAR = 95;
export const SPEED = 260;
export const SEND_MS = 100;
export const rewardsFor = (n) => (n <= 5 ? [3, 2, 1] : [5, 4, 4, 3, 2, 1]);
export const supplyFor = (n) => Math.max(10, 2 * n - 1); // 8명 = 15주 (원작과 같음)

export const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const won = (n) => `${Number(n).toLocaleString('ko-KR')}원`;
export const clockOf = (round, tick) => (tick >= TICKS ? `${round + 1}:00` : `${round}:${String(tick * 5).padStart(2, '0')}`);

// ── 라운드 정보 만들기: 사람 수 × 3개, 이웃 둘이 3개씩 함께 받음 ──
export function makeEvents(prices, n) {
  const cells = shuffle(Array.from({ length: TICKS * COMPANIES.length }, (_, i) => ({ t: Math.floor(i / COMPANIES.length) + 1, c: i % COMPANIES.length }))).slice(0, 3 * n);
  const deltas = [100, 200, 300, 300, 400, 400, 500, 500, 600, 700, 800, 1000];
  const evs = cells.map((x) => ({ ...x, d: deltas[Math.floor(Math.random() * deltas.length)] * (Math.random() < 0.5 ? -1 : 1) }));
  // 주가가 200원 아래로 떨어지지 않게 시간 순서대로 확인하며 부호 조정
  const p = [...prices];
  [...evs].sort((a, b) => a.t - b.t).forEach((e) => { if (p[e.c] + e.d < 200) e.d = Math.abs(e.d); p[e.c] += e.d; });
  return shuffle(evs);
}
export function dealInfo(state, round, now) {
  const n = state.order.length;
  const events = makeEvents(state.prices, n); // 이미 고르게 섞여 있음
  const info = events.map((e, i) => ({ ...e, env: Math.floor(i / 3), pair: null }));
  return { ...state, round, phase: 'info', info, taken: [], tick: 0, nextAt: 0, deadline: 0, ready: {}, queue: [], windows: Array(WINDOWS).fill(null), notes: [], xchg: newXchg(state, 0, now) };
}
// k번째 차례: 순서 k+1번, k+2번 (마지막은 n번과 1번)
export function newXchg(state, k, now) {
  const n = state.order.length;
  // hard: 나갔다 들어오기를 반복해도 이 시각이 지나면 무조건 봉투가 정해져요 (진행이 멈추지 않게)
  return { k, pair: [state.seats[k], state.seats[(k + 1) % n]], in: {}, pick: {}, callUntil: now + XCALL_MS, until: 0, hard: now + XCALL_MS + XSTAY_MS + 15000 };
}
export function giveEnvelope(s, env, now, note) {
  const x = s.xchg;
  const info = s.info.map((e) => (e.env === env ? { ...e, pair: x.pair } : e));
  const taken = [...s.taken, env];
  const notes = note ? [...s.notes, { at: now, text: note }].slice(-5) : s.notes;
  const k = x.k + 1;
  const got = { at: now, env, pair: x.pair };
  if (k >= s.order.length) return startMarket({ ...s, info, taken, notes, xchg: null, lastGot: got }, now);
  return { ...s, info, taken, notes, xchg: newXchg(s, k, now), lastGot: got };
}
export const freeEnvs = (s) => Array.from({ length: s.order.length }, (_, i) => i).filter((i) => !s.taken.includes(i));

// 시간이 지나면 처리할 것들: 주가 변동, 창구 시간 초과, 다음 번호 부르기
export function advance(state, now, players) {
  let s = state;
  if (s.phase === 'info' && s.xchg) {
    const x = s.xchg;
    const free = freeEnvs(s);
    const rnd = () => free[Math.floor(Math.random() * free.length)];
    if (x.hard && now > x.hard && !(x.until && now <= x.until)) {
      const picks = Object.values(x.pick).filter((e) => free.includes(e));
      s = giveEnvelope(s, picks.length ? picks[Math.floor(Math.random() * picks.length)] : rnd(), now, '정보교환 시간이 다 되어 봉투가 정해졌어요');
    } else if (x.until && now > x.until) {
      const picks = Object.values(x.pick).filter((e) => free.includes(e));
      s = giveEnvelope(s, picks.length ? picks[Math.floor(Math.random() * picks.length)] : rnd(), now, '시간이 다 되어 봉투가 정해졌어요');
    } else if (!x.until && now > x.callUntil) {
      s = giveEnvelope(s, rnd(), now, '정보교환소에 제때 오지 않아 무작위 봉투가 배정됐어요');
    }
  }
  if (s.phase === 'market') {
    const prices = [...s.prices];
    const hist = s.hist.map((h) => [...h]);
    let tick = s.tick, nextAt = s.nextAt, changed = false;
    while (tick < TICKS && now >= nextAt) {
      tick += 1; nextAt += TICK_MS; changed = true;
      s.info.filter((e) => e.t === tick).forEach((e) => { prices[e.c] = Math.max(100, prices[e.c] + e.d); });
      prices.forEach((p, c) => hist[c].push(p));
    }
    if (changed) s = { ...s, prices, hist, tick, nextAt };
    if (s.tick >= TICKS) return endRound(s, now, players);
    // 창구: 호출 시간 초과(부재) · 거래 시간 초과
    let windows = s.windows.map((w) => {
      if (!w) return null;
      if (now > w.until) return null;
      return w;
    });
    const skipped = s.windows.filter((w, i) => w && !windows[i] && w.st === 'call').map((w) => w.no);
    let queue = [...s.queue];
    windows = windows.map((w) => {
      if (w || !queue.length) return w;
      const q = queue.shift();
      return { uid: q.uid, no: q.no, st: 'call', until: now + CALL_MS, at: now };
    });
    const notes = skipped.length ? [...s.notes, ...skipped.map((no) => ({ at: now, text: `${no}번 고객님이 오지 않아 다음 번호로 넘어갔어요` }))].slice(-5) : s.notes;
    const same = !changed && queue.length === s.queue.length && windows.every((w, i) => w === s.windows[i]) && notes === s.notes;
    if (!same) s = { ...s, windows, queue, notes };
  }
  return { state: s };
}
export function startMarket(s, now) {
  return { ...s, phase: 'market', tick: 0, nextAt: now + TICK_MS, ready: {}, deadline: 0, xchg: null, marketAt: now, notes: [] };
}
export function endRound(s, now, players) {
  const done = { ...s, windows: Array(WINDOWS).fill(null), queue: [], history: [...s.history, { round: s.round, info: s.info }] };
  if (s.round >= 2) {
    // 정산: 보유 주식을 마지막 주가로 현금화
    const finalCash = {};
    s.order.forEach((u) => { finalCash[u] = s.cash[u] + s.hold[u].reduce((a, q, c) => a + q * s.prices[c], 0); });
    const end = { ...done, phase: 'done', finalCash };
    return { state: end, result: finalResult(end, players) };
  }
  return { state: dealInfo(done, s.round + 1, now) };
}
export function finalResult(state, players) {
  const rewards = rewardsFor(state.order.length);
  const ranking = state.order
    .map((uid) => ({ uid, score: state.finalCash[uid] }))
    .sort((a, b) => b.score - a.score)
    .map((r, _, all) => { const place = 1 + all.filter((o) => o.score > r.score).length; return { ...r, place, garnets: rewards[place - 1] || 0 }; });
  const top = ranking.filter((r) => r.place === 1).map((r) => players[r.uid]?.name || '?');
  return {
    message: `${top.join(', ')}님 1등! 📈`,
    winners: ranking.filter((r) => r.place === 1).map((r) => r.uid),
    ranking,
    rewards: Object.fromEntries(ranking.map((r) => [r.uid, r.garnets])),
  };
}
export const totalOf = (s, u) => s.cash[u] + s.hold[u].reduce((a, q, c) => a + q * s.prices[c], 0);
export const myWindow = (s, u) => s.windows.findIndex((w) => w && w.uid === u);

export function applyMove(state, move, uid, players) {
  const now = Date.now();
  const t = move?.type;
  if (t !== 'tick' && !state.order.includes(uid)) throw new Error('참가자가 아니에요');
  // 먼저 시간 흐름 반영
  const adv = advance(state, now, players);
  if (adv.result) return adv;
  let s = adv.state;

  if (t === 'tick') {
    if (s === state) throw new Error('__noop');
    return { state: s };
  }
  if (t === 'chat') {
    const text = String(move.text || '').trim().slice(0, 60);
    if (!text) throw new Error('__noop');
    return { state: { ...s, chat: [...(s.chat || []), { u: uid, text, at: now }].slice(-30) } };
  }
  if (t === 'dm') {
    const to = move.to;
    const text = String(move.text || '').trim().slice(0, 80);
    if (!text) throw new Error('__noop');
    if (!s.order.includes(to) || to === uid) throw new Error('대화할 수 없는 사람이에요');
    const k = [uid, to].sort().join('|');
    return { state: { ...s, dms: { ...(s.dms || {}), [k]: [...((s.dms || {})[k] || []), { u: uid, text, at: now }].slice(-40) } } };
  }
  if (t === 'xenter') {
    const x = s.xchg;
    if (s.phase !== 'info' || !x) throw new Error('지금은 정보교환소에 들어갈 수 없어요');
    if (!x.pair.includes(uid)) throw new Error('지금은 다른 사람 차례예요');
    if (x.in[uid]) throw new Error('__noop');
    const inn = { ...x.in, [uid]: true };
    const both = x.pair.every((u) => inn[u]);
    return { state: { ...s, xchg: { ...x, in: inn, until: both ? now + XSTAY_MS : 0 } } };
  }
  if (t === 'xchat') {
    const x = s.xchg;
    const text = String(move.text || '').trim().slice(0, 80);
    if (!text) throw new Error('__noop');
    if (s.phase !== 'info' || !x || !x.in[uid]) throw new Error('정보교환소 안에서만 쓸 수 있어요');
    return { state: { ...s, xchg: { ...x, chat: [...(x.chat || []), { u: uid, text, at: now }].slice(-30) } } };
  }
  if (t === 'xleave') {
    const x = s.xchg;
    if (s.phase !== 'info' || !x || !x.in[uid]) throw new Error('__noop');
    const inn = { ...x.in, [uid]: false };
    const pick = { ...x.pick };
    delete pick[uid];
    // 한 명이라도 나가면 대화는 리셋, 20초도 멈추고 다시 둘 다 들어와야 해요 (최소 15초 기다려 줌)
    return { state: { ...s, xchg: { ...x, in: inn, pick, chat: [], until: 0, callUntil: Math.min(x.hard || Infinity, Math.max(x.callUntil, now + 15000)) } } };
  }
  if (t === 'xpick') {
    const x = s.xchg;
    if (s.phase !== 'info' || !x || !x.pair.includes(uid) || !x.in[uid]) throw new Error('__noop');
    if (!x.until) throw new Error('두 사람이 모두 들어와야 봉투를 고를 수 있어요');
    const env = Number(move.env);
    if (!freeEnvs(s).includes(env)) throw new Error('이미 가져간 봉투예요');
    const pick = { ...x.pick, [uid]: env };
    if (x.pair.every((u) => pick[u] === env)) return { state: giveEnvelope(s, env, now) };
    return { state: { ...s, xchg: { ...x, pick } } };
  }
  if (t === 'ticket') {
    if (s.phase !== 'market') throw new Error('지금은 번호표를 뽑을 수 없어요');
    if (s.queue.some((q) => q.uid === uid) || myWindow(s, uid) >= 0) throw new Error('이미 번호표가 있어요');
    const queue = [...s.queue, { uid, no: s.nextNo }];
    return advance({ ...s, queue, nextNo: s.nextNo + 1 }, now, players);
  }
  if (t === 'enter') {
    const wi = myWindow(s, uid);
    if (wi < 0 || s.windows[wi].st !== 'call') throw new Error('아직 내 번호가 불리지 않았어요');
    const windows = s.windows.map((w, i) => (i === wi ? { ...w, st: 'in', until: now + STAY_MS } : w));
    return { state: { ...s, windows } };
  }
  if (t === 'leave') {
    const wi = myWindow(s, uid);
    if (wi < 0) throw new Error('__noop');
    const windows = s.windows.map((w, i) => (i === wi ? null : w));
    return advance({ ...s, windows }, now, players);
  }
  if (t === 'trade') {
    if (s.phase !== 'market') throw new Error('장이 열려 있지 않아요');
    const wi = myWindow(s, uid);
    if (wi < 0 || s.windows[wi].st !== 'in') throw new Error('거래소 안에서만 사고팔 수 있어요');
    const c = Number(move.c);
    if (!Number.isInteger(c) || c < 0 || c >= COMPANIES.length) throw new Error('__noop');
    if (!Number.isFinite(Number(move.q))) throw new Error('__noop');
    const price = s.prices[c];
    const hold = { ...s.hold, [uid]: [...s.hold[uid]] };
    const stock = [...s.stock];
    const cash = { ...s.cash };
    let q = Math.trunc(Number(move.q) || 0);
    if (q > 0) {
      if (stock[c] < q) throw new Error('남은 주식이 없어요');
      if (hold[uid][c] + q > MAX_HOLD) throw new Error(`한 회사 주식은 최대 ${MAX_HOLD}주까지 가질 수 있어요`);
      if (cash[uid] < price * q) throw new Error('현금이 부족해요');
      stock[c] -= q; hold[uid][c] += q; cash[uid] -= price * q;
    } else if (q < 0) {
      q = Math.max(q, -hold[uid][c]);
      if (!q) throw new Error('팔 주식이 없어요');
      stock[c] -= q; hold[uid][c] += q; cash[uid] -= price * q;
    } else throw new Error('__noop');
    return { state: { ...s, stock, hold, cash } };
  }
  throw new Error('알 수 없는 동작이에요');
}

// ── 서버 진행용 ──
export function deal(room) {
  const players = Object.keys(room.players || {}).sort((x, y) => (room.players[x].joinedAt || 0) - (room.players[y].joinedAt || 0)).map((uid) => ({ uid }));
  if (players.length < 4 || players.length > 8) throw new Error('폭풍의 증권시장은 4~8명이에요');
  return setupState(players, room);
}
function setupState(players, room) {
    const order = players.map((p) => p.uid);
    const n = order.length;
    const spawn = {};
    order.forEach((u, i) => { spawn[u] = { x: 380 + (i % 4) * 150, y: 470 + Math.floor(i / 4) * 110 }; });
    const base = {
      order, seats: shuffle(order), round: 1, phase: 'info', ready: {}, deadline: 0,
      prices: COMPANIES.map(() => START_PRICE), hist: COMPANIES.map(() => [START_PRICE]), stock: COMPANIES.map(() => supplyFor(n)),
      cash: Object.fromEntries(order.map((u) => [u, START_CASH])), hold: Object.fromEntries(order.map((u) => [u, COMPANIES.map(() => 0)])),
      tick: 0, nextAt: 0, queue: [], nextNo: 1, windows: Array(WINDOWS).fill(null), notes: [], info: [], history: [], chat: [], spawn,
    };
    return dealInfo(base, 1, Date.now());
  }
export function split(full) {
  const { info, cash, hold, stock, dms, ...pub } = full;
  const done = full.phase === 'done';
  if (done) { pub.cash = cash; pub.hold = hold; } // 끝나면 모두 공개
  pub.info = [];
  if (!done) pub.history = (full.history || []).map((h) => ({ round: h.round })); // 지난 라운드 봉투·받은 사람은 게임이 끝나야 공개
  const x = full.xchg;
  if (x) { const { chat, pick, ...xp } = x; pub.xchg = { ...xp, picked: Object.keys(pick || {}).length }; }
  const mine = Object.fromEntries(full.order.map((u) => {
    const inEx = full.windows.some((w) => w && w.uid === u && w.st === 'in');
    const pair = x && x.pair.includes(u);
    return [u, {
      cash: cash[u], hold: hold[u],
      info: (info || []).filter((e) => e.pair && e.pair.includes(u)),
      dms: Object.fromEntries(Object.entries(dms || {}).filter(([k]) => k.split('|').includes(u))),
      xchat: pair ? x.chat || [] : null,
      xpick: pair ? x.pick || {} : null,
      xk: pair ? x.k : null,
      stock: inEx ? stock : null, // 남은 주식 수는 거래소 안에서만
      round: full.round,
    }];
  }));
  return { pub, mine };
}
