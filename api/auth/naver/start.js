// 1단계: 네이버 로그인 화면으로 보내기
const crypto = require('crypto');
const { callbackUrl, redirect, backToSite, requireEnv } = require('../../_lib/naver');

module.exports = (req, res) => {
  try {
    const { id } = requireEnv();
    const state = crypto.randomBytes(16).toString('hex'); // 위조 요청 방지용
    const url = new URL('https://nid.naver.com/oauth2.0/authorize');
    url.search = new URLSearchParams({
      response_type: 'code',
      client_id: id,
      redirect_uri: callbackUrl(req),
      state,
    }).toString();
    redirect(res, url.toString(), [
      `naver_state=${state}; Path=/api/auth/naver; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    ]);
  } catch (e) {
    backToSite(req, res, { error: e.message });
  }
};
