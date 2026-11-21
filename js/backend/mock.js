// 테스트 모드 백엔드
// - 로그인: 실제 인증 없이 닉네임만 받습니다. 탭마다 다른 사용자(sessionStorage).
// - 방 데이터: localStorage에 저장 → 같은 브라우저의 다른 탭과 실시간 공유.
//   초대 링크를 새 탭에 붙여넣으면 "친구"로 입장해 볼 수 있어요.
import { randomCode } from './code.js';
import { serverApply } from '../games/server-games.js';

const ROOMS_KEY = 'mbg:rooms';
const PROFILE_PREFIX = 'mbg:profile:'; // 사람마다 따로 저장 (여러 탭이 동시에 저장해도 덮어쓰지 않게)
const USER_KEY = 'mbg:user';
const PROVIDER_LABEL = { google: 'Google', naver: '네이버', guest: '게스트' };

function loadRooms() {
  try { return JSON.parse(localStorage.getItem(ROOMS_KEY)) || {}; } catch { return {}; }
}

const roomListeners = new Set();
function notifyRooms() { roomListeners.forEach((fn) => fn()); }
window.addEventListener('storage', (e) => {
  if (e.key === ROOMS_KEY) notifyRooms();
  if (e.key?.startsWith('og-secret:')) notifyRooms();
  if (e.key?.startsWith(PROFILE_PREFIX) || e.key?.startsWith('og-dm:')) notifyProfiles();
});

function loadProfile(uid) {
  try { return JSON.parse(localStorage.getItem(PROFILE_PREFIX + uid)); } catch { return null; }
}
const profileListeners = new Set();
function notifyProfiles() { profileListeners.forEach((fn) => fn()); }
function saveProfile(uid, p) {
  localStorage.setItem(PROFILE_PREFIX + uid, JSON.stringify(p));
  notifyProfiles();
}

function saveRooms(rooms) {
  localStorage.setItem(ROOMS_KEY, JSON.stringify(rooms));
  notifyRooms(); // 같은 탭에도 알림 (storage 이벤트는 다른 탭에만 옴)
}

export function createBackend() {
  let authCb = null;
  const readUser = () => { try { return JSON.parse(sessionStorage.getItem(USER_KEY)); } catch { return null; } };

  return {
    mode: 'mock',

    onAuth(cb) {
      authCb = cb;
      setTimeout(() => cb(readUser()), 0); // 앱 코드가 다 준비된 뒤 알림 (실제 Firebase처럼 비동기)
      return () => { authCb = null; };
    },

    async signIn(provider, { name } = {}) {
      const label = PROVIDER_LABEL[provider] || provider;
      const user = {
        uid: 'u_' + Math.random().toString(36).slice(2, 10),
        name: (name || '').trim() || `${label}유저${Math.floor(Math.random() * 900 + 100)}`,
        photo: '',
        provider,
      };
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      authCb?.(user);
    },

    async signInWithNaverToken() {
      throw new Error('테스트 모드에서는 네이버 로그인을 쓸 수 없어요');
    },

    async signOut() {
      sessionStorage.removeItem(USER_KEY);
      authCb?.(null);
    },

    async createRoom(makeRoom) {
      const rooms = loadRooms();
      let code;
      do { code = randomCode(); } while (rooms[code]);
      rooms[code] = makeRoom(code);
      saveRooms(rooms);
      return code;
    },

    async mutateRoom(code, fn) {
      const rooms = loadRooms();
      if (!rooms[code]) throw new Error('방을 찾을 수 없어요');
      const next = fn(structuredClone(rooms[code]));
      if (next === null) delete rooms[code];
      else rooms[code] = next;
      saveRooms(rooms);
    },

    // 서버가 진행하는 게임 (테스트 모드: 서버 대신 같은 함수를 브라우저에서 실행, 비밀은 localStorage)
    async serverMove(code, move) {
      const me = readUser()?.uid;
      const rooms = loadRooms();
      if (!rooms[code]) throw new Error('방을 찾을 수 없어요');
      const sk = (id) => `og-secret:${code}:${id}`;
      let srv = null; try { srv = JSON.parse(localStorage.getItem(sk('SERVER'))); } catch {}
      let out;
      try { out = serverApply({ ...rooms[code], code }, srv, me, move); }
      catch (e) { if (e.server) localStorage.setItem(sk('SERVER'), JSON.stringify(e.server)); if (e.message === '__noop') return; throw e; }
      localStorage.setItem(sk('SERVER'), JSON.stringify(out.server));
      out.changedMine.forEach((u) => localStorage.setItem(sk(u), JSON.stringify({ ...out.mine[u], match: rooms[code].matchId })));
      if (out.roomChanged) { rooms[code] = out.room; saveRooms(rooms); } else notifyRooms();
    },
    watchSecret(code, uid, cb) {
      const emit = () => { try { cb(JSON.parse(localStorage.getItem(`og-secret:${code}:${uid}`))); } catch { cb(null); } };
      roomListeners.add(emit);
      emit();
      return () => roomListeners.delete(emit);
    },

    watchProfile(uid, cb) {
      const emit = () => cb(loadProfile(uid));
      profileListeners.add(emit);
      emit();
      return () => profileListeners.delete(emit);
    },

    async saveProfile(uid, patch) {
      saveProfile(uid, { ...(loadProfile(uid) || {}), ...patch, updatedAt: Date.now() });
    },

    async updateProfile(uid, fn) {
      saveProfile(uid, { ...fn(structuredClone(loadProfile(uid) || {})), updatedAt: Date.now() });
    },

    watchIncoming(uid, cb) {
      const emit = () => {
        const list = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k.startsWith(PROFILE_PREFIX)) continue;
          const p = loadProfile(k.slice(PROFILE_PREFIX.length));
          if (p?.reqOut?.includes(uid)) list.push({ ...p, uid: k.slice(PROFILE_PREFIX.length) });
        }
        cb(list);
      };
      profileListeners.add(emit);
      emit();
      return () => profileListeners.delete(emit);
    },

    async recordResult(uid, matchKey, gameId, { place, garnets = 0 }) {
      // 테스트 모드: 서버 대신 브라우저에서 같은 규칙으로 기록
      const p = loadProfile(uid) || {};
      if (p.lastMatch === matchKey) return; // 같은 판을 두 번 기록하지 않음
      const stats = p.stats || {};
      const g = { plays: 0, wins: 0, garnets: 0, ...(stats[gameId] || {}) };
      g.plays += 1;
      if (garnets > 0) g.wins += 1; // 가넷을 받으면 승, 못 받으면 패
      g.garnets += garnets;
      const total = Math.max(0, (p.garnets || 0) + garnets);
      const ghist = [{ at: Date.now(), game: gameId, place, g: garnets, total }, ...(p.ghist || [])].slice(0, 30); // 최근 가넷 내역
      saveProfile(uid, { ...p, stats: { ...stats, [gameId]: g }, garnets: total, ghist, lastMatch: matchKey });
    },

    // 친구 DM (테스트 모드: localStorage 'og-dm:<a>__<b>')
    watchDms(uid, cb) {
      const emit = () => {
        const out = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k.startsWith('og-dm:')) continue;
          let x; try { x = JSON.parse(localStorage.getItem(k)); } catch { continue; }
          const [a, b] = x.users || [];
          if (a !== uid && b !== uid) continue;
          const me = a === uid ? 'a' : 'b', fid = a === uid ? b : a;
          out[fid] = { mine: x[me] || [], theirs: x[me === 'a' ? 'b' : 'a'] || [] };
        }
        cb(out);
      };
      profileListeners.add(emit);
      emit();
      return () => profileListeners.delete(emit);
    },
    async writeDm(uid, fid, msgs) {
      const users = [uid, fid].sort();
      const k = `og-dm:${users.join('__')}`;
      let x = {}; try { x = JSON.parse(localStorage.getItem(k)) || {}; } catch {}
      localStorage.setItem(k, JSON.stringify({ ...x, users, [users[0] === uid ? 'a' : 'b']: msgs }));
      notifyProfiles();
    },
    async clearOldDm(uid) {
      const p = loadProfile(uid) || {};
      delete p.dm;
      saveProfile(uid, p);
    },

    // 실시간 위치 채널 (테스트 모드: 같은 브라우저 탭끼리 BroadcastChannel)
    liveAvailable: true,
    async live(code) {
      const ch = new BroadcastChannel(`mbg-live-${code}`);
      const data = {};
      const cbs = new Set();
      ch.onmessage = (e) => { if (e.data.d == null) delete data[e.data.uid]; else data[e.data.uid] = e.data.d; cbs.forEach((f) => f({ ...data })); };
      return {
        send(uid, d) { data[uid] = d; ch.postMessage({ uid, d }); cbs.forEach((f) => f({ ...data })); },
        watch(cb) { cbs.add(cb); cb({ ...data }); return () => cbs.delete(cb); },
        onLeave() {},
        close(uid) { ch.postMessage({ uid, d: null }); ch.close(); },
      };
    },

    // 음성 채팅 (테스트 모드: 같은 브라우저 탭끼리 BroadcastChannel)
    async voice(code, uid) {
      const ch = new BroadcastChannel(`mbg-voice-${code}`);
      const peers = {}; let mine = { m: false }; let peerCb = null, sigCb = null;
      const push = () => peerCb?.({ ...peers, [uid]: mine });
      ch.onmessage = (e) => {
        const d = e.data;
        if (d.t === 'hi') { peers[d.uid] = d.info; push(); if (!d.reply) ch.postMessage({ t: 'hi', uid, info: mine, reply: true }); }
        else if (d.t === 'bye') { delete peers[d.uid]; push(); }
        else if (d.t === 'sig' && d.to === uid) sigCb?.(d.from, d.msg);
      };
      ch.postMessage({ t: 'hi', uid, info: mine });
      return {
        publish(info) { mine = { ...mine, ...info }; ch.postMessage({ t: 'hi', uid, info: mine, reply: true }); push(); },
        send(to, msg) { ch.postMessage({ t: 'sig', to, from: uid, msg }); },
        watchPeers(cb) { peerCb = cb; push(); },
        onSignal(cb) { sigCb = cb; },
        close() { ch.postMessage({ t: 'bye', uid }); ch.close(); },
      };
    },

    async saveBest(uid, key, score) {
      let best = 0;
      await this.updateProfile(uid, (p) => { best = Math.max(p.best?.[key] || 0, score); return { ...p, best: { ...(p.best || {}), [key]: best } }; });
      return best;
    },
    async getBest(uid, key) { return Number(loadProfile(uid)?.best?.[key]) || 0; },
    async topScores(key, n = 10) {
      const out = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k.startsWith(PROFILE_PREFIX)) continue;
        const p = loadProfile(k.slice(PROFILE_PREFIX.length));
        if (p?.best?.[key]) out.push({ uid: k.slice(PROFILE_PREFIX.length), name: p.name || p.authName || '이름 없음', photo: p.photo || p.authPhoto || '', score: p.best[key] });
      }
      return out.sort((a, b) => b.score - a.score).slice(0, n);
    },

    watchRoom(code, cb) {
      const emit = () => cb(loadRooms()[code] || null);
      roomListeners.add(emit);
      emit();
      return () => roomListeners.delete(emit);
    },
  };
}
