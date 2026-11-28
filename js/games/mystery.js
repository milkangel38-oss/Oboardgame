// 더 지니어스: 미스터리 사인 (2~4명)
// - 라운드마다 "X ◆ Y = ?" 문제가 나와요. ◆ 는 숨겨진 규칙.
// - 차례대로 숫자 두 개를 입력하면 그 숫자에 ◆를 적용한 결과가 모두에게 힌트로 공개돼요.
// - 언제든 정답을 낼 수 있어요. 정답 +1점, 오답 -1점 (틀려도 계속 도전 가능)
// - 난이도(보통·어려움·너무 어려움)는 라운드마다 무작위
// - 방장이 정한 라운드(5~10) 후 1등 인장 3개, 2등 1개
import { soundEvent } from '../sound.js';
import { personHtml } from './face.js';
import { chatFormHtml, bindChat } from './sit.js';
import { GARNET } from '../profile.js';
import { getRule, pickRule, pickTarget, apply, LEVELS } from './mystery-rules.js';

const HINT_MS = 20000;     // 힌트 차례 제한 시간
const MAX_HINTS = 10;      // 라운드당 최대 힌트 수
const FINAL_MS = 30000;    // 힌트를 다 쓴 뒤 마지막으로 맞힐 시간
const REVEAL_MS = 6000;    // 정답 공개 시간
const REWARDS = [3, 1];    // 1등 인장 3개, 2등 1개 (1점 이상일 때)
const MAX_DIGITS = 9;
const BUZZ_MS = 5000;      // 버저를 누른 뒤 정답을 쓸 시간
const LOCK_MS = 10000;     // 시간 안에 못 쓰면 10초 동안 버저 금지
const COLORS = ['#ff4f6e', '#3d7bff', '#3ddc84', '#ffb02e'];      // 힌트 숫자: 0 ~ 999,999,999 (1억대까지)

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SIGN = '<span class="ms-sign">◆</span>';

function newRound(state, roundNo, now) {
  const rule = pickRule(state.usedRules);
  const target = pickTarget();
  return {
    ...state,
    round: roundNo,
    phase: 'play',
    ruleId: rule.id,
    target,
    answer: apply(rule, target[0], target[1]),
    hints: [],
    turnIdx: (roundNo - 1) % state.order.length,
    turnDeadline: now + HINT_MS,
    finalDeadline: 0,
    wrong: [],
    winner: '',
    buzz: null,
    locks: {},
    usedRules: [...state.usedRules, rule.id],
  };
}

function endRound(state, now, winner = '') {
  return { ...state, buzz: null, phase: 'reveal', winner, revealUntil: now + REVEAL_MS, turnIdx: -1 };
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
      return { ...r, place, garnets: r.score > 0 ? REWARDS[place - 1] || 0 : 0 };
    });
}

// 버저 정답 창
let pop = null;
function buzzPop(buzz, sendMove) {
  if (typeof document === 'undefined') return;
  if (!buzz) { if (pop) { pop.el.remove(); clearInterval(pop.iv); pop = null; } return; }
  if (pop && pop.at === buzz.at) return;
  pop?.el.remove(); clearInterval(pop?.iv);
  const $p = document.createElement('div');
  $p.className = 'ms-pop';
  $p.innerHTML = `<form class="ms-popbox"><div class="ms-poph">🚨 정답을 입력하세요!</div>
    <div class="ms-popt"><b data-pt>5</b><div class="nb-bar"><i data-pb></i></div></div>
    <input inputmode="numeric" placeholder="정답 숫자" autocomplete="off" enterkeyhint="send">
    <button class="btn gold-btn block">정답!</button></form>`;
  document.body.appendChild($p);
  pop = { at: buzz.at, el: $p, iv: 0 };
  const $in = $p.querySelector('input');
  setTimeout(() => $in.focus({ preventScroll: true }), 30);
  $in.oninput = () => { $in.value = $in.value.replace(/[^0-9-]/g, ''); };
  let done = false;
  $p.querySelector('form').onsubmit = (e) => { e.preventDefault(); const v = $in.value.trim(); if (!v || done) return; done = true; sendMove({ type: 'answer', n: v }); };
  const $t = $p.querySelector('[data-pt]'), $b = $p.querySelector('[data-pb]');
  pop.iv = setInterval(() => {
    const left = Math.max(0, buzz.until - Date.now());
    $t.textContent = Math.ceil(left / 1000); $b.style.width = `${(left / BUZZ_MS) * 100}%`;
    if (left <= 0 && !done) { done = true; clearInterval(pop?.iv); $p.remove(); pop = null; sendMove({ type: 'buzzout' }, { silent: true }); }
  }, 100);
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
    `차례가 되면 숫자 두 개(0 ~ 999,999,999)를 입력해요. 그 숫자에 ◆를 적용한 결과가 모두에게 힌트로 공개돼요. (차례당 ${HINT_MS / 1000}초)`,
    '정답은 자기 차례가 아니어도 언제든 낼 수 있어요. 내 단상의 버저를 누르면 5초 동안 정답을 쓸 수 있어요. (한 번에 한 명만)',
    '5초 안에 정답을 내지 못하면 10초 동안 버저를 누를 수 없어요.',
    '정답 +1점, 오답 −1점! 틀려도 그 라운드에서 다시 도전할 수 있어요.',
    '문제 난이도(보통 · 어려움 · 너무 어려움)는 라운드마다 무작위로 나와요.',
    `힌트가 ${MAX_HINTS}개 나온 뒤 ${FINAL_MS / 1000}초 안에 아무도 못 맞히면 라운드가 끝나요.`,
    '방장이 정한 라운드(5~10)가 끝나면 1등 인장 3개, 2등 인장 1개! (1점 이상일 때)',
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
      const re = new RegExp(`^\\d{1,${MAX_DIGITS}}$`);
      if (!re.test(String(move.a)) || !re.test(String(move.b))) throw new Error('0 ~ 999,999,999 사이의 정수를 넣어 주세요');
      const a = BigInt(move.a).toString(), b = BigInt(move.b).toString();
      if (a === String(state.target[0]) && b === String(state.target[1])) throw new Error('문제와 같은 숫자는 힌트로 쓸 수 없어요');
      const c = apply(getRule(state.ruleId), a, b);
      const next = { ...state, hints: [...state.hints, { by: uid, a, b, c }] };
      return { state: nextTurn(next, now) };
    }

    const buzzLive = state.buzz && now < state.buzz.until + 800;
    if (move?.type === 'buzz') {
      if (state.phase !== 'play' || !state.order.includes(uid)) throw new Error('지금은 버저를 누를 수 없어요');
      if (buzzLive) throw new Error(state.buzz.uid === uid ? '__noop' : '다른 사람이 먼저 눌렀어요!');
      if ((state.locks?.[uid] || 0) > now) throw new Error(`${Math.ceil((state.locks[uid] - now) / 1000)}초 뒤에 다시 누를 수 있어요`);
      return { state: { ...state, buzz: { uid, at: now, until: now + BUZZ_MS } } };
    }
    if (move?.type === 'buzzout') {
      // 시간 초과: 창을 닫고 10초 동안 버저 금지
      if (!state.buzz || (state.buzz.uid !== uid && now < state.buzz.until + 1500)) throw new Error('__noop');
      if (state.buzz.uid === uid && now < state.buzz.until - 300) throw new Error('__noop');
      return { state: { ...state, buzz: null, locks: { ...state.locks, [state.buzz.uid]: now + LOCK_MS } } };
    }

    if (move?.type === 'answer') {
      if (state.phase !== 'play') throw new Error('지금은 정답을 낼 수 없어요');
      if (!buzzLive || state.buzz.uid !== uid) throw new Error('버저를 먼저 눌러 주세요');
      const raw = String(move.n ?? '').trim();
      if (!/^-?\d{1,30}$/.test(raw)) throw new Error('숫자를 입력해 주세요');
      const n = BigInt(raw).toString();
      const scores = { ...state.scores };
      if (n === state.answer) {
        scores[uid] += 1;
        return { state: endRound({ ...state, scores }, now, uid) };
      }
      scores[uid] -= 1; // 틀려도 라운드는 잠기지 않아요
      return { state: { ...state, buzz: null, scores, wrong: [...state.wrong, { uid, n, t: Date.now() }].slice(-6) } };
    }

    if (move?.type === 'tick') {
      if (state.phase === 'play') {
        if (state.buzz && now >= state.buzz.until + 1500) return { state: { ...state, buzz: null, locks: { ...state.locks, [state.buzz.uid]: now + LOCK_MS } } };
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
    if (!finished && room) {
      if (state.phase === 'reveal' && state.winner) soundEvent(room.code, `ms:${state.round}:win`, 'ok'); // 띵동 (모두)
      const lw = state.wrong[state.wrong.length - 1];
      if (lw?.uid === me && lw.t) soundEvent(room.code, `ms:w:${lw.t}`, 'no'); // 삐 (틀린 사람)
    }
    const isPlayer = state.order.includes(me);
    const turnUid = state.turnIdx >= 0 ? state.order[state.turnIdx] : null;
    const myTurn = state.phase === 'play' && turnUid === me;

    if (finished) {
      const ranking = room?.result?.ranking || rank(state.order, state.scores);
      el.innerHTML = `
        <div class="ms">
          <ol class="nb-final">
            ${ranking.map((r) => `<li class="${r.uid === me ? 'me' : ''}">
              <span class="nb-place">${r.place <= 3 ? ['🥇', '🥈', '🥉'][r.place - 1] : r.place + '등'}</span>
              <span class="nb-name">${name(r.uid)}</span>
              <span class="nb-score">${r.score}점</span>
              <span class="nb-reward">${r.garnets ? `${GARNET}+${r.garnets}` : ''}</span>
            </li>`).join('')}
          </ol>
        </div>`;
      return;
    }

    const rule = getRule(state.ruleId);
    const now0 = Date.now();
    const buzz = state.buzz && now0 < state.buzz.until + 800 ? state.buzz : null;
    if (room && buzz) soundEvent(room.code, `ms:bz:${buzz.at}`, 'buzzer');

    let status = '';
    if (state.phase === 'reveal') status = state.winner ? `<b>${name(state.winner)}</b>님 정답! <span class="gold">+1점</span>` : '아무도 맞히지 못했어요';
    else if (buzz) status = `🚨 <b>${name(buzz.uid)}</b>님이 버저를 눌렀어요!`;
    else if (state.turnIdx < 0) status = '힌트를 모두 썼어요! 버저를 눌러 정답을 맞혀 보세요';
    else status = myTurn ? '<b>내 힌트 차례!</b> 아래에 숫자 두 개를 넣어 보세요' : `<b>${name(turnUid)}</b>님이 힌트를 제출하고 있습니다`;

    const lastWrong = state.wrong[state.wrong.length - 1];
    const podium = (u, i) => {
      const lock = Math.max(0, (state.locks?.[u] || 0) - now0);
      const mine = u === me && isPlayer && state.phase === 'play';
      const can = mine && !buzz && !lock;
      const wrongNow = lastWrong && lastWrong.uid === u && now0 - lastWrong.t < 2500;
      return `<div class="ms-p ${u === me ? 'me' : ''} ${u === turnUid ? 'turn' : ''} ${buzz?.uid === u ? 'buzzing' : ''} ${state.winner === u && state.phase === 'reveal' ? 'win' : ''}">
        <span class="seat-bubble" data-bub="${esc(u)}"></span>
        <div class="ms-person">${personHtml(COLORS[i % COLORS.length], players[u] || { name: '?' })}</div>
        <div class="ms-podium"><img src="/img/mystery/podium.webp" alt="" draggable="false"><span class="ms-pscore"><b>${state.scores[u]}</b><small>점</small></span>${wrongNow ? '<em class="ms-x">✖ 오답</em>' : ''}</div>
        <button class="ms-buzzer ${can ? 'can' : ''} ${buzz?.uid === u ? 'on' : ''} ${lock ? 'lock' : ''}" ${mine ? 'data-buzz' : 'disabled tabindex="-1"'} aria-label="버저">
          <img src="/img/mystery/buzzer-${buzz?.uid === u ? 'on' : 'off'}.webp" alt="" draggable="false">${lock && mine ? `<small data-lock="${state.locks[u]}">${Math.ceil(lock / 1000)}</small>` : can ? '<small>PUSH</small>' : ''}
        </button>
        <span class="ms-nm">${name(u)}${u === turnUid ? ' <em>✍</em>' : ''}</span>
      </div>`;
    };

    el.innerHTML = `
      <div class="ms ms2">
        <div class="nb-top">
          <span class="nb-round">ROUND <b>${state.round}</b> / ${state.rounds}</span>
          <span class="nb-timer" data-timer></span>
        </div>
        <div class="ms-set">
          <div class="ms-top">
            <div class="ms-screen"><img class="ms-sframe" src="/img/mystery/screen.webp" alt="" draggable="false"><div class="ms-sin">
              <div class="ms-problem">
                <span>${state.target[0]}</span>${SIGN}<span>${state.target[1]}</span><span class="ms-eq">=</span>
                <span class="ms-q ${state.phase === 'reveal' ? 'open' : ''}">${state.phase === 'reveal' ? state.answer : '?'}</span>
              </div>
              ${state.phase === 'reveal' ? `<div class="ms-rule"><span class="ms-level lv${rule?.level}">${LEVELS[rule?.level] || ''}</span> ◆ = ${esc(rule?.desc || '')}</div>` : ''}
              <div class="nb-bar"><i data-bar></i></div>
            </div></div>
            <div class="ms-hintbox">
              <div class="ms-hints-title">힌트 리스트 <b>${state.hints.length}</b>/${MAX_HINTS}</div>
              <ul class="ms-hints">
                ${state.hints.length ? state.hints.slice().reverse().map((h) => `
                  <li><span class="ms-eqn">${h.a} ${SIGN} ${h.b} = <b>${h.c}</b></span><small>${name(h.by)}</small></li>`).join('')
                  : '<li class="empty">아직 힌트가 없어요</li>'}
              </ul>
            </div>
          </div>
          <div class="ms-status">${status}</div>
          <div class="ms-stage n${state.order.length}">${state.order.map(podium).join('')}</div>
        </div>

        ${isPlayer && state.phase === 'play' ? `
          <form class="ms-hint ${myTurn ? '' : 'off'}" data-form="hint">
            <div class="ms-hint-row">
              <input data-key="ha" inputmode="numeric" maxlength="${MAX_DIGITS}" placeholder="첫 번째 수" aria-label="첫 번째 숫자" ${myTurn ? '' : 'disabled'}>
              ${SIGN}
              <input data-key="hb" inputmode="numeric" maxlength="${MAX_DIGITS}" placeholder="두 번째 수" aria-label="두 번째 숫자" ${myTurn ? '' : 'disabled'}>
              <button class="btn primary" ${myTurn ? '' : 'disabled'}>힌트 제출</button>
            </div>
            ${myTurn ? '' : `<small>${turnUid ? `${name(turnUid)}님의 힌트 차례예요` : '힌트를 모두 썼어요'}</small>`}
          </form>` : ''}
        ${state.wrong.length ? `<div class="ms-wrongs">오답: ${state.wrong.map((w) => `${name(w.uid)} ${esc(w.n)}`).join(' · ')}</div>` : ''}
        ${isPlayer ? chatFormHtml() : ''}
      </div>`;
    bindChat(el);

    // 입력값·커서 유지
    el.querySelectorAll('[data-key]').forEach((inp) => {
      const k = `${key}:${inp.dataset.key}`;
      if (drafts[k] !== undefined) inp.value = drafts[k];
      inp.oninput = () => { inp.value = inp.value.replace(/[^0-9-]/g, ''); drafts[k] = inp.value; };
      inp.onfocus = () => { focusKey = k; };
      inp.onblur = () => setTimeout(() => { if (inp.isConnected && focusKey === k) focusKey = ''; }, 0);
      if (focusKey === k && !inp.disabled) inp.focus();
    });
    const $hint = el.querySelector('[data-form="hint"]');
    if ($hint) {
      $hint.onsubmit = (e) => {
        e.preventDefault();
        const a = $hint.querySelector('[data-key="ha"]').value.trim();
        const b = $hint.querySelector('[data-key="hb"]').value.trim();
        if (!myTurn || a === '' || b === '') return;
        delete drafts[`${key}:ha`]; delete drafts[`${key}:hb`];
        sendMove({ type: 'hint', a, b });
      };
    }
    const $bz = el.querySelector('[data-buzz]');
    if ($bz) $bz.onclick = () => { if ($bz.classList.contains('can')) sendMove({ type: 'buzz' }); };
    // 잠금 숫자 줄이기
    const $lk = el.querySelector('[data-lock]');
    if ($lk) { const iv = setInterval(() => { if (!$lk.isConnected) return clearInterval(iv); const l = Number($lk.dataset.lock) - Date.now(); if (l <= 0) { clearInterval(iv); this.render(el, arguments[1]); } else $lk.textContent = Math.ceil(l / 1000); }, 250); }

    // 정답 창 (버저 누른 사람에게만, 5초)
    buzzPop(buzz && buzz.uid === me && state.phase === 'play' ? buzz : null, sendMove);

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
