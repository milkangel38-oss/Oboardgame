// Firebase 설정이 있으면 Firebase, 없으면 테스트(mock) 백엔드를 사용합니다.
// 주소 끝에 ?test 를 붙이면 Firebase 대신 "혼자 테스트 모드"로 동작해요.
//   - 로그인 없이 탭마다 다른 플레이어
//   - 이 브라우저 안에만 저장 (실제 데이터베이스·인장과 완전히 분리)
// 두 백엔드는 같은 모양의 API를 제공합니다:
//   mode, onAuth(cb), signIn(provider, {name}), signOut(),
//   createRoom(makeRoom) -> code, mutateRoom(code, fn), watchRoom(code, cb) -> unsubscribe,
//   watchProfile(uid, cb), saveProfile(uid, patch), recordResult(uid, key, gameId, {place, garnets})
import { firebaseConfig } from '../config.js';

export const testMode = new URLSearchParams(location.search).has('test');
const useFirebase = !testMode && !!(firebaseConfig && firebaseConfig.apiKey);
const mod = useFirebase ? await import('./firebase.js') : await import('./mock.js');

export const backend = mod.createBackend(firebaseConfig);
