// POST /api/game  { code, move }  — 비밀 정보가 있는 게임(아발론)의 동작을 서버가 확인하고 적용해요.
// 방 문서에는 공개 정보만, 비밀은 rooms/{code}/secret/SERVER(아무도 못 읽음)와 secret/{uid}(본인만)에 저장해요.
// GET /api/game — 서버 점검 (게임 규칙 파일을 불러올 수 있는지)
const { uidFrom, transact, send, readJson } = require('./_lib/google');

let engine = null;
const load = async () => (engine ||= await import('../js/games/server-games.js'));

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const m = await load();
      return send(res, 200, { ok: true, message: '게임 서버 정상 ✅', games: Object.keys(m.SERVER_GAMES) });
    }
    if (req.method !== 'POST') return send(res, 405, { ok: false });
    const uid = await uidFrom(req);
    const { code, move } = await readJson(req);
    if (!/^[A-Z0-9]{3,12}$/.test(String(code || ''))) return send(res, 400, { ok: false, error: '방 코드가 올바르지 않아요' });
    if (JSON.stringify(move || {}).length > 2000) return send(res, 400, { ok: false, error: '동작이 너무 커요' });
    const { serverApply } = await load();
    await transact(async (read) => {
      const room = await read('rooms', code);
      if (!room) { const e = new Error('방을 찾을 수 없어요'); e.status = 404; throw e; }
      const srv = await read(`rooms/${code}/secret`, 'SERVER');
      let out;
      try { out = serverApply({ ...room, code }, srv, uid, move); }
      catch (e) { e.status = e.message === '__noop' ? 200 : 400; throw e; }
      const writes = [
        { col: 'rooms', id: code, data: out.room },
        { col: `rooms/${code}/secret`, id: 'SERVER', data: out.server },
      ];
      // 각자 알아도 되는 비밀 (내 역할·아는 사람·내 투표)
      if (out.mineChanged) Object.entries(out.mine).forEach(([u, v]) => writes.push({ col: `rooms/${code}/secret`, id: u, data: { ...v, match: room.matchId } }));
      return writes;
    });
    return send(res, 200, { ok: true });
  } catch (e) {
    if (e.message === '__noop') return send(res, 200, { ok: true, noop: true });
    const status = e.status || 500;
    if (status === 500) console.error('game', e);
    return send(res, status, { ok: false, error: status === 500 ? '서버 오류' : e.message });
  }
};
