// 프로필 · 전적 · 티어 계산
// users/{uid} = { name, photo, stats: { [gameId]: { w, l, d } }, lastMatch }

// 승 3점, 무 1점
export const TIERS = [
  { name: '브론즈', min: 0, color: '#d08a57', icon: '🥉' },
  { name: '실버', min: 10, color: '#c9d2e3', icon: '🥈' },
  { name: '골드', min: 25, color: '#ffd84d', icon: '🥇' },
  { name: '플래티넘', min: 50, color: '#5ef0d0', icon: '💠' },
  { name: '다이아', min: 100, color: '#7cc4ff', icon: '💎' },
  { name: '마스터', min: 200, color: '#ff6fb5', icon: '👑' },
];

function rec(s) {
  const w = s?.w || 0, l = s?.l || 0, d = s?.d || 0;
  const games = w + l + d;
  return { w, l, d, games, rate: games ? Math.round((w / games) * 100) : 0 };
}

export function gameRecord(stats, gameId) {
  return rec(stats?.[gameId]);
}

export function summarize(stats) {
  const total = Object.values(stats || {}).reduce(
    (a, s) => ({ w: a.w + (s.w || 0), l: a.l + (s.l || 0), d: a.d + (s.d || 0) }),
    { w: 0, l: 0, d: 0 },
  );
  const r = rec(total);
  const points = r.w * 3 + r.d;
  let i = 0;
  while (i + 1 < TIERS.length && points >= TIERS[i + 1].min) i++;
  const tier = TIERS[i];
  const next = TIERS[i + 1] || null;
  const progress = next ? Math.round(((points - tier.min) / (next.min - tier.min)) * 100) : 100;
  return { ...r, points, tier, next, progress };
}

// 고를 수 있는 캐릭터 프로필 (avatars.js의 오리지널 캐릭터)
import { CHARACTERS } from './avatars.js';
export const AVATAR_PRESETS = CHARACTERS.map((c) => `char:${c.id}`);
