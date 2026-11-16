# 🎲 보드게임 모임

친구들과 링크 하나로 같이 하는 미니 보드게임 사이트입니다.
빌드 도구 없이 HTML + JavaScript만으로 되어 있어서, 파일을 열어 바로 고칠 수 있어요.

## 1. 바로 실행해 보기 (테스트 모드)

```bash
cd boardgame
python3 -m http.server 8000
```

브라우저에서 http://localhost:8000 을 엽니다.

- `js/config.js`의 `apiKey`가 비어 있으면 **테스트 모드**예요. 실제 로그인 대신 닉네임으로 들어가요.
- 탭마다 다른 사용자가 됩니다. 방을 만들고 **친구 초대** → 복사된 링크를 **새 탭**에 붙여넣으면 친구 역할로 입장할 수 있어요.
- 테스트 모드는 같은 브라우저 안에서만 동작해요. 실제 친구와 하려면 아래 2번을 따라 주세요.

## 2. 실제 서비스로 만들기 (Firebase, 무료 플랜으로 충분)

1. https://console.firebase.google.com 에서 프로젝트 생성
2. **웹 앱 추가** → 나오는 설정값을 `js/config.js`의 `firebaseConfig`에 붙여넣기
3. **Authentication** → 로그인 방법에서 `Google`, `익명`을 사용 설정
4. **Firestore Database** 만들기 → 규칙 탭에 `firestore.rules` 내용을 붙여넣고 게시
5. 배포 (Firebase Hosting):
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting   # public 폴더: . (현재 폴더), SPA 질문: No
   firebase deploy
   ```
   배포된 주소(`https://프로젝트명.web.app`)를 친구들에게 보내면 끝!

## 3. 네이버 로그인 (Vercel 서버 기능 사용)

동작 순서: 네이버 버튼 → `api/auth/naver/start` → 네이버 로그인 → `api/auth/naver/callback`
→ 서버가 Firebase 로그인 토큰 발급 → 사이트로 돌아와 자동 로그인

Vercel > 프로젝트 > Settings > Environment Variables 에 아래 3개를 넣어야 동작해요.

| 이름 | 값 |
|---|---|
| `NAVER_CLIENT_ID` | 네이버 개발자센터 > 내 애플리케이션 > Client ID |
| `NAVER_CLIENT_SECRET` | 같은 곳의 Client Secret |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase > 프로젝트 설정 > 서비스 계정 > 새 비공개 키 생성 으로 받은 JSON 파일 내용 전체 |

⚠️ 서비스 계정 JSON과 Client Secret은 비밀번호와 같아요. **GitHub에 올리지 말고** Vercel 환경 변수에만 넣으세요.

네이버 개발자센터 설정
- 사용 API: 네이버 로그인 (제공 정보: 별명, 프로필 사진)
- 서비스 URL: `https://내주소.vercel.app`
- Callback URL: `https://내주소.vercel.app/api/auth/naver/callback`
- 앱이 "개발 중" 상태일 때는 **멤버 관리**에 등록한 네이버 아이디만 로그인할 수 있어요.

## 4. 새 게임 추가하기

1. `js/games/tictactoe.js`를 복사해서 `js/games/새게임.js` 만들기
2. 아래 함수들을 채우기
   - `setup(players)` — 게임 시작 시 상태
   - `move(state, move, uid, players)` — 한 수 두기. 틀린 수면 `throw new Error('메시지')`, 끝나면 `result` 반환
   - `render(el, ctx)` — 화면 그리기. 버튼을 누르면 `ctx.sendMove({...})`
3. `js/games/index.js`의 `GAMES`에 추가

준비/시작/참가자 관리/초대는 공통 코드(`js/room-logic.js`)가 처리하므로 게임 규칙만 쓰면 돼요.

## 폴더 구조

```
index.html
css/style.css
js/
  app.js            화면 (로그인 · 로비 · 게임 방)
  config.js         앱 이름, Firebase 설정
  room-logic.js     방 규칙 (참가 · 준비 · 시작 · 나가기 · 다시하기)
  backend/
    index.js        Firebase/테스트 모드 자동 선택
    firebase.js     실제 서버 (로그인, 실시간 DB)
    mock.js         테스트 모드
  games/
    index.js        게임 목록
    tictactoe.js    예시 게임
api/auth/naver/     네이버 로그인 서버 기능 (Vercel)
firestore.rules     Firestore 보안 규칙
```
