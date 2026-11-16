import { backend } from './backend/index.js';
import { GAMES, getGame } from './games/index.js';
import * as R from './room-logic.js';
import { APP_NAME } from './config.js';

const $app = document.getElementById('app');
let user = null;
let authReady = false;
let cleanup = null;

// ───────── 유틸 ─────────
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

const AVATAR_COLORS = ['#f97362', '#f5a524', '#3bb273', '#3a86ff', '#8b5cf6', '#ec4899', '#14b8a6'];
function avatar(p) {
  if (p.photo) return `<img class="avatar" src="${esc(p.photo)}" alt="" referrerpolicy="no-referrer">`;
  const hash = [...(p.uid || p.name || '')].reduce((a, c) => a + c.charCodeAt(0), 0);
  return `<span class="avatar" style="background:${AVATAR_COLORS[hash % AVATAR_COLORS.length]}">${esc((p.name || '?')[0])}</span>`;
}

function playerCount(g) {
  return g.minPlayers === g.maxPlayers ? `${g.minPlayers}명` : `${g.minPlayers}~${g.maxPlayers}명`;
}

// ───────── 라우팅 ─────────
// #/            로그인 또는 로비
// #/room/CODE   게임 방 (초대 링크)
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

backend.onAuth((u) => { user = u; authReady = true; route(); });
window.addEventListener('hashchange', route);

function route() {
  if (!authReady) return;
  cleanup?.();
  cleanup = null;
  if (naverPending) {
    $app.innerHTML = '<div class="center muted" style="min-height:100vh;align-content:center">네이버로 로그인하는 중…</div>';
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
        <div class="logo-dice">🎲</div>
        <h1>${esc(APP_NAME)}</h1>
        <p class="sub">${invited ? '친구가 게임에 초대했어요! 로그인하고 바로 입장하세요.' : '친구들과 가볍게 즐기는 미니 보드게임'}</p>
        ${backend.mode === 'mock' ? '<div class="notice">테스트 모드 · 실제 로그인 대신 닉네임으로 입장해요</div>' : ''}
        <button class="btn social google" data-p="google"><span class="ico">G</span>Google로 시작하기</button>
        <button class="btn social naver" data-p="naver"><span class="ico">N</span>네이버로 시작하기</button>
        <div class="divider"><span>또는</span></div>
        <form class="guest">
          <input name="nick" maxlength="12" placeholder="닉네임 (최대 12자)" autocomplete="nickname">
          <button class="btn">게스트로 시작</button>
        </form>
      </div>
    </main>`;
  const nick = () => $app.querySelector('[name=nick]').value.trim();
  $app.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => doSignIn(b.dataset.p, nick())));
  $app.querySelector('form.guest').onsubmit = (e) => {
    e.preventDefault();
    if (!nick()) return toast('닉네임을 입력해 주세요');
    doSignIn('guest', nick());
  };
}

async function doSignIn(provider, name) {
  try { await backend.signIn(provider, { name }); } catch (e) { toast(e.message); }
}

// ───────── 공통 헤더 ─────────
function header() {
  return `
    <header class="top">
      <a href="#/" class="brand">🎲 <span>${esc(APP_NAME)}</span></a>
      <div class="me">${avatar(user)}<span class="me-name">${esc(user.name)}</span>
        <button class="btn ghost sm" data-logout>로그아웃</button></div>
    </header>`;
}
function bindHeader() {
  $app.querySelector('[data-logout]').onclick = async () => {
    location.hash = '#/';
    await backend.signOut();
  };
}

// ───────── 로비 (게임 선택) ─────────
function renderLobby() {
  $app.innerHTML = `${header()}
    <main class="wrap">
      <section>
        <h2>게임 고르기</h2>
        <p class="muted">게임을 고르면 방이 만들어져요. 방에서 초대 링크를 친구에게 보내세요.</p>
        <div class="games">
          ${GAMES.map((g) => `
            <button class="game-card" data-game="${g.id}" ${g.comingSoon ? 'disabled' : ''}>
              <span class="game-emoji">${g.emoji}</span>
              <span class="game-name">${esc(g.name)}</span>
              <span class="game-meta">${playerCount(g)} · ${esc(g.duration)}</span>
              <span class="game-desc">${esc(g.description)}</span>
              ${g.comingSoon ? '<span class="tag">준비중</span>' : '<span class="tag go">방 만들기 →</span>'}
            </button>`).join('')}
        </div>
      </section>
      <section class="join-box">
        <h2>초대 코드로 입장</h2>
        <form class="join">
          <input name="code" maxlength="6" placeholder="예: K7PQ2D" autocomplete="off" autocapitalize="characters">
          <button class="btn primary">입장</button>
        </form>
      </section>
    </main>`;
  bindHeader();

  $app.querySelectorAll('[data-game]').forEach((el) => {
    el.onclick = async () => {
      const game = getGame(el.dataset.game);
      el.disabled = true;
      try {
        const code = await backend.createRoom((c) => R.newRoom(c, game, user));
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

// ───────── 게임 방 ─────────
function renderRoom(code) {
  $app.innerHTML = `${header()}<main class="wrap"><div class="center muted">방에 들어가는 중…</div></main>`;
  bindHeader();
  const $main = $app.querySelector('main');
  let joining = false;
  let joinError = '';

  const message = (title, sub) => {
    $main.innerHTML = `<div class="center"><h2>${esc(title)}</h2>${sub ? `<p class="muted">${esc(sub)}</p>` : ''}
      <a class="btn" href="#/">로비로 돌아가기</a></div>`;
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
        backend.mutateRoom(code, (r) => R.join(r, user, game))
          .catch((e) => { joinError = e.message; message(e.message); })
          .finally(() => (joining = false));
      }
      return;
    }
    drawRoom($main, room, game);
  });

  return unsub;
}

function drawRoom($main, room, game) {
  const players = R.sortedPlayers(room);
  const isHost = room.hostId === user.uid;
  const me = room.players[user.uid];
  const check = R.canStart(room, game);
  const act = (fn) => backend.mutateRoom(room.code, fn).catch((e) => toast(e.message));

  const emptySeats = Math.max(0, game.minPlayers - players.length);

  let controls = '';
  if (room.status === 'waiting') {
    controls = isHost
      ? `<button class="btn primary block" data-start ${check.ok ? '' : 'disabled'}>게임 시작</button>
         <p class="hint">${check.ok ? '모두 준비됐어요!' : esc(check.reason)}</p>`
      : `<button class="btn ${me.ready ? 'ghost' : 'primary'} block" data-ready>${me.ready ? '준비 취소' : '준비'}</button>
         <p class="hint">${me.ready ? '방장이 시작하길 기다리는 중…' : '준비를 누르면 방장이 시작할 수 있어요'}</p>`;
  }

  let stage = '';
  if (room.status === 'waiting') {
    stage = `
      <div class="waiting">
        <div class="big-emoji">${game.emoji}</div>
        <h3>${esc(game.name)}</h3>
        <p class="muted">${playerCount(game)} · ${esc(game.duration)}</p>
        ${game.rules ? `<ol class="rules">${game.rules.map((r) => `<li>${esc(r)}</li>`).join('')}</ol>` : ''}
      </div>`;
  } else {
    stage = `
      ${room.status === 'finished' ? `
        <div class="result">
          <div class="result-msg">${esc(room.result?.message || '게임 종료')}</div>
          ${isHost ? '<button class="btn primary" data-reset>새 게임 열기</button>' : '<span class="muted">방장이 새 게임을 열면 다시 준비할 수 있어요</span>'}
        </div>` : ''}
      <div class="game-area"></div>`;
  }

  $main.innerHTML = `
    <div class="room-head">
      <div>
        <div class="eyebrow">${game.emoji} ${esc(game.name)} · ${room.status === 'waiting' ? '대기 중' : room.status === 'playing' ? '게임 중' : '게임 종료'}</div>
        <h2>방 코드 <span class="code">${esc(room.code)}</span></h2>
      </div>
      <div class="row">
        <button class="btn primary" data-invite>친구 초대</button>
        <button class="btn ghost" data-leave>나가기</button>
      </div>
    </div>
    <div class="room-body">
      <aside class="players card">
        <h3>참가자 <span class="muted">${players.length}/${game.maxPlayers}</span></h3>
        <ul>
          ${players.map((p) => `
            <li class="${p.uid === user.uid ? 'is-me' : ''}">
              ${avatar(p)}<span class="pname">${esc(p.name)}${p.uid === user.uid ? ' <small>(나)</small>' : ''}</span>
              ${p.uid === room.hostId ? '<span class="badge host">👑 방장</span>'
                : room.status === 'waiting' ? (p.ready ? '<span class="badge ready">준비 완료</span>' : '<span class="badge wait">대기</span>') : ''}
            </li>`).join('')}
          ${'<li class="empty">빈 자리 · 친구를 초대하세요</li>'.repeat(emptySeats)}
        </ul>
        ${controls}
      </aside>
      <section class="stage card">${stage}</section>
    </div>`;

  // 버튼 연결
  $main.querySelector('[data-invite]').onclick = () => invite(room, game);
  $main.querySelector('[data-leave]').onclick = () => {
    if (room.status === 'playing' && !confirm('게임 중에 나가면 게임이 끝나요. 나갈까요?')) return;
    const uid = user.uid;
    cleanup?.(); // 방 감시를 먼저 끊어야 나가자마자 자동 재입장되지 않아요
    cleanup = null;
    location.hash = '#/';
    backend.mutateRoom(room.code, (r) => R.leave(r, uid)).catch(() => {});
  };
  $main.querySelector('[data-ready]')?.addEventListener('click', () => act((r) => R.setReady(r, user.uid, !me.ready)));
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
  const text = `${user.name}님이 [${game.name}] 게임에 초대했어요! 방 코드: ${room.code}`;
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
