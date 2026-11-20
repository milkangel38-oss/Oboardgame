// 앱 이름
export const APP_NAME = 'O게임';
export const APP_VERSION = 'v9.7';

// Firebase 설정 — Firebase 콘솔 > 프로젝트 설정 > 내 앱 에서 복사한 값
// apiKey를 비우면 "테스트 모드"로 동작합니다
// (실제 로그인 없이 닉네임으로 입장, 같은 브라우저의 여러 탭끼리 같이 플레이).
export const firebaseConfig = {
  apiKey: 'AIzaSyD40wn5gBsDVDepsK19aRbKK8abrvfegGk',
  authDomain: 'oboardgame-fb3f7.firebaseapp.com',
  projectId: 'oboardgame-fb3f7',
  databaseURL: 'https://oboardgame-fb3f7-default-rtdb.asia-southeast1.firebasedatabase.app', // 자객 마피아 실시간 위치
  storageBucket: 'oboardgame-fb3f7.firebasestorage.app',
  messagingSenderId: '425299354027',
  appId: '1:425299354027:web:c6cfb740ec628b019c72ee',
  measurementId: 'G-K19R0G6Y0G',
};
