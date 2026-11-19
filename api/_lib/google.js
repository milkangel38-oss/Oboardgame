// 서버 전용 도우미: 로그인 토큰 확인 + Firestore 읽기/쓰기 (추가 패키지 없이 Node 기본 기능만 사용)
// 가넷·전적·최고 기록처럼 '값어치 있는' 데이터는 브라우저가 아니라 여기(서버)에서만 저장해요.
const crypto = require('crypto');
const { getServiceAccount, b64url } = require('./firebase-token');

const DEFAULT_PROJECT = 'oboardgame-fb3f7';
const projectId = () => { try { return getServiceAccount().projectId || DEFAULT_PROJECT; } catch { return process.env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT; } };

// ── 1) 서비스 계정으로 구글 API 접근 토큰 받기 ──
let tokenCache = { token: '', exp: 0 };
async function accessToken() {
  if (tokenCache.token && Date.now() < tokenCache.exp - 60_000) return tokenCache.token;
  const { email, key } = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const input = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({
    iss: email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }))}`;
  const jwt = `${input}.${b64url(crypto.createSign('RSA-SHA256').update(input).sign(key))}`;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error(`구글 접근 토큰을 받지 못했어요 (${r.status} ${j.error || ''} ${String(j.error_description || '').slice(0, 80)})`);
  tokenCache = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return tokenCache.token;
}

// Realtime Database 읽기 (자객 마피아 실시간 위치 확인용) — 별도 범위의 토큰을 써요
const RTDB_URL = process.env.FIREBASE_DATABASE_URL || 'https://oboardgame-fb3f7-default-rtdb.asia-southeast1.firebasedatabase.app';
let rtdbCache = { token: '', exp: 0 };
async function rtdbToken() {
  if (rtdbCache.token && Date.now() < rtdbCache.exp - 60_000) return rtdbCache.token;
  const { email, key } = getServiceAccount();
  const now = Math.floor(Date.now() / 1000);
  const input = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({
    iss: email, scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }))}`;
  const jwt = `${input}.${b64url(crypto.createSign('RSA-SHA256').update(input).sign(key))}`;
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}` });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error(`실시간 DB 토큰을 받지 못했어요 (${r.status})`);
  rtdbCache = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return rtdbCache.token;
}
async function rtdbGet(path) {
  const r = await fetch(`${RTDB_URL}/${path}.json`, { headers: { authorization: `Bearer ${await rtdbToken()}` } });
  if (!r.ok) throw new Error(`실시간 DB ${r.status}`);
  return r.json();
}

// ── 2) 브라우저가 보낸 Firebase 로그인 토큰(ID 토큰) 확인 → uid ──
const CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let certCache = { certs: null, exp: 0 };
async function certs() {
  if (certCache.certs && Date.now() < certCache.exp) return certCache.certs;
  const r = await fetch(CERT_URL);
  if (!r.ok) throw new Error(`인증서를 받지 못했어요 (${r.status})`); // 실패한 응답은 저장하지 않아요
  const maxAge = Number(/max-age=(\d+)/.exec(r.headers.get('cache-control') || '')?.[1] || 3600);
  certCache = { certs: await r.json(), exp: Date.now() + maxAge * 1000 };
  return certCache.certs;
}
const unb64 = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
async function verifyIdToken(idToken, { certSource = certs, now = Date.now() } = {}) {
  const parts = String(idToken || '').split('.');
  if (parts.length !== 3) throw httpError(401, '로그인이 필요해요');
  let header, payload;
  try { header = JSON.parse(unb64(parts[0])); payload = JSON.parse(unb64(parts[1])); } catch { throw httpError(401, '로그인 정보가 올바르지 않아요'); }
  if (header.alg !== 'RS256') throw httpError(401, '로그인 정보가 올바르지 않아요');
  const cert = (await certSource())[header.kid];
  if (!cert) throw httpError(401, '로그인 정보가 만료됐어요. 새로고침해 주세요');
  const ok = crypto.createVerify('RSA-SHA256').update(`${parts[0]}.${parts[1]}`).verify(cert, unb64(parts[2]));
  const pid = projectId();
  const t = Math.floor(now / 1000);
  if (!ok || payload.aud !== pid || payload.iss !== `https://securetoken.google.com/${pid}` || !payload.sub || payload.exp < t || payload.iat > t + 300) {
    throw httpError(401, '로그인 정보가 올바르지 않아요');
  }
  return payload.sub;
}
async function uidFrom(req) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  return verifyIdToken(m?.[1]);
}

// ── 3) Firestore REST (값 변환 + 트랜잭션) ──
function enc(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: v.length ? { values: v.map(enc) } : {} };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, enc(x)])) } };
}
function dec(v) {
  if (!v) return null;
  if ('nullValue' in v) return null;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('stringValue' in v) return v.stringValue;
  if ('timestampValue' in v) return Date.parse(v.timestampValue);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(dec);
  if ('mapValue' in v) return decFields(v.mapValue.fields);
  return null;
}
const decFields = (f = {}) => Object.fromEntries(Object.entries(f).map(([k, x]) => [k, dec(x)]));

const base = () => `https://firestore.googleapis.com/v1/projects/${projectId()}/databases/(default)/documents`;
const docName = (col, id) => `projects/${projectId()}/databases/(default)/documents/${col}/${id}`; // 본문 안 문서 이름은 인코딩하지 않아요 (URL에서만 인코딩)
async function call(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { authorization: `Bearer ${await accessToken()}`, 'content-type': 'application/json', ...(opts.headers || {}) } });
  if (r.status === 404) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Firestore ${r.status}: ${j.error?.status || ''} ${String(j.error?.message || '').slice(0, 120)}`);
  return j;
}
async function getDoc(col, id, transaction) {
  const q = transaction ? `?transaction=${encodeURIComponent(transaction)}` : '';
  const j = await call(`${base()}/${col}/${encodeURIComponent(id)}${q}`);
  return j ? decFields(j.fields) : null;
}
// fn(read) → { col, id, data(일부 필드), fields(덮어쓸 필드 이름들) } 목록. 충돌하면 몇 번 다시 시도해요.
async function transact(fn, tries = 4) {
  for (let i = 0; i < tries; i++) {
    const { transaction } = await call(`${base()}:beginTransaction`, { method: 'POST', body: '{}' });
    const rollback = () => call(`${base()}:rollback`, { method: 'POST', body: JSON.stringify({ transaction }) }).catch(() => {});
    let writes;
    try { writes = await fn((col, id) => getDoc(col, id, transaction)); } catch (e) { await rollback(); throw e; } // 잠금이 남지 않게 바로 풀어요
    if (!writes || !writes.length) { await rollback(); return false; }
    try {
      await call(`${base()}:commit`, {
        method: 'POST',
        body: JSON.stringify({
          transaction,
          // fields가 있으면 그 필드만, 없으면 문서 전체를 바꿔요
          writes: writes.map((w) => ({ update: { name: docName(w.col, w.id), fields: enc(w.data).mapValue.fields }, ...(w.fields ? { updateMask: { fieldPaths: w.fields } } : {}) })),
        }),
      });
      return true;
    } catch (e) {
      if (!/ABORTED|FAILED_PRECONDITION/.test(e.message)) throw e;
      if (i === tries - 1) throw httpError(409, '사람이 몰려서 처리하지 못했어요. 잠시 후 다시 해 주세요');
    }
  }
  return false;
}

function httpError(status, message) { const e = new Error(message); e.status = status; return e; }
function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}
async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch { return {}; } }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { return {}; }
}

module.exports = { rtdbGet, accessToken, verifyIdToken, uidFrom, getDoc, transact, enc, dec, decFields, httpError, send, readJson, projectId };
