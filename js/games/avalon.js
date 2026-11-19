// 보드게임: 아발론 (5~10명, 정의 vs 악 팀 게임)
// 원정 5번 중 3번 성공하면 정의 팀이 이기지만, 마지막에 암살자가 멀린을 맞히면 악 팀이 역전!
// 대표가 원정대를 고르고 → 모두 찬반 투표(공개) → 원정대만 몰래 성공/실패 → 실패 카드가 있으면 원정 실패.
import { GARNET } from '../profile.js';
import { soundEvent } from '../sound.js';
import { turnAlert, bigFlash } from './turn-alert.js';
import { faceHtml } from './face.js';

import { SIZES, failsNeeded, ROLES, ROLE_SETS, WIN_GARNETS, knowledge } from './avalon-core.js';
export { SIZES, EVIL_COUNT, failsNeeded, ROLES, ROLE_SETS, dealRoles, knowledge } from './avalon-core.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const COLORS = ['#ff4f6e', '#3d7bff', '#3ddc84', '#ffb02e', '#b26bff', '#2ee6d6', '#ff8ad8', '#e8cf8a', '#ff8a3d', '#9ad04a'];

export default {
  id: 'avalon',
  name: '아발론',
  emoji: '🏰',
  category: 'board',
  minPlayers: 5,
  maxPlayers: 10,
  duration: '30~45분',
  teamGame: true,
  rewards: [WIN_GARNETS],
  rewardLabel: `이긴 팀 ${GARNET}+${WIN_GARNETS}`,
  description: '정의냐 악이냐! 원정대를 꾸리고, 숨은 배신자를 찾아라',
  options: [{ key: 'roles', label: '특수 역할', choices: ROLE_SETS, default: ROLE_SETS[1] }],
  rules: [
    '모두에게 비밀 역할이 주어져요. 정의 팀(멀린·퍼시벌·충신)과 악 팀(암살자·모르가나·모드레드·오베론·하수인)으로 나뉘어요. (5명 2명 · 6명 2명 · 7~9명 3명 · 10명 4명이 악 팀)',
    '멀린은 악 팀을 알고, 악 팀은 서로를 알아요(오베론 빼고). 퍼시벌은 멀린과 모르가나를 알지만 누가 누군지 몰라요.',
    '원정은 5번. 매번 대표가 정해진 인원만큼 원정대를 골라요. 그러면 모두 원정대를 찬성/반대 투표하고, 투표는 한꺼번에 공개돼요.',
    '찬성이 과반이면 원정 출발! 아니면 다음 사람이 대표가 돼요. 한 원정에서 5번 연속 부결되면 악 팀이 바로 이겨요.',
    '원정대는 몰래 성공/실패 카드를 내요. 정의 팀은 성공만 낼 수 있어요. 실패가 1장이라도 있으면 원정 실패! (7명 이상일 때 4번째 원정은 실패 2장이 있어야 실패)',
    '원정 3번이 실패하면 악 팀 승리. 원정 3번이 성공하면 마지막으로 암살자가 멀린을 지목해요. 맞히면 악 팀 역전승, 틀리면 정의 팀 승리!',
    '원탁 아래 채팅창에 쓰면 내 프로필 위에 말풍선으로 떠요.',
    `이긴 팀 모두 가넷 +${WIN_GARNETS}`,
  ],

  // 역할·투표·원정 카드는 서버가 맡아요 (방 문서에는 공개 정보만). 시작하면 방장 화면이 서버에 '역할 나눠 주기'를 요청해요.
  serverMoves: true,
  setup(players) {
    return { phase: 'deal', order: players.map((p) => p.uid), turnNo: 0 };
  },
  move() { throw new Error('아발론은 서버가 진행해요'); },

  render(el, { state, me, players, finished, sendMove, room, secret }) {
    const n = state.order.length;
    if (state.phase === 'deal') {
      // 방장이 서버에 역할 나눠 주기를 요청 (한 번만)
      ui.show = false; // 새 판: 역할 카드 닫기
      // 방장이 바로 요청하고, 그대로면 다른 사람도 5초·15초·30초 뒤에 다시 요청해요 (서버는 한 번만 나눠 줘요)
      const k = `${room?.code}:${room?.matchId}`;
      if (room && ui.deal.k !== k) { clearTimeout(ui.deal.timer); ui.deal = { k, first: Date.now(), tries: 0, timer: 0 }; }
      const d = ui.deal;
      const waits = room?.hostId === me ? [0, 5000, 15000, 30000] : [5000, 15000, 30000];
      const tryDeal = () => {
        d.timer = 0;
        if (ui.deal !== d || d.tries >= waits.length) return;
        d.tries += 1;
        const last = d.tries >= waits.length;
        sendMove({ type: 'deal' }, { silent: !last }); // 마지막 시도가 실패하면 오류를 보여 줘요
        if (!last) d.timer = setTimeout(tryDeal, Math.max(0, d.first + waits[d.tries] - Date.now()));
      };
      if (room && !d.timer && d.tries < waits.length) d.timer = setTimeout(tryDeal, Math.max(0, d.first + waits[d.tries] - Date.now()));
      el.innerHTML = '<div class="av"><div class="av-msg">🃏 역할을 나눠 주는 중…</div></div>';
      return;
    }
    if (ui.deal.timer) { clearTimeout(ui.deal.timer); ui.deal.timer = 0; ui.deal.tries = 99; } // 역할을 받았으면 재시도 멈춤
    const roles = state.roles || {}; // 게임이 끝나야 모두 공개돼요
    const votedMap = state.voted || {}, playedMap = state.played || {};
    const name = (u) => esc(players[u]?.name || '나간 사람');
    const isPlayer = state.order.includes(me);
    const myRole = secret?.role || roles[me];
    const R = myRole ? ROLES[myRole] : null;
    const know = isPlayer ? (secret?.know || (state.roles ? knowledge(state.roles, me) : { label: '', who: [] })) : { who: [] };
    const over = finished || state.phase === 'done';
    const color = (u) => COLORS[state.order.indexOf(u) % COLORS.length];

    // 내가 할 일이 있을 때 알림
    const myAction = !over && ((state.phase === 'propose' && state.leader === me) || (state.phase === 'vote' && !votedMap[me]) || (state.phase === 'quest' && state.team.includes(me) && !playedMap[me]) || (state.phase === 'assassin' && myRole === 'assassin'));
    if (room) turnAlert(room.code, `av:${state.turnNo}`, myAction);
    if (room && state.lastQuest && ui.questSeen !== `${room.code}:${state.lastQuest.at}`) {
      const first = ui.questSeen === undefined;
      ui.questSeen = `${room.code}:${state.lastQuest.at}`;
      if (!first && Date.now() - state.lastQuest.at < 6000) {
        bigFlash(`${state.lastQuest.ok ? '⚔️ 원정 성공!' : '💥 원정 실패!'}<small>${state.lastQuest.quest + 1}번째 원정 · 실패 카드 ${state.lastQuest.fails}장</small>`, 2800, state.lastQuest.ok ? 'sx-note av-ok' : 'sx-note av-no');
        soundEvent(room.code, `av:q:${state.lastQuest.at}`, state.lastQuest.ok === (R?.team === 'good') ? 'ok' : 'no');
      }
    }
    if (room && state.lastVote && ui.voteSeen !== `${room.code}:${state.lastVote.at}`) {
      const first = ui.voteSeen === undefined;
      ui.voteSeen = `${room.code}:${state.lastVote.at}`;
      if (!first && Date.now() - state.lastVote.at < 6000 && !state.lastVote.pass) bigFlash(`🙅 원정대 부결<small>연속 부결 ${state.rejects}/5 · 다음 대표: ${name(state.leader)}님</small>`, 2400, 'sx-note');
    }

    if (ui.key !== `${room?.code}:${state.turnNo}`) { ui.key = `${room?.code}:${state.turnNo}`; ui.team = []; }
    // 원정 기록판
    const track = SIZES[n].map((sz, i) => {
      const r = state.results[i];
      return `<div class="av-q ${r === true ? 'ok' : r === false ? 'no' : ''} ${i === state.quest && !over && r === undefined ? 'now' : ''}">
        ${r === undefined ? `<b>${sz}<small>명</small></b>` : `<b class="word">${r ? '성공' : '실패'}</b>`}
        <small>${i + 1}번째${failsNeeded(n, i) > 1 && r === undefined ? ' · 실패2장' : ''}</small></div>`;
    }).join('');
    const rejectTrack = Array.from({ length: 5 }, (_, i) => `<i class="${i < state.rejects ? 'on' : ''} ${i === 4 ? 'last' : ''}">${i + 1}</i>`).join('');

    // 원탁 채팅 말풍선: 각자 기기에서 받은 시각부터 6초
    const now0 = Date.now();
    const bubbles = {};
    (state.chat || []).forEach((m) => {
      const k = `${m.u}:${m.at}`;
      if (!ui.chatSeen[k]) ui.chatSeen[k] = ui.chatStarted ? now0 : 1;
      if (now0 - ui.chatSeen[k] < 6000) bubbles[m.u] = { text: m.text, k, left: 6000 - (now0 - ui.chatSeen[k]) };
    });
    ui.chatStarted = true;
    // 원탁 자리
    const sel = ui.team;
    const seats = state.order.map((u, i) => {
      const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = 50 + Math.cos(ang) * 37, y = 50 + Math.sin(ang) * 38;
      const pickable = !over && state.phase === 'propose' && state.leader === me;
      const target = !over && state.phase === 'assassin' && myRole === 'assassin' && u !== me;
      const onTeam = state.phase === 'propose' ? sel.includes(u) : state.team.includes(u);
      const known = ui.show && know.who.includes(u); // 역할 카드를 열었을 때만 표시 (옆 사람이 못 보게)
      const voted = state.phase === 'vote' && !!votedMap[u];
      const showVote = state.lastVote && ['propose', 'quest'].includes(state.phase) && state.lastVote.quest === state.quest ? state.lastVote.votes[u] : undefined;
      const reveal = over && roles[u] ? ROLES[roles[u]] : null;
      return `<${pickable || target ? 'button' : 'div'} class="av-seat ${u === me ? 'me' : ''} ${onTeam ? 'team' : ''} ${known ? 'known' : ''} ${reveal ? reveal.team : ''} ${target ? 'target' : ''} ${state.target === u ? 'shot' : ''}" style="left:${x}%;top:${y}%;--pc:${color(u)}" ${pickable ? `data-pick="${u}"` : ''} ${target ? `data-kill="${u}"` : ''}>
        <span class="av-face">${faceHtml(players[u] || { name: '?' })}</span>
        ${state.leader === u && !over ? '<em class="av-crown">👑</em>' : ''}
        ${onTeam && !over ? (state.phase === 'propose' ? '<em class="av-check">✔</em>' : '<em class="av-shield">🛡️</em>') : ''}
        ${bubbles[u] ? `<span class="av-bub" data-bub="${bubbles[u].k}">${esc(bubbles[u].text)}</span>` : ''}
        ${voted ? '<em class="av-voted">✔</em>' : ''}
        ${showVote !== undefined ? `<em class="av-vote ${showVote ? 'y' : 'n'}">${showVote ? '찬성' : '반대'}</em>` : ''}
        <b>${name(u)}</b>
        ${known && !over ? `<small class="av-know">${know.label}</small>` : ''}
        ${reveal ? `<small class="av-role">${reveal.icon} ${reveal.name}</small>` : ''}
      </${pickable || target ? 'button' : 'div'}>`;
    }).join('');

    // 상태 안내 + 내 행동
    let action = '';
    const need = SIZES[n][state.quest];
    const majority = Math.floor(n / 2) + 1;
    if (over) {
      const how = { rejects: '원정대가 5번 연속 부결됐어요', quests: state.winner === 'good' ? (state.target ? `암살자가 ${name(state.target)}님을 지목했지만 멀린이 아니었어요!` : '원정 3번 성공!') : '원정이 3번 실패했어요', assassin: `암살자가 멀린(${name(state.target)}님)을 찾아냈어요!` }[state.how];
      action = `<div class="av-end ${state.winner}"><b>${state.winner === 'good' ? '⚔️ 정의 팀 승리!' : '🗡️ 악 팀 승리!'}</b><small>${how}</small>
        <span>${R ? (R.team === state.winner ? `🎉 우리 팀이 이겼어요! ${GARNET}+${WIN_GARNETS}` : '😢 우리 팀이 졌어요') : ''}</span></div>`;
    } else if (state.phase === 'role') {
      const waiting = state.order.filter((u) => !state.seen[u]).length;
      action = `<div class="av-msg">🤫 내 역할을 몰래 확인하고 <b>확인</b>을 눌러 주세요 ${waiting ? `(남은 사람 ${waiting}명)` : ''}</div>
        ${isPlayer && !state.seen[me] ? '<button class="av-go" data-seen>역할 확인했어요 →</button>' : ''}`;
    } else if (state.phase === 'propose') {
      action = state.leader === me
        ? `<div class="av-msg">👑 내가 대표! 원탁에서 <b>${need}명</b>을 눌러 원정대를 꾸려요 (나도 포함 가능) · <b>${sel.length}/${need}</b></div>
           <div class="av-rule">📜 원정대를 정하면 모두가 찬반 투표를 해요. <b>찬성이 ${majority}명 이상(과반)</b>이면 원정을 떠나요.</div>
           <button class="av-go" data-propose ${sel.length === need ? '' : 'disabled'}>이 원정대로 투표하기 →</button>`
        : `<div class="av-msg">👑 ${name(state.leader)}님이 ${state.quest + 1}번째 원정대 ${need}명을 고르는 중… 원탁 채팅으로 의견을 말해 보세요</div>
           <div class="av-rule">📜 원정대가 정해지면 모두 찬반 투표를 해요. <b>찬성이 ${majority}명 이상(과반)</b>이면 출발, 아니면 다음 사람이 대표가 돼요.</div>`;
    } else if (state.phase === 'vote') {
      const left = state.order.filter((u) => !votedMap[u]).length;
      action = `<div class="av-msg">🗳️ ${name(state.leader)}님의 원정대: <b>${state.team.map(name).join(', ')}</b> · 찬성하나요? (남은 투표 ${left}명 · 모두 투표하면 한꺼번에 공개)</div>
        <div class="av-rule">📜 <b>찬성 ${majority}명 이상(${n}명 중 과반)</b> → 원정 출발! · 찬성이 ${majority - 1}명 이하 → <b>부결</b>, 다음 사람이 대표가 돼요.<br>⚠️ 지금 연속 부결 ${state.rejects}번 · <b>5번 연속 부결되면 악 팀이 바로 이겨요</b></div>
        ${isPlayer ? (votedMap[me] ? `<div class="av-done">투표했어요${secret?.vote === true ? ' (찬성)' : secret?.vote === false ? ' (반대)' : ''} · 다른 사람 기다리는 중…</div>`
          : '<div class="av-two"><button class="av-yes" data-vote="1">👍 찬성</button><button class="av-no" data-vote="0">👎 반대</button></div>') : ''}`;
    } else if (state.phase === 'quest') {
      const left = state.team.filter((u) => !playedMap[u]).length;
      const inTeam = state.team.includes(me);
      const fn = failsNeeded(n, state.quest);
      action = `<div class="av-msg">⚔️ 원정 중! ${state.team.map(name).join(', ')} · 카드를 낸 사람 ${state.team.length - left}/${state.team.length}</div>
        <div class="av-rule">📜 원정대가 몰래 성공/실패 카드를 내요. <b>실패 카드가 ${fn}장 이상</b>이면 <b class="no">원정 실패</b>, ${fn > 1 ? '실패 카드가 1장 이하' : '모두 성공 카드'}면 <b class="ok">원정 성공</b>이에요. 누가 냈는지는 공개되지 않아요.<br>정의 팀은 성공만 낼 수 있어요 · 원정 3번 성공하면 정의 팀, 3번 실패하면 악 팀이 이겨요</div>
        ${inTeam ? (playedMap[me] ? '<div class="av-done">카드를 냈어요 · 결과를 기다리는 중…</div>'
          : `<div class="av-two"><button class="av-yes" data-play="0">✨ 성공</button><button class="av-no" data-play="1" ${R?.team !== 'evil' ? 'disabled title="정의 팀은 성공만 낼 수 있어요"' : ''}>💥 실패</button></div>${R?.team !== 'evil' ? '<small class="hint">정의 팀은 성공만 낼 수 있어요</small>' : ''}`) : ''}`;
    } else if (state.phase === 'assassin') {
      action = myRole === 'assassin'
        ? '<div class="av-msg evil">🗡️ 정의 팀이 원정 3번을 성공했어요. <b>멀린이라고 생각하는 사람</b>을 원탁에서 눌러 암살하세요! (악 팀 동료와 의논해도 좋아요)</div>'
        : `<div class="av-msg">🗡️ 원정 3번 성공! 이제 암살자가 멀린을 찾는 중… ${R?.team === 'evil' ? '암살자에게 의견을 말해 주세요' : '멀린은 들키지 마세요!'}</div>`;
    }

    // 내 역할 카드 (누르면 보였다 숨겼다)
    const roleCard = R ? `<button class="av-role-card ${R.team} ${ui.show ? 'open' : ''}" data-toggle>
      ${ui.show ? `<span class="av-rc-icon">${R.icon}</span><b>${R.name}</b><small>${R.team === 'good' ? '정의 팀' : '악 팀'}</small><p>${R.desc}</p>
        ${know.who.length ? `<p class="av-rc-know">${know.label}: <b>${know.who.map(name).join(', ')}</b></p>` : myRole === 'oberon' ? '<p class="av-rc-know">동료를 모르는 외톨이예요</p>' : ''}<em>눌러서 숨기기</em>`
        : '<span class="av-rc-icon">🂠</span><b>내 역할 보기</b><em>다른 사람이 못 보게 조심!</em>'}
    </button>` : '';

    const hist = state.history.filter((h) => h.kind === 'quest').map((h) => `<span class="${h.ok ? 'ok' : 'no'}">${h.quest + 1}번째 ${h.ok ? '성공' : '실패'} · ${h.team.map(name).join(', ')} · 실패 ${h.fails}장</span>`).join('');

    const $old = el.querySelector('.av-say input');
    const keep = $old ? { v: $old.value, f: document.activeElement === $old, s: $old.selectionStart } : null;
    el.innerHTML = `<div class="av">
      <div class="av-board"><div class="av-track">${track}</div><div class="av-rej"><small>연속 부결</small>${rejectTrack}</div></div>
      <div class="av-table"><div class="av-round"><div class="av-round-in">
        <svg viewBox="0 0 60 60" class="av-crest"><path d="M30 4 L52 12 L50 34 Q46 48 30 56 Q14 48 10 34 L8 12Z" fill="#1f3a7a" stroke="#e8cf8a" stroke-width="2.5"/><path d="M30 14 L30 44 M22 22 L38 22" stroke="#e8cf8a" stroke-width="3" stroke-linecap="round"/><circle cx="30" cy="14" r="2.5" fill="#e8cf8a"/></svg>
        <b>${over ? '게임 끝' : `${state.quest + 1}번째 원정`}</b>
        <small>${over ? (state.winner === 'good' ? '정의 팀 승리' : '악 팀 승리') : `원정대 ${need}명${failsNeeded(n, state.quest) > 1 ? ' · 실패 2장 필요' : ''}`}</small>
        <span class="av-score"><i class="ok">성공 ${state.results.filter(Boolean).length}</i><i class="no">실패 ${state.results.filter((r) => !r).length}</i></span>
      </div></div>${seats}</div>
      ${isPlayer ? '<form class="av-say"><input maxlength="60" placeholder="💬 원탁 채팅 (프로필 위에 말풍선으로 떠요)" autocomplete="off" enterkeyhint="send" /><button>보내기</button></form>' : ''}
      ${action}
      ${roleCard}
      ${hist ? `<div class="av-hist">${hist}</div>` : ''}
    </div>`;

    const $say = el.querySelector('.av-say');
    if ($say) {
      const $i = $say.querySelector('input');
      if (keep) { $i.value = keep.v; if (keep.f) { $i.focus({ preventScroll: true }); try { $i.setSelectionRange(keep.s, keep.s); } catch {} } }
      $say.addEventListener('submit', (e) => { e.preventDefault(); const text = $i.value.trim(); if (!text) return; $i.value = ''; sendMove({ type: 'chat', text }); });
    }
    el.querySelectorAll('[data-bub]').forEach((b) => { const k = b.dataset.bub; const left = 6000 - (Date.now() - (ui.chatSeen[k] || 0)); setTimeout(() => b.remove(), Math.max(0, left)); });
    el.querySelector('[data-toggle]')?.addEventListener('click', () => { ui.show = !ui.show; this.render(el, { state, me, players, finished, sendMove, room, secret }); });
    el.querySelector('[data-seen]')?.addEventListener('click', () => sendMove({ type: 'seen' }));
    el.querySelectorAll('[data-pick]').forEach((b) => (b.onclick = () => {
      const u = b.dataset.pick;
      ui.team = ui.team.includes(u) ? ui.team.filter((x) => x !== u) : ui.team.length < need ? [...ui.team, u] : ui.team;
      this.render(el, { state, me, players, finished, sendMove, room, secret });
    }));
    el.querySelector('[data-propose]')?.addEventListener('click', () => sendMove({ type: 'propose', team: ui.team }));
    el.querySelectorAll('[data-vote]').forEach((b) => (b.onclick = () => sendMove({ type: 'vote', ok: b.dataset.vote === '1' })));
    el.querySelectorAll('[data-play]').forEach((b) => (b.onclick = () => sendMove({ type: 'play', fail: b.dataset.play === '1' })));
    el.querySelectorAll('[data-kill]').forEach((b) => (b.onclick = () => sendMove({ type: 'assassinate', target: b.dataset.kill })));
  },
};
const ui = { deal: {}, team: [], show: false, key: '', questSeen: undefined, voteSeen: undefined, chatSeen: {}, chatStarted: false };
