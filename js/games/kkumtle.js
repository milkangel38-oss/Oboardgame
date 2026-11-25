// 보드게임: 꿈틀 포격전 (레드팀 vs 블루팀, 2~6명)
// - 대기방: 팀 나누기 · 맵 고르기 · 준비 → 방장 시작
// - 차례인 사람의 화면에서 실제로 시뮬레이션하고(걷기·무기·폭발), 실시간 채널로 다른 사람에게 보여줘요.
//   차례가 끝나면 결과(체력·구멍·지뢰 등)를 방 문서에 저장해요.
import { soundEvent } from '../sound.js';
import { faceHtml } from './face.js';
import { MW, MH, WATER, G, WH, MAPS, makeMask, solid, carve, spawnPoints, walkStep, airStep, surfaceAt } from './kkumtle-world.js';
import { WEAPONS, WMAP, CATS, SPECIALS, startInv } from './kkumtle-weapons.js';

const TURN_MS = 30000;
const HB = 32;
const MOVE_PX = 360; // 이동 게이지 1칸으로 걸을 수 있는 거리 // 오리 몸 높이 (맞는 범위)
const ICONS = Object.fromEntries(['shell', 'homing', 'grenade', 'flame', 'mine', 'pistol', 'mg', 'radio', 'chicken', 'tele', 'drill', 'rope', 'jet', 'chute', 'ladder', 'pill', 'medkit', 'tornado', 'fog'].map((k) => [k, `img/kkumtle/w-${k}.webp`])); // 그림이 있는 무기 아이콘
const imgs = {};
function pic(src) { if (typeof Image === 'undefined') return null; let im = imgs[src]; if (!im) { im = imgs[src] = new Image(); im.src = src; } return im.complete && im.naturalWidth ? im : null; }
const iconHtml = (id) => (ICONS[id] ? `<img src="${ICONS[id]}" alt="">` : WMAP[id].icon);
const TEAMS = { red: { name: '레드팀', col: '#ff4f5e' }, blue: { name: '블루팀', col: '#3d7bff' } };
const SKINS = [ // 12마리 (그림이 오기 전 임시 색)
  ['#ffb5c5', '#c4607a'], ['#ffd27a', '#c28a20'], ['#a8e6a1', '#4f9a48'], ['#9fd3ff', '#3a7fc0'], ['#d6b3ff', '#7a4fc0'], ['#ffb08a', '#c0603a'],
  ['#f5f0e6', '#a89a80'], ['#ff8fb8', '#b03a6a'], ['#8fe8d8', '#2f9a8a'], ['#c8a080', '#7a5030'], ['#b0b8c8', '#5a6070'], ['#ffe066', '#b09010'],
];
const ACC = ['', 'hat', 'glasses', 'bow', 'band', 'crown', 'mask', 'cap', 'antenna', 'beard', 'helmet', 'flower'];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const other = (t) => (t === 'red' ? 'blue' : 'red');
const alive = (s, team) => s.worms.some((w) => w.team === team && !w.dead);

// ── 진행 ──
function newRound(state, now) {
  const seed = (Math.random() * 1e9) | 0;
  const mask = makeMask(state.map, seed);
  const byTeam = { red: state.order.filter((u) => state.teams[u] === 'red'), blue: state.order.filter((u) => state.teams[u] === 'blue') };
  const counts = { red: Math.max(state.per, byTeam.red.length), blue: Math.max(state.per, byTeam.blue.length) };
  const pts = spawnPoints(mask, counts.red + counts.blue, seed);
  const worms = [];
  let k = 0, skin = 0;
  for (const t of ['red', 'blue']) for (let i = 0; i < counts[t]; i++) {
    const p = pts[k++];
    worms.push({ id: `${t[0]}${i}`, team: t, owner: byTeam[t][i % byTeam[t].length], x: p.x, y: p.y, hp: 100, dead: false, skin: (skin++ + state.round * 5) % 12 });
  }
  const first = Math.random() < 0.5 ? 'red' : 'blue';
  const pool = [2, 3, 4, 5, 6, 7, 8, 9, 10].sort(() => Math.random() - 0.5), drops = pool.slice(0, Math.random() < 0.5 ? 2 : 3).sort((a, b) => a - b);
  const s = { ...state, phase: 'play', round: state.round + 1, seed, craters: [], worms, mines: [], tors: [], ladders: [], fog: null, crates: [], drops, inv: { red: startInv(), blue: startInv() }, ti: { red: -1, blue: -1 }, turn: { team: other(first), n: 0 }, roundWinner: null };
  return nextTurn(s, now);
}
function nextTurn(state, now) {
  const team = other(state.turn.team);
  const t = alive(state, team) ? team : state.turn.team;
  const mine = state.worms.filter((w) => w.team === t && !w.dead);
  const idx = (state.ti[t] + 1) % mine.length;
  const w = mine[idx];
  const n = state.turn.n + 1;
  const drop = (state.drops || []).includes(n) ? { x: Math.round(160 + Math.random() * (MW - 320)), item: SPECIALS[(Math.random() * SPECIALS.length) | 0], dir: Math.random() < 0.5 ? 1 : -1 } : null;
  return { ...state, ti: { ...state.ti, [t]: idx }, turn: { team: t, wid: w.id, uid: w.owner, wind: Math.round((Math.random() * 2 - 1) * 10) / 10, deadline: now + TURN_MS, n, drop },
    tors: (state.tors || []).filter((x) => x.until >= n), fog: state.fog && state.fog.until >= n ? state.fog : null };
}
function checkRound(state, now) {
  const r = alive(state, 'red'), b = alive(state, 'blue');
  if (r && b) return null;
  const win = r ? 'red' : b ? 'blue' : 'draw';
  const wins = { ...state.wins }; if (win !== 'draw') wins[win]++;
  return { ...state, phase: 'roundEnd', roundWinner: win, wins, endAt: now + 6000, turn: { ...state.turn, deadline: 0 } };
}
function cleanInv(v, old) { if (!v) return old; return Object.fromEntries(WEAPONS.map((w) => [w.id, Number.isFinite(+v[w.id]) ? Math.max(-1, Math.min(9, Math.round(+v[w.id]))) : old[w.id]])); }
function matchOver(s) { const need = Math.floor(s.rounds / 2) + 1; return s.wins.red >= need || s.wins.blue >= need || s.round >= s.rounds; }
export function finalResult(state, players) {
  const dmg = (u) => state.stats?.[u]?.dmg || 0;
  const tdmg = (t) => state.order.filter((u) => state.teams[u] === t).reduce((a, u) => a + dmg(u), 0);
  const win = state.wins.red > state.wins.blue ? 'red' : state.wins.blue > state.wins.red ? 'blue' : tdmg('red') > tdmg('blue') ? 'red' : tdmg('blue') > tdmg('red') ? 'blue' : null;
  const ranking = [...state.order].sort((a, b) => (state.teams[b] === win) - (state.teams[a] === win) || dmg(b) - dmg(a))
    .map((uid) => ({ uid, place: win ? (state.teams[uid] === win ? 1 : 2) : 1, score: `딜 ${dmg(uid)} · 킬 ${state.stats?.[uid]?.kills || 0}`, garnets: win && state.teams[uid] === win ? 2 : 0 }));
  return {
    message: win ? `${TEAMS[win].name} 승리! 🏆 (${state.wins.red} : ${state.wins.blue})` : `무승부! (${state.wins.red} : ${state.wins.blue})`,
    winners: ranking.filter((r) => r.place === 1 && win).map((r) => r.uid),
    ranking, rewards: Object.fromEntries(ranking.map((r) => [r.uid, r.garnets])),
  };
}

export default {
  id: 'kkumtle',
  name: '꿈틀 포격전',
  emoji: '💥',
  category: 'board',
  minPlayers: 2,
  maxPlayers: 6,
  duration: '10~25분',
  rewards: [2],
  rewardLabel: '승리 팀 +2',
  description: '레드팀 vs 블루팀! 바람을 읽고 무기를 골라 땅을 부숴라',
  options: [
    { key: 'rounds', label: '라운드 수', choices: [1, 2, 3, 4, 5], default: 3 },
    { key: 'worms', label: '팀당 꿈틀이', choices: [1, 2, 3], default: 2 },
  ],
  rules: [
    '대기방에서 레드팀 · 블루팀으로 나누고, 방장이 맵(도시 · 산 · 하늘 · 바다 · 설산 · 해외)을 골라 시작해요.',
    '두 팀이 번갈아 차례! 차례마다 30초 안에 꿈틀이 한 마리를 움직이고 공격해요.',
    '왼쪽 아래 조이스틱: 좌우 = 걷기, 위아래 = 조준 · 오른쪽 아래: 점프(두 번 누르면 높이 뒤로 덤블링) · 발사 · 가운데 아래: 무기 고르기',
    '공격 무기를 쓰면 차례가 끝나요. 이동 · 유틸 아이템은 쓰고도 계속 움직일 수 있어요.',
    '🪜 사다리: 내 자리에 세우고 조이스틱 위아래로 오르내려요. 좌우로 움직이거나 점프하면 내려와요.',
    '🚁 로켓배송! 라운드마다 2~3번 헬기가 날아와 보급 상자를 떨어뜨려요. 상자를 먹으면 특수무기(무전기 · 닭 · 제트배낭 · 토네이도 · 안개)를 쓸 수 있어요.',
    '데미지(정타 기준, 빗맞으면 줄어요): 포탄 20 · 수류탄 30 · 화염방사기 50 · 지뢰 40 · 권총 30 · 기관총 50 · 무전기 미사일 1발당 60 · 닭 80',
    '폭발하면 땅이 사라지고, 맞은 꿈틀이는 날아가요. 바다에 빠지거나 하늘에서 떨어지면 탈락!',
    '화면은 끌어서 움직이고, 휠(모바일은 두 손가락)로 확대 · 축소해요. 오른쪽 위 미니맵을 눌러도 이동해요.',
    '상대 팀 꿈틀이를 모두 쓰러뜨리면 라운드 승리! 라운드를 더 많이 이긴 팀이 최종 승리 (같으면 딜량이 많은 팀).',
    '가넷: 승리 팀 모두 +2',
  ],

  setup(players, room) {
    const order = players.map((p) => p.uid);
    const teams = Object.fromEntries(order.map((u, i) => [u, i % 2 ? 'blue' : 'red']));
    return {
      phase: 'lobby', order, host: room?.hostId || order[0], teams, ready: {}, map: 'mountain',
      rounds: Math.min(5, Math.max(1, Number(room?.options?.rounds) || 3)), per: Math.min(3, Math.max(1, Number(room?.options?.worms) || 2)),
      round: 0, wins: { red: 0, blue: 0 }, stats: Object.fromEntries(order.map((u) => [u, { dmg: 0, kills: 0 }])), turn: { team: 'blue', n: 0 },
    };
  },

  move(state, move, uid, players) {
    const now = Date.now();
    const t = move?.type;
    const isHost = uid === state.host || !players[state.host];
    if (state.phase === 'lobby') {
      if (t === 'team') { if (!TEAMS[move.team]) throw new Error('__noop'); return { state: { ...state, teams: { ...state.teams, [uid]: move.team }, ready: { ...state.ready, [uid]: false } } }; }
      if (t === 'map') { if (!isHost) throw new Error('방장만 맵을 고를 수 있어요'); if (!MAPS[move.map]) throw new Error('__noop'); return { state: { ...state, map: move.map } }; }
      if (t === 'ready') return { state: { ...state, ready: { ...state.ready, [uid]: !state.ready[uid] } } };
      if (t === 'start') {
        if (!isHost) throw new Error('방장만 시작할 수 있어요');
        const r = state.order.filter((u) => state.teams[u] === 'red').length, b = state.order.length - r;
        if (!r || !b) throw new Error('두 팀 모두 한 명 이상 있어야 해요');
        if (state.order.some((u) => u !== uid && players[u] && !state.ready[u])) throw new Error('아직 준비하지 않은 사람이 있어요');
        return { state: newRound(state, now) };
      }
      throw new Error('__noop');
    }
    if (t === 'tick') {
      if (state.phase === 'roundEnd' && now >= state.endAt) {
        if (matchOver(state)) { const d = { ...state, phase: 'done' }; return { state: d, result: finalResult(d, players) }; }
        return { state: newRound(state, now) };
      }
      if (state.phase === 'play' && now >= state.turn.deadline + 9000) return { state: nextTurn(state, now) };
      throw new Error('__noop');
    }
    if (t === 'end') {
      if (state.phase !== 'play' || state.turn.uid !== uid || move.n !== state.turn.n) throw new Error('__noop');
      const r = move.res || {};
      const ws = new Map((r.worms || []).map((w) => [w.id, w]));
      const worms = state.worms.map((w) => { const n = ws.get(w.id); if (!n) return w; return { ...w, x: Math.round(+n.x), y: Math.round(+n.y), hp: Math.max(0, Math.min(200, Math.round(+n.hp))), dead: w.dead || !!n.dead }; });
      const stats = { ...state.stats };
      for (const [u, d] of Object.entries(r.stats || {})) { if (!stats[u]) continue; stats[u] = { dmg: stats[u].dmg + Math.max(0, d.dmg | 0), kills: stats[u].kills + Math.max(0, d.kills | 0) }; }
      const s = { ...state, worms, stats,
        craters: [...state.craters, ...(r.craters || []).map((c) => c.map((v) => Math.round(+v)))].slice(-400),
        mines: (r.mines || state.mines).slice(0, 30), tors: (r.tors || state.tors).slice(0, 6), ladders: Array.isArray(r.ladders) ? r.ladders.slice(0, 20).map((l) => ({ x: Math.round(+l.x), y1: Math.round(+l.y1), y2: Math.round(+l.y2) })) : state.ladders || [], fog: r.fog === undefined ? state.fog : r.fog,
        crates: Array.isArray(r.crates) ? r.crates.slice(0, 12).map((k) => ({ id: String(k.id), x: Math.round(+k.x), y: Math.round(+k.y), item: SPECIALS.includes(k.item) ? k.item : 'radio' })) : state.crates || [],
        inv: r.invs ? { red: cleanInv(r.invs.red, state.inv.red), blue: cleanInv(r.invs.blue, state.inv.blue) } : r.inv ? { ...state.inv, [state.turn.team]: cleanInv(r.inv, state.inv[state.turn.team]) } : state.inv };
      const re = checkRound(s, now);
      if (re) return { state: re };
      return { state: nextTurn(s, now) };
    }
    throw new Error('알 수 없는 동작이에요');
  },

  render(el, ctx) {
    if (typeof document === 'undefined') return;
    const { state, finished } = ctx;
    if (state.phase === 'lobby') { teardown(); lobby(el, ctx); return; }
    if (finished || state.phase === 'done') { teardown(); results(el, ctx); return; }
    const code = `${ctx.room?.code || 'local'}:${ctx.room?.startedAt || 0}`;
    if (!ctl || ctl.code !== code) { teardown(); ctl = build(code, ctx); }
    ctl.ctx = ctx;
    if (!el.querySelector('.kw-holder')) {
      el.innerHTML = '<div class="kw-holder">💥 꿈틀 포격전 진행 중 <button class="btn sm" data-open>화면 열기</button></div>';
      el.querySelector('[data-open]').onclick = () => { if (ctl && !ctl.root.isConnected) document.body.appendChild(ctl.root); };
    }
    onState(ctl);
  },
};

// ───────────────── 대기방 ─────────────────
function lobby(el, { state, me, players, sendMove, room }) {
  const isHost = room?.hostId === me || state.host === me;
  const col = (t) => {
    const us = state.order.filter((u) => state.teams[u] === t);
    return `<div class="kw-team ${t}"><h4>${TEAMS[t].name} <small>${us.length}명</small></h4>
      ${us.map((u) => `<div class="kw-pl ${u === me ? 'me' : ''}"><span class="kw-face">${faceHtml(players[u] || { name: '?' })}</span><b>${esc(players[u]?.name || '?')}</b>${u === state.host ? '<em>방장</em>' : state.ready[u] ? '<i>준비 ✔</i>' : '<i class="no">대기</i>'}</div>`).join('') || '<p class="kw-empty">아무도 없어요</p>'}
      ${state.teams[me] !== t && state.order.includes(me) ? `<button class="btn sm" data-team="${t}">${TEAMS[t].name}으로 이동</button>` : ''}</div>`;
  };
  const allReady = state.order.every((u) => u === state.host || state.ready[u] || !players[u]);
  const two = ['red', 'blue'].every((t) => state.order.some((u) => state.teams[u] === t));
  el.innerHTML = `<div class="kw-lobby">
    <div class="kw-teams">${col('red')}<div class="kw-vs">VS</div>${col('blue')}</div>
    <div class="kw-sec">🗺️ 맵 선택 ${isHost ? '' : '<small>(방장이 골라요)</small>'}</div>
    <div class="kw-maps">${Object.entries(MAPS).map(([k, m]) => `<button class="kw-map ${state.map === k ? 'on' : ''}" data-map="${k}" ${isHost ? '' : 'disabled'} style="--s1:${m.sky[0]};--s2:${m.sky[1]};--d:${m.dirt[0]};--t:${m.top};--bg:url(img/kkumtle/bg-${k}.webp)"><i></i><b>${m.emoji} ${m.name}</b><small>${m.desc}</small></button>`).join('')}</div>
    <div class="kw-opts">라운드 <b>${state.rounds}</b> · 팀당 꿈틀이 <b>${state.per}</b>마리 <small>(먼저 ${Math.floor(state.rounds / 2) + 1}라운드 이기면 승리)</small></div>
    ${state.order.includes(me) ? (isHost
      ? `<button class="btn primary block" data-start ${allReady && two ? '' : 'disabled'}>${!two ? '두 팀에 모두 사람이 있어야 해요' : allReady ? '🚀 게임 시작!' : '모두 준비하면 시작할 수 있어요'}</button>`
      : `<button class="btn ${state.ready[me] ? '' : 'primary'} block" data-ready>${state.ready[me] ? '준비 취소' : '준비 완료!'}</button>`) : ''}
  </div>`;
  el.querySelectorAll('[data-team]').forEach((b) => (b.onclick = () => sendMove({ type: 'team', team: b.dataset.team })));
  el.querySelectorAll('[data-map]').forEach((b) => (b.onclick = () => sendMove({ type: 'map', map: b.dataset.map })));
  el.querySelector('[data-ready]')?.addEventListener('click', () => sendMove({ type: 'ready' }));
  el.querySelector('[data-start]')?.addEventListener('click', () => sendMove({ type: 'start' }));
}

function dmgTable(state, players, me) {
  return ['red', 'blue'].map((t) => `<div class="kw-rt ${t}"><h5>${TEAMS[t].name} <b>${state.wins[t]}</b>승</h5>${state.order.filter((u) => state.teams[u] === t).sort((a, b) => (state.stats[b]?.dmg || 0) - (state.stats[a]?.dmg || 0)).map((u) => `<div class="${u === me ? 'me' : ''}"><span>${esc(players[u]?.name || '?')}</span><em>딜 <b>${state.stats[u]?.dmg || 0}</b></em><em>킬 <b>${state.stats[u]?.kills || 0}</b></em></div>`).join('')}</div>`).join('');
}
let shownEnd = '';
function results(el, { state, me, players, room }) {
  const res = room?.result || finalResult(state, players);
  el.innerHTML = `<div class="kw-end"><h3>${esc(res.message)}</h3><div class="kw-rts">${dmgTable(state, players, me)}</div></div>`;
  const key = `${room?.code}:${room?.startedAt}`;
  if (shownEnd !== key) {
    shownEnd = key;
    const $m = document.createElement('div');
    $m.className = 'kw-modal';
    $m.innerHTML = `<div class="kw-mbox"><div class="kw-mt">🏆 경기 결과</div><p>${esc(res.message)}</p><div class="kw-rts">${dmgTable(state, players, me)}</div><button class="btn primary block" data-x>확인</button></div>`;
    document.body.appendChild($m);
    $m.querySelector('[data-x]').onclick = () => $m.remove();
  }
}

// ───────────────── 게임 화면 ─────────────────
let ctl = null;
function teardown() {
  if (!ctl) return;
  cancelAnimationFrame(ctl.raf); ctl.unwatch?.(); ctl.live?.close?.(ctl.ctx?.me);
  window.removeEventListener('keydown', ctl.onKey); window.removeEventListener('keyup', ctl.onKey);
  ctl.root.remove(); document.documentElement.classList.remove('kw-on');
  ctl = null;
}

function build(code, ctx) {
  const root = document.createElement('div');
  root.className = 'kw';
  root.innerHTML = `
    <canvas class="kw-cv"></canvas>
    <div class="kw-tl" data-teams></div>
    <div class="kw-tc"><div class="kw-round" data-round></div><div class="kw-timer" data-timer></div></div>
    <div class="kw-gauge">
      <div class="kw-dialbox"><canvas class="kw-dial" width="128" height="128"></canvas><div class="kw-windg" title="바람"><i class="l"><s></s></i><i class="r"><s></s></i></div></div>
      <div class="kw-bars">
        <div class="kw-bar hp"><b>체력</b><u><s></s></u><em data-hpv></em></div>
        <div class="kw-bar pow" data-powbar title="눌러서 표시목을 놓아요"><b>파워</b><u><s></s><i class="mark" hidden></i></u><em data-powv></em></div>
        <div class="kw-bar mv"><b>이동</b><u><s></s></u><em data-mvv></em></div>
      </div>
    </div>
    <canvas class="kw-mini" width="200" height="100"></canvas>
    <div class="kw-center" data-center></div>
    <div class="kw-joy"><div class="kw-jpad"><i></i></div></div>
    <button class="kw-wbtn" data-wbtn><span data-wicon><img src="img/kkumtle/w-shell.webp" alt=""></span><small data-wname>일반 포탄</small></button>
    <div class="kw-rb"><button class="kw-jump" data-jump>⤴<small>점프</small></button><button class="kw-fire" data-fire><span>발사</span></button></div>
    <div class="kw-panel" data-panel hidden></div>
    <div class="kw-rmodal" data-rmodal hidden></div>`;
  document.body.appendChild(root);
  document.documentElement.classList.add('kw-on');
  const c = {
    code, root, ctx, cv: root.querySelector('.kw-cv'), mini: root.querySelector('.kw-mini'), raf: 0, last: performance.now(),
    cam: { x: MW / 2, y: MH / 2, z: 0 }, camGoal: null, joy: { x: 0, y: 0 }, keys: {},
    ter: null, turnSeen: -1, W: null, angle: 0.6, facing: 1, charge: -1,
    others: {}, live: null, lastSend: 0, lastTick: 0, msg: '', msgUntil: 0, target: null, sel: 'shell', lastJump: 0, acc: 0,
  };
  ctl = c;
  if (typeof location !== 'undefined' && location.search.includes('test')) window.__kw = c;
  bindInput(c);
  import('../backend/index.js').then(async ({ backend }) => {
    if (ctl !== c) return;
    const live = backend.live ? await backend.live(ctx.room?.code || 'local') : null;
    if (!live || ctl !== c) return;
    c.live = live; live.onLeave?.(ctx.me);
    c.unwatch = live.watch((all) => { c.others = all || {}; });
  });
  c.raf = requestAnimationFrame(frame);
  return c;
}

// ── 지형 (비트맵 + 그림) ──
function terrain(c, craters) {
  const { state } = c.ctx;
  let T = c.ter;
  const tex = pic(`img/kkumtle/tex-${state.map}.webp`);
  if (!T || T.seed !== state.seed || T.map !== state.map || craters.length < T.n || (tex && !T.tex)) {
    const mask = makeMask(state.map, state.seed);
    const cv = T?.cv || document.createElement('canvas'); cv.width = MW; cv.height = MH;
    const x = cv.getContext('2d'), img = x.createImageData(MW, MH), d = img.data, M = MAPS[state.map] || MAPS.mountain;
    const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const d1 = hex(M.dirt[0]), d2 = hex(M.dirt[1]), tp = hex(M.top);
    for (let y = 0; y < MH; y++) for (let xx = 0; xx < MW; xx++) {
      const i = y * MW + xx; if (!mask[i]) continue;
      let top = false; for (let k = 1; k <= 6; k++) if (y - k < 0 || !mask[i - k * MW]) { top = true; break; }
      const n = ((xx * 73856093) ^ (y * 19349663)) >>> 0, nz = ((n % 23) - 11) * 1.4, blot = Math.sin(xx * 0.07 + Math.sin(y * 0.05) * 2) * Math.sin(y * 0.06 + xx * 0.01) * 9;
      const t = Math.min(1, (y / MH) * 1.3);
      const c0 = top ? tp : [d1[0] + (d2[0] - d1[0]) * t, d1[1] + (d2[1] - d1[1]) * t, d1[2] + (d2[2] - d1[2]) * t];
      d[i * 4] = c0[0] + nz + blot; d[i * 4 + 1] = c0[1] + nz + blot; d[i * 4 + 2] = c0[2] + nz + blot; d[i * 4 + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    if (tex) { // 땅 질감 그림: 땅 모양 그대로 질감을 입히고, 맨 위 표면 색만 얇게 남겨요
      const top = document.createElement('canvas'); top.width = MW; top.height = MH;
      const tx = top.getContext('2d'), ti = tx.createImageData(MW, MH), td = ti.data;
      for (let i = 0; i < MW * MH; i++) if (mask[i]) { const y = (i / MW) | 0; let k = 1; while (k <= 4 && y - k >= 0 && mask[i - k * MW]) k++; if (k <= 4) { td[i * 4] = tp[0]; td[i * 4 + 1] = tp[1]; td[i * 4 + 2] = tp[2]; td[i * 4 + 3] = 230; } }
      tx.putImageData(ti, 0, 0);
      x.globalCompositeOperation = 'source-in'; x.fillStyle = x.createPattern(tex, 'repeat'); x.fillRect(0, 0, MW, MH);
      x.globalCompositeOperation = 'source-over'; x.drawImage(top, 0, 0);
    }
    T = c.ter = { seed: state.seed, map: state.map, mask, cv, n: 0, mini: null, tex: !!tex };
  }
  if (craters.length > T.n) {
    const x = T.cv.getContext('2d');
    x.globalCompositeOperation = 'destination-out';
    for (let i = T.n; i < craters.length; i++) { const [cx, cy, r] = craters[i]; carve(T.mask, cx, cy, r); x.beginPath(); x.arc(cx, cy, r + 0.5, 0, 7); x.fill(); }
    x.globalCompositeOperation = 'source-over';
    T.n = craters.length; T.mini = null;
  }
  return T;
}

// ── 방 문서가 바뀌었을 때 ──
function onState(c) {
  const { state, me } = c.ctx;
  if (state.phase === 'play' && state.turn.n !== c.turnSeen) {
    c.turnSeen = state.turn.n;
    c.W = null; c.target = null; c.charge = -1;
    const w = state.worms.find((x) => x.id === state.turn.wid);
    if (w) c.camGoal = { x: w.x, y: w.y - 60 };
    if (state.turn.uid === me) startTurn(c);
    if (state.turn.drop) {
      const n = state.turn.n, T = terrain(c, state.craters), dx = state.turn.drop.x, sy = (surfaceAt(T.mask, dx) + 1) || WATER;
      setTimeout(() => { if (c.turnSeen !== n) return; flash(c, '🚁 로켓배송 도착! 보급 상자를 먹어라', 2200); c.camGoal = { x: dx, y: Math.min(sy, WATER) - 150 }; }, state.turn.uid === me ? 1300 : 0);
      setTimeout(() => { if (c.turnSeen === n && w) c.camGoal = { x: w.x, y: w.y - 60 }; }, 5200);
    }
  }
  roundModal(c);
}
function myTurn(c) { const { state, me, finished } = c.ctx; return !finished && state.phase === 'play' && state.turn.uid === me; }

// 차례 시작: 내 화면에서 돌릴 세상
function startTurn(c) {
  const { state, room } = c.ctx;
  const T = terrain(c, state.craters);
  c.W = {
    n: state.turn.n, mask: T.mask, wid: state.turn.wid, team: state.turn.team,
    worms: state.worms.map((w) => ({ ...w, air: false, vx: 0, vy: 0, flip: 0, ph: 0 })),
    projs: [], fx: [], newCr: [], mines: (state.mines || []).map((m) => ({ ...m })), tors: (state.tors || []).map((t) => ({ ...t })), ladders: (state.ladders || []).map((l) => ({ ...l })), fog: state.fog,
    mv: 1, invs: { red: { ...state.inv.red }, blue: { ...state.inv.blue } }, stats: {}, attack: false, ending: false, settle: 0, sent: false,
    crates: (state.crates || []).map((k) => ({ ...k, air: false, vy: 0 })), heli: state.turn.drop ? { x: state.turn.drop.dir > 0 ? -160 : MW + 160, y: Math.max(60, Math.min(560, ((surfaceAt(T.mask, state.turn.drop.x) + 1) || WATER) - 210)), xd0: state.turn.drop.x, item: state.turn.drop.item, dir: state.turn.drop.dir, done: false } : null,
    rope: null, jet: null, chute: false, drill: null, chick: null, gren: null, mg: null, flame: null,
  };
  c.W.inv = c.W.invs[c.W.team];
  const me0 = c.W.worms.find((w) => w.id === c.W.wid);
  c.facing = me0 && me0.x < MW / 2 ? 1 : -1;
  if (c.W.inv[c.sel] === 0) c.sel = 'shell';
  if (c.sel === 'grenade') c.W.gren = { end: performance.now() + 5000 };
  if (room) soundEvent(room.code, `kw:turn:${state.turn.n}`, 'ok');
  flash(c, '🎯 내 차례!');
}
function flash(c, m, ms = 1500) { c.msg = m; c.msgUntil = performance.now() + ms; }

// ───────────────── 입력 ─────────────────
function bindInput(c) {
  const R = c.root;
  const $j = R.querySelector('.kw-jpad'), $k = $j.querySelector('i');
  const jmove = (e) => { const r = $j.getBoundingClientRect(); let x = ((e.clientX - r.left) / r.width) * 2 - 1, y = -(((e.clientY - r.top) / r.height) * 2 - 1); const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; } c.joy = { x, y }; $k.style.transform = `translate(${x * 100}%, ${-y * 100}%)`; };
  $j.addEventListener('pointerdown', (e) => { e.preventDefault(); $j.setPointerCapture(e.pointerId); jmove(e); });
  $j.addEventListener('pointermove', (e) => { if ($j.hasPointerCapture(e.pointerId)) jmove(e); });
  const jend = () => { c.joy = { x: 0, y: 0 }; $k.style.transform = ''; };
  $j.addEventListener('pointerup', jend); $j.addEventListener('pointercancel', jend);
  R.querySelector('[data-jump]').addEventListener('pointerdown', (e) => { e.preventDefault(); jump(c); });
  const $f = R.querySelector('[data-fire]');
  $f.addEventListener('pointerdown', (e) => { e.preventDefault(); fireDown(c); });
  const fu = () => fireUp(c);
  $f.addEventListener('pointerup', fu); $f.addEventListener('pointercancel', fu); $f.addEventListener('pointerleave', fu);
  R.querySelector('[data-wbtn]').onclick = () => openPanel(c);
  // 파워 게이지를 눌러 표시목 놓기 (내 화면에만, 다음 판에도 기억)
  try { const v = localStorage.getItem('kw-mark'); if (v != null) c.mark = +v; } catch {}
  const $pb = R.querySelector('[data-powbar] u');
  const setMark = (e) => { const r = $pb.getBoundingClientRect(); c.mark = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); try { localStorage.setItem('kw-mark', String(c.mark)); } catch {} };
  $pb.addEventListener('pointerdown', (e) => { e.preventDefault(); $pb.setPointerCapture(e.pointerId); setMark(e); });
  $pb.addEventListener('pointermove', (e) => { if ($pb.hasPointerCapture(e.pointerId)) setMark(e); });
  // 화면: 끌기 · 확대 · 탭(무전기 목표)
  const cv = c.cv, pts = new Map();
  let pinch = null, tap = null;
  cv.addEventListener('pointerdown', (e) => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); tap = pts.size === 1 ? { x: e.clientX, y: e.clientY, moved: false } : null; c.camGoal = null; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: c.cam.z }; } });
  cv.addEventListener('pointermove', (e) => {
    const p = pts.get(e.pointerId); if (!p) return;
    if (pts.size === 1) { c.cam.x -= (e.clientX - p.x) / c.cam.z; c.cam.y -= (e.clientY - p.y) / c.cam.z; if (tap && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 6) tap.moved = true; }
    p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()]; zoomTo(c, pinch.z * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d)); }
  });
  const up = (e) => {
    if (tap && !tap.moved && pts.size === 1) {
      const r = cv.getBoundingClientRect(), wx = c.cam.x + (e.clientX - r.left - r.width / 2) / c.cam.z, wy = c.cam.y + (e.clientY - r.top - r.height / 2) / c.cam.z;
      if (myTurn(c) && WMAP[c.sel]?.target) { c.target = { x: wx, y: wy }; flash(c, '📍 목표 지정! 발사 버튼을 누르세요', 1200); }
    }
    pts.delete(e.pointerId); if (pts.size < 2) pinch = null; tap = null;
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', (e) => { e.preventDefault(); c.camGoal = null; zoomTo(c, c.cam.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12)); }, { passive: false });
  c.mini.addEventListener('pointerdown', (e) => { const r = c.mini.getBoundingClientRect(); c.camGoal = { x: ((e.clientX - r.left) / r.width) * MW, y: ((e.clientY - r.top) / r.height) * MH }; });
  c.onKey = (e) => {
    if (e.target?.tagName === 'INPUT') return;
    const d = e.type === 'keydown', k = e.key;
    const dir = { ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd', a: 'l', d: 'r', w: 'u', s: 'd' }[k];
    if (dir) { e.preventDefault(); c.keys[dir] = d; }
    if (k === 'Enter' && d && !e.repeat) { e.preventDefault(); jump(c); }
    if (k === ' ') { e.preventDefault(); if (d && !e.repeat) fireDown(c); if (!d) fireUp(c); }
    if ((k === 'q' || k === 'Tab') && d) { e.preventDefault(); openPanel(c); }
  };
  window.addEventListener('keydown', c.onKey); window.addEventListener('keyup', c.onKey);
}
function zoomTo(c, z) { const cw = c.cv.clientWidth || 800, ch = c.cv.clientHeight || 400; const min = Math.min(cw / MW, ch / MH); c.cam.z = Math.max(min, Math.min(2.4, z)); }
function joyNow(c) { const K = c.keys; const kx = (K.r ? 1 : 0) - (K.l ? 1 : 0), ky = (K.u ? 1 : 0) - (K.d ? 1 : 0); return kx || ky ? { x: kx, y: ky } : c.joy; }

const canAct = (c) => myTurn(c) && c.W && c.W.n === c.ctx.state.turn.n && !c.W.attack && !c.W.ending && !c.W.sent;
const meW = (c) => c.W?.worms.find((w) => w.id === c.W.wid);
function jump(c) {
  if (!canAct(c)) return;
  const w = meW(c); if (!w || w.dead || c.W.rope || c.W.jet || c.W.drill) return;
  const now = performance.now();
  if (w.climb) { w.climb = false; w.air = false; }
  if (!w.air) { if (c.W.mv < 0.08) { flash(c, '이동 게이지가 없어요', 900); return; } c.W.mv = Math.max(0, c.W.mv - 0.08); w.air = true; w.vx = c.facing * 140; w.vy = -230; c.lastJump = now; }
  else if (now - c.lastJump < 380 && !w.flip) { w.vx = -c.facing * 80; w.vy = -400; w.flip = now; } // 두 번 누르면 높이 뒤로 덤블링
}

// ───────────────── 무기 사용 ─────────────────
function useItem(c, id) { const inv = c.W.inv; if (inv[id] === 0) return false; if (inv[id] > 0) inv[id]--; return true; }
function aimDir(c) { return [Math.cos(c.angle) * c.facing, -Math.sin(c.angle)]; }
function fireDown(c) {
  if (myTurn(c) && c.W?.chick && !c.W.sent) { boomChicken(c); return; }
  if (!canAct(c)) return;
  const W = c.W, w = meW(c), id = c.sel, def = WMAP[id];
  if (!w || w.dead) return;
  if (W.rope) { const r = W.rope; w.air = true; w.vx = r.vx; w.vy = r.vy; W.rope = null; return; }
  if (W.jet) { W.jet = null; w.air = true; w.vx = w.vx || 0; w.vy = w.vy || 0; return; }
  if (id === 'chute') { if (!w.air) { flash(c, '🪂 떨어지는 중에 눌러요'); return; } W.chute = !W.chute; return; }
  if (W.inv[id] === 0) { flash(c, def.sp ? '🔒 보급 상자를 먹어야 쓸 수 있어요' : '남은 개수가 없어요'); return; }
  if (def.charge) { c.charge = 0; return; }
  const dir = aimDir(c), cx = w.x + dir[0] * 12, cy = w.y - WH / 2 + dir[1] * 12;
  if (id === 'pistol') { useItem(c, id); W.attack = true; shoot(c, cx, cy, dir, 30, 220, 7); }
  else if (id === 'mg') { useItem(c, id); W.attack = true; W.mg = { left: 10, t: 0 }; }
  else if (id === 'flame') { useItem(c, id); W.attack = true; W.flame = { t: 0, hit: new Set() }; }
  else if (id === 'radio') {
    if (!c.target) { flash(c, '📍 먼저 화면을 눌러 목표를 정하세요'); return; }
    useItem(c, id); W.attack = true;
    for (let i = 0; i < 3; i++) W.projs.push({ k: 'air', x: c.target.x - 300 + i * 60, y: -60 - i * 20, vx: 260, vy: 200, t: -i * 0.15 });
    flash(c, '✈️ 공습 요청!');
  }
  else if (id === 'chicken') { useItem(c, id); W.attack = true; W.chick = { k: 'chick', x: w.x + c.facing * 14, y: w.y, vx: 0, vy: 0, air: false, face: c.facing, t: 0 }; W.projs.push(W.chick); flash(c, '🐔 발사 버튼을 다시 누르면 폭발!'); }
  else if (id === 'drill') { if (!w.air) { useItem(c, id); W.drill = { t: 0 }; } }
  else if (id === 'rope') ropeShoot(c, w, dir);
  else if (id === 'jet') { useItem(c, id); W.jet = { t: 5 }; w.air = true; w.vx = 0; w.vy = -60; }
  else if (id === 'pill' || id === 'medkit') { useItem(c, id); const before = w.hp; w.hp = Math.min(100, w.hp + (id === 'pill' ? 30 : 60)); W.fx.push({ k: 'txt', x: w.x, y: w.y - 40, s: `+${w.hp - before}`, col: '#3ddc84', t: 0 }); afterUtil(c, id); }
  else if (id === 'ladder') {
    let y1 = w.y - 150; for (let y = w.y - WH; y > w.y - 150; y--) if (solid(W.mask, w.x, y)) { y1 = y + 4; break; }
    if (w.air || w.y - y1 < 30) { flash(c, '여기에는 사다리를 세울 수 없어요'); return; }
    useItem(c, id); W.ladders.push({ x: Math.round(w.x), y1: Math.round(y1), y2: Math.round(w.y) }); w.climb = true; flash(c, '🪜 조이스틱 위로 올라가요', 1200); afterUtil(c, id);
  }
  else if (id === 'tornado') { useItem(c, id); W.tors.push({ x: Math.round(w.x + c.facing * 55), y: Math.round(w.y - 30), team: W.team, until: W.n + 2 }); afterUtil(c, id); }
  else if (id === 'fog') { useItem(c, id); W.fog = { until: W.n + 2, by: c.ctx.me }; flash(c, '🌫️ 안개가 깔렸어요'); afterUtil(c, id); }
}
function afterUtil(c, id) { if (c.W.inv[id] === 0 && c.sel === id) c.sel = 'shell'; }
function fireUp(c) {
  const W = c.W;
  if (W?.drill) { W.drill = null; const w = meW(c); if (w && !solid(W.mask, w.x, w.y + 1)) { w.air = true; w.vx = 0; w.vy = 0; } }
  if (c.charge < 0) return;
  if (!canAct(c)) { c.charge = -1; return; }
  const power = Math.max(0.1, Math.min(1, c.charge)); c.charge = -1;
  const w = meW(c), id = c.sel; if (!w) return;
  if (W.chick && id === 'chicken') return;
  if (!useItem(c, id)) return;
  const dir = aimDir(c), x = w.x + dir[0] * 14, y = w.y - WH / 2 + dir[1] * 14;
  if (id === 'shell') { W.attack = true; W.projs.push({ k: 'shell', x, y, vx: dir[0] * 760 * power, vy: dir[1] * 760 * power, t: 0 }); }
  else if (id === 'homing') { W.attack = true; for (let i = 0; i < 6; i++) { const a = Math.atan2(dir[1], dir[0]) + (i - 2.5) * 0.12, s = 380 * (0.5 + power * 0.5); W.projs.push({ k: 'mini', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: -i * 0.06 }); } }
  else if (id === 'grenade') { W.attack = true; W.projs.push({ k: 'gren', x, y, vx: dir[0] * 600 * power, vy: dir[1] * 600 * power, t: 0, end: W.gren?.end || performance.now() + 5000 }); W.gren = null; }
  else if (id === 'mine') { W.attack = true; W.projs.push({ k: 'mineT', x, y, vx: dir[0] * 480 * power, vy: dir[1] * 480 * power, t: 0 }); }
  else if (id === 'tele') { W.projs.push({ k: 'tele', x, y, vx: dir[0] * 700 * power, vy: dir[1] * 700 * power, t: 0 }); }
  if (W.inv[id] === 0) c.sel = 'shell';
}
function ropeShoot(c, w, dir) {
  const W = c.W, sx = w.x, sy = w.y - WH / 2;
  for (let d = 10; d < 340; d += 3) {
    const x = sx + dir[0] * d, y = sy + dir[1] * d;
    if (solid(W.mask, x, y)) { W.rope = { ax: x, ay: y, L: d, vx: w.vx || 0, vy: w.vy || 0 }; w.air = true; return; }
  }
  W.fx.push({ k: 'line', x: sx, y: sy, x2: sx + dir[0] * 340, y2: sy + dir[1] * 340, t: 0 });
  flash(c, '로프가 닿지 않았어요', 900);
}
function shoot(c, x, y, dir, dmg, push, cr) {
  const W = c.W;
  for (let d = 0; d < 760; d += 2) {
    const px = x + dir[0] * d, py = y + dir[1] * d;
    const hit = W.worms.find((w) => !w.dead && w.id !== W.wid && Math.abs(w.x - px) < 12 && py > w.y - HB && py < w.y + 2);
    if (hit) { W.fx.push({ k: 'tracer', x, y, x2: px, y2: py, t: 0 }); hurt(c, hit, dmg, dir[0] * push, dir[1] * push - 120); return; }
    if (solid(W.mask, px, py) || py > MH) { W.fx.push({ k: 'tracer', x, y, x2: px, y2: py, t: 0 }); crater(c, px, py, cr); return; }
  }
  W.fx.push({ k: 'tracer', x, y, x2: x + dir[0] * 760, y2: y + dir[1] * 760, t: 0 });
}
function crater(c, x, y, r) { const W = c.W; W.newCr.push([Math.round(x), Math.round(y), r]); terrain(c, [...c.ctx.state.craters, ...W.newCr]); }
function hurt(c, w, dmg, vx, vy) {
  const W = c.W;
  if (w.dead) return;
  w.hp = Math.max(0, w.hp - dmg);
  W.fx.push({ k: 'txt', x: w.x, y: w.y - 40, s: `-${dmg}`, col: '#ff4f4f', t: 0 });
  if (w.team !== W.team) { const st = (W.stats[c.ctx.me] ||= { dmg: 0, kills: 0 }); st.dmg += dmg; if (w.hp <= 0) st.kills++; }
  if (vx || vy) { w.air = true; w.climb = false; w.vx = vx; w.vy = vy; if (w.id === W.wid) { W.rope = null; W.jet = null; W.drill = null; } }
  if (w.hp <= 0) { w.dead = true; W.fx.push({ k: 'boom', x: w.x, y: w.y - 8, r: 22, t: 0 }); }
}
function explode(c, x, y, r, dmg) {
  const W = c.W;
  crater(c, x, y, r);
  W.fx.push({ k: 'boom', x, y, r, t: 0 });
  boomSfx(r);
  for (const w of W.worms) {
    if (w.dead) continue;
    const dx = w.x - x, dy = w.y - HB / 2 - y, d = Math.max(0, Math.hypot(dx, dy) - 6);
    if (d > r + 12) continue;
    const dm = Math.max(4, Math.round(dmg * (1 - d / (r + 12))));
    const l = d || 1, k = dm * 7.5;
    hurt(c, w, dm, (dx / l) * k, Math.min(-120, (dy / l) * k - dm * 4));
  }
  for (const m of W.mines) if (m.arm == null && Math.hypot(m.x - x, m.y - y) < r + 8) m.arm = 0.25;
  W.ladders = W.ladders.filter((l) => Math.hypot(l.x - x, Math.max(l.y1, Math.min(l.y2, y)) - y) > r * 0.8);
  for (const o of W.worms) if (o.climb && !onLadder(W, o)) { o.climb = false; o.air = true; }
  W.crates = W.crates.filter((k) => { if (Math.hypot(k.x - x, k.y - 8 - y) < r + 6) { W.fx.push({ k: 'txt', x: k.x, y: k.y - 30, s: '상자 파괴!', col: '#ccc', t: 0 }); return false; } return true; });
}
function boomChicken(c) { const ch = c.W.chick; if (!ch) return; remove(c.W, ch); c.W.chick = null; c.W.fx.push({ k: 'txt', x: ch.x, y: ch.y - 50, s: '꼬끼오!!', col: '#ffd84d', t: 0 }); explode(c, ch.x, ch.y - 6, 64, 80); }
function onLadder(W, o) { return o && W.ladders.find((l) => Math.abs(o.x - l.x) < 9 && o.y >= l.y1 - 2 && o.y <= l.y2 + 3); }
function remove(W, p) { W.projs = W.projs.filter((q) => q !== p); }

// ───────────────── 시뮬레이션 (내 차례) ─────────────────
const DEFLECT = new Set(['shell', 'mini', 'gren', 'mineT', 'tele', 'air']);
function simStep(c, dt) {
  const W = c.W, M = W.mask, wind = c.ctx.state.turn.wind, now = performance.now();
  const w = meW(c), J = joyNow(c);
  const free = canAct(c) && w && !w.dead;
  if (free) {
    const L = onLadder(W, w);
    if (w.climb && !L) w.climb = false;
    if (L && !W.rope && !W.jet && !W.drill && c.charge < 0 && Math.abs(J.y) > 0.35) w.climb = true;
    if (!W.rope && !W.jet && !w.climb && Math.abs(J.y) > 0.35) c.angle = Math.max(-1.35, Math.min(1.45, c.angle + J.y * dt * 1.4));
    if (W.rope) {
      const R = W.rope, px = w.x, py = w.y - WH / 2;
      R.vy += G * dt; R.vx += J.x * 380 * dt;
      if (Math.abs(J.y) > 0.35) R.L = Math.max(24, Math.min(420, R.L - J.y * 160 * dt));
      let nx = px + R.vx * dt, ny = py + R.vy * dt;
      const dx = nx - R.ax, dy = ny - R.ay, d = Math.hypot(dx, dy) || 1;
      if (d > R.L) { nx = R.ax + (dx / d) * R.L; ny = R.ay + (dy / d) * R.L; const rv = (R.vx * dx + R.vy * dy) / d; if (rv > 0) { R.vx -= (dx / d) * rv; R.vy -= (dy / d) * rv; } }
      if (solid(M, nx, ny) || solid(M, nx, ny + WH / 2 - 1)) { R.vx *= -0.3; R.vy *= -0.3; } else { w.x = nx; w.y = ny + WH / 2; }
      if (J.x) c.facing = J.x > 0 ? 1 : -1;
    } else if (W.jet) {
      W.jet.t -= dt;
      w.vy += G * 0.55 * dt; if (J.y > 0.2) w.vy -= 980 * J.y * dt; w.vx += J.x * 420 * dt;
      w.vx *= 1 - 0.8 * dt; w.vy = Math.max(-260, Math.min(320, w.vy)); w.vx = Math.max(-240, Math.min(240, w.vx));
      const nx = w.x + w.vx * dt, ny = w.y + w.vy * dt;
      if (solid(M, nx, ny) || solid(M, nx, ny - WH + 3)) { w.vx *= -0.2; w.vy = Math.min(0, w.vy) * 0.2; } else { w.x = Math.max(4, Math.min(MW - 4, nx)); w.y = ny; }
      if (J.x) c.facing = J.x > 0 ? 1 : -1;
      W.fx.push({ k: 'puff', x: w.x - c.facing * 6, y: w.y - 4, vx: 0, vy: 60, t: 0 });
      if (W.jet.t <= 0) { W.jet = null; w.air = true; }
    } else if (W.drill) {
      W.drill.t += dt;
      const d = aimDir(c);
      w.x = Math.max(6, Math.min(MW - 6, w.x + d[0] * 55 * dt)); w.y = Math.min(WATER + 5, w.y + d[1] * 55 * dt);
      if (!W.drill.last || Math.hypot(w.x - W.drill.last[0], w.y - W.drill.last[1]) > 5) { W.drill.last = [w.x, w.y]; crater(c, w.x, w.y - WH / 2, 13); }
      w.air = false; w.vx = 0; w.vy = 0;
      if (W.drill.t > 4) fireUp(c);
    } else if (w.climb && Math.abs(J.x) <= 0.3) {
      w.air = false; w.vx = 0; w.vy = 0; w.x += (L.x - w.x) * Math.min(1, dt * 12);
      if (Math.abs(J.y) > 0.35) { const ny = Math.max(L.y1, Math.min(L.y2, w.y - J.y * 80 * dt)); if (W.mv > 0 && (!solid(M, w.x, ny - WH + 2) || J.y < 0)) { W.mv = Math.max(0, W.mv - Math.abs(ny - w.y) / MOVE_PX); w.y = ny; } w.ph += dt * 10; }
    } else if ((!w.air || w.climb) && c.charge < 0 && Math.abs(J.x) > 0.3) {
      w.climb = false;
      c.facing = J.x > 0 ? 1 : -1;
      if (W.mv > 0) { const x0 = w.x; walkStep(M, w, c.facing * 75 * dt); W.mv = Math.max(0, W.mv - Math.abs(w.x - x0) / MOVE_PX); w.ph += dt * 14; }
    }
    if (c.charge >= 0) c.charge = Math.min(1, c.charge + dt / 1.5);
  }
  // 수류탄을 손에 든 채로 시간이 다 되면 내가 터져요
  if (W.gren && now >= W.gren.end && w && !W.sent) { W.gren = null; W.attack = true; c.charge = -1; explode(c, w.x, w.y - 8, 48, 30); }
  // 기관총 · 화염방사기
  if (W.mg && w) { W.mg.t -= dt; if (W.mg.t <= 0 && W.mg.left > 0) { W.mg.t = 0.08; W.mg.left--; const a = c.angle + (Math.random() - 0.5) * 0.14, d = [Math.cos(a) * c.facing, -Math.sin(a)]; shoot(c, w.x + d[0] * 12, w.y - WH / 2 + d[1] * 12, d, 5, 70, 5); } if (W.mg.left <= 0) W.mg = null; }
  if (W.flame && w) {
    W.flame.t += dt;
    const d = aimDir(c), ox = w.x + d[0] * 12, oy = w.y - WH / 2 + d[1] * 12;
    W.fx.push({ k: 'fire', x: ox, y: oy, vx: d[0] * 260 + (Math.random() - 0.5) * 50, vy: d[1] * 260 + (Math.random() - 0.5) * 50, t: 0 });
    for (const o of W.worms) {
      if (o.dead || o.id === w.id || W.flame.hit.has(o.id)) continue;
      const vx = o.x - ox, vy = o.y - WH / 2 - oy, along = vx * d[0] + vy * d[1], side = Math.abs(vx * d[1] - vy * d[0]);
      if (along > 0 && along < 170 * Math.min(1, W.flame.t * 2) && side < 22) { W.flame.hit.add(o.id); hurt(c, o, Math.round(50 * (1 - Math.max(0, along - 40) / 260) * (1 - side / 60)), d[0] * 280, d[1] * 280 - 150); }
    }
    if (W.flame.t > 1.2) W.flame = null;
  }
  // 꿈틀이 낙하
  for (const o of W.worms) {
    if (o.dead) continue;
    if (o.id === W.wid && (W.rope || W.jet || W.drill)) continue;
    if (o.climb || (!o.air && onLadder(W, o))) continue;
    if (!o.air && !solid(M, o.x, o.y + 1) && !solid(M, o.x, o.y + 2)) { o.air = true; o.vx = 0; o.vy = 0; }
    if (!o.air) continue;
    if (o.id === W.wid && W.chute) {
      o.vy = Math.min(o.vy + G * dt, 70); o.vx += (wind * 70 - o.vx) * Math.min(1, dt * 2);
      const nx = o.x + o.vx * dt, ny = o.y + o.vy * dt;
      if (solid(M, nx, ny)) { o.air = false; W.chute = false; o.vx = 0; o.vy = 0; } else if (!solid(M, nx, ny - WH / 2)) { o.x = Math.max(2, Math.min(MW - 2, nx)); o.y = ny; } else o.y = ny;
    } else {
      const v = airStep(M, o, dt);
      if (v) o.flip = 0;
      if (v > 430) hurt(c, o, Math.round((v - 430) / 9), 0, 0);
    }
    if (o.y > WATER) {
      o.dead = true; o.hp = 0; W.fx.push({ k: 'splash', x: o.x, y: WATER, t: 0 });
      if (o.team !== W.team) { const st = (W.stats[c.ctx.me] ||= { dmg: 0, kills: 0 }); st.kills++; }
      if (o.id === W.wid) { W.rope = null; W.jet = null; W.chute = false; }
    }
  }
  // 지뢰
  for (const m of W.mines) {
    if (m.arm == null) { if (W.worms.some((o) => !o.dead && o.team !== m.team && Math.hypot(o.x - m.x, o.y - m.y) < 24)) m.arm = 1.0; }
    else { m.arm -= dt; if (m.arm <= 0) { m.gone = true; explode(c, m.x, m.y - 4, 34, 40); } }
    if (!m.gone && m.y < MH - 1 && !solid(M, m.x, m.y + 1)) m.y += 2;
    if (m.y > WATER) m.gone = true;
  }
  W.mines = W.mines.filter((m) => !m.gone);
  // 로켓배송 헬기 · 보급 상자
  if (W.heli) {
    const H = W.heli; H.x += H.dir * 420 * dt;
    if (!H.done && (H.dir > 0 ? H.x >= H.xd0 : H.x <= H.xd0)) { H.done = true; W.crates.push({ id: `c${W.n}`, x: H.xd0, y: H.y + 36, item: H.item, air: true, vy: 0 }); }
    if (H.x < -260 || H.x > MW + 260) W.heli = null;
  }
  for (const k of W.crates) {
    if (!k.air && !solid(M, k.x, k.y + 1)) k.air = true;
    if (k.air) { k.vy = Math.min(k.vy + G * dt, 95); const ny = k.y + k.vy * dt; if (solid(M, k.x, ny)) { let y = ny; while (y > 0 && solid(M, k.x, y)) y--; k.y = Math.round(y); k.air = false; k.vy = 0; } else k.y = ny; }
    if (k.y > WATER) { k.gone = true; W.fx.push({ k: 'splash', x: k.x, y: WATER, t: 0 }); continue; }
    const o = W.worms.find((q) => !q.dead && Math.abs(q.x - k.x) < 16 && Math.abs(q.y - k.y) < 22);
    if (o) {
      k.gone = true; const inv = W.invs[o.team]; inv[k.item] = Math.max(0, inv[k.item] || 0) + 1;
      W.fx.push({ k: 'txt', x: k.x, y: k.y - 36, s: `📦 ${WMAP[k.item].icon} ${WMAP[k.item].name}!`, col: '#ffd84d', t: 0 });
      if (o.team === W.team) flash(c, `📦 ${WMAP[k.item].icon} ${WMAP[k.item].name} 획득!`, 1800);
    }
  }
  W.crates = W.crates.filter((k) => !k.gone);
  // 탄
  for (const p of [...W.projs]) {
    p.t += dt;
    if (p.t < 0) continue;
    for (const t of W.tors) if (DEFLECT.has(p.k) && Math.hypot(p.x - t.x, p.y - t.y) < 44 && !(p.def ||= []).includes(t)) { p.def.push(t); p.vx = -p.vx * 0.9; p.vy = -Math.abs(p.vy) * 0.6; W.fx.push({ k: 'txt', x: t.x, y: t.y - 50, s: '튕겼다!', col: '#9fd3ff', t: 0 }); }
    if (p.k === 'chick') {
      if (p.t > 10) { boomChicken(c); continue; }
      if (p.air) airStep(M, p, dt);
      else { const before = p.x; walkStep(M, p, p.face * 85 * dt); if (Math.abs(p.x - before) < 0.5 && !p.air) { p.air = true; p.vx = p.face * 90; p.vy = -230; } }
      if (p.y > WATER) { remove(W, p); W.chick = null; W.fx.push({ k: 'splash', x: p.x, y: WATER, t: 0 }); }
      continue;
    }
    if (p.k === 'mini' && p.t > 0.3) {
      let best = null, bd = 1e9;
      for (const o of W.worms) if (!o.dead && o.team !== W.team) { const d = Math.hypot(o.x - p.x, o.y - 9 - p.y); if (d < bd) { bd = d; best = o; } }
      if (best) { const want = Math.atan2(best.y - 9 - p.y, best.x - p.x), cur = Math.atan2(p.vy, p.vx); let da = want - cur; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; const a = cur + Math.max(-5 * dt, Math.min(5 * dt, da)); p.vx = Math.cos(a) * 340; p.vy = Math.sin(a) * 340; }
    } else { p.vy += G * dt * (p.k === 'air' ? 0.6 : 1); if (p.k === 'shell') p.vx += wind * 110 * dt; }
    const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
    if (ny > WATER) { remove(W, p); W.fx.push({ k: 'splash', x: nx, y: WATER, t: 0 }); continue; }
    if (nx < -400 || nx > MW + 400 || (p.k === 'mini' && p.t > 6)) { remove(W, p); continue; }
    const hitWorm = ['shell', 'mini', 'air'].includes(p.k) && p.t > 0.08 && W.worms.some((o) => !o.dead && (p.k !== 'mini' || o.team !== W.team) && Math.abs(o.x - nx) < 12 && ny > o.y - HB && ny < o.y + 2);
    if (solid(M, nx, ny) || hitWorm) {
      if (p.k === 'shell') { remove(W, p); explode(c, nx, ny, 42, 20); }
      else if (p.k === 'mini') { remove(W, p); explode(c, nx, ny, 18, 15); }
      else if (p.k === 'air') { remove(W, p); explode(c, nx, ny, 38, 60); }
      else if (p.k === 'tele') { remove(W, p); let y = ny; while (y > 0 && (solid(M, nx, y) || solid(M, nx, y - WH + 2))) y--; if (w) { w.x = nx; w.y = y; w.air = true; w.vx = 0; w.vy = 0; } W.fx.push({ k: 'boom', x: nx, y, r: 14, t: 0, blue: 1 }); }
      else {
        const hx = solid(M, nx, p.y), hy = solid(M, p.x, ny);
        if (hy || !hx) p.vy *= -0.4;
        if (hx) p.vx *= -0.5;
        p.vx *= 0.82;
        if (p.k === 'mineT' && Math.hypot(p.vx, p.vy) < 40) { remove(W, p); let y = p.y; while (!solid(M, p.x, y + 1) && y < MH) y++; W.mines.push({ x: Math.round(p.x), y: Math.round(y), team: W.team, id: `${W.n}-${W.mines.length}` }); }
      }
    } else { p.x = nx; p.y = ny; }
    if (p.k === 'gren' && now >= p.end && W.projs.includes(p)) { remove(W, p); explode(c, p.x, p.y, 48, 30); }
  }
  // 효과
  for (const f of W.fx) { f.t += dt; if (f.k === 'fire' || f.k === 'puff') { f.x += (f.vx || 0) * dt; f.y += (f.vy || 0) * dt; } }
  W.fx = W.fx.filter((f) => f.t < (f.k === 'txt' ? 1.4 : f.k === 'boom' ? 0.6 : f.k === 'fire' ? 0.45 : f.k === 'puff' ? 0.4 : 0.35));
  // 차례 끝내기
  const tl = c.ctx.state.turn.deadline - Date.now();
  if (tl <= 0 && !W.ending) { W.ending = true; W.rope = null; W.jet = null; W.drill = null; W.gren = null; c.charge = -1; const me0 = meW(c); if (me0 && !solid(M, me0.x, me0.y + 1)) me0.air = true; }
  const busy = W.projs.length || W.mg || W.flame || W.heli || W.crates.some((k) => k.air) || W.mines.some((m) => m.arm != null) || W.worms.some((o) => !o.dead && o.air);
  if ((W.attack || W.ending || (w && w.dead)) && !busy) W.settle += dt; else W.settle = 0;
  if (W.settle > 1.0 && !W.sent) commit(c);
}
function commit(c) {
  const W = c.W; W.sent = true;
  c.ctx.sendMove({ type: 'end', n: W.n, res: {
    worms: W.worms.map((w) => ({ id: w.id, x: Math.round(w.x), y: Math.round(w.y), hp: w.hp, dead: w.dead })),
    craters: W.newCr, mines: W.mines.map(({ x, y, team, id }) => ({ x, y, team, id })), tors: W.tors, ladders: W.ladders, fog: W.fog || null, invs: W.invs, stats: W.stats,
    crates: W.crates.map(({ id, x, y, item }) => ({ id, x: Math.round(x), y: Math.round(y), item })),
  } }, { onError: () => { W.sent = false; } });
}

// ───────────────── 매 프레임 ─────────────────
function frame(now) {
  const c = ctl; if (!c) return;
  c.raf = requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - c.last) / 1000); c.last = now;
  const { state, me, sendMove } = c.ctx;
  if (c.W && myTurn(c) && c.W.n === state.turn.n) {
    c.acc += dt;
    let k = 0;
    const W0 = c.W;
    while (c.acc >= 1 / 60 && k++ < 5 && c.W === W0) { c.acc -= 1 / 60; simStep(c, 1 / 60); }
    if (c.acc > 0.1) c.acc = 0;
    if (c.live && c.W && (now - c.lastSend > 70 || c.W.sent)) { c.lastSend = now; c.live.send(me, snap(c)); }
  }
  if (Date.now() - c.lastTick > 2500) {
    if ((state.phase === 'play' && Date.now() > state.turn.deadline + 9000) || (state.phase === 'roundEnd' && Date.now() > state.endAt)) { c.lastTick = Date.now(); sendMove({ type: 'tick' }, { silent: true }); }
  }
  draw(c, dt, now);
  hud(c);
}
function snap(c) {
  const W = c.W;
  return {
    mv: Math.round(W.mv * 100) / 100,
    n: W.n, w: W.worms.map((o) => [o.id, Math.round(o.x), Math.round(o.y), o.hp, o.dead ? 1 : 0, o.flip ? 1 : 0, Math.round((o.ph || 0) * 10) / 10]),
    p: W.projs.filter((p) => p.t >= 0).map((p) => [p.k, Math.round(p.x), Math.round(p.y), Math.round(Math.atan2(p.vy, p.vx) * 10) / 10, p.face || 0]),
    fx: W.fx.filter((f) => f.k !== 'fire' && f.k !== 'puff').map((f) => [f.k, Math.round(f.x), Math.round(f.y), f.r || 0, Math.round(f.t * 100) / 100, f.s || '', f.col || '', Math.round(f.x2 || 0), Math.round(f.y2 || 0), f.blue ? 1 : 0]),
    cr: W.newCr, a: Math.round(c.angle * 100) / 100, ch: c.charge >= 0 ? Math.round(c.charge * 100) / 100 : -1, wp: c.sel, f: c.facing,
    rope: W.rope ? [Math.round(W.rope.ax), Math.round(W.rope.ay)] : 0, jet: W.jet ? 1 : 0, chute: W.chute ? 1 : 0, flame: W.flame ? 1 : 0,
    mines: W.mines.map((m) => [m.x, m.y, m.team]), tors: W.tors, lad: W.ladders, fog: W.fog || 0, tg: c.target ? [Math.round(c.target.x), Math.round(c.target.y)] : 0,
    gr: W.gren ? Math.max(0, Math.ceil((W.gren.end - performance.now()) / 1000)) : 0, wid: W.wid,
    heli: W.heli ? [Math.round(W.heli.x), W.heli.y, W.heli.dir, W.heli.done ? 1 : 0] : 0, crates: W.crates.map((k) => [Math.round(k.x), Math.round(k.y), k.air ? 1 : 0]),
  };
}

// ───────────────── 그리기 ─────────────────
function view(c) {
  const { state } = c.ctx;
  if (c.W && myTurn(c) && c.W.n === state.turn.n) return { ...snap(c), live: true, fireFx: c.W.fx.filter((f) => f.k === 'fire' || f.k === 'puff') };
  const L = state.phase === 'play' ? c.others?.[state.turn.uid] : null;
  if (L && L.n === state.turn.n && Array.isArray(L.w)) return { ...L, live: true, fireFx: [] };
  return { n: state.turn.n, w: state.worms.map((o) => [o.id, o.x, o.y, o.hp, o.dead ? 1 : 0, 0, 0]), p: [], fx: [], cr: [], a: 0.6, ch: -1, wp: 'shell', f: 1, rope: 0, mines: (state.mines || []).map((m) => [m.x, m.y, m.team]), tors: state.tors || [], fog: state.fog || 0, tg: 0, gr: 0, wid: state.turn.wid, heli: 0, lad: state.ladders || [], crates: (state.crates || []).map((k) => [k.x, k.y, 0]), fireFx: [] };
}
function draw(c, dt, now) {
  const { state, me, players } = c.ctx;
  const cv = c.cv, dpr = Math.min(2, window.devicePixelRatio || 1), Wd = cv.clientWidth, Hd = cv.clientHeight;
  if (!Wd || !state.seed) return;
  if (cv.width !== Math.round(Wd * dpr) || cv.height !== Math.round(Hd * dpr)) { cv.width = Math.round(Wd * dpr); cv.height = Math.round(Hd * dpr); }
  if (!c.cam.z) zoomTo(c, Math.min(Wd / 520, Hd / 420));
  const V = view(c);
  const T = terrain(c, V.live && Array.isArray(V.cr) ? [...state.craters, ...V.cr] : state.craters);
  if (c.camGoal) { c.cam.x += (c.camGoal.x - c.cam.x) * Math.min(1, dt * 4); c.cam.y += (c.camGoal.y - c.cam.y) * Math.min(1, dt * 4); if (Math.hypot(c.camGoal.x - c.cam.x, c.camGoal.y - c.cam.y) < 3) c.camGoal = null; }
  const z = c.cam.z, hw = Wd / 2 / z, hh = Hd / 2 / z;
  c.cam.x = Math.max(Math.min(hw, MW / 2), Math.min(MW - Math.min(hw, MW / 2), c.cam.x));
  c.cam.y = Math.max(Math.min(hh * 0.4, MH / 2), Math.min(MH - Math.min(hh, MH / 2), c.cam.y));
  const x = cv.getContext('2d'), M = MAPS[state.map] || MAPS.mountain;
  x.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sky = x.createLinearGradient(0, 0, 0, Hd); sky.addColorStop(0, M.sky[0]); sky.addColorStop(1, M.sky[1]);
  x.fillStyle = sky; x.fillRect(0, 0, Wd, Hd);
  const bg = pic(`img/kkumtle/bg-${state.map}.webp`);
  if (bg) { // 먼 배경: 화면보다 조금 크게, 카메라를 따라 천천히 (패럴랙스)
    const ih = Math.max(Hd * 1.2, Wd / 2 * 1.15), iw = ih * (bg.naturalWidth / bg.naturalHeight);
    const ox = -(Math.max(0, Math.min(1, c.cam.x / MW))) * (iw - Wd), oy = -(Math.max(0, Math.min(1, c.cam.y / MH))) * (ih - Hd);
    x.drawImage(bg, ox, oy, iw, ih);
  }
  x.setTransform(dpr * z, 0, 0, dpr * z, dpr * (Wd / 2 - c.cam.x * z), dpr * (Hd / 2 - c.cam.y * z));
  if (!bg) { x.fillStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.moveTo(-300, MH); for (let i = -300; i <= MW + 300; i += 50) x.lineTo(i, 420 + Math.sin(i * 0.004) * 70 + Math.sin(i * 0.013) * 25); x.lineTo(MW + 300, MH); x.fill(); }
  const wind = state.turn?.wind || 0;
  x.fillStyle = 'rgba(255,255,255,.85)';
  if (!bg) for (let i = 0; i < 7; i++) { const cx = (((i * 330 + now * 0.03 * wind) % (MW + 400)) + MW + 400) % (MW + 400) - 200; x.beginPath(); x.ellipse(cx, 80 + (i % 3) * 45, 70, 20, 0, 0, 7); x.ellipse(cx + 34, 68 + (i % 3) * 45, 44, 22, 0, 0, 7); x.fill(); }
  x.drawImage(T.cv, 0, 0);
  const wy = WATER + Math.sin(now / 500) * 3;
  x.fillStyle = M.water; x.globalAlpha = 0.88; x.fillRect(-900, wy, MW + 1800, MH); x.globalAlpha = 1;
  x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 3; x.beginPath(); for (let i = -900; i < MW + 900; i += 20) x.lineTo(i, wy + Math.sin(i * 0.05 + now / 300) * 4); x.stroke();
  for (const l of V.lad || []) { x.strokeStyle = '#8a5a2b'; x.lineWidth = 3; x.beginPath(); x.moveTo(l.x - 7, l.y1); x.lineTo(l.x - 7, l.y2); x.moveTo(l.x + 7, l.y1); x.lineTo(l.x + 7, l.y2); x.stroke(); x.strokeStyle = '#c08a4a'; x.lineWidth = 2.5; x.beginPath(); for (let y = l.y2 - 6; y > l.y1; y -= 12) { x.moveTo(l.x - 7, y); x.lineTo(l.x + 7, y); } x.stroke(); }
  for (const t of V.tors || []) for (let k = 0; k < 6; k++) { x.strokeStyle = `rgba(200,230,255,${0.75 - k * 0.1})`; x.lineWidth = 3; x.beginPath(); x.ellipse(t.x + Math.sin(now / 120 + k) * 5, t.y + 30 - k * 12, 10 + k * 6, 4 + k, 0, 0, 7); x.stroke(); }
  const myTeam = state.teams?.[me];
  for (const m of V.mines || []) if ((!myTeam || m[2] === myTeam) && pic(ICONS.mine)) { x.drawImage(pic(ICONS.mine), m[0] - 9, m[1] - 15, 18, 17); x.fillStyle = (now / 300) % 2 < 1 ? 'rgba(255,60,60,.9)' : 'rgba(0,0,0,0)'; x.beginPath(); x.arc(m[0], m[1] - 7, 2.5, 0, 7); x.fill(); }
  else if (!myTeam || m[2] === myTeam) { x.fillStyle = '#333'; x.beginPath(); x.ellipse(m[0], m[1] - 3, 7, 4, 0, 0, 7); x.fill(); x.fillStyle = (now / 300) % 2 < 1 ? '#ff3b3b' : '#600'; x.beginPath(); x.arc(m[0], m[1] - 6, 2, 0, 7); x.fill(); }
  for (const k of V.crates || []) drawCrate(x, k[0], k[1], k[2], now);
  if (V.heli) drawHeli(x, V.heli[0], V.heli[1], V.heli[2], V.heli[3], now);
  const fogOn = V.fog && myTeam;
  const meta = Object.fromEntries(state.worms.map((w) => [w.id, w]));
  for (const r of V.w || []) {
    const [id, wx, wy2, hp, dead, flip, ph] = r, info = meta[id];
    if (!info || dead) continue;
    if (fogOn && info.team !== myTeam) continue;
    const active = id === V.wid && state.phase === 'play';
    const f = active ? V.f || 1 : wx < MW / 2 ? 1 : -1;
    drawWorm(x, wx, wy2, info.skin, f, active ? ph : 0, flip ? now : 0, TEAMS[info.team].col, esc(players[info.owner]?.name || '?').slice(0, 7), hp, active);
    if (!active) continue;
    if (V.rope) { x.strokeStyle = '#d9b46a'; x.lineWidth = 2; x.beginPath(); x.moveTo(wx, wy2 - 9); x.lineTo(V.rope[0], V.rope[1]); x.stroke(); }
    if (V.chute && pic(ICONS.chute)) { const im = pic(ICONS.chute), w = 54, h = w * im.naturalHeight / im.naturalWidth * 0.78; x.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight * 0.78, wx - w / 2, wy2 - 34 - h, w, h); }
    else if (V.chute) { x.fillStyle = '#ff6a8a'; x.beginPath(); x.arc(wx, wy2 - 62, 24, Math.PI, 0); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 1; x.beginPath(); x.moveTo(wx - 24, wy2 - 62); x.lineTo(wx, wy2 - 26); x.lineTo(wx + 24, wy2 - 62); x.stroke(); }
    if (V.jet && pic(ICONS.jet)) x.drawImage(pic(ICONS.jet), wx - f * 14 - 8, wy2 - 30, 16, 25);
    else if (V.jet) { x.font = '14px sans-serif'; x.textAlign = 'center'; x.fillText('🎒', wx - f * 8, wy2 - 6); }
    if (!V.rope && !V.jet) {
      const dx = Math.cos(V.a) * f, dy = -Math.sin(V.a), ox = wx, oy = wy2 - 9;
      x.strokeStyle = 'rgba(255,255,255,.9)'; x.setLineDash([5, 5]); x.lineWidth = 2; x.beginPath(); x.moveTo(ox + dx * 16, oy + dy * 16); x.lineTo(ox + dx * 80, oy + dy * 80); x.stroke(); x.setLineDash([]);
      x.strokeStyle = '#ff3b3b'; x.lineWidth = 2; x.beginPath(); x.arc(ox + dx * 86, oy + dy * 86, 7, 0, 7); x.stroke();
      const ic = ICONS[V.wp] && pic(ICONS[V.wp]); if (ic) { const ih = 18, iw = ih * ic.naturalWidth / ic.naturalHeight; x.save(); x.translate(ox + dx * 20, oy + dy * 20); x.rotate(Math.atan2(dy, dx) + Math.PI / 2); x.drawImage(ic, -iw / 2, -ih / 2, iw, ih); x.restore(); } else { x.font = '16px sans-serif'; x.textAlign = 'center'; x.fillText(WMAP[V.wp]?.icon || '', ox + dx * 18, oy + 6 + dy * 18); }
      if (V.ch >= 0) { x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(wx - 24, wy2 + 6, 48, 7); x.fillStyle = `hsl(${120 - V.ch * 120},90%,55%)`; x.fillRect(wx - 24, wy2 + 6, 48 * V.ch, 7); }
      if (V.gr) { x.font = 'bold 18px sans-serif'; x.lineWidth = 4; x.strokeStyle = '#000'; x.fillStyle = '#ff4f4f'; x.strokeText(`💣 ${V.gr}`, wx, wy2 - 84); x.fillText(`💣 ${V.gr}`, wx, wy2 - 84); }
    }
  }
  if (V.tg) { x.strokeStyle = '#ff3b3b'; x.lineWidth = 3; const [tx, ty] = V.tg; x.beginPath(); x.arc(tx, ty, 16, 0, 7); x.moveTo(tx - 24, ty); x.lineTo(tx + 24, ty); x.moveTo(tx, ty - 24); x.lineTo(tx, ty + 24); x.stroke(); }
  for (const p of V.p || []) {
    const [k, px, py, a, face] = p;
    x.save(); x.translate(px, py);
    if (k === 'chick') { const im = pic(ICONS.chicken); if (im) { x.scale(face || 1, 1); x.drawImage(im, -13, -30, 26, 28); } else { x.scale(-(face || 1), 1); x.font = '22px sans-serif'; x.textAlign = 'center'; x.fillText('🐔', 0, -2); } }
    else if (k === 'gren' && pic(ICONS.grenade)) { x.rotate(performance.now() / 120); x.drawImage(pic(ICONS.grenade), -7, -8, 14, 17); }
    else if (k === 'gren') { x.fillStyle = '#2d3a2a'; x.beginPath(); x.arc(0, 0, 5, 0, 7); x.fill(); x.fillStyle = '#ffd84d'; x.fillRect(-1, -8, 2, 4); }
    else if (k === 'mineT' && pic(ICONS.mine)) x.drawImage(pic(ICONS.mine), -9, -8, 18, 17);
    else if (k === 'mineT') { x.fillStyle = '#333'; x.beginPath(); x.ellipse(0, 0, 7, 4, 0, 0, 7); x.fill(); }
    else if (k === 'tele') { x.fillStyle = '#7fd3ff'; x.beginPath(); x.arc(0, 0, 5, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.stroke(); }
    else { x.rotate(a); x.fillStyle = k === 'mini' ? '#ffd84d' : k === 'air' ? '#555' : '#ddd'; const L = k === 'mini' ? 7 : 12; x.fillRect(-L / 2, -2.5, L, 5); x.fillStyle = 'rgba(255,150,40,.85)'; x.beginPath(); x.arc(-L / 2 - 3, 0, 3.5, 0, 7); x.fill(); }
    x.restore();
  }
  for (const f of V.fireFx || []) { if (f.k === 'fire') { x.fillStyle = `rgba(255,${120 + f.t * 200},30,${Math.max(0, 0.9 - f.t * 2)})`; x.beginPath(); x.arc(f.x, f.y, 5 + f.t * 22, 0, 7); x.fill(); } else { x.fillStyle = `rgba(255,200,120,${Math.max(0, 0.6 - f.t)})`; x.beginPath(); x.arc(f.x, f.y, 4 + f.t * 14, 0, 7); x.fill(); } }
  if (V.flame && !V.fireFx?.length) { const w = (V.w || []).find((r) => r[0] === V.wid); if (w) { const d = [Math.cos(V.a) * (V.f || 1), -Math.sin(V.a)]; for (let i = 0; i < 8; i++) { const s = 20 + i * 18; x.fillStyle = `rgba(255,${140 + i * 10},40,${0.8 - i * 0.08})`; x.beginPath(); x.arc(w[1] + d[0] * s, w[2] - 9 + d[1] * s, 6 + i * 2, 0, 7); x.fill(); } } }
  for (const f of V.fx || []) {
    const F = Array.isArray(f) ? { k: f[0], x: f[1], y: f[2], r: f[3], t: f[4], s: f[5], col: f[6], x2: f[7], y2: f[8], blue: f[9] } : f;
    if (F.k === 'boom') { const k = Math.min(1, F.t / 0.6); x.fillStyle = F.blue ? `rgba(120,200,255,${1 - k})` : `rgba(255,${200 - k * 140},40,${1 - k})`; x.beginPath(); x.arc(F.x, F.y, F.r * (0.6 + k * 0.8), 0, 7); x.fill(); x.fillStyle = `rgba(255,255,210,${Math.max(0, 0.9 - k)})`; x.beginPath(); x.arc(F.x, F.y, F.r * 0.5 * (1 - k), 0, 7); x.fill(); }
    else if (F.k === 'txt') { x.font = 'bold 18px sans-serif'; x.textAlign = 'center'; x.lineWidth = 4; x.strokeStyle = '#000'; x.fillStyle = F.col || '#fff'; x.strokeText(F.s, F.x, F.y - F.t * 30); x.fillText(F.s, F.x, F.y - F.t * 30); }
    else if (F.k === 'tracer' || F.k === 'line') { x.strokeStyle = F.k === 'line' ? 'rgba(217,180,106,.7)' : `rgba(255,240,150,${Math.max(0, 1 - F.t * 3)})`; x.lineWidth = 2; x.beginPath(); x.moveTo(F.x, F.y); x.lineTo(F.x2, F.y2); x.stroke(); }
    else if (F.k === 'splash') { x.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 6; i++) { x.beginPath(); x.arc(F.x + (i - 2.5) * 6, F.y - Math.sin((i + 1) * 0.9) * 30 * Math.max(0, 1 - F.t * 2), 3, 0, 7); x.fill(); } }
  }
  if (fogOn) { x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = 'rgba(220,225,235,.38)'; x.fillRect(0, 0, Wd, Hd); }
  miniMap(c, T, V, fogOn ? myTeam : null);
}

function drawCrate(x, X, Y, air, now) {
  const im = pic('img/kkumtle/crate-air.webp');
  if (im) {
    const w = 26, h = w * im.naturalHeight / im.naturalWidth, cut = im.naturalHeight * 0.62;
    x.save(); x.translate(X, Y);
    if (air) { x.rotate(Math.sin(now / 300) * 0.1); x.drawImage(im, -w / 2, -h, w, h); }
    else x.drawImage(im, 0, cut, im.naturalWidth, im.naturalHeight - cut, -w / 2, -(h * (1 - 0.62)), w, h * (1 - 0.62));
    x.restore(); return;
  }
  x.save(); x.translate(X, Y);
  if (air) {
    x.rotate(Math.sin(now / 300) * 0.12);
    x.fillStyle = '#ffd84d'; x.beginPath(); x.arc(0, -40, 20, Math.PI, 0); x.fill();
    x.fillStyle = '#ff5f5f'; x.beginPath(); x.arc(0, -40, 20, Math.PI, Math.PI * 1.33); x.lineTo(0, -40); x.fill(); x.beginPath(); x.arc(0, -40, 20, Math.PI * 1.66, 0); x.lineTo(0, -40); x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = 1; x.beginPath(); x.moveTo(-20, -40); x.lineTo(-7, -14); x.moveTo(20, -40); x.lineTo(7, -14); x.moveTo(0, -40); x.lineTo(0, -14); x.stroke();
  }
  x.fillStyle = '#b5762e'; x.fillRect(-11, -18, 22, 18); x.strokeStyle = '#6b4216'; x.lineWidth = 2; x.strokeRect(-11, -18, 22, 18);
  x.beginPath(); x.moveTo(-11, -18); x.lineTo(11, 0); x.moveTo(11, -18); x.lineTo(-11, 0); x.stroke();
  x.fillStyle = '#ffd84d'; x.font = 'bold 12px sans-serif'; x.textAlign = 'center'; x.lineWidth = 3; x.strokeStyle = '#000'; x.strokeText('★', 0, -5); x.fillText('★', 0, -5);
  x.restore();
}
function drawHeli(x, X, Y, dir, done, now) {
  const im = pic('img/kkumtle/heli.webp');
  if (im) {
    const w = 110, h = w * im.naturalHeight / im.naturalWidth;
    x.save(); x.translate(X, Y + Math.sin(now / 250) * 3); x.scale(dir, 1);
    if (done) x.drawImage(im, 0, 0, im.naturalWidth, im.naturalHeight * 0.66, -w / 2, -h * 0.55, w, h * 0.66);
    else x.drawImage(im, -w / 2, -h * 0.55, w, h);
    x.restore(); return;
  }
  x.save(); x.translate(X, Y); x.scale(dir, 1);
  x.fillStyle = '#2f6f4f'; x.beginPath(); x.ellipse(0, 0, 34, 16, 0, 0, 7); x.fill();
  x.fillRect(-70, -5, 44, 8); x.beginPath(); x.moveTo(-70, -5); x.lineTo(-78, -18); x.lineTo(-66, -5); x.fill();
  x.fillStyle = '#9fe3ff'; x.beginPath(); x.ellipse(16, -3, 14, 9, 0, -1.6, 1.2); x.fill();
  x.strokeStyle = '#222'; x.lineWidth = 3; x.beginPath(); x.moveTo(-18, 18); x.lineTo(22, 18); x.moveTo(-8, 14); x.lineTo(-8, 18); x.moveTo(12, 14); x.lineTo(12, 18); x.stroke();
  x.fillRect(-2, -22, 4, 8);
  const r = Math.abs(Math.sin(now / 30)) * 52 + 8; x.strokeStyle = 'rgba(40,40,40,.8)'; x.lineWidth = 3; x.beginPath(); x.moveTo(-r, -22); x.lineTo(r, -22); x.stroke();
  x.fillStyle = '#fff'; x.font = 'bold 10px sans-serif'; x.textAlign = 'center'; x.fillText('로켓배송', -2, 4);
  if (!done) { x.strokeStyle = '#d9b46a'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(0, 16); x.lineTo(0, 26); x.stroke(); x.restore(); drawCrate(x, X, Y + 44, 0, now); return; }
  x.restore();
}

// 꿈틀이 (몸과 얼굴이 하나 · 걸을 때 앞뒤로 꿈틀꿈틀)
function drawWorm(x, X, Y, skin, face, ph, flipT, col, name, hp, active) {
  const duck = pic(`img/kkumtle/d${skin % 12}.webp`);
  if (duck) {
    const h = 38, w = h * duck.naturalWidth / duck.naturalHeight, step = Math.sin(ph);
    x.save(); x.translate(X, Y);
    if (flipT) { x.translate(0, -h / 2); x.rotate(((flipT / 90) % (Math.PI * 2)) * -face); x.translate(0, h / 2); }
    x.rotate(step * 0.13 * face); x.translate(0, -Math.abs(step) * 2.5); // 뒤뚱뒤뚱
    x.scale(face, 1); x.drawImage(duck, -w / 2, -h + 2, w, h);
    x.restore();
  } else {
  const [c1, c2] = SKINS[skin % 12], acc = ACC[skin % 12];
  x.save(); x.translate(X, Y - 9);
  if (flipT) x.rotate(((flipT / 90) % (Math.PI * 2)) * -face);
  x.translate(0, 9); x.scale(face, 1);
  const wig = Math.sin(ph) * 2.5, bump = Math.abs(Math.sin(ph)) * 2;
  const seg = [[-12 + wig, -4, 5.5], [-7 + wig * 0.6, -5 - bump, 6.5], [-1, -7, 7.5], [4, -11, 8.5]];
  x.fillStyle = c1; x.strokeStyle = c2; x.lineWidth = 1.4;
  for (const [sx, sy, r] of seg) { x.beginPath(); x.arc(sx, sy, r, 0, 7); x.fill(); x.stroke(); }
  for (const [sx, sy, r] of seg) { x.beginPath(); x.arc(sx, sy, r - 1.3, 0, 7); x.fill(); }
  x.globalAlpha = 0.35; for (const [sx, sy, r] of seg.slice(0, 3)) { x.beginPath(); x.arc(sx, sy, r * 0.6, -1, 1); x.stroke(); } x.globalAlpha = 1;
  x.fillStyle = '#fff'; x.beginPath(); x.arc(6, -14, 3.2, 0, 7); x.arc(10.5, -13.5, 2.8, 0, 7); x.fill();
  x.fillStyle = '#222'; x.beginPath(); x.arc(7, -14, 1.5, 0, 7); x.arc(11.2, -13.5, 1.3, 0, 7); x.fill();
  x.strokeStyle = '#7a2a3a'; x.lineWidth = 1.2; x.beginPath(); x.arc(9, -9.5, 2.4, 0.2, 2.6); x.stroke();
  x.fillStyle = col;
  if (acc === 'hat') { x.fillRect(-1, -22, 11, 2.5); x.fillRect(1, -27, 7, 5); }
  else if (acc === 'glasses') { x.strokeStyle = '#222'; x.lineWidth = 1.2; x.beginPath(); x.arc(6.5, -14, 3.6, 0, 7); x.moveTo(13.7, -13.5); x.arc(10.5, -13.5, 3.2, 0, 7); x.stroke(); x.fillRect(-2, -20, 12, 2); }
  else if (acc === 'bow') { x.beginPath(); x.moveTo(1, -20); x.lineTo(-4, -23); x.lineTo(-4, -17); x.closePath(); x.moveTo(1, -20); x.lineTo(6, -23); x.lineTo(6, -17); x.fill(); }
  else if (acc === 'band') { x.fillRect(-3, -19, 14, 3); x.fillRect(-7, -19, 4, 5); }
  else if (acc === 'crown') { x.fillStyle = '#ffd84d'; x.beginPath(); x.moveTo(0, -19); x.lineTo(0, -25); x.lineTo(3, -21); x.lineTo(5, -26); x.lineTo(7, -21); x.lineTo(10, -25); x.lineTo(10, -19); x.fill(); x.fillStyle = col; x.fillRect(0, -19, 10, 1.5); }
  else if (acc === 'mask') { x.fillStyle = '#222'; x.fillRect(3, -16, 11, 3); x.fillStyle = col; x.fillRect(-2, -20, 12, 2); }
  else if (acc === 'cap') { x.beginPath(); x.arc(5, -19, 6, Math.PI, 0); x.fill(); x.fillRect(5, -19.5, 9, 2); }
  else if (acc === 'antenna') { x.strokeStyle = col; x.lineWidth = 1.5; x.beginPath(); x.moveTo(4, -19); x.lineTo(1, -27); x.moveTo(8, -19); x.lineTo(11, -27); x.stroke(); x.beginPath(); x.arc(1, -27, 2, 0, 7); x.arc(11, -27, 2, 0, 7); x.fill(); }
  else if (acc === 'beard') { x.fillStyle = '#f5f5f5'; x.beginPath(); x.arc(9, -6, 4, 0, Math.PI); x.fill(); x.fillStyle = col; x.fillRect(-1, -20, 12, 2.5); }
  else if (acc === 'helmet') { x.beginPath(); x.arc(5, -16, 8.5, Math.PI, 0); x.fill(); }
  else if (acc === 'flower') { x.fillStyle = '#ff8fb8'; for (let i = 0; i < 5; i++) { x.beginPath(); x.arc(2 + Math.cos(i * 1.26) * 3, -21 + Math.sin(i * 1.26) * 3, 2, 0, 7); x.fill(); } x.fillStyle = '#ffd84d'; x.beginPath(); x.arc(2, -21, 1.6, 0, 7); x.fill(); x.fillStyle = col; x.fillRect(4, -20, 8, 2); }
  else x.fillRect(-2, -19, 13, 2.5);
  x.restore();
  }
  x.save(); x.textAlign = 'center'; x.font = 'bold 11px sans-serif'; x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,.75)';
  x.fillStyle = col; x.strokeText(name, X, Y - 52); x.fillText(name, X, Y - 52);
  x.fillStyle = '#fff'; x.strokeText(String(hp), X, Y - 40); x.fillText(String(hp), X, Y - 40);
  if (active) { const b = Math.sin(performance.now() / 150) * 3; x.fillStyle = '#ffd84d'; x.beginPath(); x.moveTo(X - 6, Y - 74 + b); x.lineTo(X + 6, Y - 74 + b); x.lineTo(X, Y - 65 + b); x.fill(); }
  x.restore();
}

function miniMap(c, T, V, fogTeam) {
  const m = c.mini, x = m.getContext('2d'), { state } = c.ctx, M = MAPS[state.map] || MAPS.mountain;
  if (!T.mini) { const t = document.createElement('canvas'); t.width = m.width; t.height = m.height; t.getContext('2d').drawImage(T.cv, 0, 0, m.width, m.height); T.mini = t; }
  x.fillStyle = M.sky[0]; x.fillRect(0, 0, m.width, m.height);
  x.drawImage(T.mini, 0, 0);
  x.fillStyle = M.water; x.fillRect(0, (WATER / MH) * m.height, m.width, m.height);
  const sx = m.width / MW, sy = m.height / MH, meta = Object.fromEntries(state.worms.map((w) => [w.id, w]));
  for (const r of V.w || []) { const info = meta[r[0]]; if (!info || r[4] || (fogTeam && info.team !== fogTeam)) continue; x.fillStyle = TEAMS[info.team].col; x.beginPath(); x.arc(r[1] * sx, (r[2] - 8) * sy, r[0] === V.wid ? 4 : 3, 0, 7); x.fill(); if (r[0] === V.wid) { x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.stroke(); } }
  const z = c.cam.z, w = c.cv.clientWidth / z, h = c.cv.clientHeight / z;
  x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 1.5; x.strokeRect((c.cam.x - w / 2) * sx, (c.cam.y - h / 2) * sy, w * sx, h * sy);
}

// ───────────────── 화면 정보 ─────────────────
function hud(c) {
  const { state, me, players } = c.ctx, R = c.root;
  const set = (sel, html) => { const e = R.querySelector(sel); if (e && e.dataset.v !== html) { e.innerHTML = html; e.dataset.v = html; } };
  const mine = c.W && myTurn(c);
  const L = !mine && state.phase === 'play' ? c.others?.[state.turn.uid] : null;
  const liveW = mine ? null : L?.n === state.turn.n ? L.w : null;
  const hpOf = (id) => { if (mine) { const w = c.W.worms.find((o) => o.id === id); return w?.dead ? 0 : w?.hp; } const r = liveW?.find((o) => o[0] === id); const w = state.worms.find((o) => o.id === id); return r ? (r[4] ? 0 : r[3]) : w?.dead ? 0 : w?.hp; };
  const myTeam = state.teams?.[me];
  const fog = (mine ? c.W.fog : L?.fog) || state.fog;
  set('[data-teams]', ['red', 'blue'].map((t) => `<div class="kw-tb ${t}"><b>${TEAMS[t].name} <i>${state.wins[t]}승</i></b>${state.worms.filter((w) => w.team === t).map((w) => { const hp = hpOf(w.id) ?? 0; const hide = fog && myTeam && t !== myTeam; return `<div class="${w.id === state.turn.wid ? 'act' : ''} ${hp <= 0 ? 'dead' : ''} ${w.owner === me ? 'me' : ''}"><span>${esc(players[w.owner]?.name || '?')}</span><em>${hide ? '?' : hp}</em><u><s style="width:${hide ? 100 : Math.min(100, hp)}%"></s></u></div>`; }).join('')}</div>`).join(''));
  set('[data-round]', `ROUND ${state.round}/${state.rounds}`);
  if (state.phase === 'play') {
    const left = Math.max(0, Math.ceil((state.turn.deadline - Date.now()) / 1000));
    set('[data-timer]', `<b class="${left <= 5 ? 'hurry' : ''}">${left}</b>`);
    const w = state.turn.wind, n = Math.round(Math.abs(w) * 5);
  }
  const who = state.phase === 'play' && state.turn.uid !== me ? `<span class="kw-who" style="--c:${TEAMS[state.turn.team].col}">${esc(players[state.turn.uid]?.name || '?')}님 차례</span>` : '';
  set('[data-center]', performance.now() < c.msgUntil ? `<b class="kw-msg">${c.msg}</b>` : who);
  const def = WMAP[c.sel];
  set('[data-wicon]', iconHtml(c.sel));
  const cnt = mine ? c.W.inv[c.sel] : state.inv?.[myTeam]?.[c.sel];
  set('[data-wname]', `${def.name}${cnt > 0 ? ` ×${cnt}` : ''}`);
  gauges(c, mine, L);
  const special = c.W?.rope || c.W?.jet || c.W?.chick;
  R.classList.toggle('kw-wait', !canAct(c) && !(mine && c.W.chick && !c.W.sent));
  R.classList.toggle('kw-mine', !!mine);
  const fl = c.W?.rope ? '로프 놓기' : c.W?.jet ? '제트 끄기' : c.W?.chick ? '🐔 폭파!' : c.sel === 'chute' ? '낙하산' : c.sel === 'drill' ? '꾹 눌러<br>드릴' : def.charge ? '꾹 눌러<br>발사' : '발사';
  set('.kw-fire span', fl);
  void special;
}

// ── 아래 가운데 게이지: 각도 원 · 바람 · 체력/파워/이동 ──
function gauges(c, mine, L) {
  const { state } = c.ctx, R = c.root;
  const live = mine ? null : L?.n === state.turn.n ? L : null;
  const wid = state.turn?.wid;
  const hpNow = mine ? meW(c)?.hp : live ? live.w?.find((o) => o[0] === wid)?.[3] : state.worms?.find((o) => o.id === wid)?.hp;
  const pow = mine ? c.charge : live ? live.ch : -1;
  const mv = mine ? c.W.mv : live?.mv ?? 1;
  const ang = mine ? c.angle : live ? live.a : 0.6, face = mine ? c.facing : live?.f || 1;
  const hp = Math.max(0, hpNow ?? 0);
  const bar = (cls, v) => { const e = R.querySelector(`.kw-bar.${cls} s`); const w = `${Math.max(0, Math.min(1, v)) * 100}%`; if (e.style.width !== w) e.style.width = w; };
  bar('hp', hp / 100); bar('pow', Math.max(0, pow)); bar('mv', mv);
  const tx = (sel, t) => { const e = R.querySelector(sel); if (e.textContent !== t) e.textContent = t; };
  tx('[data-hpv]', String(hp)); tx('[data-powv]', pow >= 0 ? String(Math.round(pow * 100)) : ''); tx('[data-mvv]', `${Math.round(mv * 100)}%`);
  R.querySelector('.kw-bar.hp').classList.toggle('low', hp <= 30);
  const $m = R.querySelector('.kw-bar.pow .mark');
  if (c.mark != null) { $m.hidden = false; $m.style.left = `${c.mark * 100}%`; }
  // 바람: 왼쪽으로 세게 불면 왼쪽 칸이 많이 차요
  const wind = state.turn?.wind || 0;
  R.querySelector('.kw-windg .l s').style.width = `${Math.max(0, -wind) * 100}%`;
  R.querySelector('.kw-windg .r s').style.width = `${Math.max(0, wind) * 100}%`;
  // 각도 원
  const key = `${Math.round(ang * 100)}:${face}`;
  if (c.dialKey === key) return;
  c.dialKey = key;
  const cv = R.querySelector('.kw-dial'), x = cv.getContext('2d'), S = cv.width, m = S / 2;
  x.clearRect(0, 0, S, S);
  x.lineWidth = 7; x.strokeStyle = 'rgba(255,255,255,.15)'; x.beginPath(); x.arc(m, m, m - 10, 0, 7); x.stroke();
  // 조준 가능한 범위
  const a0 = -1.45, a1 = 1.35, toC = (a) => (face > 0 ? -a : Math.PI + a);
  x.strokeStyle = 'rgba(255,210,80,.35)'; x.beginPath(); if (face > 0) x.arc(m, m, m - 10, toC(1.45), toC(-1.35)); else x.arc(m, m, m - 10, toC(-1.35), toC(1.45)); x.stroke();
  for (let d = -90; d <= 90; d += 30) { const a = toC((d * Math.PI) / 180); x.strokeStyle = 'rgba(255,255,255,.5)'; x.lineWidth = 2; x.beginPath(); x.moveTo(m + Math.cos(a) * (m - 20), m + Math.sin(a) * (m - 20)); x.lineTo(m + Math.cos(a) * (m - 4), m + Math.sin(a) * (m - 4)); x.stroke(); }
  const a = toC(ang);
  x.strokeStyle = '#ff4f4f'; x.lineWidth = 5; x.lineCap = 'round'; x.beginPath(); x.moveTo(m, m); x.lineTo(m + Math.cos(a) * (m - 14), m + Math.sin(a) * (m - 14)); x.stroke();
  x.fillStyle = '#ffd84d'; x.beginPath(); x.arc(m, m, 7, 0, 7); x.fill();
  x.fillStyle = '#fff'; x.font = `bold ${S * 0.2}px sans-serif`; x.textAlign = 'center'; x.lineWidth = 4; x.strokeStyle = 'rgba(0,0,0,.6)';
  const deg = `${Math.round((ang * 180) / Math.PI)}°`; x.strokeText(deg, m, m + S * 0.33); x.fillText(deg, m, m + S * 0.33);
  void a0; void a1;
}

function roundModal(c) {
  const { state, players, me } = c.ctx, $m = c.root.querySelector('[data-rmodal]');
  if (state.phase !== 'roundEnd') { $m.hidden = true; return; }
  $m.hidden = false;
  const w = state.roundWinner;
  const html = `<div class="kw-mbox"><div class="kw-mt">${w === 'draw' ? '🤝 무승부' : `🏆 ${TEAMS[w].name} 라운드 승리!`}</div><p>ROUND ${state.round} 종료 · <b style="color:${TEAMS.red.col}">${state.wins.red}</b> : <b style="color:${TEAMS.blue.col}">${state.wins.blue}</b></p><div class="kw-rts">${dmgTable(state, players, me)}</div><small>${matchOver(state) ? '곧 최종 결과가 나와요' : '잠시 후 다음 라운드가 시작돼요'}</small></div>`;
  if ($m.dataset.v !== html) { $m.innerHTML = html; $m.dataset.v = html; }
}

// ───────────────── 무기 창 ─────────────────
function openPanel(c) {
  const $p = c.root.querySelector('[data-panel]');
  if (!$p.hidden) { $p.hidden = true; return; }
  const { state, me } = c.ctx;
  const inv = c.W && myTurn(c) ? c.W.inv : state.inv?.[state.teams?.[me]] || {};
  let pick = c.sel;
  const descHtml = (d) => `<b>${d.icon} ${d.name}</b> <small>${CATS[d.cat]}${d.sp ? ' · 특수무기' : ''}</small><p>${esc(d.desc)}</p>${d.sp && !inv[d.id] ? '<p class="kw-lock">🔒 헬기가 떨어뜨리는 보급 상자를 먹으면 쓸 수 있어요</p>' : ''}`;
  const draw = () => {
    $p.innerHTML = `<div class="kw-pbox">
      <div class="kw-ph"><b>🎒 무기 · 아이템</b><button data-x>✕</button></div>
      ${Object.entries(CATS).map(([k, n]) => `<div class="kw-cat"><h6>${n}</h6><div class="kw-grid">${WEAPONS.filter((w) => w.cat === k).map((w) => `<button class="kw-it ${pick === w.id ? 'on' : ''} ${!(inv[w.id] !== 0 && (inv[w.id] != null || !w.sp)) ? 'none' : ''} ${w.sp ? 'sp' : ''}" data-it="${w.id}"><span>${iconHtml(w.id)}</span><small>${w.name}</small><em>${w.sp && !inv[w.id] ? '🔒' : inv[w.id] == null || inv[w.id] < 0 ? '∞' : '×' + inv[w.id]}</em>${w.sp ? '<b>특수</b>' : ''}</button>`).join('')}</div></div>`).join('')}
      <div class="kw-desc">${descHtml(WMAP[pick])}</div>
      <button class="btn primary block" data-ok ${!inv[pick] && (inv[pick] === 0 || WMAP[pick].sp) ? 'disabled' : ''}>선택</button></div>`;
    $p.querySelector('[data-x]').onclick = () => ($p.hidden = true);
    $p.querySelectorAll('[data-it]').forEach((b) => {
      b.onclick = () => { pick = b.dataset.it; draw(); };
      b.onmouseenter = () => { $p.querySelector('.kw-desc').innerHTML = descHtml(WMAP[b.dataset.it]); };
      b.onmouseleave = () => { $p.querySelector('.kw-desc').innerHTML = descHtml(WMAP[pick]); };
    });
    $p.querySelector('[data-ok]').onclick = () => {
      $p.hidden = true;
      if (c.W && c.sel === 'grenade' && pick !== 'grenade') c.W.gren = null;
      c.sel = pick; c.target = null;
      if (pick === 'grenade' && c.W && myTurn(c) && !c.W.gren && !c.W.attack) { c.W.gren = { end: performance.now() + 5000 }; flash(c, '💣 5초 카운트다운 시작!'); }
      if (WMAP[pick].target) flash(c, '📍 화면을 눌러 목표를 정하세요', 1800);
    };
  };
  draw();
  $p.hidden = false;
}

let actx = null;
function boomSfx(r) {
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime, len = 0.3 + r / 100, b = actx.createBuffer(1, Math.floor(actx.sampleRate * len), actx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
    const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
    s.buffer = b; f.type = 'lowpass'; f.frequency.value = 700 + r * 6; g.gain.value = 0.45;
    s.connect(f); f.connect(g); g.connect(actx.destination); s.start(t);
  } catch {}
}
