// Firebase 백엔드 (Authentication + Cloud Firestore)
// 방 문서: rooms/{code}  — 구조는 room-logic.js 상단 주석 참고
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
  signInAnonymously, updateProfile, signOut as fbSignOut,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  initializeFirestore, doc, onSnapshot, runTransaction,
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
    provider: u.isAnonymous ? 'guest' : (u.providerData[0]?.providerId || 'custom'),
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
        // 네이버는 Firebase 기본 제공이 아니라 서버(Cloud Functions)에서
        // 커스텀 토큰을 발급해야 합니다. README의 "네이버 로그인 붙이기" 참고.
        throw new Error('네이버 로그인은 서버 설정 후 사용할 수 있어요 (README 참고)');
      } else {
        throw new Error('지원하지 않는 로그인 방식이에요');
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

    watchRoom(code, cb) {
      return onSnapshot(
        doc(db, 'rooms', code),
        (snap) => cb(snap.exists() ? snap.data() : null),
        (err) => cb(null, err),
      );
    },
  };
}
