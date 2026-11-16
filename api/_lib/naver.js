// 네이버 로그인 공통 도우미
// 필요한 Vercel 환경 변수: NAVER_CLIENT_ID, NAVER_CLIENT_SECRET

function siteOrigin(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

function callbackUrl(req) {
  return `${siteOrigin(req)}/api/auth/naver/callback`;
}

function getQuery(req) {
  return new URL(req.url, 'http://localhost').searchParams;
}

function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return '';
}

function redirect(res, url, cookies = []) {
  res.statusCode = 302;
  if (cookies.length) res.setHeader('Set-Cookie', cookies);
  res.setHeader('Location', url);
  res.setHeader('Cache-Control', 'no-store');
  res.end();
}

// 결과를 사이트로 돌려보냄. URL의 # 뒤 내용은 서버로 전송되지 않아 토큰이 로그에 남지 않아요.
function backToSite(req, res, params, cookies) {
  const qs = new URLSearchParams(params).toString();
  redirect(res, `${siteOrigin(req)}/#/auth/naver?${qs}`, cookies);
}

function requireEnv() {
  const id = process.env.NAVER_CLIENT_ID;
  const secret = process.env.NAVER_CLIENT_SECRET;
  if (!id || !secret) throw new Error('NAVER_CLIENT_ID / NAVER_CLIENT_SECRET 환경 변수가 설정되지 않았어요');
  return { id, secret };
}

module.exports = { siteOrigin, callbackUrl, getQuery, getCookie, redirect, backToSite, requireEnv };
