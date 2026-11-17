// 게임 중 BGM + 효과음 (띵동 / 삐) — O게임 오리지널, Web Audio로 직접 만든 소리 (음원 파일 없음)
// 음량·음소거 설정은 이 기기에 저장돼요.

const VOL_KEY = 'og:vol';
const MUTE_KEY = 'og:mute';
let ctx = null, master = null, musicBus = null, sfxBus = null;
let timer = null, step = 0, nextTime = 0;
const listeners = new Set();

export function getVolume() { const v = Number(localStorage.getItem(VOL_KEY)); return Number.isFinite(v) && localStorage.getItem(VOL_KEY) !== null ? v : 0.5; }
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
  musicBus = ctx.createGain(); musicBus.gain.value = 0.55; musicBus.connect(master);
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
window.addEventListener('pointerdown', resume, { capture: true });
window.addEventListener('keydown', resume, { capture: true });

// ── 게임 BGM: 경쾌한 8비트 풍 루프 (C – Am – F – G) ──
const BPM = 116;
const S16 = 60 / BPM / 4; // 16분음표 길이
const f = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]; // C Am F G
const BASS = [36, 33, 29, 31];
const LEAD = [ // 마디마다 16칸 (null = 쉼표)
  [72, null, 76, null, 79, null, 76, 74, 72, null, null, 67, 69, null, 72, null],
  [69, null, 72, null, 76, null, 74, 72, 69, null, null, 64, 67, null, 69, null],
  [65, null, 69, null, 72, null, 74, 72, 69, null, 67, null, 65, null, 67, 69],
  [67, null, 71, null, 74, null, 72, 71, 67, null, 74, null, 71, null, null, null],
];

function tone(time, freq, dur, type, vol, bus = musicBus) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(vol, time + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
  o.connect(g); g.connect(bus);
  o.start(time); o.stop(time + dur + 0.02);
}
let noiseBuf = null;
function hat(time, vol) {
  if (!noiseBuf) {
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = ctx.createBufferSource(), g = ctx.createGain(), hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 6000;
  s.buffer = noiseBuf;
  g.gain.setValueAtTime(vol, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.045);
  s.connect(hp); hp.connect(g); g.connect(musicBus);
  s.start(time);
}
function kick(time) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(140, time); o.frequency.exponentialRampToValueAtTime(45, time + 0.12);
  g.gain.setValueAtTime(0.5, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
  o.connect(g); g.connect(musicBus); o.start(time); o.stop(time + 0.16);
}
function schedule() {
  while (nextTime < ctx.currentTime + 0.25) {
    const bar = Math.floor(step / 16) % 4, i = step % 16;
    if (i % 4 === 0) kick(nextTime);
    if (i % 2 === 1) hat(nextTime, 0.06);
    if (i % 4 === 0 || i % 4 === 3) tone(nextTime, f(BASS[bar]), S16 * 1.8, 'triangle', 0.32);
    if (i % 2 === 0) tone(nextTime, f(CHORDS[bar][(i / 2) % 3] + 12), S16 * 0.9, 'square', 0.035);
    const n = LEAD[bar][i];
    if (n && Math.floor(step / 64) % 2 === 1) tone(nextTime, f(n), S16 * 1.6, 'square', 0.06); // 두 번째 바퀴부터 멜로디
    nextTime += S16;
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
  musicBus.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 1.5);
  timer = setInterval(schedule, 80);
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
