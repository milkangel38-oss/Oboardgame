// 로그인 화면 BGM — O게임 오리지널 (Web Audio로 직접 만든 소리, 음원 파일 없음)
// 낮게 깔리는 저음 + 느리게 울리는 단조 오르골 멜로디 + 메아리
// 브라우저 정책상 사용자가 화면을 한 번 눌러야 소리가 나요.

const PREF_KEY = 'og:bgm';
let ctx = null;
let master = null;
let timer = null;
let droneNodes = [];
let step = 0;
let nextTime = 0;

// 단조 오르골 멜로디 (반음 단위, 기준 A4=0). null = 쉼표
const MELODY = [0, null, 3, 7, 5, null, 3, 2, 0, null, -2, -4, -5, null, null, null,
  0, null, 3, 8, 7, null, 5, 3, 2, null, 3, -1, 0, null, null, null];
const BEAT = 0.42; // 초

const freq = (semi) => 440 * Math.pow(2, semi / 12);

export const bgmWanted = () => { try { return localStorage.getItem(PREF_KEY) === 'on'; } catch { return false; } };
const savePref = (on) => { try { localStorage.setItem(PREF_KEY, on ? 'on' : 'off'); } catch {} };
export const bgmPlaying = () => !!timer;

function setup() {
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);

  // 메아리(딜레이)
  const delay = ctx.createDelay(2);
  delay.delayTime.value = BEAT * 1.5;
  const fb = ctx.createGain();
  fb.gain.value = 0.38;
  const wet = ctx.createGain();
  wet.gain.value = 0.45;
  delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(master);
  master.echo = delay;
}

function startDrone() {
  // 낮은 저음 두 개를 살짝 어긋나게 + 천천히 숨 쉬듯 커졌다 작아짐
  const g = ctx.createGain();
  g.gain.value = 0.11;
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.08;
  lfoGain.gain.value = 0.05;
  lfo.connect(lfoGain); lfoGain.connect(g.gain);
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 420;
  [freq(-36), freq(-36) * 1.006, freq(-29)].forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = i === 2 ? 'sine' : 'sawtooth';
    o.frequency.value = f;
    o.connect(lp);
    o.start();
    droneNodes.push(o);
  });
  lp.connect(g); g.connect(master);
  lfo.start();
  droneNodes.push(lfo);
}

function bell(time, semi) {
  // 오르골 소리: 짧게 '띵' 하고 사라지는 사인파 + 배음
  [1, 2.01, 3.98].forEach((mult, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq(semi) * mult;
    const peak = [0.16, 0.05, 0.02][i];
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(peak, time + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 1.6 - i * 0.4);
    o.connect(g); g.connect(master); g.connect(master.echo);
    o.start(time); o.stop(time + 1.7);
  });
}

function schedule() {
  while (nextTime < ctx.currentTime + 0.3) {
    const n = MELODY[step % MELODY.length];
    if (n !== null) bell(nextTime, n);
    nextTime += BEAT;
    step++;
  }
}

export async function startBgm() {
  savePref(true);
  if (timer) return;
  if (!ctx) setup();
  if (ctx.state === 'suspended') await ctx.resume();
  startDrone();
  step = 0;
  nextTime = ctx.currentTime + 0.2;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
  master.gain.linearRampToValueAtTime(0.7, ctx.currentTime + 2.5); // 서서히 커지기
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
  master.gain.linearRampToValueAtTime(0, t + 0.6);
  const old = droneNodes;
  droneNodes = [];
  setTimeout(() => old.forEach((n) => { try { n.stop(); } catch {} }), 700);
}
