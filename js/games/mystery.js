// 더 지니어스: 미스터리 사인 (2~4명)
// - 라운드마다 "X ◆ Y = ?" 문제가 나와요. ◆ 는 숨겨진 규칙.
// - 차례대로 숫자 두 개를 입력하면 그 숫자에 ◆를 적용한 결과가 모두에게 힌트로 공개돼요.
// - 언제든 정답을 낼 수 있어요. 정답 +1점, 오답 -1점 (오답이면 그 라운드는 더 못 맞힘)
// - 방장이 정한 라운드(5~10) 후 1등에게 가넷 3개
import { GARNET } from '../profile.js';
import { getRule, levelFor, pickRule, pickTarget } from './mystery-rules.js';

const HINT_MS = 20000;     // 힌트 차례 제한 시간
const MAX_HINTS = 10;      // 라운드당 최대 힌트 수
const FINAL_MS = 30000;    // 힌트를 다 쓴 뒤 마지막으로 맞힐 시간
const REVEAL_MS = 6000;    // 정답 공개 시간
const REWARDS = [3];       // 1등만 가넷 3개 (1점 이상일 때)

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SIGN = '<span class="ms-sign">◆</span>';

function newRound(state, roundNo, now) {
  const rule = pickRule(levelFor(roundNo, state.rounds), state.usedRules);
  const target = pickTarget();
  return {
    ...state,
    round: roundNo,
    phase: 'play',
    ruleId: rule.id,
    target,
    answer: rule.f(target[0], target[1]),
    hints: [],
    turnIdx: (roundNo - 1) % state.order.length,
    turnDeadline: now + HINT_MS,
    finalDeadline: 0,
    locked: {},
    wrong: [],
    winner: '',
    usedRules: [...state.usedRules, rule.id],
  };
}

function endRound(state, now, winner = '') {
  return { ...state, phase: 'reveal', winner, revealUntil: now + REVEAL_MS, turnIdx: -1 };
}

function nextTurn(state, now) {
  if (state.hints.length >= MAX_HINTS) return { ...state, turnIdx: -1, finalDeadline: now + FINAL_MS };
  return { ...state, turnIdx: (state.turnIdx + 1) % state.order.length, turnDeadline: now + HINT_MS };
}

export function rank(order, scores) {
  return order
    .map((uid) => ({ uid, score: scores[uid] || 0 }))
    .sort((a, b) => b.score - a.score)
    .map((r, _, all) => {
      const place = 1 + all.filter((o) => o.score > r.score).length;
      return { ...r, place, garnets: place === 1 && r.score > 0 ? REWARDS[0] : 0 };
    });
}

// 다시 그려도 입력하던 값과 커서가 유지되도록
const drafts = {};
let focusKey = '';

export default {
  id: 'mystery',
  name: '미스터리 사인',
  emoji: '◈',
  category: 'genius',
  minPlayers: 2,
  maxPlayers: 4,
  duration: '10~20분',
  rewards: REWARDS,
  description: '숨겨진 기호 ◆의 규칙을 먼저 알아내라!',
  options: [
    { key: 'rounds', label: '라운드 수', choices: [5, 6, 7, 8, 9, 10], default: 5 },
  ],
  rules: [
    '라운드마다 "X ◆ Y = ?" 문제가 나와요. ◆는 숨겨진 규칙이에요.',
    `차례가 되면 숫자 두 개(0~99)를 입력해요. 그 숫자에 ◆를 적용한 결과가 모두에게 힌트로 공개돼요. (차례당 ${HINT_MS / 1000}초)`,
    '정답은 자기 차례가 아니어도 언제든 낼 수 있어요.',
    '정답 +1점, 오답 −1점! 틀리면 그 라운드에서는 다시 맞힐 수 없어요.',
    `힌트가 ${MAX_HINTS}개 나온 뒤 ${FINAL_MS / 1000}초 안에 아무도 못 맞히면 라운드가 끝나요.`,
    '방장이 정한 라운드(5~10)가 끝나면 1등에게 가넷 3개! (1점 이상일 때)',
  ],

  setup(players, room) {
    const ids = players.map((p) => p.uid);
    const h = Math.max(0, ids.indexOf(room?.hostId));
    const order = [...ids.slice(h), ...ids.slice(0, h)];
    const rounds = Math.min(10, Math.max(5, Number(room?.options?.rounds) || 5));
    const base = { rounds, order, scores: Object.fromEntries(order.map((u) => [u, 0])), usedRules: [], revealUntil: 0 };
    return newRound(base, 1, Date.now());
  },

  move(state, move, uid, players) {
    const now = Date.now();
    const turnUid = state.turnIdx >= 0 ? state.order[state.turnIdx] : null;

    if (move?.type === 'hint') {
      if (state.phase !== 'play') throw new Error('지금은 힌트를 볼 수 없어요');
      if (turnUid !== uid) throw new Error('내 힌트 차례가 아니에요');
      const a = Number(move.a), b = Number(move.b);
      const ok = (n) => Number.isInteger(n) && n >= 0 && n <= 99;
      if (!ok(a) || !ok(b)) throw new Error('0~99 사이의 정수를 넣어 주세요');
      if (a === state.target[0] && b === state.target[1]) throw new Error('문제와 같은 숫자는 힌트로 쓸 수 없어요');
      const c = getRule(state.ruleId).f(a, b);
      const next = { ...state, hints: [...state.hints, { by: uid, a, b, c }] };
      return { state: nextTurn(next, now) };
    }

    if (move?.type === 'pass') {
      if (state.phase !== 'play' || turnUid !== uid) throw new Error('내 차례가 아니에요');
      return { state: { ...state, turnIdx: (state.turnIdx + 1) % state.order.length, turnDeadline: now + HINT_MS } };
    }

    if (move?.type === 'answer') {
      if (state.phase !== 'play') throw new Error('지금은 정답을 낼 수 없어요');
      if (state.locked[uid]) throw new Error('이번 라운드는 이미 틀려서 더 맞힐 수 없어요');
      const n = Number(move.n);
      if (!Number.isFinite(n) || String(move.n).trim() === '') throw new Error('숫자를 입력해 주세요');
      const scores = { ...state.scores };
      if (n === state.answer) {
        scores[uid] += 1;
        return { state: endRound({ ...state, scores }, now, uid) };
      }
      scores[uid] -= 1;
      const next = { ...state, scores, locked: { ...state.locked, [uid]: true }, wrong: [...state.wrong, { uid, n }] };
      const allLocked = next.order.every((u) => next.locked[u]);
      return { state: allLocked ? endRound(next, now) : next };
    }

    if (move?.type === 'tick') {
      if (state.phase === 'play') {
        if (state.turnIdx >= 0 && now >= state.turnDeadline) {
          return { state: { ...state, turnIdx: (state.turnIdx + 1) % state.order.length, turnDeadline: now + HINT_MS } };
        }
        if (state.turnIdx < 0 && state.finalDeadline && now >= state.finalDeadline) return { state: endRound(state, now) };
      }
      if (state.phase === 'reveal' && now >= state.revealUntil) {
        if (state.round >= state.rounds) {
          const ranking = rank(state.order, state.scores);
          const top = ranking.filter((r) => r.place === 1);
          return {
            state: { ...state, phase: 'done' },
            result: {
              message: top[0].score > 0 ? `${top.map((r) => players[r.uid]?.name || '?').join(', ')}님 1등! 🎉` : '아무도 점수를 얻지 못했어요',
              winners: top.map((r) => r.uid),
              ranking,
              rewards: Object.fromEntries(ranking.map((r) => [r.uid, r.garnets])),
            },
          };
        }
        return { state: newRound(state, state.round + 1, now) };
      }
      throw new Error('__noop');
    }

    throw new Error('알 수 없는 동작이에요');
  },

  render(el, { state, me, players, finished, sendMove, room }) {
    const name = (u) => esc(players[u]?.name || '나간 사람');
    const key = `${room?.code}:${state.round}`;
    const isPlayer = state.order.includes(me);
    const turnUid = state.turnIdx >= 0 ? state.order[state.turnIdx] : null;
    const myTurn = state.phase === 'play' && turnUid === me;
    const locked = !!state.locked?.[me];

    if (finished) {
      const ranking = room?.result?.ranking || rank(state.order, state.scores);
      el.innerHTML = `
        <div class="ms">
          <ol class="nb-final">
            ${ranking.map((r) => `<li class="${r.uid === me ? 'me' : ''}">
              <span class="nb-place">${r.place === 1 ? '🥇' : r.place + '등'}</span>
              <span class="nb-name">${name(r.uid)}</span>
              <span class="nb-score">${r.score}점</span>
              <span class="nb-reward">${r.garnets ? `${GARNET}+${r.garnets}` : ''}</span>
            </li>`).join('')}
          </ol>
        </div>`;
      return;
    }

    const rule = getRule(state.ruleId);
    const scoreChips = state.order.map((u) => `
      <span class="ms-chip ${u === me ? 'me' : ''} ${u === turnUid ? 'turn' : ''} ${state.locked?.[u] ? 'locked' : ''}">
        <b>${name(u)}</b><i>${state.scores[u]}</i>
      </span>`).join('');

    let status = '';
    if (state.phase === 'reveal') {
      status = state.winner
        ? `<b>${name(state.winner)}</b>님 정답! <span class="gold">+1점</span>`
        : '아무도 맞히지 못했어요';
    } else if (state.turnIdx < 0) {
      status = '힌트를 모두 썼어요! 마지막으로 정답을 맞혀 보세요';
    } else {
      status = myTurn ? '<b>내 힌트 차례!</b> 숫자 두 개를 넣어 보세요' : `<b>${name(turnUid)}</b>님이 힌트를 고르는 중…`;
    }

    el.innerHTML = `
      <div class="ms">
        <div class="nb-top">
          <span class="nb-round">ROUND <b>${state.round}</b> / ${state.rounds}</span>
          <span class="nb-timer" data-timer></span>
        </div>
        <div class="ms-chips">${scoreChips}</div>

        <div class="ms-problem">
          <span>${state.target[0]}</span>${SIGN}<span>${state.target[1]}</span><span class="ms-eq">=</span>
          <span class="ms-q ${state.phase === 'reveal' ? 'open' : ''}">${state.phase === 'reveal' ? state.answer : '?'}</span>
        </div>
        ${state.phase === 'reveal' ? `<div class="ms-rule">◆ = ${esc(rule?.desc || '')}</div>` : ''}

        <div class="nb-bar"><i data-bar></i></div>
        <div class="nb-banner"><span>${status}</span></div>

        ${isPlayer && state.phase === 'play' ? `
          <div class="ms-actions">
            ${myTurn ? `
              <form class="ms-hint" data-form="hint">
                <input data-key="ha" inputmode="numeric" maxlength="2" placeholder="0~99" aria-label="첫 번째 숫자">
                ${SIGN}
                <input data-key="hb" inputmode="numeric" maxlength="2" placeholder="0~99" aria-label="두 번째 숫자">
                <button class="btn primary sm">힌트 보기</button>
                <button type="button" class="btn ghost sm" data-pass>패스</button>
              </form>` : ''}
            <form class="ms-answer" data-form="answer">
              <input data-key="ans" inputmode="numeric" placeholder="${locked ? '이번 라운드는 오답 처리됐어요' : '정답 숫자'}" ${locked ? 'disabled' : ''} aria-label="정답">
              <button class="btn ${locked ? 'ghost' : 'gold-btn'}" ${locked ? 'disabled' : ''}>정답!</button>
            </form>
          </div>` : ''}

        <div class="ms-hints-title">힌트 ${state.hints.length}/${MAX_HINTS}${state.wrong.length ? ` · <span class="nb-dupe">오답: ${state.wrong.map((w) => `${name(w.uid)} ${esc(w.n)}`).join(', ')}</span>` : ''}</div>
        <ul class="ms-hints">
          ${state.hints.length ? state.hints.slice().reverse().map((h) => `
            <li><span class="ms-eqn">${h.a} ${SIGN} ${h.b} = <b>${h.c}</b></span><small>${name(h.by)}</small></li>`).join('')
            : '<li class="empty">아직 힌트가 없어요</li>'}
        </ul>
      </div>`;

    // 입력값·커서 유지
    el.querySelectorAll('[data-key]').forEach((inp) => {
      const k = `${key}:${inp.dataset.key}`;
      if (drafts[k] !== undefined) inp.value = drafts[k];
      inp.oninput = () => { inp.value = inp.value.replace(/[^0-9-]/g, ''); drafts[k] = inp.value; };
      inp.onfocus = () => { focusKey = k; };
      // 화면이 다시 그려져서 사라진 경우가 아니라, 직접 다른 곳을 눌렀을 때만 포커스 기억을 지워요
      inp.onblur = () => setTimeout(() => { if (inp.isConnected && focusKey === k) focusKey = ''; }, 0);
      if (focusKey === k && !inp.disabled) inp.focus();
    });

    const $hint = el.querySelector('[data-form="hint"]');
    if ($hint) {
      $hint.onsubmit = (e) => {
        e.preventDefault();
        const a = $hint.querySelector('[data-key="ha"]').value.trim();
        const b = $hint.querySelector('[data-key="hb"]').value.trim();
        if (a === '' || b === '') return;
        delete drafts[`${key}:ha`]; delete drafts[`${key}:hb`];
        sendMove({ type: 'hint', a: Number(a), b: Number(b) });
      };
      el.querySelector('[data-pass]').onclick = () => sendMove({ type: 'pass' });
    }
    const $ans = el.querySelector('[data-form="answer"]');
    if ($ans) {
      $ans.onsubmit = (e) => {
        e.preventDefault();
        const v = $ans.querySelector('[data-key="ans"]').value.trim();
        if (v === '') return;
        delete drafts[`${key}:ans`];
        sendMove({ type: 'answer', n: Number(v) });
      };
    }

    // 타이머 + 진행 신호
    const $t = el.querySelector('[data-timer]');
    const $bar = el.querySelector('[data-bar]');
    const myIndex = Math.max(0, state.order.indexOf(me));
    let lastTick = 0;
    const update = () => {
      if (!el.isConnected) return clearInterval(timer);
      const now = Date.now();
      let due = 0, total = 1;
      if (state.phase === 'play') {
        if (state.turnIdx >= 0) { due = state.turnDeadline; total = HINT_MS; } else { due = state.finalDeadline; total = FINAL_MS; }
        const left = Math.max(0, due - now);
        $t.textContent = Math.ceil(left / 1000);
        $t.classList.toggle('hurry', left <= 5000);
        $bar.style.width = `${(left / total) * 100}%`;
      } else {
        due = state.revealUntil;
        $t.textContent = '공개';
        $t.classList.remove('hurry');
        $bar.style.width = '0%';
      }
      if (due && now >= due && now - lastTick > 2000 && now - due > 300 + myIndex * 350) {
        lastTick = now;
        sendMove({ type: 'tick' }, { silent: true });
      }
    };
    const timer = setInterval(update, 250);
    update();
  },
};
