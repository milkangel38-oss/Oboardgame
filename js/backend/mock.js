// 테스트 모드 백엔드
// - 로그인: 실제 인증 없이 닉네임만 받습니다. 탭마다 다른 사용자(sessionStorage).
// - 방 데이터: localStorage에 저장 → 같은 브라우저의 다른 탭과 실시간 공유.
//   초대 링크를 새 탭에 붙여넣으면 "친구"로 입장해 볼 수 있어요.
import { randomCode } from './code.js';

const ROOMS_KEY = 'mbg:rooms';
const USER_KEY = 'mbg:user';
const PROVIDER_LABEL = { google: 'Google', naver: '네이버', guest: '게스트' };

function loadRooms() {
  try { return JSON.parse(localStorage.getItem(ROOMS_KEY)) || {}; } catch { return {}; }
}

const roomListeners = new Set();
function notifyRooms() { roomListeners.forEach((fn) => fn()); }
window.addEventListener('storage', (e) => { if (e.key === ROOMS_KEY) notifyRooms(); });

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
      cb(readUser());
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

    watchRoom(code, cb) {
      const emit = () => cb(loadRooms()[code] || null);
      roomListeners.add(emit);
      emit();
      return () => roomListeners.delete(emit);
    },
  };
}
