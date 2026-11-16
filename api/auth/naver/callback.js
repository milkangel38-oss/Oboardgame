// 2단계: 네이버가 돌려준 code로 사용자 정보를 확인하고, Firebase 로그인 토큰을 만들어 사이트로 돌려보냄
const { callbackUrl, getQuery, getCookie, backToSite, requireEnv } = require('../../_lib/naver');
const { createCustomToken } = require('../../_lib/firebase-token');

const CLEAR_STATE = 'naver_state=; Path=/api/auth/naver; HttpOnly; Secure; SameSite=Lax; Max-Age=0';

module.exports = async (req, res) => {
  const fail = (msg) => backToSite(req, res, { error: msg }, [CLEAR_STATE]);
  try {
    const q = getQuery(req);
    if (q.get('error')) return fail('네이버 로그인을 취소했어요');

    const code = q.get('code');
    const state = q.get('state');
    if (!code || !state || state !== getCookie(req, 'naver_state')) {
      return fail('로그인 요청이 만료됐어요. 다시 시도해 주세요');
    }

    const { id, secret } = requireEnv();

    // code → 접근 토큰
    const tokenRes = await fetch('https://nid.naver.com/oauth2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: id,
        client_secret: secret,
        code,
        state,
        redirect_uri: callbackUrl(req),
      }),
    });
    const tokenJson = await tokenRes.json();
    if (!tokenJson.access_token) {
      console.error('naver token error', tokenJson);
      return fail('네이버 인증에 실패했어요');
    }

    // 접근 토큰 → 사용자 정보
    const meRes = await fetch('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    });
    const me = await meRes.json();
    if (me.resultcode !== '00' || !me.response?.id) {
      console.error('naver profile error', me);
      return fail('네이버 사용자 정보를 가져오지 못했어요');
    }

    const profile = me.response;
    const token = createCustomToken(`naver:${profile.id}`, { provider: 'naver' });

    backToSite(req, res, {
      token,
      name: profile.nickname || profile.name || '',
      photo: profile.profile_image || '',
    }, [CLEAR_STATE]);
  } catch (e) {
    console.error(e);
    fail(e.message || '알 수 없는 오류가 났어요');
  }
};
