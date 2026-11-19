import { backend } from './backend/index.js';
import { GAMES, CATEGORIES, getGame, getCategory } from './games/index.js';
import * as R from './room-logic.js';
import { APP_NAME, APP_VERSION } from './config.js';
import { summarize, gameRecord, tierOf, AVATAR_PRESETS, GARNET } from './profile.js';
import { charSvg, charName } from './avatars.js';
import { startBgm, stopBgm, bgmWanted, bgmPlaying } from './bgm.js';
import { showAlert } from './alert.js';
import { primeSounds, startGameBgm, stopGameBgm, getVolume, isMuted, setVolume, setMuted, onSoundChange } from './sound.js';

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

// ───────── 접속 상태 (친구에게 보여 주기) ─────────
// users/{uid}.presence = { at: 마지막 신호(0이면 오프라인), last: 마지막 접속, state: lobby|waiting|playing, room, game }
const ONLINE_MS = 75000;
let presenceState = { state: 'lobby', room: null, game: null };
function pushPresence(offline = false) {
  if (!user) return;
  const now = Date.now();
  backend.saveProfile(user.uid, {
    presence: { ...presenceState, at: offline ? 0 : now, last: now },
    authName: user.name, authPhoto: user.photo || '',
  }).catch(() => {});
}
function setPresence(next) {
  const changed = ['state', 'room', 'game'].some((k) => (next[k] ?? null) !== (presenceState[k] ?? null));
  presenceState = { state: next.state, room: next.room ?? null, game: next.game ?? null };
  if (changed) pushPresence();
}
setInterval(() => pushPresence(), 30000);
window.addEventListener('pagehide', () => pushPresence(true));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') pushPresence(); });

backend.onAuth((u) => {
  const changed = u?.uid !== user?.uid;
  user = u;
  authReady = true;
  if (changed) {
    profileUnsub?.();
    profile = null;
    let lastSig = '';
    profileUnsub = u ? backend.watchProfile(u.uid, (p) => {
      profile = p;
      const sig = JSON.stringify(p, (k, v) => (k === 'presence' || k === 'updatedAt' ? undefined : v));
      if (sig === lastSig) return; // 접속 신호만 바뀐 경우
      lastSig = sig;
      syncFriendSubs();
      profileListeners.forEach((fn) => fn());
    }) : null;
    stopFriends();
    if (u) { pushPresence(); startFriends(); }
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
  stopBgm(); // BGM은 로그인 화면에서만
  const after = sessionStorage.getItem('mbg:after');
  if (after) {
    sessionStorage.removeItem('mbg:after');
    if (after !== hash) { location.hash = after; return; }
  }
  const cat = hash.match(/^\/cat\/([a-z]+)$/);
  if (!m) setPresence({ state: 'lobby' });
  if (m) cleanup = renderRoom(m[1].toUpperCase());
  else if (cat && getCategory(cat[1])) renderCategory(getCategory(cat[1]));
  else cleanup = renderLobby();
}

// ───────── 로그인 ─────────
function renderLogin(invited) {
  $app.innerHTML = `
    <main class="login">
      <button class="bgm-btn" data-bgm aria-label="배경음악 켜고 끄기"></button>
      <div class="login-card">
        ${logo('lg')}

        <div class="marquee">
          <div class="marquee-inner">
            ${invited ? '<p class="marquee-kicker">★ 초대장이 도착했어요 ★</p>' : ''}
            <p class="marquee-text">${invited ? '친구가 초대한<br>' : ''}<em>O게임</em>에<br>참여하시겠습니까?</p>
          </div>
        </div>

        ${backend.mode === 'mock' ? `<div class="notice">🧪 <b>혼자 테스트 모드</b> · 로그인 없이 임시 플레이어로 들어가요.<br>
          새 탭에 초대 링크를 붙여 넣으면 그 탭은 다른 플레이어가 돼요. 여기서 얻은 가넷·전적은 실제 계정과 상관없어요.</div>` : ''}

        <div class="login-buttons">
          <button class="arcade-btn google" data-p="google"><span class="ico">G</span>Google로 참여하기</button>
          <button class="arcade-btn naver" data-p="naver"><span class="ico">N</span>네이버로 참여하기</button>
        </div>
        <p class="insert-coin">▶ INSERT COIN ◀</p>
        <p class="version">${APP_VERSION} · <a href="/about.html">서비스 소개</a> · <a href="/privacy.html">개인정보 처리방침</a></p>
      </div>
    </main>`;
  $app.querySelectorAll('[data-p]').forEach((b) => {
    b.onclick = async () => {
      try { await backend.signIn(b.dataset.p, {}); } catch (e) { toast(e.message); }
    };
  });

  // BGM 버튼 (브라우저 정책상 화면을 한 번 눌러야 소리가 나요)
  const $bgm = $app.querySelector('[data-bgm]');
  const paintBgm = () => {
    const on = bgmPlaying();
    $bgm.classList.toggle('on', on);
    $bgm.innerHTML = on ? '🔊 <span>BGM</span>' : '🔇 <span>BGM</span>';
  };
  $bgm.onclick = async (e) => {
    e.stopPropagation();
    if (bgmPlaying()) stopBgm(true); else await startBgm().catch(() => {});
    paintBgm();
  };
  paintBgm();
  if (bgmWanted() && !bgmPlaying()) {
    // 전에 켜 두었다면, 화면을 처음 누를 때 자동으로 다시 재생
    const resume = async () => { await startBgm().catch(() => {}); paintBgm(); };
    $app.querySelector('.login').addEventListener('pointerdown', resume, { once: true });
  }
}

// ───────── 공통 헤더 ─────────
function header() {
  return `
    <header class="top">
      <a href="#/" class="brand">${logo('sm')}${backend.mode === 'mock' ? '<span class="test-chip">TEST</span>' : ''}</a>
      <span class="row"><a class="fr-badge" data-frbadge href="#/" hidden></a><button class="btn ghost sm" data-logout>로그아웃</button></span>
    </header>`;
}
function bindHeader() {
  updateFriendBadge();
  $app.querySelector('[data-logout]').onclick = async () => {
    location.hash = '#/';
    pushPresence(true);
    await backend.signOut();
  };
}

// ───────── 로비 (게임 선택) ─────────
const COLLAPSE_KEY = 'og:profileCollapsed';

function renderLobby() {
  $app.innerHTML = `${header()}
    <main class="wrap lobby">
      <section class="profile" id="profile"></section>
      <section class="panel friends" id="friends"></section>

      <nav class="cat-banners" aria-label="게임 분류">
        ${CATEGORIES.map((c) => {
          const n = GAMES.filter((g) => g.category === c.id && !g.comingSoon).length;
          return `<a class="cat-banner cat-${c.id}" href="#/cat/${c.id}">
            <div class="cat-art">${c.art}</div>
            <div class="cat-text">
              <span class="cat-name">${esc(c.name)}</span>
              <span class="cat-desc">${esc(c.desc)}</span>
              <span class="cat-count">${n ? `게임 ${n}개 ▶` : '준비중'}</span>
            </div>
          </a>`;
        }).join('')}
      </nav>

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
  drawFriends();
  friendListeners.add(drawFriends);
  const tick = setInterval(drawFriends, 20000); // 접속 끊김 반영
  profileListeners.add(() => { drawProfile(); refreshGameRecords(); });

  $app.querySelector('form.join').onsubmit = (e) => {
    e.preventDefault();
    const code = e.target.code.value.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) return toast('6자리 코드를 입력해 주세요');
    location.hash = `#/room/${code}`;
  };
  return () => { clearInterval(tick); friendListeners.delete(drawFriends); };
}

// ───────── 친구 (요청 → 수락) ─────────
// 내 문서(users/{나})에만 기록해요:
//   friends{uid: {at,name,photo}} 친구 · reqOut[uid] 보낸 요청 · reqMeta{uid:{at,...}} 요청 보낸 시각
//   declined{uid: at} 거절한 요청 · unfriended{uid: at} 내가 삭제한 친구
// 상대는 내 문서를 보고 수락/거절/삭제를 자기 쪽에 반영해요.
const fdocs = {};          // 친구·요청 상대 프로필
let incoming = [];         // 나에게 온 요청 (보낸 사람 프로필)
let incomingInit = false;
let friendSubs = {};
let incomingUnsub = null;
const friendListeners = new Set();
const notifyFriends = () => { friendListeners.forEach((fn) => fn()); updateFriendBadge(); };
const nameOf = (p, fb = '친구') => p?.name || p?.authName || fb;
const photoOf = (p) => p?.photo || p?.authPhoto || '';

function visibleIncoming() {
  return incoming.filter((p) => {
    if (profile?.friends?.[p.uid]) return false;
    const dec = profile?.declined?.[p.uid];
    return !(dec && dec >= (p.reqMeta?.[user.uid]?.at || 0));
  });
}
function startFriends() {
  incomingUnsub = backend.watchIncoming(user.uid, (list) => {
    const before = new Set(visibleIncoming().map((p) => p.uid));
    incoming = list;
    if (incomingInit) visibleIncoming().forEach((p) => { if (!before.has(p.uid)) toast(`🔔 ${nameOf(p)}님이 친구 요청을 보냈어요`); });
    incomingInit = true;
    notifyFriends();
  });
  syncFriendSubs();
}
function stopFriends() {
  incomingUnsub?.(); incomingUnsub = null;
  Object.values(friendSubs).forEach((u) => u()); friendSubs = {};
  incoming = []; incomingInit = false;
}
function syncFriendSubs() {
  if (!user) return;
  const ids = new Set([...Object.keys(profile?.friends || {}), ...(profile?.reqOut || [])]);
  ids.forEach((id) => { if (!friendSubs[id]) friendSubs[id] = backend.watchProfile(id, (p) => { fdocs[id] = p; reconcile(); notifyFriends(); checkInvites(id); checkDm(id); }); });
  Object.keys(friendSubs).forEach((id) => { if (!ids.has(id)) { friendSubs[id](); delete friendSubs[id]; } });
  reconcile();
  notifyFriends();
}

// 상대가 수락/거절/삭제한 것을 내 쪽에 반영
let reconciling = false;
function reconcile() {
  if (!user || !profile || reconciling) return;
  const me = user.uid, accepted = [], dropped = [], gone = [];
  (profile.reqOut || []).forEach((id) => {
    const p = fdocs[id];
    if (!p) return;
    const dec = p.declined?.[me];
    if (p.friends?.[me]) accepted.push(id);
    else if (dec && dec >= (profile.reqMeta?.[id]?.at || 0)) dropped.push(id);
  });
  Object.entries(profile.friends || {}).forEach(([id, f]) => {
    const p = fdocs[id];
    const u = p?.unfriended?.[me];
    if (u && u > (f.at || 0) && !p.friends?.[me]) gone.push(id);
  });
  if (!accepted.length && !dropped.length && !gone.length) return;
  reconciling = true;
  editFriends((d) => {
    accepted.forEach((id) => (d.friends[id] = { at: Date.now(), name: nameOf(fdocs[id]), photo: photoOf(fdocs[id]) }));
    [...accepted, ...dropped].forEach((id) => { d.reqOut = d.reqOut.filter((x) => x !== id); delete d.reqMeta[id]; });
    gone.forEach((id) => delete d.friends[id]);
  })
    .then(() => accepted.forEach((id) => toast(`🎉 ${nameOf(fdocs[id])}님이 친구 요청을 수락했어요`)))
    .catch(() => {})
    .finally(() => { reconciling = false; });
}
function editFriends(fn) {
  return backend.updateProfile(user.uid, (d) => {
    d.friends = { ...(d.friends || {}) }; d.reqOut = [...(d.reqOut || [])]; d.reqMeta = { ...(d.reqMeta || {}) };
    d.declined = { ...(d.declined || {}) }; d.unfriended = { ...(d.unfriended || {}) };
    fn(d);
    return d;
  });
}
async function friendAction(act, person) {
  const id = person.uid, now = Date.now();
  if (act === 'request' && visibleIncoming().some((p) => p.uid === id)) act = 'accept'; // 서로 요청하면 바로 친구
  if (act === 'request') {
    await editFriends((d) => { if (!d.reqOut.includes(id)) d.reqOut.push(id); d.reqMeta[id] = { at: now, name: person.name, photo: person.photo }; delete d.unfriended[id]; });
    toast(`${person.name}님에게 친구 요청을 보냈어요`);
  } else if (act === 'accept') {
    await editFriends((d) => { d.friends[id] = { at: now, name: person.name, photo: person.photo }; delete d.declined[id]; delete d.unfriended[id]; d.reqOut = d.reqOut.filter((x) => x !== id); });
    toast(`${person.name}님과 친구가 됐어요!`);
  } else if (act === 'decline') {
    await editFriends((d) => { d.declined[id] = now; });
    toast('친구 요청을 거절했어요');
  } else if (act === 'cancel') {
    await editFriends((d) => { d.reqOut = d.reqOut.filter((x) => x !== id); delete d.reqMeta[id]; });
    toast('친구 요청을 취소했어요');
  } else if (act === 'remove') {
    await editFriends((d) => { delete d.friends[id]; d.unfriended[id] = now; d.reqOut = d.reqOut.filter((x) => x !== id); });
    toast(`${person.name}님을 친구에서 삭제했어요`);
  }
}
function relationOf(uid) {
  if (profile?.friends?.[uid]) return 'friend';
  if (visibleIncoming().some((p) => p.uid === uid)) return 'incoming';
  if ((profile?.reqOut || []).includes(uid)) return 'outgoing';
  return 'none';
}
function updateFriendBadge() {
  const $b = document.querySelector('[data-frbadge]');
  if (!$b) return;
  const n = user ? visibleIncoming().length : 0;
  $b.hidden = !n;
  $b.textContent = `🔔 친구 요청 ${n}`;
}

function friendView(uid) {
  const p = fdocs[uid];
  const saved = profile?.friends?.[uid] || profile?.reqMeta?.[uid] || {};
  return { uid, name: nameOf(p, saved.name || '친구'), photo: photoOf(p) || saved.photo || '' };
}
const ago = (t) => {
  const m = Math.floor((Date.now() - t) / 60000);
  return m < 1 ? '방금 전' : m < 60 ? `${m}분 전` : m < 1440 ? `${Math.floor(m / 60)}시간 전` : `${Math.floor(m / 1440)}일 전`;
};
function friendStatus(p) {
  const pr = p?.presence;
  const online = pr && pr.at && Date.now() - pr.at < ONLINE_MS;
  const gname = getGame(pr?.game)?.name || '';
  if (!online) return { key: 'off', label: pr?.last ? `오프라인 · ${ago(pr.last)} 접속` : '오프라인', order: 3 };
  if (pr.state === 'playing') return { key: 'play', label: `게임 중${gname ? ` · ${gname}` : ''}`, order: 1 };
  if (pr.state === 'waiting') return { key: 'wait', label: `대기 중${gname ? ` · ${gname}` : ''}`, room: pr.room, order: 0 };
  return { key: 'on', label: '온라인 · 로비', order: 0 };
}
const personAttrs = (p) => `data-person="${esc(p.uid)}" data-pname="${esc(p.name)}" data-pphoto="${esc(p.photo)}"`;

const FR_FOLD_KEY = 'og:friendsFolded';
// 친구 전적: 티어 · 보유 가넷 · N전 N승 N패 · 승률
function friendRecord(uid) {
  const p = fdocs[uid];
  if (!p) return '';
  const s = summarize(p);
  return `<span class="fr-rec"><i class="fr-tier" style="--tier:${s.tier.color}">${s.tier.icon} ${s.tier.name}</i><i class="fr-gar">${GARNET}${s.garnets}</i><i>${s.plays ? `${s.plays}전 ${s.wins}승 ${s.losses}패 · ${s.rate}%` : '전적 없음'}</i></span>`;
}

function drawFriends() {
  const $f = document.getElementById('friends');
  if (!$f) return;
  const list = Object.keys(profile?.friends || {})
    .map((uid) => ({ ...friendView(uid), st: friendStatus(fdocs[uid]) }))
    .sort((a, b) => a.st.order - b.st.order || a.name.localeCompare(b.name));
  const inc = visibleIncoming().map((p) => ({ uid: p.uid, name: nameOf(p), photo: photoOf(p) }));
  const out = (profile?.reqOut || []).map(friendView);
  const on = list.filter((f) => f.st.key !== 'off').length;
  const folded = localStorage.getItem(FR_FOLD_KEY) === '1';
  $f.classList.toggle('folded', folded);
  $f.innerHTML = `
    <h2 class="section-title sm fr-head" data-frfold role="button" tabindex="0" aria-expanded="${!folded}">👥 친구 <span class="muted">${on}/${list.length} 접속 중</span>${inc.length ? `<span class="fr-newreq">요청 ${inc.length}</span>` : ''}<span class="chevron" aria-hidden="true">▾</span></h2>
    <div class="fr-body">
    ${inc.length ? `<div class="fr-sec"><div class="fr-sec-t">🔔 받은 친구 요청</div><ul class="fr-list">${inc.map((p) => `
      <li class="fr-item req" ${personAttrs(p)}>
        <span class="fr-av">${avatar(p)}</span>
        <span class="fr-main"><b>${esc(p.name)}</b><small>친구가 되고 싶어 해요</small></span>
        <button class="btn sm primary" data-fr="accept" data-id="${esc(p.uid)}">수락</button>
        <button class="btn sm ghost" data-fr="decline" data-id="${esc(p.uid)}">거절</button>
      </li>`).join('')}</ul></div>` : ''}
    ${list.length ? `<ul class="fr-list">${list.map((f) => `
      <li class="fr-item st-${f.st.key}" ${personAttrs(f)}>
        <span class="fr-av">${avatar(f)}<i class="fr-dot"></i></span>
        <span class="fr-main"><b>${esc(f.name)}${unreadCount(f.uid) ? `<i class="dm-unread">${unreadCount(f.uid)}</i>` : ''}</b><small>${esc(f.st.label)}</small>${friendRecord(f.uid)}</span>
        <button class="btn sm ghost fr-chatbtn" data-dm="${esc(f.uid)}" title="대화하기">💬</button>
        ${f.st.key === 'wait' && f.st.room ? `<a class="btn sm primary" href="#/room/${esc(f.st.room)}">참가</a>` : ''}
      </li>`).join('')}</ul>`
      : '<p class="muted fr-empty">아직 친구가 없어요.</p>'}
    ${out.length ? `<div class="fr-sec"><div class="fr-sec-t">📨 보낸 요청 <small>상대가 수락하면 친구가 돼요</small></div><ul class="fr-list">${out.map((p) => `
      <li class="fr-item out" ${personAttrs(p)}>
        <span class="fr-av">${avatar(p)}</span>
        <span class="fr-main"><b>${esc(p.name)}</b><small>수락 기다리는 중</small></span>
        <button class="btn sm ghost" data-fr="cancel" data-id="${esc(p.uid)}">취소</button>
      </li>`).join('')}</ul></div>` : ''}
    <p class="hint">게임 방에서 참가자 프로필을 <b>우클릭</b>(휴대폰은 <b>길게 누르기</b>)하면 친구 요청을 보낼 수 있어요</p>
    </div>`;
  const $fold = $f.querySelector('[data-frfold]');
  const fold = () => { localStorage.setItem(FR_FOLD_KEY, folded ? '0' : '1'); drawFriends(); };
  $fold.onclick = fold;
  $fold.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fold(); } };
  $f.querySelectorAll('[data-dm]').forEach((b) => (b.onclick = () => openDm(b.dataset.dm)));
  $f.querySelectorAll('[data-fr]').forEach((b) => (b.onclick = () => {
    const li = b.closest('[data-person]');
    b.disabled = true;
    friendAction(b.dataset.fr, { uid: b.dataset.id, name: li.dataset.pname, photo: li.dataset.pphoto }).catch((e) => { toast('처리하지 못했어요: ' + e.message); b.disabled = false; });
  }));
}

// ───────── 친구와 대화 (DM) ─────────
// 보낸 메시지는 내 문서 dm{친구uid: [{t, text}]} 에 최근 40개만 저장 → 두 사람 문서를 합쳐서 대화로 보여 줘요.
const DM_MAX = 40;
const dmReadKey = (fid) => `og:dmread:${user?.uid}:${fid}`;
const lastRead = (fid) => Number(localStorage.getItem(dmReadKey(fid))) || 0;
function dmThread(fid) {
  const mine = (profile?.dm?.[fid] || []).map((m) => ({ ...m, me: true }));
  const theirs = (fdocs[fid]?.dm?.[user.uid] || []).map((m) => ({ ...m, me: false }));
  return [...mine, ...theirs].sort((a, b) => a.t - b.t);
}
function unreadCount(fid) {
  if (!profile?.friends?.[fid] || dmOpen === fid) return 0;
  const r = lastRead(fid);
  return (fdocs[fid]?.dm?.[user.uid] || []).filter((m) => m.t > r).length;
}
const dmToasted = new Set();
function checkDm(fid) {
  if (!user || !profile?.friends?.[fid]) return;
  const msgs = fdocs[fid]?.dm?.[user.uid] || [];
  const last = msgs[msgs.length - 1];
  if (!last) return;
  if (dmOpen === fid) { localStorage.setItem(dmReadKey(fid), String(last.t)); drawDm(); return; }
  const k = `${fid}:${last.t}`;
  if (last.t > lastRead(fid) && !dmToasted.has(k) && Date.now() - last.t < 60000) {
    dmToasted.add(k);
    showDmToast(fid, last.text);
  }
}
function showDmToast(fid, text) {
  let $box = document.querySelector('.invite-stack');
  if (!$box) { $box = document.createElement('div'); $box.className = 'invite-stack'; document.body.appendChild($box); }
  const f = friendView(fid);
  const $c = document.createElement('button');
  $c.className = 'dm-toast';
  $c.innerHTML = `${avatar(f, 'sm')}<span class="dm-tt"><b>💬 ${esc(f.name)}</b>${esc(text)}</span>`;
  $box.appendChild($c);
  const close = () => { $c.remove(); if (!$box.children.length) $box.remove(); };
  $c.onclick = () => { close(); openDm(fid); };
  setTimeout(close, 10000);
}

let dmOpen = null;
let dmDraft = '';
function openDm(fid) {
  dmOpen = fid;
  dmDraft = '';
  document.querySelector('.dm')?.remove();
  const $d = document.createElement('div');
  $d.className = 'dm';
  document.body.appendChild($d);
  drawDm(true);
  notifyFriends();
}
function closeDm() { dmOpen = null; document.querySelector('.dm')?.remove(); notifyFriends(); }
function drawDm(focus = false) {
  const $d = document.querySelector('.dm');
  if (!$d || !dmOpen) return;
  const fid = dmOpen;
  if (!profile?.friends?.[fid]) { closeDm(); return; }
  const f = friendView(fid), st = friendStatus(fdocs[fid]);
  const msgs = dmThread(fid);
  if (msgs.length) localStorage.setItem(dmReadKey(fid), String(Math.max(lastRead(fid), ...msgs.filter((m) => !m.me).map((m) => m.t), 0)));
  const hadFocus = document.activeElement?.closest?.('.dm');
  $d.innerHTML = `
    <div class="dm-head">${avatar(f, 'sm')}<span class="dm-who"><b>${esc(f.name)}</b><small class="st-${st.key}">${esc(st.label)}</small></span><button class="dm-x" data-dmx aria-label="닫기">✕</button></div>
    <div class="dm-msgs">${msgs.length ? msgs.map((m, i) => {
      const day = new Date(m.t);
      const time = `${day.getHours()}:${String(day.getMinutes()).padStart(2, '0')}`;
      return `<div class="dm-msg ${m.me ? 'me' : ''}"><span>${esc(m.text)}</span><small>${time}</small></div>`;
    }).join('') : '<p class="muted dm-empty">첫 메시지를 보내 보세요!</p>'}</div>
    <form class="dm-form"><input maxlength="200" placeholder="메시지 입력" autocomplete="off" value="${esc(dmDraft)}"><button class="btn primary sm">보내기</button></form>`;
  const $list = $d.querySelector('.dm-msgs');
  $list.scrollTop = $list.scrollHeight;
  const $in = $d.querySelector('input');
  $in.oninput = () => (dmDraft = $in.value);
  if (focus || hadFocus) { $in.focus(); $in.setSelectionRange($in.value.length, $in.value.length); }
  $d.querySelector('[data-dmx]').onclick = closeDm;
  $d.querySelector('form').onsubmit = async (e) => {
    e.preventDefault();
    const text = $in.value.trim();
    if (!text) return;
    dmDraft = '';
    $in.value = '';
    try {
      await backend.updateProfile(user.uid, (d) => {
        const dm = { ...(d.dm || {}) };
        dm[fid] = [...(dm[fid] || []), { t: Date.now(), text }].slice(-DM_MAX);
        return { ...d, dm };
      });
    } catch (err) { toast('보내지 못했어요: ' + err.message); dmDraft = text; drawDm(true); }
  };
}
friendListeners.add(() => drawDm());

// ───────── 친구 게임 초대 ─────────
// 초대한 사람 문서에 invites{친구uid: {room, game, at}} 를 남기면, 친구 쪽 화면에 초대 알림이 떠요.
const INVITE_TTL = 5 * 60 * 1000;
const SEEN_KEY = 'og:seenInvites';
const seenInvites = new Set((() => { try { return JSON.parse(sessionStorage.getItem(SEEN_KEY)) || []; } catch { return []; } })());
function markSeen(k) { seenInvites.add(k); try { sessionStorage.setItem(SEEN_KEY, JSON.stringify([...seenInvites].slice(-50))); } catch {} }

function checkInvites(fromUid) {
  if (!user || !profile?.friends?.[fromUid]) return;
  const inv = fdocs[fromUid]?.invites?.[user.uid];
  if (!inv?.room || Date.now() - inv.at > INVITE_TTL) return;
  const key = `${fromUid}:${inv.at}`;
  if (seenInvites.has(key)) return;
  markSeen(key);
  if (location.hash === `#/room/${inv.room}`) return; // 이미 그 방에 있음
  showInvitePopup(friendView(fromUid), inv);
}

function showInvitePopup(from, inv) {
  let $box = document.querySelector('.invite-stack');
  if (!$box) { $box = document.createElement('div'); $box.className = 'invite-stack'; document.body.appendChild($box); }
  const g = getGame(inv.game);
  const $c = document.createElement('div');
  $c.className = 'invite-pop';
  $c.innerHTML = `
    <div class="ip-head">${avatar(from)}<div><b>${esc(from.name)}</b>님이 게임에 초대했어요!<small>${g ? `${g.emoji} ${esc(g.name)}` : ''} · 방 코드 ${esc(inv.room)}</small></div></div>
    <div class="ip-acts"><button class="btn primary" data-go>참가하기</button><button class="btn ghost" data-no>다음에</button></div>`;
  $box.appendChild($c);
  const close = () => { $c.remove(); if (!$box.children.length) $box.remove(); };
  $c.querySelector('[data-go]').onclick = () => { close(); location.hash = `#/room/${inv.room}`; };
  $c.querySelector('[data-no]').onclick = close;
  setTimeout(close, INVITE_TTL);
}

async function sendInvite(friendUid, room) {
  await backend.updateProfile(user.uid, (d) => {
    const invites = { ...(d.invites || {}) };
    Object.keys(invites).forEach((k) => { if (Date.now() - invites[k].at > INVITE_TTL) delete invites[k]; }); // 오래된 초대 정리
    invites[friendUid] = { room: room.code, game: room.gameId, at: Date.now() };
    return { ...d, invites };
  });
}

// 방에서 '친구 초대' → 친구 목록 창
function openInviteModal(room, game) {
  document.querySelector('.invite-modal')?.remove();
  const sent = {};
  const $m = document.createElement('div');
  $m.className = 'modal-backdrop invite-modal';
  document.body.appendChild($m);
  const draw = () => {
    const list = Object.keys(profile?.friends || {})
      .map((uid) => ({ ...friendView(uid), st: friendStatus(fdocs[uid]), inRoom: !!room.players?.[uid] }))
      .sort((a, b) => a.st.order - b.st.order || a.name.localeCompare(b.name));
    $m.innerHTML = `
      <div class="modal panel" role="dialog" aria-modal="true" aria-label="친구 초대">
        <h3 class="section-title sm">친구 초대 <span class="muted">${esc(game.emoji)} ${esc(game.name)}</span></h3>
        <div class="inv-code">방 코드 <b>${esc(room.code)}</b></div>
        ${list.length ? `<ul class="fr-list inv-list">${list.map((f) => `
          <li class="fr-item st-${f.st.key}">
            <span class="fr-av">${avatar(f)}<i class="fr-dot"></i></span>
            <span class="fr-main"><b>${esc(f.name)}</b><small>${f.inRoom ? '이 방에 있어요' : esc(f.st.label)}</small></span>
            ${f.inRoom ? '<span class="inv-done">참가 중</span>'
              : sent[f.uid] ? '<span class="inv-done">✓ 초대함</span>'
              : `<button class="btn sm ${f.st.key === 'off' ? 'ghost' : 'primary'}" data-inv="${esc(f.uid)}" ${f.st.key === 'off' ? 'disabled' : ''}>${f.st.key === 'off' ? '오프라인' : '초대'}</button>`}
          </li>`).join('')}</ul>
          ${list.some((f) => f.st.key !== 'off' && !f.inRoom && !sent[f.uid]) ? '<button class="btn block" data-invall>접속 중인 친구 모두 초대</button>' : ''}`
          : '<p class="muted">아직 친구가 없어요. 참가자 프로필을 우클릭(길게 누르기)해서 친구 요청을 보내 보세요.</p>'}
        <div class="row end">
          <button class="btn ghost" data-link>🔗 초대 링크 보내기</button>
          <button class="btn" data-close>닫기</button>
        </div>
      </div>`;
    const inviteOne = async (uid, btn) => {
      if (btn) btn.disabled = true;
      try { await sendInvite(uid, room); sent[uid] = true; draw(); }
      catch (e) { toast('초대하지 못했어요: ' + e.message); if (btn) btn.disabled = false; }
    };
    $m.querySelectorAll('[data-inv]').forEach((b) => (b.onclick = async () => { await inviteOne(b.dataset.inv, b); toast(`${friendView(b.dataset.inv).name}님에게 초대를 보냈어요`); }));
    const $all = $m.querySelector('[data-invall]');
    if ($all) $all.onclick = async () => {
      const targets = list.filter((f) => f.st.key !== 'off' && !f.inRoom && !sent[f.uid]);
      $all.disabled = true;
      for (const f of targets) await inviteOne(f.uid);
      toast(`친구 ${targets.length}명에게 초대를 보냈어요`);
    };
    $m.querySelector('[data-link]').onclick = () => shareInviteLink(room, game);
    $m.querySelector('[data-close]').onclick = close;
  };
  const close = () => { friendListeners.delete(draw); $m.remove(); };
  $m.onclick = (e) => { if (e.target === $m) close(); };
  friendListeners.add(draw);
  draw();
}

// 프로필 우클릭 / 길게 누르기 → 친구 메뉴
function openPersonMenu(el, x, y) {
  document.querySelector('.ctx-menu')?.remove();
  const uid = el.dataset.person;
  if (!uid || uid === user?.uid) return;
  const person = { uid, name: el.dataset.pname || '?', photo: el.dataset.pphoto || '' };
  const rel = relationOf(uid);
  const st = friendStatus(fdocs[uid]);
  const items = {
    friend: `<div class="ctx-note">✓ 친구 · ${esc(st.label)}</div><button data-act="chat">💬 대화하기</button>${st.key === 'wait' && st.room ? '<button data-act="join">🎮 친구 방에 참가</button>' : ''}<button data-act="remove" class="danger">친구 삭제</button>`,
    incoming: '<div class="ctx-note">나에게 친구 요청을 보냈어요</div><button data-act="accept">✓ 요청 수락</button><button data-act="decline" class="danger">거절</button>',
    outgoing: '<div class="ctx-note">친구 요청을 보냈어요 (수락 대기 중)</div><button data-act="cancel" class="danger">요청 취소</button>',
    none: '<button data-act="request">➕ 친구 요청 보내기</button>',
  }[rel];
  const $m = document.createElement('div');
  $m.className = 'ctx-menu';
  $m.innerHTML = `<div class="ctx-head">${avatar(person, 'sm')}<b>${esc(person.name)}</b></div>${items}`;
  document.body.appendChild($m);
  const r = $m.getBoundingClientRect();
  $m.style.left = `${Math.max(8, Math.min(x, innerWidth - r.width - 8))}px`;
  $m.style.top = `${Math.max(8, Math.min(y, innerHeight - r.height - 8))}px`;
  const close = () => { $m.remove(); document.removeEventListener('pointerdown', outside, true); };
  const outside = (e) => { if (!$m.contains(e.target)) close(); };
  setTimeout(() => document.addEventListener('pointerdown', outside, true), 0);
  $m.querySelectorAll('[data-act]').forEach((b) => (b.onclick = async () => {
    close();
    if (b.dataset.act === 'join') { location.hash = `#/room/${st.room}`; return; }
    if (b.dataset.act === 'chat') { openDm(uid); return; }
    try { await friendAction(b.dataset.act, person); } catch (e) { toast('처리하지 못했어요: ' + e.message); }
  }));
}
$app.addEventListener('contextmenu', (e) => {
  const el = e.target.closest('[data-person]');
  if (!el) return;
  e.preventDefault();
  openPersonMenu(el, e.clientX, e.clientY);
});
let pressTimer = null;
$app.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') return;
  const el = e.target.closest('[data-person]');
  if (!el) return;
  const { clientX: x, clientY: y } = e;
  pressTimer = setTimeout(() => { pressTimer = null; openPersonMenu(el, x, y); }, 550);
});
['pointerup', 'pointercancel', 'pointermove'].forEach((t) => $app.addEventListener(t, (e) => {
  if (t === 'pointermove' && pressTimer && Math.abs(e.movementX) + Math.abs(e.movementY) < 4) return;
  clearTimeout(pressTimer); pressTimer = null;
}));

// ───────── 분류별 게임 목록 ─────────
function renderCategory(c) {
  const list = GAMES.filter((g) => g.category === c.id);
  $app.innerHTML = `${header()}
    <main class="wrap">
      <div class="cat-top">
        <a class="btn ghost sm" href="#/">← 뒤로</a>
      </div>
      <div class="cat-banner cat-${c.id} small">
        <div class="cat-art">${c.art}</div>
        <div class="cat-text"><span class="cat-name">${esc(c.name)}</span><span class="cat-desc">${esc(c.desc)}</span></div>
      </div>
      ${list.length
        ? `<div class="games">${list.map(gameCard).join('')}</div>`
        : `<div class="panel center"><div style="font-size:42px">${c.icon}</div><p class="muted">아직 게임이 없어요. 곧 추가될 예정이에요!</p></div>`}
    </main>`;
  bindHeader();
  profileListeners.add(refreshGameRecords);
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

}

function drawProfile() {
  const $p = document.getElementById('profile');
  if (!$p) return;
  const my = me();
  const s = summarize(profile);
  const collapsed = localStorage.getItem(COLLAPSE_KEY) === '1';
  const playable = GAMES.filter((g) => !g.comingSoon || profile?.stats?.[g.id]);

  $p.className = `profile panel ${collapsed ? 'collapsed' : ''}`;
  $p.style.setProperty('--tier', s.tier.color);
  $p.innerHTML = `
    <div class="profile-head" data-toggle role="button" tabindex="0" aria-expanded="${!collapsed}">
      <button class="avatar-edit" data-edit title="프로필 사진 바꾸기">${avatar(my, 'lg')}<span class="pen">✎</span></button>
      <div class="profile-main">
        <div class="profile-name">${nickEdit !== null
          ? `<span class="nick-form" data-nickform><input maxlength="12" value="${esc(nickEdit)}" aria-label="새 닉네임"><button class="btn sm primary" data-nicksave>저장</button><button class="btn sm ghost" data-nickcancel>취소</button></span>`
          : `<b>${esc(my.name)}</b><button class="nick-btn" data-nick title="닉네임 변경">✎ 변경</button><span class="tier-badge">${s.tier.icon} ${s.tier.name}</span>`}</div>
        <div class="profile-garnet">${GARNET}<b>${s.garnets}</b><span>가넷</span></div>
        <div class="profile-sum">${s.plays ? `${s.plays}전 ${s.wins}승 ${s.losses}패 · 승률 <b>${s.rate}%</b>` : '아직 기록이 없어요. 첫 판을 시작해 보세요!'}</div>
      </div>
      <span class="chevron" aria-hidden="true">▾</span>
    </div>
    <div class="profile-body">
      <div class="tier-progress">
        <div class="tier-row">
          <span>${s.tier.icon} ${s.tier.name} · <b>가넷 ${s.garnets}개</b></span>
          <span class="muted">${s.next ? `${s.next.icon} ${s.next.name}까지 ${s.next.min - s.garnets}개` : '최고 티어 달성!'}</span>
        </div>
        <div class="bar"><i style="width:${s.progress}%"></i></div>
      </div>
      <ul class="records">
        ${playable.map((g) => {
          const r = gameRecord(profile?.stats, g.id);
          return `<li><span class="rec-game">${g.emoji} ${esc(g.name)}</span>
            <span class="rec-wl">${r.plays ? `${r.plays}전 ${r.wins}승 ${r.losses}패` : '기록 없음'}</span>
            <span class="rec-rate">${r.plays ? `${r.rate}%` : '-'}</span></li>`;
        }).join('')}
      </ul>
      <p class="hint">등수와 관계없이 가넷을 받으면 <b>승</b>, 못 받으면 <b>패</b>예요 · 보유 가넷 수로 티어가 정해져요</p>
      <div class="ghist">
        <div class="ghist-t">최근 가넷 내역</div>
        ${(profile?.ghist || []).length ? `<ul>${profile.ghist.slice(0, 10).map((h) => {
          const gm = getGame(h.game);
          const d = new Date(h.at);
          return `<li><span class="gh-date">${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}</span>
            <span class="gh-game">${gm ? `${gm.emoji} ${esc(gm.name)}` : esc(h.game)}${h.place && !gm?.coopGame ? ` · ${h.place}등` : gm?.coopGame ? ' · 협동' : ''}</span>
            <span class="gh-g ${h.g > 0 ? 'plus' : h.g < 0 ? 'minus' : ''}">${h.g > 0 ? `지급 +${h.g}` : h.g < 0 ? `차감 −${Math.abs(h.g)}` : '변동 없음'}</span>
            <span class="gh-total">${GARNET}${h.total}</span></li>`;
        }).join('')}</ul>` : '<p class="hint">게임을 마치면 가넷 지급·차감 내역이 여기에 쌓여요</p>'}
      </div>
      <p class="hint">가넷은 게임 결과로만 얻는 무료 포인트예요. 돈으로 사거나 바꿀 수 없고, 다른 사람에게 줄 수도 없어요.</p>
    </div>`;

  const toggle = () => {
    localStorage.setItem(COLLAPSE_KEY, $p.classList.contains('collapsed') ? '0' : '1');
    drawProfile();
  };
  $p.querySelector('[data-toggle]').onclick = toggle;
  $p.querySelector('[data-toggle]').onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } };
  $p.querySelector('[data-edit]').onclick = (e) => { e.stopPropagation(); openProfileEditor(); };
  // 닉네임 바로 변경
  $p.querySelector('[data-nick]')?.addEventListener('click', (e) => { e.stopPropagation(); nickEdit = my.name; drawProfile(); const $i = $p.querySelector('[data-nickform] input'); $i.focus(); $i.select(); });
  const $form = $p.querySelector('[data-nickform]');
  if ($form) {
    const $i = $form.querySelector('input');
    $form.onclick = (e) => e.stopPropagation();
    $i.oninput = () => (nickEdit = $i.value);
    const save = async () => {
      const name = $i.value.trim();
      if (!name) return toast('닉네임을 입력해 주세요');
      if (name === my.name) { nickEdit = null; return drawProfile(); }
      $form.querySelectorAll('button').forEach((b) => (b.disabled = true));
      try { await backend.saveProfile(user.uid, { name }); nickEdit = null; drawProfile(); toast(`닉네임을 '${name}'(으)로 바꿨어요`); }
      catch (e) { toast('저장하지 못했어요: ' + e.message); $form.querySelectorAll('button').forEach((b) => (b.disabled = false)); }
    };
    $form.querySelector('[data-nicksave]').onclick = save;
    $form.querySelector('[data-nickcancel]').onclick = () => { nickEdit = null; drawProfile(); };
    $i.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') save(); if (e.key === 'Escape') { nickEdit = null; drawProfile(); } };
  }
}
let nickEdit = null; // 닉네임 수정 중인 값 (null이면 수정 안 함)

function gameCard(g) {
  return `
    <div class="gcard-wrap">
      <button class="gcard ${g.comingSoon ? 'soon' : ''} ${g.deathmatch ? 'deathmatch' : ''} ${g.teamGame ? 'teamgame' : ''} ${g.coopGame ? 'coopgame' : ''}" data-game="${g.id}" aria-label="${esc(g.name)} ${g.comingSoon ? '(준비중)' : '방 만들기'}">
        <div class="gcard-art">${g.art}</div>
        <div class="ribbon"><span><i>◆</i>${esc(g.name)}<i>◆</i></span></div>
        <div class="gcard-top" data-rec="${g.id}">${recordLine(g.id)}</div>
        ${g.deathmatch ? '<div class="dm-stamp">DEATH<br>MATCH</div>' : ''}
        ${g.teamGame ? '<div class="tg-stamp">팀게임</div>' : ''}
        ${g.coopGame ? '<div class="tg-stamp coop">협동게임</div>' : ''}
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
  const g = getGame(id);
  const top = g?.rewards?.[0];
  return r.plays
    ? `<span>${r.plays}전 ${r.wins}승 ${r.losses}패</span><span class="gold">승률 ${r.rate}%</span>`
    : `<span>첫 도전!</span><span class="gold">${g?.deathmatch ? `승자 ${GARNET}+${top}` : g?.coopGame ? `협동 ${GARNET} 점수 비례` : g?.teamGame ? `승리팀 ${GARNET}+${top}` : top ? `1등 ${GARNET}${top}` : 'NEW'}</span>`;
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

  // 게임 중 접속 확인: 10초마다 내 접속 신호, 40초 넘게 신호가 없는 사람은 나간 것으로 처리
  // (혼자 테스트 모드에서는 뒤쪽 탭이 느려져서 꺼 둬요. 확인용으로 ?presence 를 붙이면 켜져요)
  const HEARTBEAT_MS = 10000;
  const GONE_MS = Number(new URLSearchParams(location.search).get('gone')) || 40000;
  const presenceOn = backend.mode !== 'mock' || new URLSearchParams(location.search).has('presence');
  let latest = null;
  let lastSig = '';
  const presence = presenceOn ? setInterval(() => {
    if (!latest || latest.status !== 'playing' || !latest.players[user.uid]) return;
    backend.mutateRoom(code, (r) => R.heartbeat(r, user.uid)).catch(() => {});
    const now = Date.now();
    Object.values(latest.players).forEach((p) => {
      if (p.uid !== user.uid && p.seen && now - p.seen > GONE_MS) {
        backend.mutateRoom(code, (r) => R.dropIfGone(r, p.uid, GONE_MS)).catch(() => {});
      }
    });
  }, Math.min(HEARTBEAT_MS, GONE_MS / 3)) : null;

  const vol = mountVolume();
  const unsub = backend.watchRoom(code, (room, err) => {
    latest = room;
    if (room?.status === 'playing' && room.players?.[user.uid]) startGameBgm(getGame(room.gameId)?.bgm || 'calm'); else stopGameBgm();
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
    setPresence({ state: room.status === 'playing' ? 'playing' : 'waiting', room: room.code, game: room.gameId });
    // 접속 신호(seen)만 바뀐 경우에는 화면을 다시 그리지 않아요 (입력 중 깜빡임 방지)
    // (방 채팅 room.chat만 빼요 — 게임 안 채팅 room.game.chat은 바뀌면 다시 그려야 해요)
    const sig = JSON.stringify(room, function (k, v) { return k === 'seen' || (k === 'chat' && this === room) ? undefined : v; });
    if (sig === lastSig && $main.querySelector('.room-head')) { drawRoomChat(room); return; }
    lastSig = sig;
    drawRoom($main, room, game);
  });

  return () => { unsub(); if (presence) clearInterval(presence); stopGameBgm(); vol(); };
}

// ───────── 방 채팅 (이 방에 들어온 사람끼리만) ─────────
const RCHAT_FOLD = 'og:roomChatFolded';
const rchat = { code: '', draft: '', seen: 0, focus: false };
function drawRoomChat(room, full = false) {
  drawBubbles(room);
  const $c = document.getElementById('rchat');
  if (!$c) return;
  if (rchat.code !== room.code) { rchat.code = room.code; rchat.draft = ''; rchat.seen = Date.now(); }
  const msgs = room.chat || [];
  const folded = localStorage.getItem(RCHAT_FOLD) === '1';
  if (!folded) rchat.seen = Math.max(rchat.seen, ...msgs.map((m) => m.t), 0);
  const unread = folded ? msgs.filter((m) => m.t > rchat.seen && m.uid !== user.uid).length : 0;
  const list = msgs.length ? msgs.map((m) => {
    const d = new Date(m.t);
    return `<li class="${m.uid === user.uid ? 'me' : ''}"><b>${esc(room.players[m.uid]?.name || m.name)}</b><span>${esc(m.text)}</span><small>${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}</small></li>`;
  }).join('') : '<li class="rc-empty">이 방에 있는 사람끼리만 보이는 채팅이에요. 인사를 건네 보세요 👋</li>';

  if (!full && $c.querySelector('.rc-list') && $c.classList.contains('folded') === folded) {
    // 채팅만 바뀐 경우: 목록만 바꾸고 입력칸은 그대로
    const $l = $c.querySelector('.rc-list');
    const atBottom = $l.scrollHeight - $l.scrollTop - $l.clientHeight < 30;
    $l.innerHTML = list;
    if (atBottom) $l.scrollTop = $l.scrollHeight;
    $c.querySelector('.rc-unread')?.replaceWith(...(unread ? [Object.assign(document.createElement('i'), { className: 'rc-unread', textContent: unread })] : []));
    if (unread && !$c.querySelector('.rc-unread')) $c.querySelector('.rc-head').insertAdjacentHTML('beforeend', `<i class="rc-unread">${unread}</i>`);
    return;
  }
  $c.classList.toggle('folded', folded);
  $c.innerHTML = `
    <h3 class="rc-head" data-rcfold role="button" tabindex="0">💬 방 채팅 <span class="muted">이 방 사람끼리만</span>${unread ? `<i class="rc-unread">${unread}</i>` : ''}<span class="chevron">▾</span></h3>
    <div class="rc-body">
      <ul class="rc-list">${list}</ul>
      <form class="rc-form"><input maxlength="120" placeholder="메시지 입력" autocomplete="off"><button class="btn sm primary">보내기</button></form>
    </div>`;
  const $l = $c.querySelector('.rc-list');
  $l.scrollTop = $l.scrollHeight;
  const $in = $c.querySelector('input');
  $in.value = rchat.draft;
  $in.oninput = () => (rchat.draft = $in.value);
  $in.onfocus = () => (rchat.focus = true);
  $in.onblur = () => setTimeout(() => { if ($in.isConnected) rchat.focus = false; }, 0);
  if (rchat.focus && !folded) $in.focus();
  const fold = () => { localStorage.setItem(RCHAT_FOLD, folded ? '0' : '1'); drawRoomChat(room, true); };
  $c.querySelector('[data-rcfold]').onclick = fold;
  $c.querySelector('[data-rcfold]').onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fold(); } };
  $c.querySelector('form').onsubmit = (e) => {
    e.preventDefault();
    const text = $in.value.trim();
    if (!text) return;
    rchat.draft = ''; $in.value = '';
    backend.mutateRoom(room.code, (r) => R.chat(r, user.uid, text)).catch((err) => toast(err.message));
  };
}

// ───────── 게임 중 채팅: 초상화 위 말풍선 ─────────
const BUBBLE_MS = 6000;
const gchat = { draft: '', focus: false };
function drawBubbles(room) {
  const now = Date.now();
  const last = {};
  (room.chat || []).forEach((m) => { if (now - m.t < BUBBLE_MS && (!room.startedAt || m.t >= room.startedAt - 1000)) last[m.uid] = m; });
  document.querySelectorAll('[data-bub]').forEach(($b) => {
    const m = last[$b.dataset.bub];
    const key = m ? String(m.t) : '';
    if ($b.dataset.key === key) return; // 같은 말풍선이면 그대로 (애니메이션 유지)
    $b.dataset.key = key;
    $b.innerHTML = m ? `<span class="bub" style="animation-delay:-${now - m.t}ms">${esc(m.text)}</span>` : '';
  });
}
function bindGameChat($main, room) {
  const $f = $main.querySelector('.gchat');
  if (!$f) return;
  const $in = $f.querySelector('input');
  $in.value = gchat.draft;
  $in.oninput = () => (gchat.draft = $in.value);
  $in.onfocus = () => (gchat.focus = true);
  $in.onblur = () => setTimeout(() => { if ($in.isConnected) gchat.focus = false; }, 0);
  if (gchat.focus) $in.focus();
  $f.onsubmit = (e) => {
    e.preventDefault();
    const text = $in.value.trim();
    if (!text) return;
    gchat.draft = ''; $in.value = '';
    backend.mutateRoom(room.code, (r) => R.chat(r, user.uid, text)).catch((err) => toast(err.message));
  };
}

// 화면 오른쪽 아래 음량 버튼 (BGM·효과음 음량 / 음소거)
function mountVolume() {
  const $v = document.createElement('div');
  $v.className = 'vol';
  $v.innerHTML = `
    <div class="vol-pop" hidden>
      <div class="vol-t">🎵 게임 소리</div>
      <input type="range" min="0" max="100" step="5" aria-label="음량">
      <div class="vol-row"><span class="vol-num"></span><button class="btn sm" data-mute></button></div>
    </div>
    <button class="vol-btn" aria-label="소리 설정"></button>`;
  document.body.appendChild($v);
  const $pop = $v.querySelector('.vol-pop'), $btn = $v.querySelector('.vol-btn'), $r = $v.querySelector('input'), $mute = $v.querySelector('[data-mute]');
  const paint = () => {
    const v = Math.round(getVolume() * 100), m = isMuted() || v === 0;
    $btn.textContent = m ? '🔇' : v < 40 ? '🔉' : '🔊';
    $btn.classList.toggle('muted', m);
    $r.value = v;
    $v.querySelector('.vol-num').textContent = m ? '음소거' : `${v}%`;
    $mute.textContent = m ? '🔊 소리 켜기' : '🔇 음소거';
  };
  $btn.onclick = (e) => { e.stopPropagation(); $pop.hidden = !$pop.hidden; };
  $r.oninput = () => setVolume(Number($r.value) / 100);
  $mute.onclick = () => { if (isMuted() || getVolume() === 0) { if (getVolume() === 0) setVolume(0.5); setMuted(false); } else setMuted(true); };
  const outside = (e) => { if (!$v.contains(e.target)) $pop.hidden = true; };
  document.addEventListener('pointerdown', outside);
  const off = onSoundChange(paint);
  paint();
  return () => { off(); document.removeEventListener('pointerdown', outside); $v.remove(); };
}

// 게임이 끝나면 내 전적에 한 번만 기록
function recordIfFinished(room) {
  if (room.status !== 'finished' || !room.result || room.result.aborted || !room.matchId) return;
  if (getGame(room.gameId)?.solo) return; // 혼자 하는 게임은 전적·가넷 없음 (랭킹만)
  const key = `${room.code}:${room.matchId}`;
  if (recordedMatches.has(key)) return;
  recordedMatches.add(key);
  const mine = (room.result.ranking || []).find((r) => r.uid === user.uid);
  const place = mine?.place || ((room.result.winners || []).includes(user.uid) ? 1 : 0);
  const garnets = room.result.rewards?.[user.uid] || 0;
  backend.recordResult(user.uid, key, room.gameId, { place, garnets }).catch((e) => console.warn('전적 저장 실패', e));
}

function drawRoom($main, room, game) {
  const players = R.sortedPlayers(room);
  const isHost = room.hostId === user.uid;
  const mine = room.players[user.uid];
  const check = R.canStart(room, game);
  const act = (fn, silent) => backend.mutateRoom(room.code, fn).catch((e) => { if (silent) return; if (room.status === 'playing') showAlert(e.message); else toast(e.message); });

  const emptySeats = Math.max(0, game.minPlayers - players.length);
  const playing = room.status === 'playing';
  const gameChat = playing && !game.ownChat; // 초성퀴즈·타이핑퀴즈는 게임 안 채팅을 그대로 써요

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
    const mineRank = (r.ranking || []).find((x) => x.uid === user.uid);
    const reward = r.rewards?.[user.uid] || 0;
    const tag = r.aborted ? ''
      : r.draw && mineRank ? '<span class="res-tag draw">DRAW</span>'
      : mineRank && game.coopGame ? `<span class="res-tag ${reward > 0 ? 'win' : reward < 0 ? 'lose' : 'draw'}">${reward > 0 ? 'CLEAR' : reward < 0 ? 'FAIL' : 'DRAW'}</span>${reward ? `<span class="res-garnet ${reward < 0 ? 'minus' : ''}">${GARNET}${reward > 0 ? '+' : '−'}${Math.abs(reward)}</span>` : ''}`
      : mineRank ? `<span class="res-tag ${mineRank.place === 1 ? 'win' : 'lose'}">${game.deathmatch || game.teamGame ? (mineRank.place === 1 ? 'WIN' : 'LOSE') : `${mineRank.place}등`}</span>${reward ? `<span class="res-garnet ${reward < 0 ? 'minus' : ''}">${GARNET}${reward > 0 ? '+' : '−'}${Math.abs(reward)}</span>` : ''}`
      : r.draw ? '<span class="res-tag draw">DRAW</span>'
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
         ${(game.options || []).map((o) => {
           const val = room.options?.[o.key] ?? o.default;
           return `<div class="game-opt"><span>${esc(o.label)}</span>${isHost
             ? `<select data-opt="${o.key}">${o.choices.map((c) => `<option value="${c}" ${c === val ? 'selected' : ''}>${c}</option>`).join('')}</select>`
             : `<b>${esc(val)}</b>`}</div>`;
         }).join('')}
         ${controls}
       </div>`
    : `${resultBanner}<div class="game-area"></div>`;

  $main.innerHTML = `
    <div class="room-head">
      <div>
        <div class="eyebrow">${game.deathmatch ? '<span class="dm-chip">⚔ DEATH MATCH</span> ' : ''}${game.teamGame ? '<span class="tg-chip">👥 팀게임</span> ' : ''}${game.coopGame ? '<span class="tg-chip coop">🤝 협동게임</span> ' : ''}${game.emoji} ${esc(game.name)} · ${room.status === 'waiting' ? '대기 중' : room.status === 'playing' ? '게임 중' : '게임 종료'}</div>
        <h2 class="room-code">방 코드 <span class="code">${esc(room.code)}</span></h2>
      </div>
      <div class="row">
        <button class="btn primary" data-invite>친구 초대</button>
        <button class="btn ghost" data-leave>나가기</button>
      </div>
    </div>
    <div class="room-body">
      <section class="players panel ${gameChat ? 'ingame' : ''}">
        <h3>${gameChat ? '플레이어' : '참가자'} <span class="muted">${players.length}/${game.maxPlayers}</span></h3>
        <ul class="seats">
          ${players.map((p) => {
            const host = p.uid === room.hostId;
            const tag = host ? '방장' : room.status === 'waiting' ? (p.ready ? 'READY' : '대기') : '';
            return `<li class="seat ${p.uid === user.uid ? 'is-me' : ''} ${host ? 'host' : ''} ${!host && room.status === 'waiting' && p.ready ? 'ready' : ''} ${profile?.friends?.[p.uid] ? 'friend' : ''}" title="${esc(p.name)}${p.uid === user.uid ? '' : ' · 우클릭(길게 누르기)으로 친구 요청'}" data-person="${esc(p.uid)}" data-pname="${esc(p.name)}" data-pphoto="${esc(p.photo || '')}">
              ${gameChat ? `<span class="seat-bubble" data-bub="${esc(p.uid)}"></span>` : ''}
              <span class="seat-av">${avatar(p, gameChat ? 'lg' : '')}${host ? '<span class="crown">👑</span>' : ''}</span>
              <span class="seat-name">${profile?.friends?.[p.uid] ? '<i class="fr-mark">♥</i>' : ''}${esc(p.name)}</span>
              ${tag ? `<span class="seat-tag">${tag}</span>` : ''}
            </li>`;
          }).join('')}
          ${'<li class="seat empty"><span class="seat-av"><span class="avatar">?</span></span><span class="seat-name">빈 자리</span></li>'.repeat(emptySeats)}
          ${room.status === 'waiting' && players.length >= game.minPlayers && players.length < game.maxPlayers
            ? '<li class="seat add" data-invite-seat role="button" tabindex="0"><span class="seat-av"><span class="avatar">+</span></span><span class="seat-name">초대하기</span></li>' : ''}
        </ul>
        ${gameChat && mine ? '<form class="gchat"><input maxlength="60" placeholder="채팅 입력 (말풍선으로 떠요)" autocomplete="off"><button class="btn sm primary">💬</button></form>' : ''}
      </section>
      ${playing ? '' : '<section class="panel rchat" id="rchat"></section>'}
      <section class="stage panel">${stage}</section>
    </div>`;

  drawRoomChat(room, true);
  if (gameChat) bindGameChat($main, room);
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
  $main.querySelectorAll('[data-opt]').forEach((sel) => {
    sel.onchange = () => act((r) => R.setOption(r, user.uid, game, sel.dataset.opt, Number.isNaN(Number(sel.value)) ? sel.value : Number(sel.value)));
  });

  const $area = $main.querySelector('.game-area');
  primeSounds(room.code);
  if ($area && room.game) {
    game.render($area, {
      state: room.game,
      me: user.uid,
      players: room.players,
      finished: room.status === 'finished',
      room,
      sendMove: (move, opts) => act((r) => R.applyMove(r, game, user.uid, move), opts?.silent),
    });
  }
}

function invite(room, game) {
  openInviteModal(room, game);
}

async function shareInviteLink(room, game) {
  const url = `${location.origin}${location.pathname}${location.search}#/room/${room.code}`;
  const text = `${me().name}님이 [${game.name}] 게임에 초대했어요! O게임에 참여하시겠습니까? 방 코드: ${room.code}`;
  // 혼자 테스트 모드: 새 탭 주소창에 바로 붙여 넣을 수 있게 주소만 복사
  if (backend.mode === 'mock') {
    try {
      await navigator.clipboard.writeText(url);
      toast('테스트용 링크를 복사했어요. 새 탭 주소창에 붙여 넣으세요!');
    } catch {
      toast(url);
    }
    return;
  }
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
