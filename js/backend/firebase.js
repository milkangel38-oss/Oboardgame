// Firebase 백엔드 (Authentication + Cloud Firestore)
// 방 문서: rooms/{code}  — 구조는 room-logic.js 상단 주석 참고
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
  signInAnonymously, signInWithCustomToken, updateProfile, signOut as fbSignOut,
  setPersistence, browserSessionPersistence,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  initializeFirestore, doc, onSnapshot, runTransaction, setDoc, getDoc, deleteField, collection, query, where, orderBy, limit, getDocs,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { randomCode } from './code.js';

export function createBackend(config) {
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
  // 로그인은 이 창(탭)이 열려 있는 동안만 유지 → 창을 닫았다 다시 열면 다시 로그인
  const persistReady = setPersistence(auth, browserSessionPersistence).catch((e) => console.warn('로그인 유지 설정 실패', e));

  const toUser = (u) => u && {
    uid: u.uid,
    name: u.displayName || '게스트',
    photo: u.photoURL || '',
    provider: u.isAnonymous ? 'guest' : (u.providerData[0]?.providerId || (u.uid.startsWith('naver:') ? 'naver' : 'custom')),
  };

  let authCb = null;

  return {
    mode: 'firebase',

    onAuth(cb) {
      authCb = cb;
      return onAuthStateChanged(auth, (u) => cb(toUser(u)));
    },

    async signIn(provider, { name } = {}) {
      await persistReady;
      if (provider === 'google') {
        await signInWithPopup(auth, new GoogleAuthProvider());
      } else if (provider === 'guest') {
        const cred = await signInAnonymously(auth);
        await updateProfile(cred.user, { displayName: name || '게스트' });
        authCb?.(toUser(auth.currentUser)); // 닉네임 반영 후 다시 알림
      } else if (provider === 'naver') {
        // 서버(api/auth/naver)가 네이버 로그인 → Firebase 토큰 발급 후 #/auth/naver 로 돌려보냄
        location.href = '/api/auth/naver/start';
        await new Promise(() => {}); // 페이지 이동 중
      } else {
        throw new Error('지원하지 않는 로그인 방식이에요');
      }
    },

    // 네이버 로그인 마지막 단계: 서버가 준 토큰으로 Firebase 로그인
    async signInWithNaverToken(token, { name, photo } = {}) {
      await persistReady;
      const cred = await signInWithCustomToken(auth, token);
      const u = cred.user;
      if ((name && u.displayName !== name) || (photo && u.photoURL !== photo)) {
        await updateProfile(u, { displayName: name || u.displayName, photoURL: photo || u.photoURL });
        authCb?.(toUser(auth.currentUser));
      }
    },

    async signOut() {
      await fbSignOut(auth);
    },

    async createRoom(makeRoom) {
      for (let tries = 0; tries < 5; tries++) {
        const code = randomCode();
        const ref = doc(db, 'rooms', code);
        const created = await runTransaction(db, async (t) => {
          const snap = await t.get(ref);
          if (snap.exists()) return false;
          t.set(ref, makeRoom(code));
          return true;
        });
        if (created) return code;
      }
      throw new Error('방 코드를 만들지 못했어요. 다시 시도해 주세요');
    },

    async mutateRoom(code, fn) {
      const ref = doc(db, 'rooms', code);
      await runTransaction(db, async (t) => {
        const snap = await t.get(ref);
        if (!snap.exists()) throw new Error('방을 찾을 수 없어요');
        const next = fn(structuredClone(snap.data()));
        if (next === null) t.delete(ref);
        else t.set(ref, next);
      });
    },

    // 프로필 · 전적 (users/{uid})
    watchProfile(uid, cb) {
      return onSnapshot(
        doc(db, 'users', uid),
        (snap) => cb(snap.exists() ? snap.data() : null),
        (err) => { console.warn('프로필을 불러오지 못했어요', err); cb(null); },
      );
    },

    async saveProfile(uid, patch) {
      await setDoc(doc(db, 'users', uid), { ...patch, updatedAt: Date.now() }, { merge: true });
    },

    // 내 프로필 문서를 읽고 고쳐서 통째로 저장 (친구 목록 등)
    async updateProfile(uid, fn) {
      const ref = doc(db, 'users', uid);
      await runTransaction(db, async (t) => {
        const snap = await t.get(ref);
        const next = fn(structuredClone(snap.exists() ? snap.data() : {}));
        t.set(ref, { ...next, updatedAt: Date.now() });
      });
    },

    // 인장·전적·최고 기록은 서버(/api)가 확인하고 저장해요 (브라우저에서는 바꿀 수 없게 보안 규칙으로 막혀 있어요)
    async callApi(path, body) {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('로그인이 필요해요');
      const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { const e = new Error(j.error || `서버 오류 (${r.status})`); e.status = r.status; throw e; }
      return j;
    },

    // 혼자 하는 게임의 최고 기록 (내 프로필 best.{게임}) · 랭킹
    async getBest(uid, key) {
      const snap = await getDoc(doc(db, 'users', uid));
      return Number(snap.data()?.best?.[key]) || 0;
    },
    async saveBest(uid, key, score) {
      try {
        const j = await this.callApi('/api/best', { key, score: Math.floor(score) });
        return Number(j.best) || 0;
      } catch (e) {
        if (e.status && e.status < 500) throw e;
        // 서버를 못 쓰면 예전 방식으로 (새 보안 규칙을 게시하면 이 길은 막혀요)
        let best = 0;
        await this.updateProfile(uid, (p) => { best = Math.max(Number(p.best?.[key]) || 0, score); return { ...p, best: { ...(p.best || {}), [key]: best } }; });
        return best;
      }
    },
    async topScores(key, n = 10) {
      const snap = await getDocs(query(collection(db, 'users'), orderBy(`best.${key}`, 'desc'), limit(n)));
      return snap.docs.map((d) => { const p = d.data(); return { uid: d.id, name: p.name || p.authName || '이름 없음', photo: p.photo || p.authPhoto || '', score: Number(p.best?.[key]) || 0 }; });
    },

    // 나에게 친구 요청을 보낸 사람들 (그 사람의 reqOut에 내가 있음)
    watchIncoming(uid, cb) {
      return onSnapshot(
        query(collection(db, 'users'), where('reqOut', 'array-contains', uid)),
        (snap) => cb(snap.docs.map((d) => ({ ...d.data(), uid: d.id }))),
        (err) => { console.warn('친구 요청을 불러오지 못했어요', err); cb([]); },
      );
    },

    async recordResult(uid, matchKey, gameId, { place, garnets = 0 } = {}) {
      try {
        await this.callApi('/api/record', { code: matchKey.split(':')[0] });
      } catch (e) {
        if (e.status && e.status < 500) throw e;
        console.warn('서버 기록 실패 → 예전 방식으로 기록', e);
        await this.legacyRecord(uid, matchKey, gameId, { place, garnets });
      }
    },
    // 예전 방식(브라우저가 직접 기록). 새 보안 규칙을 게시하면 권한이 없어 실패해요.
    async legacyRecord(uid, matchKey, gameId, { place, garnets = 0 }) {
      const ref = doc(db, 'users', uid);
      await runTransaction(db, async (t) => {
        const snap = await t.get(ref);
        const p = snap.exists() ? snap.data() : {};
        const recent = p.recentMatches || [];
        if (p.lastMatch === matchKey || recent.includes(matchKey)) return;
        const stats = p.stats || {};
        const g = { plays: 0, wins: 0, garnets: 0, ...(stats[gameId] || {}) };
        g.plays += 1;
        if (garnets > 0) g.wins += 1;
        g.garnets += garnets;
        const total = Math.max(0, (p.garnets || 0) + garnets);
        const ghist = [{ at: Date.now(), game: gameId, place, g: garnets, total }, ...(p.ghist || [])].slice(0, 30);
        t.set(ref, { stats: { ...stats, [gameId]: g }, garnets: total, ghist, lastMatch: matchKey, recentMatches: [matchKey, ...recent].slice(0, 30) }, { merge: true });
      });
    },

    // 서버가 진행하는 게임(아발론)의 동작 보내기 + 내 비밀(역할 등) 받기
    async serverMove(code, move) {
      await this.callApi('/api/game', { code, move });
    },
    watchSecret(code, uid, cb) {
      return onSnapshot(doc(db, 'rooms', code, 'secret', uid), (snap) => cb(snap.exists() ? snap.data() : null), () => cb(null));
    },

    // 친구 DM: dms/{두 사람 uid를 정렬해 '__'로 이은 것} = { users: [a, b], a: [a가 보낸 메시지], b: [b가 보낸 메시지] }
    // 보안 규칙으로 두 사람만 읽을 수 있고, 각자 자기 칸(a 또는 b)만 쓸 수 있어요.
    watchDms(uid, cb) {
      return onSnapshot(
        query(collection(db, 'dms'), where('users', 'array-contains', uid)),
        (snap) => {
          const out = {};
          snap.docs.forEach((d) => {
            const x = d.data(); const [a, b] = x.users || [];
            const me = a === uid ? 'a' : 'b', fid = a === uid ? b : a;
            if (fid) out[fid] = { mine: x[me] || [], theirs: x[me === 'a' ? 'b' : 'a'] || [] };
          });
          cb(out);
        },
        (err) => { console.warn('DM을 불러오지 못했어요', err); cb({}); },
      );
    },
    async writeDm(uid, fid, msgs) {
      const users = [uid, fid].sort();
      await setDoc(doc(db, 'dms', users.join('__')), { users, [users[0] === uid ? 'a' : 'b']: msgs }, { merge: true });
    },
    async clearOldDm(uid) {
      await setDoc(doc(db, 'users', uid), { dm: deleteField() }, { merge: true });
    },

    // 실시간 위치 채널 (자객 마피아) — Realtime Database: live/{방코드}/{uid}
    // Firestore는 초당 여러 번 쓰기엔 무료 한도가 금방 차서, 위치만 따로 Realtime Database로 보내요.
    liveAvailable: !!config.databaseURL,
    async live(code) {
      if (!config.databaseURL) return null;
      const m = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
      const rdb = m.getDatabase(app);
      const base = m.ref(rdb, `live/${code}`);
      return {
        send(uid, data) { m.set(m.child(base, uid), { ...data, t: m.serverTimestamp() }).catch(() => {}); }, // t: 서버 시각 (보안 규칙의 속도 제한용)
        watch(cb) { return m.onValue(base, (snap) => cb(snap.val() || {}), () => cb({})); },
        onLeave(uid) { try { m.onDisconnect(m.child(base, uid)).remove(); } catch {} },
        close(uid) { m.remove(m.child(base, uid)).catch(() => {}); },
      };
    },

    // 음성 채팅 연결 정보 (Realtime Database: voice/{방코드}/peers/{uid}, voice/{방코드}/sig/{받는uid}/{push})
    async voice(code, uid) {
      if (!config.databaseURL) return null;
      const m = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
      const rdb = m.getDatabase(app);
      const me = m.ref(rdb, `voice/${code}/peers/${uid}`);
      const inbox = m.ref(rdb, `voice/${code}/sig/${uid}`);
      m.onDisconnect(me).remove().catch(() => {});
      m.onDisconnect(inbox).remove().catch(() => {});
      await m.set(me, { m: false, t: m.serverTimestamp() });
      const offs = [];
      return {
        publish(d) { m.update(me, d).catch(() => {}); },
        send(to, msg) { m.push(m.ref(rdb, `voice/${code}/sig/${to}`), { ...msg, from: uid }).catch(() => {}); },
        watchPeers(cb) { offs.push(m.onValue(m.ref(rdb, `voice/${code}/peers`), (s) => cb(s.val() || {}), () => cb({}))); },
        onSignal(cb) {
          offs.push(m.onChildAdded(inbox, (s) => { const v = s.val(); m.remove(s.ref).catch(() => {}); if (v?.from) cb(v.from, v); }));
        },
        close() { offs.forEach((f) => f()); m.remove(me).catch(() => {}); m.remove(inbox).catch(() => {}); },
      };
    },

    // 방 접속 확인 (Realtime Database: presence/{방코드}/{uid}) — 창을 닫거나 연결이 끊기면 서버가 알아서 지워요.
    // cb(온라인 uid Set) · 사용할 수 없으면 cb(null) → 예전 방식(seen)으로 확인
    async roomPresence(code, uid) {
      if (!config.databaseURL) return null;
      const m = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');
      const rdb = m.getDatabase(app);
      // 연결(탭)마다 따로 표시해요: presence/{방}/{uid}/{연결id} — 한 사람이 탭을 여러 개 열어도 하나만 닫혔다고 사라지지 않게
      let mine = null;
      const offConn = m.onValue(m.ref(rdb, '.info/connected'), (s) => {
        if (s.val() !== true) return;
        const conn = m.push(m.ref(rdb, `presence/${code}/${uid}`));
        mine = conn;
        m.onDisconnect(conn).remove().then(() => m.set(conn, true)).catch(() => {});
      });
      let offRoom = () => {};
      return {
        watch(cb) {
          offRoom = m.onValue(m.ref(rdb, `presence/${code}`), (s) => {
            const v = s.val() || {};
            cb(new Set(Object.keys(v).filter((u) => v[u] && typeof v[u] === 'object' && Object.keys(v[u]).length)));
          }, () => cb(null));
        },
        close() { offConn(); offRoom(); if (mine) m.remove(mine).catch(() => {}); },
      };
    },

    watchRoom(code, cb) {
      return onSnapshot(
        doc(db, 'rooms', code),
        (snap) => cb(snap.exists() ? snap.data() : null),
        (err) => cb(null, err),
      );
    },
  };
}
