// POST /api/best  { key: 'merge', score }  — 혼자 하는 게임의 최고 기록을 서버가 저장해요 (더 높을 때만).
const { uidFrom, transact, send, readJson } = require('./_lib/google');
const { bestFor } = require('./_lib/record-logic');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return send(res, 405, { ok: false });
    const uid = await uidFrom(req);
    const { key, score } = await readJson(req);
    let best = 0;
    await transact(async (read) => {
      const r = bestFor(await read('users', uid), String(key || ''), Number(score));
      best = r.best;
      return r.write ? [{ col: 'users', id: uid, ...r.write }] : [];
    });
    return send(res, 200, { ok: true, best });
  } catch (e) {
    const status = e.status || 500;
    if (status === 500) console.error('best', e);
    return send(res, status, { ok: false, error: status === 500 ? '서버 오류' : e.message });
  }
};
