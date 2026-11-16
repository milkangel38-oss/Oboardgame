import { backend } from './backend/index.js';
import { GAMES, CATEGORIES, getGame } from './games/index.js';
import * as R from './room-logic.js';
import { APP_NAME, APP_VERSION } from './config.js';
import { summarize, gameRecord, AVATAR_PRESETS } from './profile.js';
import { charSvg, charName } from './avatars.js';

const $app = document.getElementById('app');
let user = null;      // 로그인 정보 (구글/네이버)
let profile = null;   // users/{uid} 문서 (닉네임·사진·전적)
let profileUnsub = null;
const profileListeners = new Set();
let authReady = false;
let cleanup = null;
const recordedMatches = new Set();

// 화면에 쓰는 "나" = 로그인 정보 + 프로필에서 바꾼 닉네임/사진
function me() {
  if (!user) return null;
  return { uid: user.uid, name: profile?.name || user.name, photo: profile?.photo || user.photo };
}

// ───────── 유틸 ─────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

const AVATAR_COLORS = ['#ff4f9a', '#ffb02e', '#3ddc84', '#3d7bff', '#9b5cff', '#ff6b4a', '#14c7c7'];
function avatar(p, size = '') {
  const photo = p?.photo || '';
  const cls = `avatar ${size}`;
  if (photo.startsWith('char:')) {
    const svg = charSvg(photo.slice(5));
    if (svg) return `<span class="${cls} char">${svg}</span>`;
  }
  if (photo.startsWith('emoji:')) {
    const [, emo, color] = photo.split(':');
    const bg = /^#[0-9a-f]{6}$/i.test(color) ? color : '#555';
    return `<span class="${cls} emoji" style="background:${bg}">${esc(emo)}</span>`;
  }
  if (/^(https:|data:image\/)/.test(photo)) {
    return `<img class="${cls}" src="${esc(photo)}" alt="" referrerpolicy="no-referrer">`;
  }
  const hash = [...(p?.uid || p?.name || '')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return `<span class="${cls}" style="background:${AVATAR_COLORS[hash % AVATAR_COLORS.length]}">${esc((p?.name || '?')[0])}</span>`;
}

function playerCount(g) {
  return g.minPlayers === g.maxPlayers ? `${g.minPlayers}명` : `${g.minPlayers}~${g.maxPlayers}명`;
}

const logo = (size = '') => `<span class="logo ${size}"><span class="logo-o">O</span><span class="logo-text">게임</span></span>`;

// ───────── 로그인 상태 / 라우팅 ─────────
// 네이버 로그인에서 돌아온 경우 (#/auth/naver?token=... 또는 ?error=...)
let naverPending = null;
const naverReturn = location.hash.match(/^#\/auth\/naver\?(.*)$/);
if (naverReturn) {
  const params = new URLSearchParams(naverReturn[1]);
  history.replaceState(null, '', location.pathname + location.search + '#/'); // 주소창에서 토큰 지우기
  if (params.get('error')) {
    setTimeout(() => toast(params.get('error')), 300);
  } else if (params.get('token')) {
    naverPending = backend
      .signInWithNaverToken(params.get('token'), { name: params.get('name'), photo: params.get('photo') })
      .catch((e) => toast('네이버 로그인 실패: ' + e.message))
      .finally(() => { naverPending = null; route(); });
  }
}

backend.onAuth((u) => {
  const changed = u?.uid !== user?.uid;
  user = u;
  authReady = true;
  if (changed) {
    profileUnsub?.();
    profile = null;
    profileUnsub = u ? backend.watchProfile(u.uid, (p) => { profile = p; profileListeners.forEach((fn) => fn()); }) : null;
  }
  route();
});
window.addEventListener('hashchange', route);

// #/            로그인 또는 로비
// #/room/CODE   게임 방 (초대 링크)
function route() {
  if (!authReady) return;
  cleanup?.();
  cleanup = null;
  profileListeners.clear();
  if (naverPending) {
    $app.innerHTML = `<div class="center fill">${logo('lg')}<p class="muted">네이버로 로그인하는 중…</p></div>`;
    return;
  }

  const hash = location.hash.slice(1) || '/';
  const m = hash.match(/^\/room\/([A-Za-z0-9]{4,8})$/);

  if (!user) {
    if (m) sessionStorage.setItem('mbg:after', hash); // 로그인 후 초대받은 방으로 이동
    return renderLogin(!!m);
  }
  const after = sessionStorage.getItem('mbg:after');
  if (after) {
    sessionStorage.removeItem('mbg:after');
    if (after !== hash) { location.hash = after; return; }
  }
  if (m) cleanup = renderRoom(m[1].toUpperCase());
  else renderLobby();
}

// ───────── 로그인 ─────────
function renderLogin(invited) {
  $app.innerHTML = `
    <main class="login">
      <div class="login-card">
        ${logo('lg')}

        <div class="marquee">
          <div class="marquee-inner">
            ${invited ? '<p class="marquee-kicker">★ 초대장이 도착했어요 ★</p>' : ''}
            <p class="marquee-text">${invited ? '친구가 초대한<br>' : ''}<em>O게임</em>에<br>참여하시겠습니까?</p>
          </div>
        </div>

        ${backend.mode === 'mock' ? '<div class="notice">테스트 모드 · 실제 로그인 대신 임시 계정으로 들어가요</div>' : ''}

        <div class="login-buttons">
          <button class="arcade-btn google" data-p="google"><span class="ico">G</span>Google로 참여하기</button>
          <button class="arcade-btn naver" data-p="naver"><span class="ico">N</span>네이버로 참여하기</button>
        </div>
        <p class="insert-coin">▶ INSERT COIN ◀</p>
        <p class="version">${APP_VERSION}</p>
      </div>
    </main>`;
  $app.querySelectorAll('[data-p]').forEach((b) => {
    b.onclick = async () => {
      try { await backend.signIn(b.dataset.p, {}); } catch (e) { toast(e.message); }
    };
  });
}

// ───────── 공통 헤더 ─────────
function header() {
  return `
    <header class="top">
      <a href="#/" class="brand">${logo('sm')}</a>
      <button class="btn ghost sm" data-logout>로그아웃</button>
    </header>`;
}
function bindHeader() {
  $app.querySelector('[data-logout]').onclick = async () => {
    location.hash = '#/';
    await backend.signOut();
  };
}

// ───────── 로비 (게임 선택) ─────────
const COLLAPSE_KEY = 'og:profileCollapsed';

function renderLobby() {
  $app.innerHTML = `${header()}
    <main class="wrap lobby">
      <section class="profile" id="profile"></section>

      <section class="game-list">
        <h2 class="section-title">게임 고르기</h2>
        <div class="games">${GAMES.map(gameCard).join('')}</div>
      </section>

      <section class="panel join-box">
        <h2 class="section-title sm">초대 코드로 입장</h2>
        <form class="join">
          <input name="code" maxlength="6" placeholder="예: K7PQ2D" autocomplete="off" autocapitalize="characters">
          <button class="btn primary">입장</button>
        </form>
      </section>
    </main>`;
  bindHeader();
  drawProfile();
  profileListeners.add(() => { drawProfile(); refreshGameRecords(); });

  $app.querySelectorAll('[data-game]').forEach((el) => {
    el.onclick = async () => {
      const game = getGame(el.dataset.game);
      if (game.comingSoon) return toast('곧 열릴 게임이에요! 조금만 기다려 주세요');
      el.disabled = true;
      try {
        const code = await backend.createRoom((c) => R.newRoom(c, game, me()));
        location.hash = `#/room/${code}`;
      } catch (e) {
        toast(e.message);
        el.disabled = false;
      }
    };
  });

  $app.querySelector('form.join').onsubmit = (e) => {
    e.preventDefault();
    const code = e.target.code.value.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) return toast('6자리 코드를 입력해 주세요');
    location.hash = `#/room/${code}`;
  };
}

function drawProfile() {
  const $p = document.getElementById('profile');
  if (!$p) return;
  const my = me();
  const s = summarize(profile?.stats);
  const collapsed = localStorage.getItem(COLLAPSE_KEY) === '1';
  const playable = GAMES.filter((g) => !g.comingSoon || profile?.stats?.[g.id]);

  $p.className = `profile panel ${collapsed ? 'collapsed' : ''}`;
  $p.style.setProperty('--tier', s.tier.color);
  $p.innerHTML = `
    <div class="profile-head" data-toggle role="button" tabindex="0" aria-expanded="${!collapsed}">
      <button class="avatar-edit" data-edit title="프로필 사진 바꾸기">${avatar(my, 'lg')}<span class="pen">✎</span></button>
      <div class="profile-main">
        <div class="profile-name"><b>${esc(my.name)}</b><span class="tier-badge">${s.tier.icon} ${s.tier.name}</span></div>
        <div class="profile-sum">${s.games ? `${s.games}전 ${s.w}승 ${s.l}패 ${s.d}무 · 승률 <b>${s.rate}%</b>` : '아직 기록이 없어요. 첫 판을 시작해 보세요!'}</div>
      </div>
      <span class="chevron" aria-hidden="true">▾</span>
    </div>
    <div class="profile-body">
      <div class="tier-progress">
        <div class="tier-row">
          <span>${s.tier.icon} ${s.tier.name} · <b>${s.points}점</b></span>
          <span class="muted">${s.next ? `${s.next.icon} ${s.next.name}까지 ${s.next.min - s.points}점` : '최고 티어 달성!'}</span>
        </div>
        <div class="bar"><i style="width:${s.progress}%"></i></div>
      </div>
      <ul class="records">
        ${playable.map((g) => {
          const r = gameRecord(profile?.stats, g.id);
          return `<li><span class="rec-game">${g.emoji} ${esc(g.name)}</span>
            <span class="rec-wl">${r.games ? `${r.w}승 ${r.l}패 ${r.d}무` : '기록 없음'}</span>
            <span class="rec-rate">${r.games ? `${r.rate}%` : '-'}</span></li>`;
        }).join('')}
      </ul>
      <p class="hint">승리 3점 · 무승부 1점으로 티어가 올라가요</p>
    </div>`;

  const toggle = () => {
    localStorage.setItem(COLLAPSE_KEY, $p.classList.contains('collapsed') ? '0' : '1');
    drawProfile();
  };
  $p.querySelector('[data-toggle]').onclick = toggle;
  $p.querySelector('[data-toggle]').onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } };
  $p.querySelector('[data-edit]').onclick = (e) => { e.stopPropagation(); openProfileEditor(); };
}

function gameCard(g) {
  const cat = CATEGORIES[g.category] || CATEGORIES.mini;
  return `
    <div class="gcard-wrap">
      <div class="gcat">${cat.icon} ${esc(cat.name)}</div>
      <button class="gcard ${g.comingSoon ? 'soon' : ''}" data-game="${g.id}" aria-label="${esc(g.name)} ${g.comingSoon ? '(준비중)' : '방 만들기'}">
        <div class="gcard-art">${g.art}</div>
        <div class="ribbon"><span><i>◆</i>${esc(g.name)}<i>◆</i></span></div>
        <div class="gcard-top" data-rec="${g.id}">${recordLine(g.id)}</div>
        ${g.comingSoon ? '<div class="stamp">준비중</div>' : ''}
        <div class="gcard-bottom">
          <p class="gdesc">${esc(g.description)}</p>
          <span class="pill">${g.comingSoon ? 'COMING SOON' : '▶ 방 만들기'}</span>
        </div>
        <div class="gcard-foot">👥 ${playerCount(g)} · ⏱ ${esc(g.duration)}</div>
      </button>
    </div>`;
}

function recordLine(id) {
  const r = gameRecord(profile?.stats, id);
  return r.games
    ? `<span>${r.w}승 ${r.l}패</span><span class="gold">승률 ${r.rate}%</span>`
    : `<span>첫 도전!</span><span class="gold">NEW</span>`;
}
function refreshGameRecords() {
  $app.querySelectorAll('[data-rec]').forEach((el) => { el.innerHTML = recordLine(el.dataset.rec); });
}

// ───────── 프로필 편집 ─────────
function openProfileEditor() {
  const my = me();
  let draft = { uid: my.uid, name: my.name, photo: profile?.photo || '' };
  const shown = () => ({ ...draft, photo: draft.photo || user.photo });

  const $m = document.createElement('div');
  $m.className = 'modal-backdrop';
  $m.innerHTML = `
    <div class="modal panel" role="dialog" aria-modal="true" aria-label="프로필 편집">
      <h3 class="section-title sm">프로필 편집</h3>
      <div class="pe-preview"></div>
      <div class="row jc">
        <label class="btn sm">📷 사진 올리기<input type="file" accept="image/*" hidden></label>
        <button class="btn sm ghost" data-default>기본 사진</button>
      </div>
      <p class="label">캐릭터 고르기</p>
      <div class="preset-grid">
        ${AVATAR_PRESETS.map((p) => `<button class="preset" data-preset="${esc(p)}">${avatar({ photo: p })}<span>${esc(charName(p.slice(5)))}</span></button>`).join('')}
      </div>
      <p class="label">닉네임</p>
      <input name="nick" maxlength="12" value="${esc(draft.name)}">
      <div class="row end">
        <button class="btn ghost" data-cancel>취소</button>
        <button class="btn primary" data-save>저장</button>
      </div>
    </div>`;
  document.body.appendChild($m);

  const $preview = $m.querySelector('.pe-preview');
  const paint = () => {
    $preview.innerHTML = avatar(shown(), 'xl');
    $m.querySelectorAll('.preset').forEach((b) => b.classList.toggle('on', b.dataset.preset === draft.photo));
  };
  paint();

  const close = () => $m.remove();
  $m.onclick = (e) => { if (e.target === $m) close(); };
  $m.querySelector('[data-cancel]').onclick = close;
  $m.querySelector('[data-default]').onclick = () => { draft.photo = ''; paint(); };
  $m.querySelectorAll('.preset').forEach((b) => (b.onclick = () => { draft.photo = b.dataset.preset; paint(); }));
  $m.querySelector('input[type=file]').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try { draft.photo = await fileToAvatar(file); paint(); } catch { toast('이미지를 읽지 못했어요. 다른 사진으로 해 보세요'); }
  };
  $m.querySelector('[data-save]').onclick = async (e) => {
    const name = $m.querySelector('[name=nick]').value.trim();
    if (!name) return toast('닉네임을 입력해 주세요');
    e.target.disabled = true;
    try {
      await backend.saveProfile(user.uid, { name, photo: draft.photo });
      toast('프로필을 저장했어요');
      close();
    } catch (err) {
      console.error(err);
      toast('저장하지 못했어요. 잠시 후 다시 시도해 주세요');
      e.target.disabled = false;
    }
  };
}

// 올린 사진을 가운데 기준 정사각형 128px로 줄여서 저장 (용량 약 10KB)
async function fileToAvatar(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const s = Math.min(img.naturalWidth, img.naturalHeight);
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 128, 128);
    return c.toDataURL('image/jpeg', 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ───────── 게임 방 ─────────
function renderRoom(code) {
  $app.innerHTML = `${header()}<main class="wrap"><div class="center muted">방에 들어가는 중…</div></main>`;
  bindHeader();
  const $main = $app.querySelector('main');
  let joining = false;
  let joinError = '';

  const message = (title, sub) => {
    $main.innerHTML = `<div class="center panel"><h2 class="section-title">${esc(title)}</h2>${sub ? `<p class="muted">${esc(sub)}</p>` : ''}
      <a class="btn primary" href="#/">로비로 돌아가기</a></div>`;
  };

  const unsub = backend.watchRoom(code, (room, err) => {
    if (err) return message('방을 불러오지 못했어요', err.message);
    if (!room) return message('방을 찾을 수 없어요', '코드가 맞는지, 방이 아직 있는지 확인해 주세요.');
    const game = getGame(room.gameId);
    if (!game) return message('알 수 없는 게임이에요');

    // 초대 링크로 들어온 경우 자동 참가
    if (!room.players[user.uid]) {
      if (joinError) return message(joinError);
      if (room.status !== 'waiting') return message('이미 게임이 진행 중이에요', '게임이 끝나고 방장이 새 게임을 열면 다시 들어올 수 있어요.');
      if (!joining) {
        joining = true;
        backend.mutateRoom(code, (r) => R.join(r, me(), game))
          .catch((e) => { joinError = e.message; message(e.message); })
          .finally(() => (joining = false));
      }
      return;
    }
    recordIfFinished(room);
    drawRoom($main, room, game);
  });

  return unsub;
}

// 게임이 끝나면 내 전적에 한 번만 기록
function recordIfFinished(room) {
  if (room.status !== 'finished' || !room.result || room.result.aborted || !room.matchId) return;
  const key = `${room.code}:${room.matchId}`;
  if (recordedMatches.has(key)) return;
  recordedMatches.add(key);
  const outcome = room.result.draw ? 'd' : (room.result.winners || []).includes(user.uid) ? 'w' : 'l';
  backend.recordResult(user.uid, key, room.gameId, outcome).catch((e) => console.warn('전적 저장 실패', e));
}

function drawRoom($main, room, game) {
  const players = R.sortedPlayers(room);
  const isHost = room.hostId === user.uid;
  const mine = room.players[user.uid];
  const check = R.canStart(room, game);
  const act = (fn) => backend.mutateRoom(room.code, fn).catch((e) => toast(e.message));

  const emptySeats = Math.max(0, game.minPlayers - players.length);

  let controls = '';
  if (room.status === 'waiting') {
    controls = isHost
      ? `<div class="controls"><button class="btn primary block big" data-start ${check.ok ? '' : 'disabled'}>게임 시작</button>
         <p class="hint">${check.ok ? '모두 준비됐어요!' : esc(check.reason)}</p></div>`
      : `<div class="controls"><button class="btn ${mine.ready ? 'ghost' : 'primary'} block big" data-ready>${mine.ready ? '준비 취소' : '준비'}</button>
         <p class="hint">${mine.ready ? '방장이 시작하길 기다리는 중…' : '준비를 누르면 방장이 시작할 수 있어요'}</p></div>`;
  }

  let resultBanner = '';
  if (room.status === 'finished') {
    const r = room.result || {};
    const tag = r.aborted ? '' : r.draw ? '<span class="res-tag draw">DRAW</span>'
      : (r.winners || []).includes(user.uid) ? '<span class="res-tag win">WIN</span>' : '<span class="res-tag lose">LOSE</span>';
    resultBanner = `
      <div class="result">
        <div class="result-msg">${tag}${esc(r.message || '게임 종료')}</div>
        ${isHost ? '<button class="btn primary" data-reset>새 게임 열기</button>' : '<span class="muted sm">방장이 새 게임을 열면 다시 준비할 수 있어요</span>'}
      </div>`;
  }

  const stage = room.status === 'waiting'
    ? `<div class="waiting">
         <div class="waiting-art">${game.art}</div>
         <div class="ribbon static"><span><i>◆</i>${esc(game.name)}<i>◆</i></span></div>
         <p class="muted">${playerCount(game)} · ${esc(game.duration)}</p>
         ${game.rules ? `<ol class="rules">${game.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>` : ''}
         ${controls}
       </div>`
    : `${resultBanner}<div class="game-area"></div>`;

  $main.innerHTML = `
    <div class="room-head">
      <div>
        <div class="eyebrow">${game.emoji} ${esc(game.name)} · ${room.status === 'waiting' ? '대기 중' : room.status === 'playing' ? '게임 중' : '게임 종료'}</div>
        <h2 class="room-code">방 코드 <span class="code">${esc(room.code)}</span></h2>
      </div>
      <div class="row">
        <button class="btn primary" data-invite>친구 초대</button>
        <button class="btn ghost" data-leave>나가기</button>
      </div>
    </div>
    <div class="room-body">
      <section class="players panel">
        <h3>참가자 <span class="muted">${players.length}/${game.maxPlayers}</span></h3>
        <ul class="seats">
          ${players.map((p) => {
            const host = p.uid === room.hostId;
            const tag = host ? '방장' : room.status === 'waiting' ? (p.ready ? 'READY' : '대기') : '';
            return `<li class="seat ${p.uid === user.uid ? 'is-me' : ''} ${host ? 'host' : ''} ${!host && room.status === 'waiting' && p.ready ? 'ready' : ''}" title="${esc(p.name)}">
              <span class="seat-av">${avatar(p)}${host ? '<span class="crown">👑</span>' : ''}</span>
              <span class="seat-name">${esc(p.name)}</span>
              ${tag ? `<span class="seat-tag">${tag}</span>` : ''}
            </li>`;
          }).join('')}
          ${'<li class="seat empty"><span class="seat-av"><span class="avatar">?</span></span><span class="seat-name">빈 자리</span></li>'.repeat(emptySeats)}
          ${room.status === 'waiting' && players.length >= game.minPlayers && players.length < game.maxPlayers
            ? '<li class="seat add" data-invite-seat role="button" tabindex="0"><span class="seat-av"><span class="avatar">+</span></span><span class="seat-name">초대하기</span></li>' : ''}
        </ul>
      </section>
      <section class="stage panel">${stage}</section>
    </div>`;

  $main.querySelector('[data-invite]').onclick = () => invite(room, game);
  const $seatInvite = $main.querySelector('[data-invite-seat]');
  if ($seatInvite) $seatInvite.onclick = () => invite(room, game);
  $main.querySelector('[data-leave]').onclick = () => {
    if (room.status === 'playing' && !confirm('게임 중에 나가면 게임이 끝나요. 나갈까요?')) return;
    const uid = user.uid;
    cleanup?.(); // 방 감시를 먼저 끊어야 나가자마자 자동 재입장되지 않아요
    cleanup = null;
    location.hash = '#/';
    backend.mutateRoom(room.code, (r) => R.leave(r, uid)).catch(() => {});
  };
  $main.querySelector('[data-ready]')?.addEventListener('click', () => act((r) => R.setReady(r, user.uid, !mine.ready)));
  $main.querySelector('[data-start]')?.addEventListener('click', () => act((r) => R.start(r, game, user.uid)));
  $main.querySelector('[data-reset]')?.addEventListener('click', () => act((r) => R.reset(r, user.uid)));

  const $area = $main.querySelector('.game-area');
  if ($area && room.game) {
    game.render($area, {
      state: room.game,
      me: user.uid,
      players: room.players,
      finished: room.status === 'finished',
      sendMove: (move) => act((r) => R.applyMove(r, game, user.uid, move)),
    });
  }
}

async function invite(room, game) {
  const url = `${location.origin}${location.pathname}#/room/${room.code}`;
  const text = `${me().name}님이 [${game.name}] 게임에 초대했어요! O게임에 참여하시겠습니까? 방 코드: ${room.code}`;
  if (navigator.share) {
    try { await navigator.share({ title: APP_NAME, text, url }); return; }
    catch (e) { if (e.name === 'AbortError') return; }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast('초대 링크를 복사했어요. 친구에게 붙여넣어 보내세요!');
  } catch {
    toast(url);
  }
}
