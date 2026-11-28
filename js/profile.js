// 프로필 · 인장 · 티어 계산
// users/{uid} = {
//   name, photo,
//   garnets: 보유 인장 수,
//   stats: { [gameId]: { plays, wins(인장을 받은 판 = 승), garnets(그 게임에서 받은 인장) } },  패 = plays - wins
//   lastMatch: 마지막으로 기록한 판 (중복 기록 방지)
// }

// 보유 인장 개수로 티어 결정
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

// O의 인장 아이콘 — 금빛 팔각 엠블럼 (O게임 오리지널)
export const GARNET = '<img class="garnet" src="/img/seal-64.webp" alt="" aria-hidden="true" draggable="false">';

// 고를 수 있는 캐릭터 프로필 (avatars.js의 오리지널 캐릭터)
import { CHARACTERS } from './avatars.js';
export const AVATAR_PRESETS = CHARACTERS.map((c) => `char:${c.id}`);
