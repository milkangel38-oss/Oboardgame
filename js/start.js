// 시작 화면 (움직이는 연기 배경 + 엠블럼 + 시작하기) · 로딩 화면
// 분위기: 어둡고 신비로운 서바이벌 게임 초대장. 그림은 모두 O게임 오리지널(코드로 그림)이에요.

// 금빛 팔각 엠블럼 + 가운데 O 고리 + 붉은 심장빛
export const emblem = (cls = '') => `<svg class="emb ${cls}" viewBox="0 0 200 200" aria-hidden="true">
  <defs>
    <linearGradient id="embG" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff1c4"/><stop offset=".28" stop-color="#e2b766"/><stop offset=".55" stop-color="#8a5f22"/>
      <stop offset=".75" stop-color="#f4d58b"/><stop offset="1" stop-color="#6b4615"/>
    </linearGradient>
    <linearGradient id="embG2" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff6d8"/><stop offset=".4" stop-color="#d9a84f"/><stop offset=".7" stop-color="#7a5019"/><stop offset="1" stop-color="#f0cd7c"/>
    </linearGradient>
    <radialGradient id="embCore" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#ffd0c0"/><stop offset=".25" stop-color="#ff3b2f"/><stop offset=".7" stop-color="#8e0a14"/><stop offset="1" stop-color="#2a0306" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="embIn" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#2a2140"/><stop offset="1" stop-color="#07050d"/></radialGradient>
  </defs>
  <polygon points="62,6 138,6 194,62 194,138 138,194 62,194 6,138 6,62" fill="url(#embG)"/>
  <polygon points="66,16 134,16 184,66 184,134 134,184 66,184 16,134 16,66" fill="#1a1222"/>
  <polygon points="69,22 131,22 178,69 178,131 131,178 69,178 22,131 22,69" fill="url(#embIn)" stroke="url(#embG2)" stroke-width="2"/>
  <g class="emb-ticks" stroke="url(#embG)" stroke-width="3" stroke-linecap="round">
    <line x1="100" y1="27" x2="100" y2="37"/><line x1="100" y1="163" x2="100" y2="173"/><line x1="27" y1="100" x2="37" y2="100"/><line x1="163" y1="100" x2="173" y2="100"/>
  </g>
  <circle class="emb-core" cx="100" cy="100" r="44" fill="url(#embCore)"/>
  <circle cx="100" cy="100" r="47" fill="none" stroke="#3a2608" stroke-width="22" opacity=".6"/>
  <circle cx="100" cy="100" r="46" fill="none" stroke="url(#embG)" stroke-width="18"/>
  <circle cx="100" cy="100" r="55" fill="none" stroke="url(#embG2)" stroke-width="1.5" opacity=".8"/>
  <circle cx="100" cy="100" r="37" fill="none" stroke="url(#embG2)" stroke-width="1.5" opacity=".8"/>
  <path class="emb-shine" d="M70 62 A46 46 0 0 1 128 60" fill="none" stroke="#fffbe8" stroke-width="4" stroke-linecap="round" opacity=".75"/>
</svg>`;

// 금속 글씨 제목 (O게임)
export const titleHtml = (sub) => `<h1 class="st-title" data-text="O게임"><span>O게임</span></h1>
  <p class="st-sub">${sub}</p>`;

// 움직이는 연기 + 떠오르는 불씨 (canvas). 색이 청록 → 푸른빛 → 붉은빛으로 천천히 바뀌어요.
export function smoke($cv) {
  const g = $cv.getContext('2d');
  let W = 0, H = 0, raf = 0, dead = false;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const fit = () => { W = $cv.clientWidth; H = $cv.clientHeight; $cv.width = W * dpr; $cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); };
  fit();
  const ro = new ResizeObserver(fit); ro.observe($cv);
  const R = (a, b) => a + Math.random() * (b - a);
  const puffs = Array.from({ length: 22 }, () => ({ x: R(0, 1), y: R(0.15, 0.95), r: R(0.25, 0.55), vx: R(-0.012, 0.012), vy: R(-0.006, 0.004), ph: R(0, 6.28), k: R(0, 1) }));
  const sparks = Array.from({ length: 46 }, () => ({ x: R(0, 1), y: R(0, 1), v: R(0.015, 0.05), s: R(0.6, 2), ph: R(0, 6.28) }));
  // 팔레트 (청록 · 푸른 · 붉은 · 호박빛)
  const PAL = [[40, 120, 130], [30, 80, 170], [170, 40, 25], [150, 95, 30]];
  const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  let t0 = performance.now();
  const frame = (now) => {
    if (dead) return;
    const t = Math.max(0, now - t0) / 1000;
    const cyc = (t / 14) % PAL.length, i0 = Math.floor(cyc), f = cyc - i0;
    const ease = f < 0.7 ? 0 : (f - 0.7) / 0.3;
    const base = mix(PAL[i0], PAL[(i0 + 1) % PAL.length], ease * ease * (3 - 2 * ease));
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#050308'; g.fillRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    const M = Math.max(W, H);
    for (const p of puffs) {
      p.x += p.vx / 60; p.y += p.vy / 60;
      if (p.x < -0.4) p.x = 1.4; if (p.x > 1.4) p.x = -0.4; if (p.y < -0.3) p.y = 1.2; if (p.y > 1.3) p.y = -0.2;
      const x = p.x * W + Math.sin(t * 0.3 + p.ph) * 30, y = p.y * H + Math.cos(t * 0.23 + p.ph) * 20;
      const r = p.r * M * (0.9 + 0.1 * Math.sin(t * 0.5 + p.ph));
      const c = mix(base, [200, 200, 210], p.k * 0.15);
      const a = 0.075 + 0.05 * Math.sin(t * 0.4 + p.ph);
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${c},${a})`); gr.addColorStop(0.5, `rgba(${c},${a * 0.45})`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
    }
    for (const s of sparks) {
      s.y -= s.v / 60; if (s.y < -0.02) { s.y = 1.02; s.x = Math.random(); }
      const x = s.x * W + Math.sin(t * 0.8 + s.ph) * 12, y = s.y * H;
      const a = 0.35 + 0.35 * Math.sin(t * 2 + s.ph);
      g.fillStyle = `rgba(255,${200 + Math.round(40 * Math.sin(s.ph))},150,${a})`;
      g.beginPath(); g.arc(x, y, s.s, 0, 6.283); g.fill();
    }
    // 가장자리 어둡게
    g.globalCompositeOperation = 'source-over';
    const v = g.createRadialGradient(W / 2, H * 0.45, M * 0.2, W / 2, H * 0.45, M * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.85)');
    g.fillStyle = v; g.fillRect(0, 0, W, H);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  return () => { dead = true; cancelAnimationFrame(raf); ro.disconnect(); };
}

// ───────── 로딩 화면 (게임장으로 이동) ─────────
const LINES = ['게임장으로 이동하는 중입니다…', '참가자 명단을 확인하는 중입니다…', '게임판을 준비하는 중입니다…', '곧 게임이 시작됩니다…'];
const TIPS = [
  '게임 중 <b>Esc</b>를 누르면 메뉴가 열려요.',
  '친구에게 <b>방 코드</b>를 보내면 바로 같은 방에 들어올 수 있어요.',
  '경기 중에 나가면 <b>가넷 보상</b>을 받을 수 없어요.',
  '휴대폰은 게임이 시작되면 <b>가로 화면</b>으로 바뀌어요.',
  '<b>📲 앱 설치</b>를 하면 홈 화면 아이콘으로 바로 들어올 수 있어요.',
  '게임마다 <b>규칙 영상</b>이 있어요. 처음이라면 꼭 보고 시작해요!',
  '이기면 <b>가넷</b>을 얻고, 가넷을 모으면 등급이 올라가요.',
];
// 화면($app) 위에 덮어 씌우고, 아래 화면의 그림이 다 받아지면 사라져요.
export function loadingOverlay($under, done) {
  const $o = document.createElement('div');
  $o.className = 'ld';
  $o.innerHTML = `<div class="ld-mid">${emblem('ld-emb')}<p class="ld-line">${LINES[0]}</p></div>
    <div class="ld-foot"><p class="ld-tip"><span>TIP</span> ${TIPS[Math.floor(Math.random() * TIPS.length)]}</p>
    <div class="ld-bar"><i></i><b>0%</b></div></div>`;
  document.body.appendChild($o);
  const $i = $o.querySelector('.ld-bar i'), $b = $o.querySelector('.ld-bar b'), $line = $o.querySelector('.ld-line');
  const t0 = performance.now(), MIN = 1800;
  let shown = 0, dead = false, li = 0;
  const fonts = document.fonts?.ready || Promise.resolve();
  let fontsOk = false; fonts.then(() => { fontsOk = true; });
  const lineT = setInterval(() => { li = (li + 1) % LINES.length; $line.classList.remove('in'); void $line.offsetWidth; $line.textContent = LINES[li]; $line.classList.add('in'); }, 1500);
  const tick = () => {
    if (dead) return;
    const imgs = [...$under.querySelectorAll('img')];
    const ok = imgs.filter((im) => im.complete).length;
    const real = ((imgs.length ? ok / imgs.length : 1) * 0.7 + (fontsOk ? 0.3 : 0));
    const timeP = Math.min(1, (performance.now() - t0) / MIN);
    const target = Math.min(real, timeP) * 100;
    shown += (target - shown) * 0.18;
    if (target >= 99.9 && shown > 99) shown = 100;
    $i.style.width = shown + '%'; $b.textContent = Math.floor(shown) + '%';
    if (shown >= 100 || performance.now() - t0 > 8000) return finish();
    requestAnimationFrame(tick);
  };
  const finish = () => {
    if (dead) return; dead = true; clearInterval(lineT);
    $i.style.width = '100%'; $b.textContent = '100%';
    setTimeout(() => { $o.classList.add('out'); done?.(); setTimeout(() => $o.remove(), 700); }, 250);
  };
  requestAnimationFrame(tick);
  return () => { if (!dead) { dead = true; clearInterval(lineT); $o.remove(); } };
}
