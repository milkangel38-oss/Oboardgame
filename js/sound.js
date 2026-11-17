// 게임 중 BGM + 효과음 (띵동 / 삐) — O게임 오리지널, Web Audio로 직접 만든 소리 (음원 파일 없음)
// 음량·음소거 설정은 이 기기에 저장돼요.

const VOL_KEY = 'og:vol';
const MUTE_KEY = 'og:mute';
let ctx = null, master = null, musicBus = null, sfxBus = null;
let timer = null, step = 0, nextTime = 0;
const listeners = new Set();

export function getVolume() { if (typeof localStorage === 'undefined') return 0.5; const v = Number(localStorage.getItem(VOL_KEY)); return Number.isFinite(v) && localStorage.getItem(VOL_KEY) !== null ? v : 0.5; }
export function isMuted() { return localStorage.getItem(MUTE_KEY) === '1'; }
export function setVolume(v) { try { localStorage.setItem(VOL_KEY, String(v)); if (v > 0) localStorage.setItem(MUTE_KEY, '0'); } catch {} apply(); }
export function setMuted(m) { try { localStorage.setItem(MUTE_KEY, m ? '1' : '0'); } catch {} apply(); }
export function onSoundChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.gain.value = 1; musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 1; sfxBus.connect(master);
  apply();
  return ctx;
}
function apply() {
  if (master) master.gain.setTargetAtTime(isMuted() ? 0 : getVolume(), ctx.currentTime, 0.05);
  listeners.forEach((fn) => fn());
}
// 브라우저 정책: 화면을 한 번이라도 누른 뒤에 소리가 나요
const resume = () => { if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); };
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', resume, { capture: true });
  window.addEventListener('keydown', resume, { capture: true });
}

// ── 게임 BGM: 차분하고 고민하는 분위기 (느린 단조, 부드러운 패드 + 잔잔한 아르페지오 + 시계 똑딱) ──
// 코드 진행 Am(add9) → Fmaj7 → Dm7 → E7, 코드마다 2마디, 64 BPM
const BPM = 64;
const S8 = 60 / BPM / 2; // 8분음표 길이
const f = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const CHORDS = [[57, 60, 64, 71], [53, 57, 60, 64], [50, 53, 57, 60], [52, 56, 59, 62]];
const BASS = [33, 29, 26, 28];
const ARP = [0, null, 2, 1, null, 3, 2, null, 1, null, 3, null, 2, 1, null, null]; // 2마디(8분음표 16칸)
const MELODY = [ // 두 번째 바퀴부터 아주 드문드문
  [76, null, null, null, 74, null, 72, null, 71, null, null, null, null, null, null, null],
  [72, null, null, null, 69, null, null, null, 72, null, 71, null, 69, null, null, null],
  [74, null, null, null, 72, null, 69, null, 65, null, null, null, 64, null, null, null],
  [68, null, null, null, 71, null, null, null, 74, null, 72, null, 71, null, null, null],
];
let echo = null;
function ensureEcho() {
  if (echo) return echo;
  echo = ctx.createDelay(2);
  echo.delayTime.value = S8 * 3;
  const fb = ctx.createGain(); fb.gain.value = 0.35;
  const wet = ctx.createGain(); wet.gain.value = 0.4;
  echo.connect(fb); fb.connect(echo); echo.connect(wet); wet.connect(musicBus);
  return echo;
}
function tone(time, freq, dur, type, vol, bus = musicBus, attack = 0.01) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(vol, time + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  o.connect(g); g.connect(bus);
  o.start(time); o.stop(time + dur + 0.05);
  return g;
}
// 부드러운 패드: 살짝 어긋난 두 톱니파를 저역 필터로 감싸서 천천히 커졌다 작아짐
function pad(time, notes, dur) {
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 0.3;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, time);
  g.gain.linearRampToValueAtTime(0.05, time + dur * 0.35);
  g.gain.linearRampToValueAtTime(0.035, time + dur * 0.8);
  g.gain.linearRampToValueAtTime(0.0001, time + dur + 0.6);
  lp.connect(g); g.connect(musicBus);
  notes.forEach((n) => [-4, 4].forEach((cent) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.frequency.value = f(n); o.detune.value = cent;
    o.connect(lp); o.start(time); o.stop(time + dur + 0.7);
  }));
}
// 오르골 같은 맑은 소리 (사인 + 배음)
function pluck(time, midi, vol) {
  const g = tone(time, f(midi), 1.8, 'sine', vol, musicBus, 0.006);
  g.connect(ensureEcho());
  tone(time, f(midi) * 2, 0.6, 'sine', vol * 0.18, musicBus, 0.004);
}
let noiseBuf = null;
function tick(time, hi) { // 시계 똑딱
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource(), g = ctx.createGain(), bp = ctx.createBiquadFilter();
  bp.type = 'bandpass'; bp.frequency.value = hi ? 3200 : 2300; bp.Q.value = 8;
  src.buffer = noiseBuf;
  g.gain.setValueAtTime(0.09, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);
  src.connect(bp); bp.connect(g); g.connect(musicBus);
  src.start(time);
}
function schedule() {
  while (nextTime < ctx.currentTime + 0.3) {
    const i = step % 16;                       // 2마디 안에서의 위치
    const c = Math.floor(step / 16) % 4;       // 지금 코드
    const loop = Math.floor(step / 64);        // 몇 바퀴째
    const chord = CHORDS[c];
    if (i === 0) {
      pad(nextTime, chord, S8 * 16);
      tone(nextTime, f(BASS[c]), S8 * 7, 'sine', 0.22, musicBus, 0.08);
    }
    if (i === 8) tone(nextTime, f(BASS[c] + 7), S8 * 6, 'sine', 0.12, musicBus, 0.08);
    if (i % 2 === 0) tick(nextTime, i % 4 === 0);
    const a = ARP[i];
    if (a !== null) pluck(nextTime, chord[a] + 12, 0.05);
    const m = MELODY[c][i];
    if (loop % 2 === 1 && m) pluck(nextTime, m, 0.07);
    nextTime += S8;
    step++;
  }
}
export function startGameBgm() {
  if (timer || !ensure()) return;
  resume();
  step = 0;
  nextTime = ctx.currentTime + 0.1;
  musicBus.gain.cancelScheduledValues(ctx.currentTime);
  musicBus.gain.setValueAtTime(0.0001, ctx.currentTime);
  musicBus.gain.linearRampToValueAtTime(1, ctx.currentTime + 3);
  timer = setInterval(schedule, 100);
  schedule();
}
export function stopGameBgm() {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  musicBus.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.15);
}

// ── 효과음 ──
export function ding() { // 띵동 (정답)
  if (!ensure()) return;
  resume();
  const t = ctx.currentTime + 0.02;
  [[1318.5, 0, 0.5], [1046.5, 0.22, 0.9]].forEach(([fr, d, len]) => {
    tone(t + d, fr, len, 'sine', 0.35, sfxBus);
    tone(t + d, fr * 2, len * 0.5, 'sine', 0.08, sfxBus);
  });
}
export function buzz() { // 삐 (오답)
  if (!ensure()) return;
  resume();
  const t = ctx.currentTime + 0.02;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'square'; o.frequency.value = 196;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
  g.gain.setValueAtTime(0.18, t + 0.38);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.46);
}

// 같은 사건에 소리가 두 번 나지 않게. 방에 처음 들어왔을 때 이미 있던 사건은 소리 없이 넘겨요.
const seen = new Set();
const primed = new Set();
const priming = new Set();
// 방 화면을 처음 그릴 때 호출: 그 순간까지의 사건은 소리 없이 넘기고, 그 뒤부터 소리 나요
export function primeSounds(roomCode) {
  if (priming.has(roomCode)) return;
  priming.add(roomCode);
  setTimeout(() => primed.add(roomCode), 0);
}
export function soundEvent(roomCode, key, kind) {
  const k = `${roomCode}|${key}`;
  if (seen.has(k)) return;
  seen.add(k);
  if (!primed.has(roomCode)) return;
  if (kind === 'ok') ding(); else buzz();
}
