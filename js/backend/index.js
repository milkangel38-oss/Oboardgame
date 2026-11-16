// Firebase 설정이 있으면 Firebase, 없으면 테스트(mock) 백엔드를 사용합니다.
// 두 백엔드는 같은 모양의 API를 제공합니다:
//   mode, onAuth(cb), signIn(provider, {name}), signOut(),
//   createRoom(makeRoom) -> code, mutateRoom(code, fn), watchRoom(code, cb) -> unsubscribe
import { firebaseConfig } from '../config.js';

const useFirebase = !!(firebaseConfig && firebaseConfig.apiKey);
const mod = useFirebase ? await import('./firebase.js') : await import('./mock.js');

export const backend = mod.createBackend(firebaseConfig);
