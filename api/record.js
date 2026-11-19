// POST /api/record  { code }  — 끝난 게임의 내 가넷·전적을 서버가 확인하고 저장해요.
// GET  /api/record?check=1   — 서버 설정 점검 (서비스 계정으로 Firestore에 접근되는지)
const { uidFrom, getDoc, transact, send, readJson, accessToken } = require('./_lib/google');
const { recordFor } = require('./_lib/record-logic');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      await accessToken();
      await getDoc('rooms', '__check__');
      return send(res, 200, { ok: true, message: '서버 설정 정상 ✅' });
    }
    if (req.method !== 'POST') return send(res, 405, { ok: false });
    const uid = await uidFrom(req);
    const { code } = await readJson(req);
    if (!/^[A-Z0-9]{3,12}$/.test(String(code || ''))) return send(res, 400, { ok: false, error: '방 코드가 올바르지 않아요' });
    let out = null;
    const room = await getDoc('rooms', code); // 방은 읽기만 해요 (트랜잭션 밖 → 방을 잠그지 않아요)
    await transact(async (read) => {
      const prof = await read('users', uid);
      out = recordFor(room, prof, uid);
      return out ? [{ col: 'users', id: uid, data: out.data, fields: out.fields }] : [];
    });
    return send(res, 200, { ok: true, dup: !out, garnets: out?.garnets ?? 0, total: out?.total });
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error('record', e);
    return send(res, status, { ok: false, error: status === 500 ? '서버 오류' : e.message });
  }
};
