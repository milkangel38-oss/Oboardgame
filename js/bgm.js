// 시작 화면 BGM — O게임 오리지널 "먼 길 떠나는 날" (Web Audio로 직접 만든 소리, 음원 파일 없음)
// 통기타 핑거피킹(엄지가 저음을 번갈아 치고 손가락이 고음을 뜯는 주법) + 리드 기타 멜로디 + 낮은 베이스 + 셰이커
// 쓸쓸하지만 앞으로 나아가는 개척지 분위기. 기타 소리는 줄을 튕기는 원리(카플러스-스트롱)로 직접 만들어요.
// 브라우저 정책상 사용자가 화면을 한 번 눌러야 소리가 나요.

const PREF_KEY = 'og:bgm';
let ctx = null;
let master = null;
let bus = null; // 기타 몸통 · 리버브로 가는 길
let timer = null;
let step = 0;
let nextTime = 0;

const E8 = 0.27; // 8분음표 길이(초) — 약 111 BPM
const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);

// 코드: 저음(엄지), 번갈이 저음, 고음 세 줄
const CH = {
  Em: { b: 40, a: 47, t: [55, 59, 64] },
  C: { b: 48, a: 43, t: [55, 60, 64] },
  G: { b: 43, a: 50, t: [55, 59, 62] },
  D: { b: 50, a: 45, t: [57, 62, 66] },
  Am: { b: 45, a: 52, t: [57, 60, 64] },
  B7: { b: 47, a: 54, t: [57, 59, 63] },
};
// 한 마디 = 8분음표 8개. 반 마디씩 코드가 바뀌는 곳은 [앞, 뒤]
const VERSE = ['Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'B7'];
const CHORUS = ['C', 'G', 'D', 'Em', 'C', 'G', ['Am', 'B7'], 'Em'];
const _ = null;
const MEL = [ // 후렴 멜로디 (마디마다 8분음표 8개)
  [64, _, 67, _, 72, 71, 69, 67],
  [67, _, _, _, 62, 64, 67, _],
  [66, _, 69, _, 74, 72, 71, 69],
  [71, _, _, _, _, _, 67, 69],
  [72, _, 71, _, 69, _, 67, _],
  [71, _, 67, _, 62, _, 64, 67],
  [69, _, 72, _, 71, _, 75, _],
  [76, _, _, _, 71, _, _, _],
];
const VMEL = [ // 두 번째 절에 살짝 얹는 짧은 응답 멜로디
  [_, _, _, _, 71, _, 67, _], [_, _, _, _, 72, _, 71, _], [_, _, _, _, 74, _, 71, _], [_, _, _, _, 69, _, 66, _],
  [_, _, _, _, 71, _, 67, _], [_, _, _, _, 72, _, 76, _], [_, _, _, _, 72, _, 71, _], [_, _, _, _, 71, _, 66, _],
];
// 곡 구성: 절(기타만) → 절(응답 멜로디) → 후렴 → 후렴(멜로디 + 베이스 · 셰이커) … 반복
const FORM = [['v', 0], ['v', 1], ['c', 0], ['c', 1]];
const BARS = 8, STEPS = BARS * 8;

export const bgmWanted = () => { try { return localStorage.getItem(PREF_KEY) === 'on'; } catch { return false; } };
const savePref = (on) => { try { localStorage.setItem(PREF_KEY, on ? 'on' : 'off'); } catch {} };
export const bgmPlaying = () => !!timer;

// ── 줄 튕기는 소리 만들기 (한 번 만든 소리는 저장해 두고 다시 써요) ──
const cache = new Map();
function pluckBuf(m, bright) {
  const key = m + ':' + bright;
  if (cache.has(key)) return cache.get(key);
  const sr = ctx.sampleRate, f = mf(m);
  const N = Math.max(2, Math.round(sr / f));
  const len = Math.floor(sr * (m < 52 ? 3.2 : 2.4));
  const buf = ctx.createBuffer(1, len, sr), d = buf.getChannelData(0);
  const line = new Float32Array(N);
  // 처음 튕김: 잡음을 살짝 부드럽게 (bright가 낮을수록 손가락 살로 튕긴 둥근 소리)
  let prev = 0;
  for (let i = 0; i < N; i++) { const r = Math.random() * 2 - 1; prev = prev + bright * (r - prev); line[i] = prev; }
  let mean = 0; for (let i = 0; i < N; i++) mean += line[i]; mean /= N; for (let i = 0; i < N; i++) line[i] -= mean;
  const decay = m < 52 ? 0.9965 : 0.9952;
  let idx = 0, last = line[N - 1];
  for (let i = 0; i < len; i++) {
    const cur = line[idx];
    const nv = decay * 0.5 * (cur + last);
    last = cur; line[idx] = nv; d[i] = cur;
    idx = idx + 1 === N ? 0 : idx + 1;
  }
  let pk = 0; for (let i = 0; i < Math.min(len, N * 8); i++) pk = Math.max(pk, Math.abs(d[i]));
  if (pk > 0) for (let i = 0; i < len; i++) d[i] /= pk;
  const out = { buf, rate: N / (sr / f) }; // 정수 길이 때문에 생긴 음 높이 오차를 재생 속도로 보정
  cache.set(key, out);
  return out;
}

function setup() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  // 기타 몸통 울림
  const body = ctx.createBiquadFilter(); body.type = 'peaking'; body.frequency.value = 115; body.Q.value = 1.1; body.gain.value = 5;
  const air = ctx.createBiquadFilter(); air.type = 'peaking'; air.frequency.value = 2600; air.Q.value = 0.9; air.gain.value = 2.5;
  const soft = ctx.createBiquadFilter(); soft.type = 'highshelf'; soft.frequency.value = 5200; soft.gain.value = -7;
  bus = ctx.createGain();
  bus.connect(body); body.connect(air); air.connect(soft); soft.connect(master);
  // 넓은 방 울림 (직접 만든 잔향)
  const sr = ctx.sampleRate, L = Math.floor(sr * 2.4);
  const ir = ctx.createBuffer(2, L, sr);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < L; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / L, 3.2); }
  const verb = ctx.createConvolver(); verb.buffer = ir;
  const send = ctx.createGain(); send.gain.value = 0.22;
  soft.connect(send); send.connect(verb); verb.connect(master);
  bus.verbIn = verb;
}

function pluck(time, m, vel, pan = 0, bright = 0.5) {
  const { buf, rate } = pluckBuf(m, bright);
  const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = vel;
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  s.connect(g);
  if (p) { p.pan.value = pan; g.connect(p); p.connect(bus); } else g.connect(bus);
  s.start(time); s.stop(time + buf.duration);
}

function bassNote(time, m, dur) {
  const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
  o.type = 'triangle'; o.frequency.value = mf(m - 12);
  lp.type = 'lowpass'; lp.frequency.value = 300;
  g.gain.setValueAtTime(0.0001, time); g.gain.exponentialRampToValueAtTime(0.16, time + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  o.connect(lp); lp.connect(g); g.connect(master);
  o.start(time); o.stop(time + dur + 0.05);
}

let noiseBuf = null;
function shaker(time, vel) {
  if (!noiseBuf) { const L = Math.floor(ctx.sampleRate * 0.12); noiseBuf = ctx.createBuffer(1, L, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < L; i++) d[i] = Math.random() * 2 - 1; }
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 7000; hp.Q.value = 0.8;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time); g.gain.exponentialRampToValueAtTime(vel, time + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);
  s.connect(hp); hp.connect(g); g.connect(master);
  s.start(time); s.stop(time + 0.12);
}

const hum = () => (Math.random() - 0.5) * 0.012; // 사람 손처럼 살짝 어긋나게

function playStep(time, k) {
  const sec = FORM[Math.floor(k / STEPS) % FORM.length];
  const inSec = k % STEPS, bar = Math.floor(inSec / 8), e = inSec % 8;
  const prog = sec[0] === 'v' ? VERSE : CHORUS;
  const cell = prog[bar];
  const ch = CH[Array.isArray(cell) ? cell[e < 4 ? 0 : 1] : cell];
  const strong = sec[0] === 'c';
  // 엄지: 저음 ↔ 번갈이 저음 (박마다)
  if (e % 2 === 0) {
    const m = e === 0 || e === 4 ? ch.b : ch.a;
    pluck(time + hum(), m, (e === 0 ? 0.62 : 0.5) * (strong ? 1 : 0.92), -0.12, 0.35);
  }
  // 손가락: 고음 (박 사이)
  const PAT = [2, 1, _, 2, 0, 1, _, 2];
  const PAT2 = [_, 1, _, 2, _, 0, _, 1];
  const ti = e % 2 === 0 ? PAT[e] : PAT2[e];
  if (ti !== _ && ti !== undefined) pluck(time + hum() + 0.006, ch.t[ti], (e === 0 ? 0.34 : 0.28) * (strong ? 1.05 : 1), 0.18, 0.55);
  if (e === 0 && (bar % 2 === 0 || strong)) pluck(time + 0.01, ch.t[1], 0.2, 0.22, 0.5); // 첫 박 꼬집기
  // 멜로디
  const mel = sec[0] === 'c' ? MEL : (sec[1] === 1 ? VMEL : null);
  const n = mel?.[bar]?.[e];
  if (n != null) {
    pluck(time + hum(), n, sec[0] === 'c' ? 0.52 : 0.36, 0.32, 0.62);
    if (sec[0] === 'c' && sec[1] === 1) pluck(time + 0.018, n - 12, 0.22, -0.3, 0.5); // 두 번째 후렴은 옥타브 겹치기
  }
  // 베이스 · 셰이커 (두 번째 후렴부터 살짝 더 힘 있게)
  if (strong && sec[1] === 1 && (e === 0 || e === 4)) bassNote(time, e === 0 ? ch.b : ch.a, E8 * 3.6);
  if (strong || sec[1] === 1) shaker(time + 0.004, e % 2 ? 0.05 : 0.025);
}

function schedule() {
  while (nextTime < ctx.currentTime + 0.35) {
    playStep(nextTime, step);
    nextTime += E8 * (step % 2 ? 0.94 : 1.06); // 살짝 튀는 리듬(셔플 조금)
    step++;
  }
}

export async function startBgm() {
  savePref(true);
  if (timer) return;
  if (!ctx) setup();
  if (ctx.state === 'suspended') await ctx.resume();
  step = 0;
  nextTime = ctx.currentTime + 0.25;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0.75, ctx.currentTime + 2); // 서서히 커지기
  timer = setInterval(schedule, 100);
  schedule();
}

export function stopBgm(remember = false) {
  if (remember) savePref(false);
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  const t = ctx.currentTime;
  master.gain.cancelScheduledValues(t);
  master.gain.setValueAtTime(master.gain.value, t);
  master.gain.linearRampToValueAtTime(0, t + 1.2);
}
