// Firebase 백엔드 (Authentication + Cloud Firestore)
// 방 문서: rooms/{code}  — 구조는 room-logic.js 상단 주석 참고
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
  signInAnonymously, signInWithCustomToken, updateProfile, signOut as fbSignOut,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  initializeFirestore, doc, onSnapshot, runTransaction, setDoc,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { randomCode } from './code.js';

export function createBackend(config) {
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = initializeFirestore(app, { ignoreUndefinedProperties: true });

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

    async recordResult(uid, matchKey, gameId, outcome) {
      const ref = doc(db, 'users', uid);
      await runTransaction(db, async (t) => {
        const snap = await t.get(ref);
        const p = snap.exists() ? snap.data() : {};
        if (p.lastMatch === matchKey) return; // 같은 판을 두 번 기록하지 않음
        const stats = p.stats || {};
        const g = { w: 0, l: 0, d: 0, ...(stats[gameId] || {}) };
        g[outcome] += 1;
        t.set(ref, { stats: { ...stats, [gameId]: g }, lastMatch: matchKey }, { merge: true });
      });
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
