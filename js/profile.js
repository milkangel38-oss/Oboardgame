// 프로필 · 가넷 · 티어 계산
// users/{uid} = {
//   name, photo,
//   garnets: 보유 가넷 수,
//   stats: { [gameId]: { plays, wins(가넷을 받은 판 = 승), garnets(그 게임에서 받은 가넷) } },  패 = plays - wins
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
  return { plays, wins, losses: Math.max(0, plays - wins), garnets, rate: plays ? Math.round((wins / plays) * 100) : 0 };
}

export function summarize(profile) {
  const garnets = profile?.garnets || 0;
  let plays = 0, wins = 0;
  for (const s of Object.values(profile?.stats || {})) { plays += s.plays || 0; wins += s.wins || 0; }
  const { tier, next } = tierOf(garnets);
  const progress = next ? Math.min(100, Math.round(((garnets - tier.min) / (next.min - tier.min)) * 100)) : 100;
  return { garnets, plays, wins, losses: Math.max(0, plays - wins), rate: plays ? Math.round((wins / plays) * 100) : 0, tier, next, progress };
}

// 가넷 아이콘 — 반짝이는 붉은 정육면체 보석 (O게임 오리지널)
export const GARNET = `<svg class="garnet" viewBox="0 0 20 20" aria-hidden="true">
<polygon points="10,1.5 18.2,6 10,10.5 1.8,6" fill="#ff7d8e"/>
<polygon points="1.8,6 10,10.5 10,19 1.8,14.5" fill="#d01c3b"/>
<polygon points="18.2,6 10,10.5 10,19 18.2,14.5" fill="#86091f"/>
<polygon points="10,3.2 15.4,6 10,8.8 4.6,6" fill="#ffb3bd" opacity=".55"/>
<polygon points="3.4,8.2 8.4,11 8.4,16.2 3.4,13.4" fill="#e8394f" opacity=".6"/>
<polygon points="16.6,8.2 11.6,11 11.6,16.2 16.6,13.4" fill="#5e0515" opacity=".55"/>
<polyline points="1.8,6 10,10.5 18.2,6" fill="none" stroke="#ffd0d6" stroke-width=".55" opacity=".9"/>
<line x1="10" y1="10.5" x2="10" y2="19" stroke="#ff9aa8" stroke-width=".45" opacity=".6"/>
<polygon points="7.2,4.4 9.6,3.2 10.4,3.7 8,4.9" fill="#fff" opacity=".9"/>
</svg>`;

// 고를 수 있는 캐릭터 프로필 (avatars.js의 오리지널 캐릭터)
import { CHARACTERS } from './avatars.js';
export const AVATAR_PRESETS = CHARACTERS.map((c) => `char:${c.id}`);
