// 프로필 · 가넷 · 티어 계산
// users/{uid} = {
//   name, photo,
//   garnets: 보유 가넷 수,
//   stats: { [gameId]: { plays, wins(1등 횟수), garnets(그 게임에서 받은 가넷) } },
//   lastMatch: 마지막으로 기록한 판 (중복 기록 방지)
// }

// 보유 가넷 개수로 티어 결정
export const TIERS = [
  { name: '브론즈', min: 0, color: '#d08a57', icon: '🥉' },    // 0 ~ 10
  { name: '실버', min: 11, color: '#c9d2e3', icon: '🥈' },     // 11 ~ 30
  { name: '골드', min: 31, color: '#ffd84d', icon: '🥇' },     // 31 ~ 50
  { name: '플래티넘', min: 51, color: '#5ef0d0', icon: '💠' }, // 51 ~ 70
  { name: '다이아', min: 71, color: '#7cc4ff', icon: '💎' },   // 71 ~ 99
  { name: '마스터', min: 100, color: '#ff6fb5', icon: '👑' },  // 100 이상
];

export function tierOf(garnets) {
  let i = 0;
  while (i + 1 < TIERS.length && garnets >= TIERS[i + 1].min) i++;
  return { tier: TIERS[i], next: TIERS[i + 1] || null };
}

export function gameRecord(stats, gameId) {
  const s = stats?.[gameId] || {};
  const plays = s.plays || 0, wins = s.wins || 0, garnets = s.garnets || 0;
  return { plays, wins, garnets, rate: plays ? Math.round((wins / plays) * 100) : 0 };
}

export function summarize(profile) {
  const garnets = profile?.garnets || 0;
  let plays = 0, wins = 0;
  for (const s of Object.values(profile?.stats || {})) { plays += s.plays || 0; wins += s.wins || 0; }
  const { tier, next } = tierOf(garnets);
  const progress = next ? Math.min(100, Math.round(((garnets - tier.min) / (next.min - tier.min)) * 100)) : 100;
  return { garnets, plays, wins, rate: plays ? Math.round((wins / plays) * 100) : 0, tier, next, progress };
}

// 가넷 아이콘 — 브릴리언트 컷 보석을 옆에서 본 모양 (짙은 석류빛 빨강)
export const GARNET = `<svg class="garnet" viewBox="0 0 20 20" aria-hidden="true">
<polygon points="3,7.5 7,3 13,3 17,7.5 10,18.5" fill="#5a0715"/>
<polygon points="3,7.5 7,3 8.6,7.5" fill="#c8223f"/>
<polygon points="7,3 13,3 11.4,7.5 8.6,7.5" fill="#e8455e"/>
<polygon points="13,3 17,7.5 11.4,7.5" fill="#931229"/>
<polygon points="3,7.5 8.6,7.5 10,18.5" fill="#a0162f"/>
<polygon points="8.6,7.5 11.4,7.5 10,18.5" fill="#6d0a1d"/>
<polygon points="11.4,7.5 17,7.5 10,18.5" fill="#480512"/>
<polyline points="3,7.5 17,7.5" stroke="#ff8a9a" stroke-width=".5" fill="none" opacity=".7"/>
<polygon points="8,3.6 10.6,3.6 9.6,6.4 8.4,6.4" fill="#fff" opacity=".75"/>
</svg>`;

// 고를 수 있는 캐릭터 프로필 (avatars.js의 오리지널 캐릭터)
import { CHARACTERS } from './avatars.js';
export const AVATAR_PRESETS = CHARACTERS.map((c) => `char:${c.id}`);
