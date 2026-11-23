// 보드게임: 스컬킹 (2~8명, 트릭테이킹 + 비딩) — 7~8명은 카드가 모자라 한 사람 최대 10장·8장
// 덱 69장: 초록 앵무새·노랑 보물상자·보라 보물지도 1~14, 검정 해골기 1~14(으뜸패),
//          도망 5, 해적 5, 스컬킹 1, 인어 2 (변신 해적 없음)
// 라운드 N: 카드 N장씩 → 몇 트릭을 가져갈지 동시에 예측(비딩) → 트릭 진행 → 점수
import { GARNET } from '../profile.js';
import { turnAlert, bigFlash } from './turn-alert.js';
import { faceHtml } from './face.js';
import { soundEvent, sfxCard, isMuted, getVolume } from '../sound.js';

const SUITS = {
  g: { name: '앵무새', color: '#2f9e5b' },
  y: { name: '보물상자', color: '#e0a11a' },
  p: { name: '보물지도', color: '#7b4fc9' },
  k: { name: '해골기', color: '#23232b' },
};
const PIRATES = ['외눈 선장', '붉은 수염', '갈고리 손', '바다 늑대', '폭풍의 항해사'];

// ── 카드 ──
export const CARDS = {};
for (const s of Object.keys(SUITS)) for (let r = 1; r <= 14; r++) CARDS[`${s}${r}`] = { id: `${s}${r}`, kind: 'num', suit: s, rank: r };
for (let i = 1; i <= 5; i++) CARDS[`e${i}`] = { id: `e${i}`, kind: 'escape' };
PIRATES.forEach((name, i) => (CARDS[`pr${i + 1}`] = { id: `pr${i + 1}`, kind: 'pirate', name, v: i }));
CARDS.sk = { id: 'sk', kind: 'king' };
CARDS.m1 = { id: 'm1', kind: 'mermaid', v: 0 };
CARDS.m2 = { id: 'm2', kind: 'mermaid', v: 1 };
export const DECK = Object.keys(CARDS);

export const cardName = (c) => {
  if (c.kind === 'num') return `${SUITS[c.suit].name} ${c.rank}`;
  return { escape: '도망', pirate: c.name, tigress: '변신 해적', king: '스컬킹', mermaid: '인어' }[c.kind];
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
export const rewardsFor = (n) => (n === 2 ? [1] : n <= 4 ? [2, 1] : [3, 2, 1]);
export const maxCards = (n) => Math.min(10, Math.floor(69 / n)); // 8명이면 최대 8장
const isSpecial = (c) => c.kind !== 'num';

// 트릭의 기준 색: 처음 나온 숫자 카드의 색
export const leadSuit = (trick) => {
  for (const t of trick) { const c = CARDS[t.card]; if (c.kind === 'num') return c.suit; }
  return null;
};
// 실제 효과 (변신 해적은 고른 쪽으로)
const eff = (t) => { const c = CARDS[t.card]; return c.kind === 'tigress' ? (t.as === 'escape' ? 'escape' : 'pirate') : c.kind; };

export function canPlay(hand, trick, cardId) {
  const c = CARDS[cardId];
  if (!hand.includes(cardId)) return false;
  if (isSpecial(c)) return true;
  const lead = leadSuit(trick);
  if (!lead || c.suit === lead) return true;
  return !hand.some((id) => CARDS[id].kind === 'num' && CARDS[id].suit === lead);
}

// 트릭 승자 + 보너스
export function trickWinner(trick) {
  const kinds = trick.map(eff);
  const first = (k) => kinds.indexOf(k);
  const count = (k) => kinds.filter((x) => x === k).length;
  let w, bonus = 0;
  const notes = [];
  if (kinds.includes('king')) {
    if (kinds.includes('mermaid')) { w = first('mermaid'); bonus += 40; notes.push('인어가 스컬킹을 잡았어요! +40'); }
    else { w = first('king'); const n = count('pirate'); if (n) { bonus += 30 * n; notes.push(`스컬킹이 해적 ${n}명을 잡았어요! +${30 * n}`); } }
  } else if (kinds.includes('pirate')) {
    w = first('pirate'); const n = count('mermaid'); if (n) { bonus += 20 * n; notes.push(`해적이 인어를 잡았어요! +${20 * n}`); }
  } else if (kinds.includes('mermaid')) {
    w = first('mermaid');
  } else {
    const nums = trick.map((t, i) => ({ c: CARDS[t.card], i })).filter((x) => x.c.kind === 'num');
    const blacks = nums.filter((x) => x.c.suit === 'k');
    const lead = leadSuit(trick);
    const pool = blacks.length ? blacks : nums.filter((x) => x.c.suit === lead);
    w = pool.length ? pool.reduce((a, b) => (b.c.rank > a.c.rank ? b : a)).i : 0; // 모두 도망이면 처음 낸 사람
  }
  // 14 카드 보너스
  let b14 = 0;
  for (const t of trick) { const c = CARDS[t.card]; if (c.kind === 'num' && c.rank === 14) b14 += c.suit === 'k' ? 20 : 10; }
  if (b14) { bonus += b14; notes.push(`14 카드 +${b14}`); }
  const note = notes.join(' · ');
  return { idx: w, bonus, note };
}

export function roundScore(bid, won, bonus, cards) {
  if (bid === 0) return won === 0 ? 10 * cards + bonus : -10 * cards;
  return won === bid ? 20 * bid + bonus : -10 * Math.abs(won - bid);
}

function deal(state) {
  const cards = state.rounds[state.ri];
  const deck = shuffle(DECK);
  const hands = {};
  state.order.forEach((u) => (hands[u] = deck.splice(0, cards)));
  const lead = (state.startIdx + state.ri) % state.order.length;
  return {
    ...state, phase: 'bid', hands,
    bids: Object.fromEntries(state.order.map((u) => [u, null])),
    won: Object.fromEntries(state.order.map((u) => [u, 0])),
    bonus: Object.fromEntries(state.order.map((u) => [u, 0])),
    trick: [], tricks: [], leaderIdx: lead, turnIdx: lead, lastTrick: null, roundLog: null,
  };
}

function finalResult(state, players) {
  const rewards = rewardsFor(state.order.length);
  const ranking = state.order
    .map((uid) => ({ uid, score: state.scores[uid] }))
    .sort((a, b) => b.score - a.score)
    .map((r, _, all) => {
      const place = 1 + all.filter((o) => o.score > r.score).length;
      return { ...r, place, garnets: rewards[place - 1] || 0 };
    });
  const top = ranking.filter((r) => r.place === 1).map((r) => players[r.uid]?.name || '?');
  return {
    message: `${top.join(', ')}님이 해적왕! 🏴‍☠️`,
    winners: ranking.filter((r) => r.place === 1).map((r) => r.uid),
    ranking,
    rewards: Object.fromEntries(ranking.map((r) => [r.uid, r.garnets])),
  };
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ── 카드 그림 (모두 직접 그린 그림) ──
const ICON = {
  g: `<svg viewBox="0 0 60 60"><path d="M30 10 C40 10 46 18 45 28 C44 38 38 46 30 54 L26 50 C22 44 20 36 22 26 C23 17 25 10 30 10 Z" fill="#3cbf6a"/><path d="M26 50 C20 54 16 58 12 58 C16 52 20 48 24 46 Z" fill="#1f8a45"/><path d="M38 14 C44 14 48 18 48 22 C45 22 42 21 40 19 Z" fill="#f2c230"/><path d="M44 21 C49 21 52 24 51 28 C48 28 45 26 44 23 Z" fill="#2a2a2a"/><circle cx="38" cy="18" r="3.4" fill="#fff"/><circle cx="38.6" cy="18" r="1.8" fill="#111"/><path d="M28 26 C34 30 36 38 32 46 C28 40 26 32 28 26 Z" fill="#d93a3a"/><path d="M26 32 C30 36 31 42 28 48" stroke="#1f8a45" stroke-width="1.5" fill="none"/></svg>`,
  y: `<svg viewBox="0 0 60 60"><path d="M10 26 C10 14 50 14 50 26 Z" fill="#a0602a"/><rect x="10" y="26" width="40" height="24" rx="2" fill="#b8702e"/><path d="M10 26 h40 v4 h-40z M10 40 h40 v3 h-40z" fill="#7a4618"/><rect x="18" y="14" width="4" height="36" fill="#e0b13a"/><rect x="38" y="14" width="4" height="36" fill="#e0b13a"/><rect x="26" y="28" width="8" height="9" rx="1.5" fill="#f5d34a" stroke="#7a4618" stroke-width="1"/><circle cx="30" cy="32" r="1.4" fill="#4a2a0a"/><g fill="#ffe36a"><circle cx="16" cy="22" r="3"/><circle cx="24" cy="19" r="3"/><circle cx="32" cy="18" r="3"/><circle cx="42" cy="21" r="3"/></g></svg>`,
  p: `<svg viewBox="0 0 60 60"><path d="M8 14 L22 10 L38 14 L52 10 L52 48 L38 52 L22 48 L8 52 Z" fill="#efdcae"/><path d="M22 10 V48 M38 14 V52" stroke="#c9ad74" stroke-width="1.2"/><path d="M14 40 C20 30 26 36 30 28 C34 22 40 26 44 20" fill="none" stroke="#7b4fc9" stroke-width="2" stroke-dasharray="3 3"/><path d="M40 16 l8 8 M48 16 l-8 8" stroke="#c81d38" stroke-width="3" stroke-linecap="round"/><circle cx="14" cy="40" r="2.5" fill="#7b4fc9"/></svg>`,
  k: `<svg viewBox="0 0 60 60"><path d="M10 8 V56" stroke="#8a6a3a" stroke-width="3"/><path d="M12 10 C24 6 34 14 52 9 V36 C34 41 24 33 12 37 Z" fill="#111"/><circle cx="30" cy="20" r="7" fill="#f2efe6"/><rect x="26" y="25" width="8" height="5" rx="1" fill="#f2efe6"/><circle cx="27.4" cy="19.5" r="1.8" fill="#111"/><circle cx="32.6" cy="19.5" r="1.8" fill="#111"/><path d="M20 28 L40 36 M40 28 L20 36" stroke="#f2efe6" stroke-width="2.6" stroke-linecap="round"/></svg>`,
};
const SPECIAL_ART = {
  escape: `<svg viewBox="0 0 60 60"><path d="M16 6 V56" stroke="#8a6a3a" stroke-width="3"/><path d="M18 8 C28 4 36 12 50 8 V32 C36 36 28 28 18 32 Z" fill="#fff" stroke="#c9d3e3" stroke-width="1.5"/><path d="M8 52 q8 -6 16 0 q8 6 16 0 q8 -6 16 0" fill="none" stroke="#5ab0e0" stroke-width="3"/></svg>`,
  pirate: (v) => {
    const band = ['#c81d38', '#2f6fd6', '#2f9e5b', '#7b4fc9', '#e0a11a'][v];
    return `<svg viewBox="0 0 60 60"><path d="M14 54 C14 42 20 38 30 38 C40 38 46 42 46 54 Z" fill="${band}"/><ellipse cx="30" cy="27" rx="12" ry="13" fill="#e8b48a"/><path d="M17 22 C18 12 42 12 43 22 C38 18 22 18 17 22 Z" fill="${band}"/><path d="M42 20 l8 4 l-7 2 z" fill="${band}"/><path d="M19 22 L42 30" stroke="#111" stroke-width="1.6"/><ellipse cx="25" cy="26" rx="4" ry="3.5" fill="#111"/><circle cx="35" cy="26" r="1.8" fill="#111"/><path d="M22 34 C26 44 34 44 38 34 C34 37 26 37 22 34 Z" fill="${v % 2 ? '#3a2412' : '#8a3a1a'}"/><path d="M26 36 q4 2 8 0" stroke="#fff" stroke-width="1.2" fill="none"/><circle cx="18" cy="30" r="2" fill="none" stroke="#e0b13a" stroke-width="1.4"/></svg>`;
  },
  tigress: `<svg viewBox="0 0 60 60"><path d="M14 54 C14 42 20 38 30 38 C40 38 46 42 46 54 Z" fill="#2a2a3a"/><path d="M16 30 C14 16 22 10 30 10 C38 10 46 16 44 30 C44 40 40 46 30 46 C20 46 16 40 16 30 Z" fill="#7a2a14"/><ellipse cx="30" cy="29" rx="10" ry="12" fill="#e8b48a"/><path d="M19 25 C24 21 36 21 41 25 L40 30 C36 28 24 28 20 30 Z" fill="#c81d38"/><circle cx="25" cy="27" r="1.6" fill="#fff"/><circle cx="35" cy="27" r="1.6" fill="#fff"/><path d="M26 36 q4 3 8 0" stroke="#a02040" stroke-width="1.6" fill="none"/><path d="M18 14 L30 4 L42 14 Z" fill="#111"/><path d="M26 10 h8" stroke="#f2efe6" stroke-width="1.5"/></svg>`,
  king: `<svg viewBox="0 0 60 60"><path d="M14 20 L18 6 L24 14 L30 4 L36 14 L42 6 L46 20 Z" fill="#f5c32c" stroke="#a87a10" stroke-width="1.2"/><circle cx="30" cy="10" r="2" fill="#c81d38"/><path d="M14 30 C14 20 22 18 30 18 C38 18 46 20 46 30 C46 38 42 42 40 44 L40 50 L20 50 L20 44 C18 42 14 38 14 30 Z" fill="#f2efe6"/><ellipse cx="23.5" cy="31" rx="4.5" ry="5" fill="#111"/><ellipse cx="36.5" cy="31" rx="4.5" ry="5" fill="#111"/><circle cx="24.5" cy="30" r="1.4" fill="#c81d38"/><circle cx="37.5" cy="30" r="1.4" fill="#c81d38"/><path d="M28 40 l2 -4 l2 4 z" fill="#111"/><path d="M24 46 v4 M28 46 v4 M32 46 v4 M36 46 v4" stroke="#111" stroke-width="1.4"/></svg>`,
  mermaid: `<svg viewBox="0 0 60 60"><path d="M24 30 C20 40 22 48 30 52 C34 54 40 52 42 56 C44 50 40 46 36 46 C32 44 32 38 34 30 Z" fill="#2fb3a3"/><path d="M42 56 C46 52 52 52 54 54 C50 56 46 58 42 56 Z M42 56 C42 50 46 46 50 46 C48 50 46 54 42 56 Z" fill="#1f8a7e"/><ellipse cx="29" cy="24" rx="7" ry="8" fill="#f0c49a"/><path d="M21 22 C20 12 36 10 37 20 C38 30 42 38 40 44 C36 36 34 28 34 22 C30 20 26 22 21 22 Z" fill="#e0603a"/><path d="M23 32 C26 30 32 30 34 32 L33 36 C30 34 27 34 24 36 Z" fill="#c45fa0"/><circle cx="27" cy="24" r="1.2" fill="#2a1a10"/><path d="M27 28 q2 1.4 4 0" stroke="#b5503a" stroke-width="1" fill="none"/></svg>`,
};

const IMG = (c) => (c.kind === 'num' ? c.suit : c.kind === 'pirate' ? `pirate${c.v + 1}` : c.kind === 'mermaid' ? `mermaid${c.v + 1}` : c.kind);
export function cardHtml(id, { small = false } = {}) {
  const c = CARDS[id];
  const img = `<img class="skc-img" src="/img/skullking/${IMG(c)}.webp" alt="" draggable="false" loading="lazy">`;
  if (c.kind === 'num') {
    const s = SUITS[c.suit];
    return `<div class="skc ${small ? 'sm' : ''} s-${c.suit}" style="--sc:${s.color}" title="${esc(cardName(c))}">${img}<b class="skc-n l">${c.rank}${c.rank === 14 ? `<i class="skc-bonus">+${c.suit === 'k' ? 20 : 10}</i>` : ''}</b><b class="skc-n r">${c.rank}</b></div>`;
  }
  return `<div class="skc ${small ? 'sm' : ''} sp-${c.kind}" title="${esc(cardName(c))}">${img}<span class="skc-name">${esc(cardName(c))}</span></div>`;
}

const fx = { bid: '', rk: '', tno: 0, hold: null, ckey: '', cnt: 0 };
const HOLD_MS = 2800;
// 모두 예측하면 해적 목소리로 "요호호호!" (기기 음성 · 굵고 낮게)
function yoho() {
  try {
    if (isMuted() || typeof speechSynthesis === 'undefined') return;
    const u = new SpeechSynthesisUtterance('요호호호!');
    u.lang = 'ko-KR'; u.pitch = 0.2; u.rate = 0.85; u.volume = Math.min(1, getVolume() * 1.6);
    const v = speechSynthesis.getVoices().filter((x) => x.lang?.startsWith('ko'));
    if (v.length) u.voice = v.find((x) => /male|남/i.test(x.name)) || v[0];
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  } catch {}
}
// 배경 소품: 금은보화 · 보물상자 · 쇠사슬
const COINS = (w) => `<svg viewBox="0 0 120 70" width="${w}"><g stroke="#8a5a0a" stroke-width="1.2">${[[20,58],[38,60],[56,61],[74,60],[92,58],[29,50],[47,51],[65,51],[83,50],[38,42],[56,42],[74,42],[47,34],[65,34],[56,26]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="11" ry="5" fill="#f5c32c"/><ellipse cx="${x}" cy="${y - 1}" rx="7" ry="2.6" fill="#ffe27a" stroke="none"/>`).join('')}</g><path d="M88 40 l6 -8 l6 8 l-6 6 z" fill="#e0304a" stroke="#7a0a1a"/><path d="M22 44 l5 -6 l5 6 l-5 5 z" fill="#2fb3e0" stroke="#0a4a7a"/><path d="M60 18 l4 -5 l4 5 l-4 4 z" fill="#3ddc84" stroke="#0a6a3a"/></svg>`;
const CHEST = (w) => `<svg viewBox="0 0 110 90" width="${w}"><path d="M12 30 Q55 0 98 30 L98 38 L12 38 Z" fill="#6b3a17" stroke="#2a1405" stroke-width="2" transform="rotate(-14 12 38)"/><g stroke="#8a5a0a" stroke-width="1">${[[30,38],[44,34],[58,33],[72,35],[84,38],[38,30],[54,27],[68,29],[50,22]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="4" fill="#f5c32c"/>`).join('')}</g><path d="M46 20 l4 -6 l4 6 l-4 4 z" fill="#e0304a"/><path d="M66 24 l4 -5 l4 5 l-4 4 z" fill="#2fb3e0"/><rect x="12" y="38" width="86" height="44" rx="4" fill="#7a4520" stroke="#2a1405" stroke-width="2"/><path d="M12 50 h86 M12 70 h86" stroke="#5a3010" stroke-width="2"/><rect x="24" y="38" width="8" height="44" fill="#d8a73a" stroke="#6a4a0a"/><rect x="78" y="38" width="8" height="44" fill="#d8a73a" stroke="#6a4a0a"/><rect x="48" y="46" width="14" height="16" rx="2" fill="#d8a73a" stroke="#6a4a0a"/><circle cx="55" cy="54" r="2.4" fill="#2a1405"/></svg>`;
const CHAIN = (w) => `<svg viewBox="0 0 200 40" width="${w}"><g fill="none" stroke-width="4">${Array.from({ length: 9 }, (_, i) => `<ellipse cx="${14 + i * 21}" cy="${20 + Math.sin(i / 1.3) * 7}" rx="12" ry="${i % 2 ? 4 : 7}" stroke="${i % 2 ? '#6f7883' : '#9aa4b0'}"/>`).join('')}</g></svg>`;
const DECOR = `<div class="skx-decor" aria-hidden="true">
  <span class="d-chest">${CHEST(96)}</span><span class="d-coins r">${COINS(104)}</span>
  <span class="d-chain a">${CHAIN(150)}</span><span class="d-chain b">${CHAIN(130)}</span>
</div>`;
const chat = { draft: '', focus: false };
let lastCtx = null;
let guideOpen = false;
// 카드 상성표 (내 카드 아래, 접었다 폈다)
const gc = (id) => `<span class="skg-c">${cardHtml(id, { small: true })}</span>`;
const GUIDE = () => `
  <details class="skg" ${guideOpen ? 'open' : ''}>
    <summary>📜 카드 상성 보기 <small>누르면 펼쳐져요</small></summary>
    <div class="skg-body">
      <div class="skg-row"><b class="skg-t">특수 카드 상성</b>
        <div class="skg-cycle">
          ${gc('sk')}<i>▶<br>이김</i>${gc('pr1')}<i>▶<br>이김</i>${gc('m1')}<i>▶<br>이김</i>${gc('sk')}
        </div>
        <p>👑 스컬킹은 해적을, ☠ 해적은 인어를, 🧜 인어는 스컬킹을 잡아요. 셋 다 숫자 카드는 모두 이겨요.</p>
      </div>
      <div class="skg-row"><b class="skg-t">숫자 카드</b>
        <div class="skg-cycle">${gc('g9')}<i>&lt;</i>${gc('g12')}<i>&lt;</i>${gc('k2')}</div>
        <p>처음 나온 색(기준 색)끼리는 숫자가 높을수록 이겨요. 기준 색이 아닌 색은 져요. <b>검정 해골기</b>는 으뜸패라 다른 색을 모두 이겨요.</p>
      </div>
      <div class="skg-row"><b class="skg-t">도망 · 같은 종류</b>
        <div class="skg-cycle">${gc('e1')}<i>항상 짐</i></div>
        <p>🏳️ 도망은 무엇에든 져요. 모두 도망이면 먼저 낸 사람이 가져가요. 해적끼리·인어끼리는 먼저 낸 카드가 이겨요.</p>
      </div>
      <div class="skg-row"><b class="skg-t">보너스 (예측 성공 시)</b>
        <ul class="skg-bonus">
          <li>${gc('g14')}<span>색 14 <b>+10</b></span></li>
          <li>${gc('k14')}<span>검정 14 <b>+20</b></span></li>
          <li><span>☠ 해적이 인어를 잡으면 <b>+20</b></span></li>
          <li><span>👑 스컬킹이 해적을 잡으면 1명당 <b>+30</b></span></li>
          <li><span>🧜 인어가 스컬킹을 잡으면 <b>+40</b></span></li>
        </ul>
      </div>
    </div>
  </details>`;
const COMPASS = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width=".8" stroke-dasharray="2 3"/><path d="M50 4 L56 44 L96 50 L56 56 L50 96 L44 56 L4 50 L44 44 Z" fill="currentColor" opacity=".55"/><path d="M50 18 L53 47 L82 50 L53 53 L50 82 L47 53 L18 50 L47 47 Z" fill="currentColor" opacity=".35" transform="rotate(45 50 50)"/><circle cx="50" cy="50" r="4" fill="currentColor"/></svg>`;

// 라운드가 끝나면 새 창: 왼쪽 플레이어, 오른쪽 트릭별 기록
function roundModal(state, me, players, finished, sendMove) {
  const show = !finished && state.phase === 'roundEnd' && state.roundLog;
  let $m = document.querySelector('.sk-modal');
  if (!show) { $m?.remove(); return; }
  const key = `${state.ri}`;
  if ($m && $m.dataset.k === key) return;
  $m?.remove();
  const name = (u) => esc(players[u]?.name || '나간 사람');
  const cards = state.rounds[state.ri];
  const last = state.ri === state.rounds.length - 1;
  $m = document.createElement('div');
  $m.className = 'sk-modal'; $m.dataset.k = key;
  $m.innerHTML = `<div class="sk-mbox">
    <div class="sk-mtitle">🏴‍☠️ ${state.ri + 1}라운드 결과 <small>카드 ${cards}장</small></div>
    <div class="sk-mgrid">
      <div class="sk-mplayers">${[...state.order].sort((a, b) => state.scores[b] - state.scores[a]).map((u) => {
        const l = state.roundLog[u]; const ok = l.bid === l.won;
        return `<div class="sk-mp ${u === me ? 'me' : ''}">
          <span class="sk-mface">${faceHtml(players[u] || { name: '?' })}</span>
          <div class="sk-mpi"><b>${name(u)}</b><span>예측 ${l.bid} · 획득 ${l.won} ${ok ? '<em class="ok">성공</em>' : '<em class="no">실패</em>'}</span></div>
          <div class="sk-mpts"><b class="${l.pts >= 0 ? 'up' : 'dn'}">${l.pts >= 0 ? '+' : ''}${l.pts}</b>${l.bonus ? `<small>보너스 ${l.bonus}</small>` : ''}<span>총 ${state.scores[u]}</span></div>
        </div>`;
      }).join('')}</div>
      <div class="sk-mtricks">${(state.tricks || []).map((t, i) => `
        <div class="sk-mt">
          <span class="sk-mtn">${i + 1}</span>
          ${cardHtml(t.card, { small: true })}
          <div class="sk-mti"><div><b>${name(t.winner)}</b> 승리</div><span>${esc(cardName(CARDS[t.card]))}${t.bonus ? ` · <em>${esc(t.note)}</em>` : ''}</span>
            <div class="sk-mall">${t.plays.map((p) => `<i class="${p.uid === t.winner ? 'w' : ''}">${name(p.uid)}: ${esc(cardName(CARDS[p.card]))}</i>`).join('')}</div>
          </div>
        </div>`).join('')}</div>
    </div>
    <p class="sk-mnote">보너스는 예측에 성공했을 때만 더해져요.</p>
    ${last ? '' : `<button class="btn primary block" data-mnext>다음 라운드 (카드 ${state.rounds[state.ri + 1]}장) ▶</button>`}
  </div>`;
  document.body.appendChild($m);
  const $b = $m.querySelector('[data-mnext]');
  if ($b) $b.onclick = () => { $b.disabled = true; sendMove({ type: 'next' }); };
}
// 고른 카드 (변신 해적 선택 등)
let ui = { key: '', pick: null };

export default {
  id: 'skullking',
  name: '스컬킹',
  emoji: '🏴‍☠️',
  category: 'board',
  minPlayers: 2,
  maxPlayers: 8,
  duration: '20~40분',
  rewards: [3, 2, 1],
  rewardLabel: '1등 최대 +3',
  description: '몇 번 이길지 예측하라! 해적 트릭테이킹',
  options: [{ key: 'length', label: '게임 길이', choices: ['10라운드 (정식)', '5라운드 (짧게)'], default: '10라운드 (정식)' }],
  rules: [
    '라운드 N에는 카드를 N장씩 받아요 (1라운드 1장 … 10라운드 10장). 짧게 하면 2·4·6·8·10장 5라운드예요.',
    '카드를 보고 이번 라운드에 트릭(한 바퀴 대결)을 몇 번 가져갈지 예측해요. 모두 동시에 공개돼요.',
    '선 플레이어부터 한 장씩 내요. 처음 나온 숫자 카드의 색을 가지고 있으면 그 색을 내야 해요. 특수 카드(도망·해적·스컬킹·인어)는 언제든 낼 수 있어요.',
    '이기는 순서: 숫자는 높을수록 강하고, 검정 해골기는 다른 색을 모두 이겨요(으뜸패). 다른 색이 기준일 때 그 색이 아닌 숫자는 져요.',
    '☠ 해적은 모든 숫자 카드와 인어를 이겨요. 👑 스컬킹은 해적까지 이겨요. 🧜 인어는 숫자 카드를 이기고, 스컬킹이 있으면 스컬킹을 잡아요! 🏳️ 도망은 항상 져요.',
    '같은 종류(해적끼리·인어끼리)면 먼저 낸 카드가 이겨요.',
    '1라운드는 방장이 선이고, 다음 라운드부터는 입장 순서대로 선이 넘어가요. 라운드 안에서는 트릭을 이긴 사람이 다음 트릭의 선이 돼요.',
    '점수: 예측 성공 시 이긴 트릭 × 20점 / 실패 시 차이 × −10점. 0을 예측하면 성공 시 라운드 수 × 10점, 실패 시 라운드 수 × −10점.',
    '보너스(예측 성공했을 때만): 색 14 +10, 검정 14 +20, 해적이 인어를 잡으면 +20, 스컬킹이 해적을 잡으면 1명당 +30, 인어가 스컬킹을 잡으면 +40.',
    '8명일 때는 카드가 모자라 9·10라운드도 8장씩 받아요.',
    '가넷: 2명 → 1등 1개 / 3~4명 → 1등 2개, 2등 1개 / 5~8명 → 1등 3개, 2등 2개, 3등 1개',
  ],

  setup(players, room) {
    const short = String(room?.options?.length || '').includes('5');
    // 입장 순서 그대로. 1라운드 선은 방장, 이후 라운드는 입장 순서대로 한 칸씩
    const order = players.map((p) => p.uid);
    const hostIdx = Math.max(0, order.indexOf(room?.hostId));
    const base = {
      order, rounds: (short ? [2, 4, 6, 8, 10] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).map((c) => Math.min(c, maxCards(order.length))), ri: 0, startIdx: hostIdx,
      scores: Object.fromEntries(order.map((u) => [u, 0])), history: [],
    };
    return deal(base);
  },

  move(state, move, uid, players) {
    if (move?.type === 'tick') throw new Error('__noop');
    const n = state.order.length;
    const cards = state.rounds[state.ri];

    if (move?.type === 'bid') {
      if (state.phase !== 'bid') throw new Error('지금은 예측할 수 없어요');
      if (!state.order.includes(uid)) throw new Error('참가자가 아니에요');
      const b = Number(move.bid);
      if (!Number.isInteger(b) || b < 0 || b > cards) throw new Error(`0~${cards} 사이로 예측해 주세요`);
      const bids = { ...state.bids, [uid]: b };
      const all = state.order.every((u) => bids[u] !== null);
      return { state: { ...state, bids, phase: all ? 'play' : 'bid' } };
    }

    if (move?.type === 'play') {
      if (state.phase !== 'play') throw new Error('지금은 카드를 낼 수 없어요');
      if (state.order[state.turnIdx] !== uid) throw new Error('내 차례가 아니에요');
      const hand = state.hands[uid];
      if (!canPlay(hand, state.trick, move.card)) throw new Error('그 카드는 낼 수 없어요 (같은 색을 내야 해요)');
      const c = CARDS[move.card];
      const play = { uid, card: move.card };
      const trick = [...state.trick, play];
      let s = { ...state, trick, hands: { ...state.hands, [uid]: hand.filter((x) => x !== move.card) } };
      if (trick.length < n) return { state: { ...s, turnIdx: (s.turnIdx + 1) % n } };

      // 트릭 끝
      const w = trickWinner(trick);
      const wu = trick[w.idx].uid;
      s = {
        ...s, trick: [], won: { ...s.won, [wu]: s.won[wu] + 1 }, bonus: { ...s.bonus, [wu]: s.bonus[wu] + w.bonus },
        lastTrick: { plays: trick, winner: wu, note: w.note, lead: leadSuit(trick) },
        tricks: [...(s.tricks || []), { plays: trick, winner: wu, card: trick[w.idx].card, note: w.note, bonus: w.bonus }],
      };
      const wIdx = s.order.indexOf(wu);
      if (s.hands[wu].length) return { state: { ...s, leaderIdx: wIdx, turnIdx: wIdx } };

      // 라운드 끝
      const log = {};
      const scores = { ...s.scores };
      for (const u of s.order) {
        const pts = roundScore(s.bids[u], s.won[u], s.bonus[u], cards);
        log[u] = { bid: s.bids[u], won: s.won[u], bonus: s.won[u] === s.bids[u] ? s.bonus[u] : 0, pts };
        scores[u] += pts;
      }
      s = { ...s, scores, history: [...s.history, { cards, log }], roundLog: log, phase: 'roundEnd', turnIdx: -1 };
      if (s.ri === s.rounds.length - 1) {
        const done = { ...s, phase: 'done' };
        return { state: done, result: finalResult(done, players) };
      }
      return { state: s };
    }

    if (move?.type === 'next') {
      if (state.phase !== 'roundEnd') throw new Error('__noop');
      return { state: deal({ ...state, ri: state.ri + 1 }) };
    }
    throw new Error('알 수 없는 동작이에요');
  },

  render(el, ctx) {
    const { state, me, players, finished, sendMove, room } = ctx;
    const name = (u) => esc(players[u]?.name || '나간 사람');
    const isPlayer = state.order.includes(me);
    const cards = state.rounds[state.ri];
    const turnUid = state.turnIdx >= 0 ? state.order[state.turnIdx] : null;
    const myTurn = state.phase === 'play' && turnUid === me;
    const key = `${room?.code}:${state.ri}:${state.phase}:${state.trick.length}`;
    if (!finished && room) {
      turnAlert(room.code, `sk:${state.ri}:${state.phase}:${state.trick.length}:${Object.values(state.won).join()}`, myTurn || (state.phase === 'bid' && isPlayer && state.bids[me] === null));
      // 모두 예측하면 "요호호!" 하고 한꺼번에 공개
      const bk = `${room.code}:${room.startedAt}:${state.ri}`;
      if (state.phase === 'play' && fx.bid !== bk && !state.lastTrick && !state.trick.length) {
        fx.bid = bk;
        yoho();
        bigFlash(`<div class="sk-yoho"><b>요호호! 🏴‍☠️</b><div>${state.order.map((u) => `<span>${name(u)} <i>${state.bids[u]}</i></span>`).join('')}</div></div>`, 2200, 'sk-flash');
      }
      // 트릭이 끝나면 가운데에 잠깐 남겨 두었다가 이긴 사람에게 카드가 날아가요
      const tno = Object.values(state.won).reduce((a, b) => a + b, 0);
      if (fx.rk !== bk) { if (fx.rk) fx.cnt = 0; fx.rk = bk; fx.tno = tno; }
      else if (tno > fx.tno && state.lastTrick) {
        fx.tno = tno;
        fx.hold = { k: `${bk}:${tno - 1}`, until: Date.now() + HOLD_MS, uid: state.lastTrick.winner };
      }
    }
    lastCtx = { el, ctx, self: this };
    if (ui.key !== key) ui = { key, pick: null };

    const scoreTable = (withRound) => `
      <table class="sk-table">
        <thead><tr><th>플레이어</th><th>예측</th><th>획득</th>${withRound ? '<th>이번</th>' : ''}<th>총점</th></tr></thead>
        <tbody>${state.order.map((u) => {
          const lg = state.roundLog?.[u];
          const bidShown = state.phase === 'bid' ? (state.bids[u] === null ? '<i class="muted">생각 중</i>' : '✔') : state.bids[u];
          return `<tr class="${u === me ? 'me' : ''} ${u === turnUid ? 'turn' : ''}">
            <td>${u === state.order[state.leaderIdx] && state.phase !== 'roundEnd' ? '⚓' : ''}${name(u)}</td>
            <td>${bidShown}</td>
            <td>${state.won[u]}${state.phase === 'play' && state.bids[u] !== null ? `<small>/${state.bids[u]}</small>` : ''}</td>
            ${withRound ? `<td class="${lg.pts >= 0 ? 'up' : 'dn'}">${lg.pts >= 0 ? '+' : ''}${lg.pts}${lg.bonus ? `<small>보너스 ${lg.bonus}</small>` : ''}</td>` : ''}
            <td><b>${state.scores[u]}</b></td>
          </tr>`;
        }).join('')}</tbody>
      </table>`;

    if (finished) {
      const ranking = room?.result?.ranking || finalResult(state, players).ranking;
      el.innerHTML = `
        <div class="sk">
          <div class="dm-title" style="color:var(--gold)">🏴‍☠️ 최종 순위</div>
          <ol class="nb-final">
            ${ranking.map((r) => `<li class="${r.uid === me ? 'me' : ''}">
              <span class="nb-place">${r.place <= 3 ? ['🥇', '🥈', '🥉'][r.place - 1] : r.place + '등'}</span>
              <span class="nb-name">${name(r.uid)}</span>
              <span class="nb-score">${r.score}점</span>
              <span class="nb-reward">${r.garnets ? `${GARNET}+${r.garnets}` : ''}</span>
              <div class="sk-hist">${state.history.map((h, i) => { const l = h.log[r.uid]; return `<span class="${l.pts >= 0 ? 'up' : 'dn'}" title="${h.cards}장">R${i + 1} ${l.won}/${l.bid} <b>${l.pts >= 0 ? '+' : ''}${l.pts}</b></span>`; }).join('')}</div>
            </li>`).join('')}
          </ol>
        </div>`;
      return;
    }

    const myHand = state.hands[me] || [];
    const sortKey = (id) => { const c = CARDS[id]; return c.kind === 'num' ? 'gypk'.indexOf(c.suit) * 20 + c.rank : { escape: 100, mermaid: 110, pirate: 120, tigress: 130, king: 140 }[c.kind] + (c.v || 0); };
    const hand = [...myHand].sort((a, b) => sortKey(a) - sortKey(b));
    const lead = leadSuit(state.trick);

    let banner, action = '';
    if (state.phase === 'bid') {
      const mine = state.bids[me];
      banner = isPlayer ? (mine === null ? `<span><b>${state.ri + 1}라운드 · 카드 ${cards}장</b><br>승리를 몇 번 가져갈지 예측하세요</span>` : `<span>내 예측 <b>${mine}</b> · 다른 사람을 기다리는 중 (바꿀 수 있어요)</span>`) : '<span>예측 중…</span>';
      if (isPlayer) action = `<div class="sk-bids">${Array.from({ length: cards + 1 }, (_, i) => `<button class="btn ${mine === i ? 'primary' : ''}" data-bid="${i}">${i}</button>`).join('')}</div>`;
    } else if (state.phase === 'play') {
      banner = myTurn ? `<span><b>내 차례!</b> ${lead ? `기준 색 <b style="color:${SUITS[lead].color === '#23232b' ? '#c9c9d6' : SUITS[lead].color}">${SUITS[lead].name}</b>` : '카드를 내세요'}</span>` : `<span><b>${name(turnUid)}</b>님 차례</span>`;
    } else {
      banner = `<span><b>${state.ri + 1}라운드 끝!</b> 점수를 확인하세요</span>`;
      action = state.ri < state.rounds.length - 1 ? `<button class="btn primary block" data-next>다음 라운드 (카드 ${state.rounds[state.ri + 1]}장) ▶</button>` : '';
    }

    // ── 해적선 갑판: 나는 항상 아래 가운데 ──
    const n = state.order.length;
    const meIdx = Math.max(0, state.order.indexOf(me));
    const tno = Object.values(state.won).reduce((a, b) => a + b, 0);
    const holding = fx.hold && Date.now() < fx.hold.until && !state.trick.length && state.lastTrick;
    const plays = holding ? state.lastTrick.plays : state.trick;
    const tKey = holding ? fx.hold.k : `${room?.code}:${room?.startedAt}:${state.ri}:${tno}`;
    const winU = holding ? state.lastTrick.winner : null;
    const leader = state.order[state.leaderIdx];
    const seats = state.order.map((u, k) => {
      const i = (k - meIdx + n) % n;
      const ang = Math.PI / 2 + (i / n) * Math.PI * 2;
      const x = 50 + Math.cos(ang) * 43, y = 50 + Math.sin(ang) * 41;
      const bid = state.bids[u];
      const stat = state.phase === 'bid' ? (bid === null ? '<i class="think">생각 중…</i>' : '<i class="done">예측 완료</i>')
        : `<span class="skx-bw ${bid !== null && state.won[u] === bid ? 'hit' : state.won[u] > bid ? 'over' : ''}">예측 <b>${bid}</b> · 획득 <b>${state.won[u]}</b></span>`;
      return `<div class="skx-seat ${u === me ? 'me' : ''} ${u === turnUid && !holding ? 'turn' : ''} ${winU === u ? 'win' : ''} ${y < 45 ? 'up' : ''}" data-u="${esc(u)}" style="left:${x}%;top:${y}%">
        <span class="seat-bubble" data-bub="${esc(u)}"></span>
        <span class="skx-face">${faceHtml(players[u] || { name: '?' })}${u === leader && state.phase !== 'roundEnd' ? '<i class="skx-lead" title="이번 트릭 선">⚓</i>' : ''}</span>
        <b class="skx-name">${name(u)}</b>
        ${stat}
        <em class="skx-score">${state.scores[u]}점</em>
      </div>`;
    }).join('');
    const cw = n <= 3 ? 60 : n === 4 ? 52 : n === 5 ? 42 : n === 6 ? 36 : 30;
    const center = plays.length || state.phase === 'play' ? `<div class="skx-trick" style="--cw:${cw}px">${plays.map((t, k) => `
        <div class="skx-slot ${winU === t.uid ? 'win' : ''}" data-i="${k}" data-from="${esc(t.uid)}">${cardHtml(t.card, { small: true })}<span>${name(t.uid)}</span></div>`).join('')}
        ${!holding && state.phase === 'play' && plays.length < n ? `<div class="skx-slot wait"><div class="skc sm empty">?</div><span>${name(turnUid)}</span></div>` : ''}
      </div>` : '';
    const label = holding
      ? `<div class="skx-cap win">⚓ <b>${name(winU)}</b> 승리!${state.lastTrick.note ? ` <em>${esc(state.lastTrick.note)}</em>` : ''}</div>`
      : state.phase === 'play' ? `<div class="skx-cap">${lead ? `기준 색 <b style="color:${SUITS[lead].color === '#23232b' ? '#e8e8f0' : SUITS[lead].color}">${SUITS[lead].name}</b>` : `<b>${tno + 1}번째 트릭</b>`}</div>`
      : state.phase === 'bid' ? `<div class="skx-cap">🏴‍☠️ 예측하는 중…</div>` : '';

    el.innerHTML = `
      <div class="sk skx">
        <div class="sk-head"><span class="sk-round">${state.ri + 1}<small>/${state.rounds.length}라운드</small></span><span class="sk-cards">카드 ${cards}장</span></div>
        <div class="skx-board">${state.order.map((u) => `<div class="skx-bp ${u === me ? 'me' : ''} ${u === turnUid && !holding ? 'turn' : ''}">
          <span class="skx-bface">${faceHtml(players[u] || { name: '?' })}</span><b>${name(u)}</b><em>${state.scores[u]}<small>점</small></em></div>`).join('')}</div>
        <div class="skx-stage">
          <i class="skx-glow l"></i><i class="skx-glow r"></i>
          <div class="skx-deck"><div class="skx-rope"></div><div class="skx-compass">${COMPASS}</div>
            <div class="skx-mid">${label}${center}</div>
          </div>
          ${seats}
        </div>
        ${isPlayer ? `<form class="sp-chat skx-chat"><input maxlength="60" placeholder="💬 채팅 (내 프로필 말풍선으로 떠요)" autocomplete="off" enterkeyhint="send"><button class="btn sm primary">전송</button></form>` : ''}
        <div class="nb-banner">${banner}</div>
        ${action}
        ${isPlayer && hand.length ? `
          <div class="ud-mine-title">🃏 내 카드 ${hand.length}장 ${myTurn ? '<small>낼 수 있는 카드만 밝게 보여요</small>' : ''}</div>
          <div class="sk-hand">${hand.map((id) => {
            const ok = myTurn && canPlay(myHand, state.trick, id);
            return `<button class="sk-cardbtn ${ok ? 'ok' : ''} ${myTurn && !ok ? 'no' : ''}" data-card="${id}" ${myTurn && !ok ? 'disabled' : ''}>${cardHtml(id)}</button>`;
          }).join('')}</div>` : ''}
        ${GUIDE()}
      </div>`;
    const $g = el.querySelector('.skg');
    if ($g) $g.ontoggle = () => (guideOpen = $g.open);

    // 카드가 낸 사람 자리에서 가운데로 날아와요
    const fromNew = fx.ckey === tKey ? fx.cnt : fx.ckey ? 0 : plays.length;
    el.querySelectorAll('.skx-slot[data-i]').forEach(($s) => {
      if (Number($s.dataset.i) < fromNew) return;
      const $seat = el.querySelector(`.skx-seat[data-u="${CSS.escape($s.dataset.from)}"] .skx-face`);
      if (!$seat) return;
      const A = $seat.getBoundingClientRect(), B = $s.getBoundingClientRect();
      $s.animate([
        { transform: `translate(${A.left + A.width / 2 - B.left - B.width / 2}px, ${A.top + A.height / 2 - B.top - B.height / 2}px) scale(.45) rotate(-20deg)`, opacity: 0.4 },
        { transform: 'translate(0,0) scale(1.08) rotate(3deg)', opacity: 1, offset: 0.8 },
        { transform: 'none', opacity: 1 },
      ], { duration: 520, easing: 'cubic-bezier(.3,.7,.3,1)' });
      sfxCard();
    });
    fx.ckey = tKey; fx.cnt = plays.length;

    // 잠깐 보여준 뒤 이긴 사람에게 카드를 모아 보내요
    if (holding) {
      const h = fx.hold;
      clearTimeout(fx.t1); clearTimeout(fx.t2);
      const flyAt = h.until - 650 - Date.now();
      fx.t1 = setTimeout(() => {
        const $w = el.querySelector(`.skx-seat[data-u="${CSS.escape(h.uid)}"] .skx-face`);
        if (!$w) return;
        const W = $w.getBoundingClientRect();
        el.querySelectorAll('.skx-slot[data-i]').forEach(($s, k) => {
          const B = $s.getBoundingClientRect();
          $s.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${W.left + W.width / 2 - B.left - B.width / 2}px, ${W.top + W.height / 2 - B.top - B.height / 2}px) scale(.3) rotate(${k % 2 ? 25 : -25}deg)`, opacity: 0 }],
            { duration: 560, delay: k * 50, easing: 'cubic-bezier(.5,0,.7,.4)', fill: 'forwards' });
        });
        sfxCard();
      }, Math.max(0, flyAt));
      fx.t2 = setTimeout(() => { fx.hold = null; if (lastCtx?.el.isConnected) lastCtx.self.render(lastCtx.el, lastCtx.ctx); }, Math.max(0, h.until - Date.now()) + 30);
    }

    if (!holding) roundModal(state, me, players, finished, sendMove);

    // 채팅: 방 채팅으로 보내면 내 프로필 위 말풍선으로 떠요
    const $cf = el.querySelector('.skx-chat');
    if ($cf) {
      const $in = $cf.querySelector('input');
      $in.value = chat.draft;
      $in.oninput = () => (chat.draft = $in.value);
      $in.onfocus = () => (chat.focus = true);
      $in.onblur = () => setTimeout(() => { if ($in.isConnected) chat.focus = false; }, 0);
      if (chat.focus) $in.focus({ preventScroll: true });
      $cf.onsubmit = (e) => {
        e.preventDefault();
        const text = $in.value.trim();
        const $g = document.querySelector('.gchat');
        if (!text || !$g) return;
        $g.querySelector('input').value = text;
        $g.requestSubmit();
        chat.draft = ''; $in.value = '';
      };
    }

    el.querySelectorAll('[data-bid]').forEach((b) => (b.onclick = () => sendMove({ type: 'bid', bid: Number(b.dataset.bid) })));
    const $next = el.querySelector('[data-next]');
    if ($next) $next.onclick = () => sendMove({ type: 'next' });
    el.querySelectorAll('[data-card]').forEach((b) => (b.onclick = () => {
      if (!myTurn) return;
      b.classList.add('sel');
      sendMove({ type: 'play', card: b.dataset.card });
    }));
  },
};
window.addEventListener?.('hashchange', () => document.querySelector('.sk-modal')?.remove());
