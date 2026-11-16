// Firebase 커스텀 토큰을 직접 만듭니다 (추가 패키지 설치 없이 Node 기본 crypto만 사용).
// 필요한 Vercel 환경 변수:
//   FIREBASE_SERVICE_ACCOUNT  — Firebase 콘솔에서 받은 서비스 계정 JSON 파일 내용 전체
//   (또는 FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY 두 개로 나눠서 넣어도 됩니다)
const crypto = require('crypto');

const AUDIENCE = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';

function getServiceAccount() {
  let email = process.env.FIREBASE_CLIENT_EMAIL;
  let key = process.env.FIREBASE_PRIVATE_KEY;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    email = sa.client_email;
    key = sa.private_key;
  }
  if (!email || !key) throw new Error('FIREBASE_SERVICE_ACCOUNT 환경 변수가 설정되지 않았어요');
  return { email, key: key.replace(/\\n/g, '\n') };
}

const b64url = (input) => Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

function createCustomToken(uid, claims = {}) {
  const { email, key } = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iss: email, sub: email, aud: AUDIENCE, iat: now, exp: now + 3600, uid, claims };
  const input = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = crypto.createSign('RSA-SHA256').update(input).sign(key);
  return `${input}.${b64url(signature)}`;
}

module.exports = { createCustomToken, AUDIENCE };
