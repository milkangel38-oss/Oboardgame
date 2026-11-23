// 미니게임: 장기 (2명) — 9×10 판, 초(楚)가 먼저, 상대 궁을 외통으로 몰면 승리
// 칸 번호: r*9 + c (r 0~9 위→아래, c 0~8). 한(漢·빨강)은 위, 초(楚·초록)는 아래에서 시작
// 말: K 궁 · R 차 · C 포 · H 마 · E 상 · A 사 · P 졸/병, 앞에 진영 글자 c(초) / h(한)
import { turnAlert, bigFlash } from './turn-alert.js';
import { faceHtml } from './face.js';
import { sfxToken } from '../sound.js';

const W = 9, H = 10;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const at = (r, c) => r * W + c;
const inB = (r, c) => r >= 0 && r < H && c >= 0 && c < W;
const PAL = { h: [0, 1, 2], c: [7, 8, 9] };
const inPal = (r, c, side) => c >= 3 && c <= 5 && (side ? PAL[side].includes(r) : PAL.h.includes(r) || PAL.c.includes(r));
// 궁성 대각선: 꼭짓점 ↔ 가운데
const palCenter = (r) => (r <= 2 ? 1 : 8);
function palDiag(r, c) {
  if (!inPal(r, c)) return [];
  const m = palCenter(r);
  if (r === m && c === 4) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  if ((r === m - 1 || r === m + 1) && (c === 3 || c === 5)) return [[m - r, 4 - c]];
  return [];
}

export const NAMES = { K: '궁', R: '차', C: '포', H: '마', E: '상', A: '사', P: '졸' };
const HANJA = { c: { K: '楚', R: '車', C: '包', H: '馬', E: '象', A: '士', P: '卒' }, h: { K: '漢', R: '車', C: '包', H: '馬', E: '象', A: '士', P: '兵' } };
const SCORE = { R: 13, C: 7, H: 5, E: 3, A: 3, P: 2, K: 0 };

export function initialBoard() {
  const b = Array(W * H).fill('');
  const back = ['R', 'H', 'E', 'A', '', 'A', 'E', 'H', 'R'];
  back.forEach((p, c) => { if (p) { b[at(0, c)] = 'h' + p; b[at(9, c)] = 'c' + p; } });
  b[at(1, 4)] = 'hK'; b[at(8, 4)] = 'cK';
  [1, 7].forEach((c) => { b[at(2, c)] = 'hC'; b[at(7, c)] = 'cC'; });
  [0, 2, 4, 6, 8].forEach((c) => { b[at(3, c)] = 'hP'; b[at(6, c)] = 'cP'; });
  return b;
}

// 규칙상 갈 수 있는 칸 (내 궁이 잡히는지는 아직 안 봐요)
function pseudo(b, i) {
  const p = b[i]; if (!p) return [];
  const side = p[0], kind = p[1], r = Math.floor(i / W), c = i % W;
  const out = [];
  const mine = (j) => b[j] && b[j][0] === side;
  const add = (rr, cc) => { if (inB(rr, cc) && !mine(at(rr, cc))) out.push(at(rr, cc)); };
  const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  if (kind === 'K' || kind === 'A') {
    for (const [dr, dc] of ORTH) if (inPal(r + dr, c + dc, side)) add(r + dr, c + dc);
    for (const [dr, dc] of palDiag(r, c)) if (inPal(r + dr, c + dc, side)) add(r + dr, c + dc);
  } else if (kind === 'R') {
    for (const [dr, dc] of ORTH) {
      let rr = r + dr, cc = c + dc;
      while (inB(rr, cc)) { if (b[at(rr, cc)]) { if (!mine(at(rr, cc))) out.push(at(rr, cc)); break; } out.push(at(rr, cc)); rr += dr; cc += dc; }
    }
    for (const [dr, dc] of palDiag(r, c)) {
      let rr = r + dr, cc = c + dc;
      while (inPal(rr, cc) && palDiag(rr, cc).length) { if (b[at(rr, cc)]) { if (!mine(at(rr, cc))) out.push(at(rr, cc)); break; } out.push(at(rr, cc)); if (rr === palCenter(rr) && cc === 4) { rr += dr; cc += dc; } else break; }
    }
  } else if (kind === 'C') {
    const isC = (j) => b[j] && b[j][1] === 'C';
    for (const [dr, dc] of ORTH) {
      let rr = r + dr, cc = c + dc;
      while (inB(rr, cc) && !b[at(rr, cc)]) { rr += dr; cc += dc; }
      if (!inB(rr, cc) || isC(at(rr, cc))) continue; // 넘을 말이 없거나 포는 못 넘어요
      rr += dr; cc += dc;
      while (inB(rr, cc)) {
        const j = at(rr, cc);
        if (b[j]) { if (!mine(j) && !isC(j)) out.push(j); break; }
        out.push(j); rr += dr; cc += dc;
      }
    }
    // 궁성 대각선: 꼭짓점에서 가운데 말을 넘어 반대 꼭짓점으로
    const m = palCenter(r);
    if (inPal(r, c) && (c === 3 || c === 5) && (r === m - 1 || r === m + 1)) {
      const mid = at(m, 4), tr = 2 * m - r, tc = 8 - c, t = at(tr, tc);
      if (b[mid] && !isC(mid) && (!b[t] || (!mine(t) && !isC(t)))) out.push(t);
    }
  } else if (kind === 'H') {
    for (const [dr, dc] of ORTH) {
      if (!inB(r + dr, c + dc) || b[at(r + dr, c + dc)]) continue;
      for (const s of [-1, 1]) add(r + 2 * dr + (dc ? s : 0), c + 2 * dc + (dr ? s : 0));
    }
  } else if (kind === 'E') {
    for (const [dr, dc] of ORTH) {
      if (!inB(r + dr, c + dc) || b[at(r + dr, c + dc)]) continue;
      for (const s of [-1, 1]) {
        const pr = dr ? 0 : s, pc = dc ? 0 : s;
        const r2 = r + 2 * dr + pr, c2 = c + 2 * dc + pc;
        if (!inB(r2, c2) || b[at(r2, c2)]) continue;
        add(r + 3 * dr + 2 * pr, c + 3 * dc + 2 * pc);
      }
    }
  } else if (kind === 'P') {
    const f = side === 'c' ? -1 : 1;
    add(r + f, c); add(r, c - 1); add(r, c + 1);
    for (const [dr, dc] of palDiag(r, c)) if (dr === f && inPal(r + dr, c + dc, side === 'c' ? 'h' : 'c')) add(r + dr, c + dc);
  }
  return out;
}

const kingAt = (b, side) => b.indexOf(side + 'K');
export function inCheck(b, side) {
  const k = kingAt(b, side); if (k < 0) return true;
  const opp = side === 'c' ? 'h' : 'c';
  for (let i = 0; i < b.length; i++) if (b[i] && b[i][0] === opp && pseudo(b, i).includes(k)) return true;
  return false;
}
const apply = (b, from, to) => { const n = b.slice(); n[to] = n[from]; n[from] = ''; return n; };
// 내 궁이 잡히지 않는 수만
export function legalFrom(b, i) {
  const side = b[i]?.[0]; if (!side) return [];
  return pseudo(b, i).filter((t) => !inCheck(apply(b, i, t), side));
}
export function hasMove(b, side) {
  for (let i = 0; i < b.length; i++) if (b[i] && b[i][0] === side && legalFrom(b, i).length) return true;
  return false;
}
const material = (b, side) => b.reduce((s, p) => s + (p && p[0] === side ? SCORE[p[1]] : 0), 0) + (side === 'h' ? 1.5 : 0);

function result(state, players, winner, why) {
  const order = [state.cho, state.han];
  if (!winner) return { message: `무승부! ${why}`, winners: [], ranking: order.map((uid) => ({ uid, score: 0, place: 1, garnets: 0 })), rewards: {} };
  const loser = order.find((u) => u !== winner);
  return {
    message: `${players[winner]?.name || '?'}님 승리! ${why}`,
    winners: [winner],
    ranking: [{ uid: winner, score: 1, place: 1, garnets: 1 }, { uid: loser, score: 0, place: 2, garnets: 0 }],
    rewards: { [winner]: 1, [loser]: 0 },
  };
}

const ui = { key: '', sel: -1 };
const fx = { n: -1 };
const pieceHtml = (p) => `<span class="jg-p ${p[0]} k${p[1]}"><b>${HANJA[p[0]][p[1]]}</b></span>`;

export default {
  id: 'janggi',
  name: '장기',
  emoji: '♟️',
  category: 'mini',
  minPlayers: 2,
  maxPlayers: 2,
  duration: '15~30분',
  rewards: [1],
  rewardLabel: '승리 +1',
  description: '초와 한의 한판 승부! 상대 궁을 외통으로 몰아라',
  rules: [
    '2명이 초(楚·초록)와 한(漢·빨강)을 나눠 맡아요. 초가 먼저 둬요. (진영은 무작위)',
    '궁·사: 궁성 안에서 선을 따라 한 칸 · 차: 직선으로 원하는 만큼 · 포: 말 하나를 넘어서 이동 (포끼리는 넘거나 잡을 수 없어요)',
    '마: 한 칸 직선 후 한 칸 대각선 · 상: 한 칸 직선 후 두 칸 대각선 (가는 길이 막히면 못 가요)',
    '졸·병: 앞이나 옆으로 한 칸 (뒤로는 못 가요). 궁성 안에서는 선을 따라 대각선으로도 갈 수 있어요.',
    '상대 궁을 공격하면 "장군!" 내 궁이 공격받으면 반드시 피해야 해요. 피할 수 없으면 외통으로 패배!',
    '둘 곳이 마땅치 않으면 "한수쉼"으로 차례를 넘길 수 있어요 (장군일 때는 안 돼요).',
    '200수가 지나면 남은 기물 점수로 승부해요 (차13·포7·마5·상3·사3·졸2, 한은 덤 1.5점).',
    '가넷: 승리한 사람 +1',
  ],

  setup(players) {
    const [a, b] = players.map((p) => p.uid).sort(() => Math.random() - 0.5);
    return { cho: a, han: b, board: initialBoard(), turn: 'c', n: 0, last: null, check: false, passes: 0, phase: 'play' };
  },

  move(state, move, uid, players) {
    if (state.phase !== 'play') throw new Error('__noop');
    const side = uid === state.cho ? 'c' : uid === state.han ? 'h' : '';
    if (!side) throw new Error('참가자가 아니에요');
    const opp = side === 'c' ? 'h' : 'c';
    const oppUid = side === 'c' ? state.han : state.cho;
    if (move?.type === 'resign') { const s = { ...state, phase: 'done', resign: uid }; return { state: s, result: result(s, players, oppUid, '(상대 기권)') }; }
    if (side !== state.turn) throw new Error('내 차례가 아니에요');
    let s;
    if (move?.type === 'pass') {
      if (state.check) throw new Error('장군일 때는 쉴 수 없어요');
      s = { ...state, turn: opp, n: state.n + 1, last: null, check: false, passes: state.passes + 1 };
      if (s.passes >= 2) { const d = { ...s, phase: 'done' }; return { state: d, result: result(d, players, null, '(둘 다 한수쉼)') }; }
    } else if (move?.type === 'move') {
      const from = Number(move.from), to = Number(move.to);
      if (!state.board[from] || state.board[from][0] !== side) throw new Error('내 말이 아니에요');
      if (!legalFrom(state.board, from).includes(to)) throw new Error('그 자리로는 갈 수 없어요');
      const board = apply(state.board, from, to);
      const check = inCheck(board, opp);
      s = { ...state, board, turn: opp, n: state.n + 1, last: [from, to], check, passes: 0, took: state.board[to] || '' };
      if (!hasMove(board, opp)) {
        if (check) { const d = { ...s, phase: 'done', mate: true }; return { state: d, result: result(d, players, uid, '(외통 장군!)') }; }
      }
    } else throw new Error('알 수 없는 동작이에요');
    if (s.n >= 200) {
      const sc = material(s.board, 'c'), sh = material(s.board, 'h');
      const d = { ...s, phase: 'done', score: { c: sc, h: sh } };
      return { state: d, result: result(d, players, sc > sh ? state.cho : state.han, `(200수 점수 ${sc} : ${sh})`) };
    }
    return { state: s };
  },

  render(el, ctx) {
    const { state, me, players, finished, sendMove, room } = ctx;
    const name = (u) => esc(players[u]?.name || '나간 사람');
    const mySide = me === state.cho ? 'c' : me === state.han ? 'h' : '';
    const turnUid = state.turn === 'c' ? state.cho : state.han;
    const myTurn = !finished && state.phase === 'play' && mySide === state.turn;
    const flip = mySide === 'h'; // 내 진영이 항상 아래
    if (ui.key !== `${room?.code}:${state.n}`) ui.key = `${room?.code}:${state.n}`, ui.sel = -1;
    if (room) turnAlert(room.code, `jg:${room.startedAt}:${state.n}`, myTurn);
    if (fx.n !== state.n) {
      if (fx.n >= 0 && state.n > fx.n) { sfxToken(); if (state.check && state.phase === 'play') bigFlash('<div class="jg-flash">장군!</div>', 1400); }
      fx.n = state.n;
    }

    const b = state.board;
    const targets = ui.sel >= 0 ? legalFrom(b, ui.sel) : [];
    const last = state.last || [];
    // 판 선 (교차점 = 칸 가운데)
    const L = [];
    for (let r = 0; r < H; r++) L.push(`<line x1=".5" y1="${r + 0.5}" x2="${W - 0.5}" y2="${r + 0.5}"/>`);
    for (let c = 0; c < W; c++) L.push(`<line x1="${c + 0.5}" y1=".5" x2="${c + 0.5}" y2="${H - 0.5}"/>`);
    for (const t of [0, 7]) L.push(`<line x1="3.5" y1="${t + 0.5}" x2="5.5" y2="${t + 2.5}"/><line x1="5.5" y1="${t + 0.5}" x2="3.5" y2="${t + 2.5}"/>`);
    const view = (k) => (flip ? W * H - 1 - k : k); // 화면 순서 → 실제 칸
    const cells = Array.from({ length: W * H }, (_, k) => {
      const i = view(k), p = b[i];
      const cls = ['jg-c', last.includes(i) && 'last', ui.sel === i && 'sel', targets.includes(i) && (p ? 'cap' : 'dot'),
        state.check && p === state.turn + 'K' && 'chk'].filter(Boolean).join(' ');
      return `<button class="${cls}" data-i="${i}">${p ? pieceHtml(p) : ''}</button>`;
    }).join('');

    const seat = (u, side) => `<div class="om-p jg-seat ${side} ${u === me ? 'me' : ''} ${!finished && u === turnUid ? 'turn' : ''}">
      <span class="om-face">${faceHtml(players[u] || { name: '?' })}<i class="jg-mark ${side}">${side === 'c' ? '楚' : '漢'}</i></span>
      <b>${name(u)}</b><small>${side === 'c' ? '초 · 먼저' : '한'}</small></div>`;
    const top = flip ? state.cho : state.han, bottom = flip ? state.han : state.cho;

    let banner;
    if (finished || state.phase === 'done') {
      const w = room?.result?.winners?.[0];
      banner = w ? `<b>${name(w)}</b>님 승리! ${state.mate ? '외통 장군 🎉' : state.resign ? '(상대 기권)' : state.score ? `(점수 ${state.score.c} : ${state.score.h})` : ''}` : '무승부!';
    } else if (myTurn) banner = state.check ? '<b class="red">장군!</b> 궁을 지키세요' : ui.sel >= 0 ? `<b>${NAMES[b[ui.sel][1]]}</b> 선택 · 갈 곳을 누르세요` : '<b>내 차례!</b> 움직일 말을 누르세요';
    else banner = `<b>${name(turnUid)}</b>님 차례${state.check ? ' · <b class="red">장군!</b>' : ''}`;

    el.innerHTML = `
      <div class="om jg">
        ${seat(top, flip ? 'c' : 'h')}
        <div class="nb-banner"><span>${banner} <small class="jg-n">${state.n}수</small></span></div>
        <div class="jg-board">
          <svg class="jg-grid" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${L.join('')}</svg>
          <div class="jg-cells">${cells}</div>
        </div>
        ${seat(bottom, flip ? 'h' : 'c')}
        ${mySide && !finished && state.phase === 'play' ? `<div class="jg-acts">
          <button class="btn sm" data-pass ${!myTurn || state.check ? 'disabled' : ''}>⏸ 한수쉼</button>
          <button class="btn ghost sm" data-resign>🏳️ 기권</button></div>` : ''}
      </div>`;

    el.querySelectorAll('.jg-c').forEach((btn) => (btn.onclick = () => {
      if (!myTurn) return;
      const i = Number(btn.dataset.i);
      if (b[i] && b[i][0] === mySide) { ui.sel = ui.sel === i ? -1 : i; this.render(el, ctx); return; }
      if (ui.sel >= 0 && targets.includes(i)) { const from = ui.sel; ui.sel = -1; sendMove({ type: 'move', from, to: i }); }
    }));
    const $p = el.querySelector('[data-pass]');
    if ($p) $p.onclick = () => sendMove({ type: 'pass' });
    const $r = el.querySelector('[data-resign]');
    if ($r) $r.onclick = () => { if (confirm('정말 기권할까요?')) sendMove({ type: 'resign' }); };
  },
};
