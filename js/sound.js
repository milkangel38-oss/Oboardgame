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
// 음성 채팅 중엔 배경음악을 작게
let ducked = false;
export function setDuck(on) { ducked = !!on; if (musicBus) musicBus.gain.setTargetAtTime(ducked ? 0.3 : 1, ctx.currentTime, 0.2); }
export function onSoundChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.gain.value = ducked ? 0.3 : 1; musicBus.connect(master);
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
// ── 신나고 발랄한 BGM (동글동글 합체): C장조 I–V–vi–IV, 132 BPM, 통통 튀는 베이스 + 짧은 코드 + 밝은 멜로디 ──
let style = 'calm';
const HB = 132, H8 = 60 / HB / 2;
const HCH = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
const HBASS = [36, 31, 33, 29];
const HMEL = [
  [72, null, 76, 79, null, 76, 74, null, 72, null, 74, 76, null, 74, 72, null],
  [71, null, 74, 79, null, 74, 71, null, 74, null, 72, 71, null, 67, null, null],
  [69, null, 72, 76, null, 72, 69, null, 72, null, 76, 77, null, 76, 74, null],
  [69, null, 72, 77, null, 76, 74, null, 72, null, 71, 72, null, 74, null, null],
];
function kick(time) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(150, time); o.frequency.exponentialRampToValueAtTime(45, time + 0.12);
  g.gain.setValueAtTime(0.32, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
  o.connect(g); g.connect(musicBus); o.start(time); o.stop(time + 0.18);
}
function hat(time, open) {
  if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.03, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const src = ctx.createBufferSource(), g = ctx.createGain(), hp = ctx.createBiquadFilter();
  hp.type = 'highpass'; hp.frequency.value = 7000; src.buffer = noiseBuf; src.loop = open;
  g.gain.setValueAtTime(open ? 0.05 : 0.06, time); g.gain.exponentialRampToValueAtTime(0.0001, time + (open ? 0.12 : 0.03));
  src.connect(hp); hp.connect(g); g.connect(musicBus); src.start(time); src.stop(time + 0.15);
}
function scheduleHappy() {
  while (nextTime < ctx.currentTime + 0.3) {
    const i = step % 16, c = Math.floor(step / 16) % 4, loop = Math.floor(step / 64);
    const ch = HCH[c];
    if (i % 4 === 0) kick(nextTime);
    hat(nextTime, i % 4 === 2);
    if (i % 4 === 0) tone(nextTime, f(HBASS[c]), H8 * 1.6, 'triangle', 0.24, musicBus, 0.005);
    if (i % 4 === 2) tone(nextTime, f(HBASS[c] + 12), H8 * 1.2, 'triangle', 0.16, musicBus, 0.005);
    if (i % 4 === 2) ch.forEach((n) => tone(nextTime, f(n + 12), H8 * 0.7, 'square', 0.018, musicBus, 0.004));
    const m = HMEL[c][i];
    if (m && loop % 4 !== 0) { tone(nextTime, f(m), H8 * 1.3, 'triangle', 0.09, musicBus, 0.005); tone(nextTime, f(m + 12), H8 * 0.6, 'sine', 0.025, musicBus, 0.003); }
    if (m && loop % 4 === 0 && i % 2 === 0) tone(nextTime, f(m), H8 * 0.9, 'sine', 0.05, musicBus, 0.005);
    nextTime += H8;
    step++;
  }
}
function schedule() {
  if (style === 'happy') return scheduleHappy();
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
export function startGameBgm(st = 'calm') {
  if (timer && style === st) return;
  theme = null;
  if (timer) { clearInterval(timer); timer = null; }
  if (!ensure()) return;
  style = st;
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
// 동글동글 합체: 떨어뜨리기 '퐁' · 합체 '뾰로롱'(클수록 높고 화려하게) · 보너스
export function sfxDrop() {
  if (!ensure()) return; resume();
  const t = ctx.currentTime + 0.01;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(260, t + 0.12);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.18);
}
export function sfxMerge(lv) {
  if (!ensure()) return; resume();
  const t = ctx.currentTime + 0.01;
  const base = 64 + Math.min(lv, 10) * 2;
  const notes = lv >= 7 ? [0, 4, 7, 12, 16] : lv >= 4 ? [0, 4, 7, 12] : [0, 7];
  notes.forEach((n, k) => { tone(t + k * 0.045, f(base + n), 0.22 + (lv >= 7 ? 0.2 : 0), 'triangle', 0.16, sfxBus, 0.004); tone(t + k * 0.045, f(base + n + 12), 0.12, 'sine', 0.05, sfxBus, 0.003); });
  if (lv >= 6) { // 반짝이 꼬리
    for (let k = 0; k < 6; k++) tone(t + 0.2 + k * 0.05, f(base + 24 + (k % 3) * 4), 0.15, 'sine', 0.05, sfxBus, 0.003);
  }
}
export function sfxBonus() {
  if (!ensure()) return; resume();
  const t = ctx.currentTime + 0.01;
  [72, 76, 79, 84, 88, 91].forEach((m, k) => tone(t + k * 0.07, f(m), 0.3, 'triangle', 0.15, sfxBus, 0.004));
}
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

// ── 보드게임 효과음: 토큰 '딸깍' · 카드 '스윽' ──
let sfxNoise = null;
function noise() {
  if (sfxNoise) return sfxNoise;
  sfxNoise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = sfxNoise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return sfxNoise;
}
function burst(t, len, type, freq, q, vol, endFreq) {
  const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noise(); fl.type = type; fl.frequency.setValueAtTime(freq, t); fl.Q.value = q;
  if (endFreq) fl.frequency.exponentialRampToValueAtTime(endFreq, t + len);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.01, len / 4)); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
  s.connect(fl); fl.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + len + 0.02);
}
// 보석 토큰(포커칩)이 맞부딪히는 소리. delay(초) 뒤에 나요
export function sfxToken(delay = 0) {
  if (!ensure()) return; resume();
  const t = ctx.currentTime + 0.01 + delay;
  const p = 0.9 + Math.random() * 0.25;
  burst(t, 0.035, 'bandpass', 3800 * p, 6, 0.35);
  tone(t, 2300 * p, 0.05, 'triangle', 0.07, sfxBus, 0.002);
  burst(t + 0.045, 0.03, 'bandpass', 3200 * p, 6, 0.2);
}
// 카드를 미끄러뜨려 내려놓는 소리
export function sfxCard(delay = 0) {
  if (!ensure()) return; resume();
  const t = ctx.currentTime + 0.01 + delay;
  burst(t, 0.18, 'bandpass', 1800, 1.2, 0.18, 5200);
  burst(t + 0.17, 0.05, 'lowpass', 900, 0.8, 0.22);
}
// 깜짝 놀람 '뾰잉!' (겁쟁이 ‼)
export function sfxAlert() {
  if (!ensure()) return; resume();
  const t = ctx.currentTime + 0.01;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'square'; o.frequency.setValueAtTime(520, t); o.frequency.exponentialRampToValueAtTime(1400, t + 0.12); o.frequency.exponentialRampToValueAtTime(900, t + 0.28);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + 0.34);
  tone(t + 0.05, 1760, 0.12, 'triangle', 0.08, sfxBus, 0.003);
}

// 녹음된 효과음 파일 재생 (이미 깨워 둔 소리 장치로 → 휴대폰에서도 나와요)
const fileBufs = {};
export function preloadSfx(url) {
  const c = ensure(); if (!c || fileBufs[url]) return;
  fileBufs[url] = fetch(url).then((r) => r.arrayBuffer()).then((b) => c.decodeAudioData(b)).catch(() => null);
}
export async function playSfxFile(url, gain = 1) {
  const c = ensure(); if (!c) return;
  preloadSfx(url);
  const buf = await fileBufs[url]; if (!buf) return;
  resume();
  const src = c.createBufferSource(); src.buffer = buf;
  const g = c.createGain(); g.gain.value = gain;
  src.connect(g); g.connect(sfxBus); src.start();
}

// 바둑돌을 판에 '딱' 놓는 소리
export function sfxStone() {
  if (!ensure()) return; resume();
  const t = ctx.currentTime + 0.01, p = 0.95 + Math.random() * 0.1;
  burst(t, 0.022, 'highpass', 4200 * p, 1.2, 0.55);
  tone(t, 2100 * p, 0.035, 'triangle', 0.1, sfxBus, 0.001);
  tone(t, 380 * p, 0.11, 'sine', 0.22, sfxBus, 0.002);
  burst(t + 0.004, 0.06, 'bandpass', 900 * p, 4, 0.25);
}
// 장기알을 나무판에 '탁' 놓는 소리 (잡으면 두 번 탁탁)
export function sfxPiece(capture = false) {
  if (!ensure()) return; resume();
  const hit = (t, p, v) => {
    burst(t, 0.035, 'bandpass', 1700 * p, 3, 0.5 * v);
    tone(t, 240 * p, 0.14, 'sine', 0.28 * v, sfxBus, 0.002);
    tone(t, 520 * p, 0.06, 'triangle', 0.09 * v, sfxBus, 0.001);
  };
  const t = ctx.currentTime + 0.01, p = 0.95 + Math.random() * 0.1;
  if (capture) { hit(t, p * 1.1, 0.8); hit(t + 0.075, p, 1); } else hit(t, p, 1);
}

// ───────── 게임별 테마 BGM (모두 Web Audio로 직접 만든 오리지널) ─────────
// 각 곡: 4마디 반복, 1마디 = 8칸(8분음표). chords: "근음+종류" 4개, mel: 32칸 (반음, '.' 쉼표), 숫자는 key 기준
const CT = { M: [0, 4, 7], m: [0, 3, 7], M7: [0, 4, 7, 11], m7: [0, 3, 7, 10], D7: [0, 4, 7, 10], d: [0, 3, 6], s: [0, 5, 7], 5: [0, 7], m9: [0, 3, 7, 14], M9: [0, 4, 7, 14] };
const parseCh = (s) => s.split(' ').map((t) => { const m = t.match(/^(-?\d+)(.*)$/); return CT[m[2] || 'M'].map((x) => x + Number(m[1])); });
const parseMel = (s) => s.trim().split(/\s+/).map((t) => (t === '.' ? null : Number(t)));
export const BGM_THEMES = {
  // 숫자눈치게임: 살금살금 눈치 보는 피치카토
  numbers: { bpm: 112, key: 62, ch: '0m 0m 5m 7M', mel: '0 . 3 . 7 . 5 3 | 2 . . 3 2 . 0 . | 5 . 8 . 7 5 3 . | 7 . 6 . 7 . . .', lead: 'pizz', pad: null, bass: 'bounce', drum: 'tick', bassType: 'pizz' },
  // 미스터리 사인: 안개 낀 수수께끼
  mystery: { bpm: 68, key: 64, ch: '0m 1M 0m -2d', mel: '12 . . 11 . . 7 . | 8 . . . 7 . . . | 12 . 15 . 14 . 11 . | 10 . . . . . . .', lead: 'bell', pad: 'saw', padCut: 500, bass: 'long', drum: 'heart', echo: 0.45 },
  // 결합: 퍼즐 맞추는 전자음
  combo: { bpm: 120, key: 64, ch: '0m 8M 3M 10M', mel: '7 . 12 7 . 12 14 . | 12 . 8 . 7 . 3 . | 7 . 10 7 . 10 12 . | 14 . 12 . 10 . 7 .', lead: 'square', pad: 'organ', arp: 1, bass: 'pulse', drum: 'pop' },
  // 시드포커: 카지노 재즈 라운지 (스윙)
  seedpoker: { bpm: 104, key: 60, swing: 0.28, ch: '0M7 9m7 2m7 7D7', mel: '7 . 9 7 4 . . . | 4 . 7 9 12 . 9 . | 5 . 9 5 2 . . . | 11 . 9 . 7 . 5 .', lead: 'vibe', pad: 'organ', padCut: 900, bass: 'walk', drum: 'swing' },
  // 기억포커: 몽환적인 라운지
  memorypoker: { bpm: 80, key: 65, swing: 0.2, ch: '0M7 4m7 9m7 7D7', mel: '11 . . 9 7 . . . | 7 . 11 . 14 . . . | 12 . . 9 7 . 4 . | 5 . . 7 . . . .', lead: 'vibe', pad: 'sine', bass: 'long', drum: 'brush', echo: 0.4 },
  // 폭풍의 증권시장: 긴박하게 달리는 시장
  stock: { bpm: 132, key: 57, ch: '0m 0m 8M 7M', mel: '12 . 12 15 . 12 10 . | 12 . 7 . 8 . 7 . | 12 . 12 15 . 17 15 . | 14 . 11 . 7 . . .', lead: 'saw', pad: 'saw', padCut: 800, bass: 'pulse', drum: 'drive' },
  // 타이핑 퀴즈: 경쾌한 퀴즈쇼
  typing: { bpm: 144, key: 60, ch: '0M 9m 5M 7M', mel: '12 . 16 . 19 . 16 . | 16 . 12 . 9 . 12 . | 17 . 21 . 19 17 16 . | 14 . 11 . 7 . . .', lead: 'square', pad: null, bass: 'bounce', drum: 'pop' },
  // 자객 마피아: 어둠 속 긴장감
  assassin: { bpm: 72, key: 57, ch: '0m 0m 1M 0d', mel: '. . . . 12 . 13 . | 12 . . . . . . . | . . 15 . 13 . 12 . | 11 . . . 12 . . .', lead: 'bell', pad: 'saw', padCut: 420, bass: 'long', drum: 'heart', echo: 0.5 },
  // 동상이몽퀴즈: 몽글몽글 꿈속
  dongsang: { bpm: 96, key: 65, ch: '0M7 9m7 5M7 7D7', mel: '16 . 14 . 12 . 9 . | 12 . . . 16 . . . | 17 . 16 . 14 . 12 . | 14 . . . . . . .', lead: 'music', pad: 'sine', bass: 'long', drum: 'soft', echo: 0.35 },
  // 언더독레이스: 두두두 달리는 경주
  underdog: { bpm: 152, key: 62, ch: '0M 7M 9m 5M', mel: '7 . 7 9 11 . 7 . | 7 . 7 9 14 . 11 . | 12 . 12 11 9 . 7 . | 9 . 11 . 7 . . .', lead: 'brass', pad: null, bass: 'gallop', drum: 'gallop' },
  // 티츄: 동양풍 오음계
  tichu: { bpm: 98, key: 62, ch: '0m 3M 5m 0m', mel: '12 . 10 7 . 5 7 . | 3 . 5 . 7 . . . | 10 . 12 . 15 12 10 . | 7 . 5 . 3 . 0 .', lead: 'koto', pad: 'sine', bass: 'long', drum: 'wood', echo: 0.3 },
  // 초성퀴즈: 통통 튀는 실로폰
  chosung: { bpm: 126, key: 67, ch: '0M 5M 7M 0M', mel: '0 4 7 . 12 . 7 . | 9 . 5 . 9 12 . . | 11 . 7 . 11 14 12 11 | 12 . 7 . 0 . . .', lead: 'xylo', pad: null, bass: 'bounce', drum: 'pop' },
  // 루미큐브: 느긋한 로파이
  rummikub: { bpm: 84, key: 63, swing: 0.22, ch: '0M7 5m7 10D7 3M7', mel: '14 . 12 . 7 . . . | 8 . 10 . 12 . 15 . | 14 . 12 10 . 7 . . | 7 . . . 10 . . .', lead: 'vibe', pad: 'sine', bass: 'long', drum: 'lofi' },
  // 오목: 정자의 가야금 (느긋한 한국 오음계)
  omok: { bpm: 70, key: 62, ch: '0s 5s 7s 0s', mel: '12 . . 9 7 . . . | 5 . 7 . 9 . . . | 12 . 14 . 12 9 7 . | 7 . . 5 2 . . .', lead: 'gaya', pad: 'sine', bass: 'long', drum: 'janggu', echo: 0.3 },
  // 장기: 장수의 북소리
  janggi: { bpm: 92, key: 60, ch: '0m 0m 5s 7s', mel: '12 . 10 . 7 . 10 12 | 15 . . 12 10 . . . | 17 . 15 . 12 . 10 . | 12 . . . 7 . . .', lead: 'gaya', pad: 'organ', padCut: 600, bass: 'long', drum: 'buk' },
  // 렉시오: 현대적인 동양 라운지
  lexio: { bpm: 104, key: 64, ch: '0m7 5m7 8M7 7m7', mel: '7 . 10 . 12 . 15 . | 12 . 10 . . . 7 . | 10 . 12 . 15 . 17 . | 15 . 12 . 10 . . .', lead: 'koto', pad: 'sine', bass: 'walk', drum: 'lofi', echo: 0.3 },
  // 스컬킹: 바다 해적 뱃노래 (아코디언 + 쿵짝)
  skullking: { bpm: 120, key: 62, ch: '0m 0m 10M 9M', mel: '7 . 7 . 5 3 2 . | 0 . 2 3 5 . 7 . | 10 . 10 . 8 7 5 . | 4 . 5 . 7 . . .', lead: 'accord', pad: null, bass: 'oom', drum: 'shanty' },
  // 퍼레이드: 서커스 행진 칼리오페
  parade: { bpm: 134, key: 60, ch: '0M 7D7 7D7 0M', mel: '12 . 16 19 . 16 12 . | 14 . 17 19 . 17 14 . | 11 . 14 17 . 14 11 . | 12 . 16 . 12 . . .', lead: 'calliope', pad: null, bass: 'oom', drum: 'march' },
  // 스플렌더: 르네상스 상인의 하프시코드
  splendor: { bpm: 92, key: 60, ch: '0M 7M 9m 5M', mel: '12 14 16 . 14 12 11 . | 11 12 14 . 12 11 9 . | 9 11 12 . 11 9 7 . | 9 . 11 . 12 . . .', lead: 'harpsi', pad: null, bass: 'walk', drum: 'none' },
  // 아발론: 웅장한 중세 기사단
  avalon: { bpm: 78, key: 62, ch: '0m 10M 3M 0m', mel: '7 . . 9 10 . 12 . | 14 . . . 12 . 10 . | 10 . . 12 15 . 14 . | 12 . . . . . . .', lead: 'horn', pad: 'saw', padCut: 650, bass: 'long', drum: 'epic', echo: 0.3 },
};
let theme = null, tmel = null, tch = null;
function nz(time, len, type, fr, q, vol) { // 노이즈 타악기
  if (!noiseBuf || noiseBuf.duration < 0.3) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.4, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = noiseBuf; fl.type = type; fl.frequency.value = fr; fl.Q.value = q;
  g.gain.setValueAtTime(vol, time); g.gain.exponentialRampToValueAtTime(0.0001, time + len);
  s.connect(fl); fl.connect(g); g.connect(musicBus); s.start(time); s.stop(time + len + 0.02);
}
function thump(time, f0, f1, len, vol) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(f0, time); o.frequency.exponentialRampToValueAtTime(f1, time + len * 0.8);
  g.gain.setValueAtTime(vol, time); g.gain.exponentialRampToValueAtTime(0.0001, time + len);
  o.connect(g); g.connect(musicBus); o.start(time); o.stop(time + len + 0.02);
}
function leadNote(time, midi, d) {
  const fr = f(midi), T = theme.lead;
  const L = (type, len, vol, att = 0.005) => tone(time, fr, len, type, vol, musicBus, att);
  const E = (g) => { if (theme.echo) g.connect(ensureEcho()); };
  if (T === 'pizz') { L('triangle', 0.22, 0.12); L('sine', 0.12, 0.04); }
  else if (T === 'bell') { E(L('sine', 2.2, 0.07)); tone(time, fr * 2.76, 0.8, 'sine', 0.018, musicBus, 0.003); }
  else if (T === 'square') { L('square', d * 0.9, 0.035); L('triangle', d * 1.1, 0.05); }
  else if (T === 'vibe') { E(L('sine', 1.4, 0.08)); tone(time, fr * 4, 0.3, 'sine', 0.012, musicBus, 0.002); }
  else if (T === 'saw') { const g = ctx.createGain(); const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1600; const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; g.gain.setValueAtTime(0.0001, time); g.gain.exponentialRampToValueAtTime(0.05, time + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, time + d * 1.4); o.connect(lp); lp.connect(g); g.connect(musicBus); o.start(time); o.stop(time + d * 1.5); }
  else if (T === 'music') { E(L('sine', 1.6, 0.07, 0.004)); tone(time, fr * 2, 0.5, 'sine', 0.02, musicBus, 0.003); }
  else if (T === 'brass') { L('square', d * 1.2, 0.03, 0.02); L('sawtooth', d * 1.1, 0.018, 0.02); }
  else if (T === 'koto') { E(L('triangle', 0.9, 0.1, 0.002)); tone(time, fr * 3, 0.15, 'sine', 0.02, musicBus, 0.001); }
  else if (T === 'xylo') { L('sine', 0.35, 0.12, 0.002); tone(time, fr * 4, 0.08, 'sine', 0.03, musicBus, 0.001); }
  else if (T === 'gaya') { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(fr, time); o.frequency.setValueAtTime(fr, time + 0.25); o.frequency.linearRampToValueAtTime(fr * 1.03, time + 0.45); o.frequency.linearRampToValueAtTime(fr, time + 0.7); g.gain.setValueAtTime(0.0001, time); g.gain.exponentialRampToValueAtTime(0.12, time + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, time + 1.3); o.connect(g); g.connect(musicBus); E(g); o.start(time); o.stop(time + 1.4); }
  else if (T === 'accord') { [-6, 6].forEach((c) => { const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; o.type = 'square'; o.frequency.value = fr; o.detune.value = c; g.gain.setValueAtTime(0.0001, time); g.gain.linearRampToValueAtTime(0.022, time + 0.03); g.gain.setValueAtTime(0.022, time + d * 0.9); g.gain.linearRampToValueAtTime(0.0001, time + d * 1.3); o.connect(lp); lp.connect(g); g.connect(musicBus); o.start(time); o.stop(time + d * 1.4); }); }
  else if (T === 'calliope') { L('square', d * 0.8, 0.028, 0.004); L('sine', d * 0.9, 0.06, 0.004); tone(time, fr * 2, d * 0.6, 'sine', 0.025, musicBus, 0.004); }
  else if (T === 'harpsi') { const o = ctx.createOscillator(), g = ctx.createGain(), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300; o.type = 'sawtooth'; o.frequency.value = fr; g.gain.setValueAtTime(0.06, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.6); o.connect(hp); hp.connect(g); g.connect(musicBus); o.start(time); o.stop(time + 0.65); }
  else if (T === 'horn') { const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; o.type = 'sawtooth'; o.frequency.value = fr; g.gain.setValueAtTime(0.0001, time); g.gain.linearRampToValueAtTime(0.05, time + 0.09); g.gain.setValueAtTime(0.05, time + d * 1.5); g.gain.linearRampToValueAtTime(0.0001, time + d * 2.2); o.connect(lp); lp.connect(g); g.connect(musicBus); E(g); o.start(time); o.stop(time + d * 2.3); }
  else L('triangle', d, 0.08);
}
function padTheme(time, notes, dur) {
  const P = theme.pad; if (!P) return;
  if (P === 'saw') { pad(time, notes, dur); return; }
  const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = theme.padCut || 1200;
  g.gain.setValueAtTime(0.0001, time); g.gain.linearRampToValueAtTime(P === 'organ' ? 0.018 : 0.03, time + dur * 0.3); g.gain.linearRampToValueAtTime(0.0001, time + dur + 0.4);
  lp.connect(g); g.connect(musicBus);
  notes.forEach((n) => { const o = ctx.createOscillator(); o.type = P === 'organ' ? 'square' : 'sine'; o.frequency.value = f(n); o.connect(lp); o.start(time); o.stop(time + dur + 0.5); });
}
function drums(t, i, d) {
  const D = theme.drum;
  const kick2 = (v = 0.28) => thump(t, 140, 45, 0.16, v);
  const snare = (v = 0.08) => { nz(t, 0.14, 'bandpass', 1900, 0.8, v); tone(t, 190, 0.08, 'triangle', v * 0.8, musicBus, 0.002); };
  const hh = (v = 0.04, len = 0.03) => nz(t, len, 'highpass', 7500, 0.7, v);
  if (D === 'tick') { if (i % 2 === 0) tick(t, i % 4 === 0); if (i === 0) kick2(0.15); }
  else if (D === 'pop') { if (i % 4 === 0) kick2(); if (i % 4 === 2) snare(); hh(i % 2 ? 0.025 : 0.04); }
  else if (D === 'drive') { if (i % 2 === 0) kick2(0.24); if (i % 4 === 2) snare(0.07); hh(0.035); nz(t + d / 2, 0.02, 'highpass', 8000, 0.7, 0.02); }
  else if (D === 'swing') { if (i % 2 === 0) nz(t, 0.25, 'highpass', 6000, 0.5, 0.025); if (i % 4 === 3) nz(t, 0.05, 'highpass', 6000, 0.5, 0.03); if (i === 0) kick2(0.12); if (i % 4 === 2) nz(t, 0.18, 'bandpass', 2500, 0.4, 0.03); }
  else if (D === 'brush') { if (i % 2 === 0) nz(t, 0.3, 'bandpass', 3000, 0.4, 0.018); if (i === 4) nz(t, 0.2, 'bandpass', 2000, 0.5, 0.03); }
  else if (D === 'heart') { if (i === 0) thump(t, 70, 40, 0.2, 0.3); if (i === 1) thump(t, 65, 38, 0.2, 0.2); }
  else if (D === 'soft') { if (i === 0) kick2(0.12); if (i === 4) nz(t, 0.12, 'bandpass', 3500, 0.6, 0.025); if (i % 2 === 1) hh(0.015); }
  else if (D === 'gallop') { if (i % 2 === 0) kick2(0.2); hh(0.03); if (i % 4 === 2) snare(0.06); if (i % 2 === 1) nz(t + d * 0.5, 0.03, 'bandpass', 1200, 2, 0.04); }
  else if (D === 'wood') { if ([0, 3, 6].includes(i)) tone(t, 880, 0.05, 'sine', 0.06, musicBus, 0.001); if (i === 4) tone(t, 660, 0.06, 'sine', 0.05, musicBus, 0.001); if (i === 0) thump(t, 90, 50, 0.25, 0.15); }
  else if (D === 'lofi') { if (i === 0 || i === 5) kick2(0.18); if (i === 2 || i === 6) nz(t, 0.12, 'bandpass', 1600, 0.6, 0.05); if (i % 2 === 0) hh(0.02); }
  else if (D === 'janggu') { if (i === 0) thump(t, 110, 60, 0.35, 0.22); if (i === 3) tone(t, 520, 0.07, 'triangle', 0.05, musicBus, 0.001); if (i === 4) thump(t, 100, 55, 0.3, 0.14); if (i === 6) tone(t, 520, 0.07, 'triangle', 0.04, musicBus, 0.001); }
  else if (D === 'buk') { if ([0, 3, 4].includes(i)) thump(t, 85, 42, 0.4, i === 0 ? 0.32 : 0.2); if (i === 6) tone(t, 600, 0.06, 'triangle', 0.05, musicBus, 0.001); }
  else if (D === 'shanty') { if (i === 0 || i === 4) kick2(0.22); if (i === 2 || i === 6) { nz(t, 0.08, 'bandpass', 1500, 1, 0.05); } if (i === 7) tone(t, 1200, 0.05, 'triangle', 0.03, musicBus, 0.001); }
  else if (D === 'march') { if (i === 0 || i === 4) kick2(0.26); if (i === 2 || i === 6) snare(0.08); if (i === 7) { snare(0.04); nz(t + d / 2, 0.08, 'bandpass', 1900, 0.8, 0.04); } nz(t, 0.05, 'highpass', 5000, 2, 0.012); }
  else if (D === 'epic') { if (i === 0) thump(t, 70, 32, 0.6, 0.35); if (i === 4) thump(t, 80, 36, 0.4, 0.2); if (i === 6) thump(t, 90, 40, 0.25, 0.14); }
}
function bassLine(t, i, c, d) {
  const B = theme.bass, root = theme.key - 24 + tch[c][0];
  const fifth = root + 7, oct = root + 12;
  const bt = (m, len, v = 0.2) => tone(t, f(m), len, theme.bassType === 'pizz' ? 'triangle' : 'sine', v, musicBus, 0.01);
  if (B === 'long') { if (i === 0) bt(root, d * 7.5, 0.2); if (i === 4) bt(fifth, d * 3.5, 0.1); }
  else if (B === 'bounce') { if (i % 4 === 0) bt(root, d * 1.5, 0.22); if (i % 4 === 2) bt(oct, d, 0.14); }
  else if (B === 'pulse') { bt(i % 4 === 3 ? oct : root, d * 0.8, 0.16); }
  else if (B === 'walk') { if (i % 2 === 0) { const n = [root, root + tch[c][1] - tch[c][0], fifth, oct - 1][i / 2]; bt(n, d * 1.8, 0.18); } }
  else if (B === 'gallop') { if (i % 2 === 0) bt(root, d * 0.6, 0.2); else bt(fifth, d * 0.4, 0.12); }
  else if (B === 'oom') {
    if (i === 0 || i === 4) bt(i === 0 ? root : fifth, d * 1.2, 0.24);
    if (i === 2 || i === 6) tch[c].forEach((n) => tone(t, f(theme.key - 12 + n), d * 0.6, theme.lead === 'accord' ? 'square' : 'triangle', theme.lead === 'accord' ? 0.012 : 0.03, musicBus, 0.004));
  }
}
function scheduleTheme() {
  const d = 60 / theme.bpm / 2; // 8분음표
  while (nextTime < ctx.currentTime + 0.3) {
    const i = step % 8, c = Math.floor(step / 8) % 4, loop = Math.floor(step / 32);
    const t = nextTime + (i % 2 === 1 ? (theme.swing || 0) * d : 0);
    if (i === 0) padTheme(t, tch[c].map((n) => theme.key - 12 + n), d * 8);
    bassLine(t, i, c, d);
    drums(t, i, d);
    if (theme.arp && i % 2 === 1) tone(t, f(theme.key + tch[c][(i >> 1) % tch[c].length]), d * 0.6, 'square', 0.012, musicBus, 0.003);
    const m = tmel[(c * 8 + i)];
    if (m !== null && m !== undefined && (loop % 4 !== 3 || i % 4 === 0)) leadNote(t, theme.key + m, d);
    nextTime += d; step++;
  }
}
const _startGameBgm = startGameBgm;
export function startThemeBgm(id) {
  const th = BGM_THEMES[id];
  if (!th) return _startGameBgm(id === 'merge' ? 'happy' : 'calm');
  if (timer && style === 'theme:' + id) return;
  if (timer) { clearInterval(timer); timer = null; }
  if (!ensure()) return;
  theme = th; tch = parseCh(th.ch); tmel = parseMel(th.mel.replace(/\|/g, ' '));
  if (echo) echo.delayTime.value = (60 / th.bpm / 2) * 3;
  style = 'theme:' + id;
  resume(); step = 0; nextTime = ctx.currentTime + 0.1;
  musicBus.gain.cancelScheduledValues(ctx.currentTime);
  musicBus.gain.setValueAtTime(0.0001, ctx.currentTime);
  musicBus.gain.linearRampToValueAtTime(ducked ? 0.3 : 1, ctx.currentTime + 3);
  timer = setInterval(scheduleTheme, 100);
  scheduleTheme();
}
