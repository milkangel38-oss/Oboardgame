// 게임 방법 영상 엔진: 장면 목록(scenes)을 시간에 따라 그려요. renderAt(t)를 프레임마다 불러 녹화해요.
const E = (t) => (t < 0 ? 0 : t > 1 ? 1 : t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a, b, k) => a + (b - a) * k;
function at(tr, t) {
  if (t <= tr[0][0]) return tr[0][1];
  for (let i = 1; i < tr.length; i++) {
    const [t1, v1] = tr[i], [t0, v0] = tr[i - 1];
    if (t <= t1) { const k = E((t - t0) / (t1 - t0 || 1)); const o = { ...v0 }; for (const key in v1) o[key] = lerp(v0[key] ?? v1[key], v1[key], k); return o; }
  }
  return { ...tr[tr.length - 1][1] };
}
export const BG = {
  dark: 'radial-gradient(ellipse at 50% 35%,#2a1d5a,#120a26 75%)',
};
export function play({ meta, scenes }) {
  const st = document.getElementById('st');
  const TITLE = 3.4, END = 3.2;
  let t0 = TITLE;
  const S = scenes.map((s, i) => { const o = { ...s, i, start: t0, d: s.d || 6 }; t0 += o.d; return o; });
  const DUR = t0 + END;
  const layer = document.createElement('div'); layer.className = 'layer'; st.appendChild(layer);
  const els = [];
  S.forEach((s) => {
    const box = document.createElement('div'); box.className = 'scene ' + (s.bg || ''); layer.appendChild(box); s.box = box;
    if (s.html) box.insertAdjacentHTML('beforeend', s.html);
    (s.items || []).forEach((it) => {
      const e = document.createElement('div'); e.className = 'it ' + (it.cls || '');
      if (it.flip) e.innerHTML = `<div class="fl"><div class="bk">${it.h}</div><div class="fr">${it.flip.h}</div></div>`; else e.innerHTML = it.h;
      if (it.w) e.style.width = it.w + 'px';
      box.appendChild(e);
      const k = it.k || [[0, { x: it.x, y: it.y, s: it.s ?? 1, r: it.r ?? 0 }]];
      els.push({ e, it, s, k });
    });
  });
  const cap = document.createElement('div'); cap.className = 'cap'; cap.innerHTML = '<span></span>'; st.appendChild(cap);
  const step = document.createElement('div'); step.className = 'step'; st.appendChild(step);
  const full = document.createElement('div'); full.className = 'full'; st.appendChild(full);
  const pills = (meta.pills || []).map((p) => `<span class="pill">${p}</span>`).join('');
  const TITLE_H = `<div class="t-emoji">${meta.emoji || ''}</div><h1>${meta.name}</h1><p>${meta.sub || ''}</p><div class="row">${pills}</div>`;
  const END_H = `<h1 style="font-size:64px">준비됐나요?</h1><p>확인을 누르면 게임이 시작돼요!</p>`;
  window.DUR = DUR;
  window.SCENES = S.map((s) => ({ start: s.start, d: s.d, narr: s.narr || '', cap: s.cap }));
  window.renderAt = (t) => {
    // 장면 상자: 지금 장면만 보이고 앞뒤 0.35초 겹쳐 페이드
    S.forEach((s) => {
      const a = t - s.start, b = s.start + s.d - t;
      const on = a > -0.35 && b > -0.35 && t >= TITLE - 0.35 && t < DUR - END + 0.35;
      s.box.style.display = on ? '' : 'none';
      s.box.style.opacity = on ? Math.min(1, (a + 0.35) / 0.35, (b + 0.35) / 0.35) : 0;
    });
    for (const o of els) {
      const lt = t - o.s.start;
      if (o.s.box.style.display === 'none') continue;
      const v = at(o.k, lt);
      const inA = o.it.at ?? 0, outA = o.it.out ?? 999;
      let op = lt < inA ? 0 : lt > outA ? Math.max(0, 1 - (lt - outA) / 0.3) : Math.min(1, (lt - inA) / 0.3);
      if (v.o != null) op *= v.o;
      let sc = (v.s ?? 1) * (o.it.zoom ?? (/class="lxw"/.test(o.it.h) ? 2 : /class="rkw"/.test(o.it.h) ? 1.45 : 1));
      if (o.it.pop && lt >= inA && lt < inA + 0.35) sc *= 0.6 + 0.4 * E((lt - inA) / 0.35) + Math.sin(((lt - inA) / 0.35) * Math.PI) * 0.12;
      if (o.it.pulse && lt >= inA) sc *= 1 + Math.sin((lt - inA) * 6) * 0.04;
      o.e.style.transform = `translate(${v.x}px,${v.y}px) translate(-50%,-50%) rotate(${v.r || 0}deg) scale(${sc})`;
      o.e.style.opacity = op;
      o.e.style.zIndex = o.it.z ?? Math.round(v.y);
      if (o.it.flip) {
        const f = Math.max(0, Math.min(1, (lt - o.it.flip.at) / 0.5));
        o.e.querySelector('.fl').style.transform = `scaleX(${Math.max(0.02, Math.abs(Math.cos(f * Math.PI)))})`;
        o.e.querySelector('.fr').style.visibility = f >= 0.5 ? 'visible' : 'hidden';
        o.e.querySelector('.bk').style.visibility = f >= 0.5 ? 'hidden' : 'visible';
      }
      if (o.it.on) o.e.classList.toggle('on', lt >= o.it.on);
    }
    const cur = S.find((s) => t >= s.start && t < s.start + s.d);
    const sp = cap.firstChild, ct = cur ? cur.cap : '';
    if (sp.dataset.v !== ct) { sp.dataset.v = ct; sp.innerHTML = ct; }
    cap.style.opacity = cur ? Math.min(1, (t - cur.start) / 0.3) : 0;
    const sv = cur?.step ? `STEP ${cur.stepNo ?? ''}${cur.stepNo ? ' · ' : ''}${cur.step}` : '';
    if (step.textContent !== sv) step.textContent = sv;
    step.style.display = sv ? '' : 'none';
    const fh = t < TITLE ? TITLE_H : t >= DUR - END ? END_H : '';
    if (full.dataset.v !== fh) { full.dataset.v = fh; full.innerHTML = fh; }
    full.style.display = fh ? '' : 'none';
    full.style.opacity = t < TITLE ? Math.min(1, (TITLE - t) / 0.4) : Math.min(1, (t - (DUR - END)) / 0.4);
  };
  window.ready = true;
}
