// 미스터리 사인 문제 규칙 (O게임 오리지널)
// level 1 쉬움 · 2 보통 · 3 어려움 · 4 넌센스 — 라운드마다 무작위로 섞여 나와요.
// f(a, b): 두 수 a, b (0 ~ 999,999,999, BigInt)에 미스터리 사인 ◆를 적용한 결과 (BigInt)
// 1억대 수끼리 곱하면 일반 숫자로는 정확도가 깨져서 BigInt로 계산해요.

export const LEVELS = { 2: '보통', 3: '어려움', 4: '너무 어려움' };

const digits = (n) => (n < 0n ? -n : n).toString().split('').map(Number);
const dsum = (n) => BigInt(digits(n).reduce((s, d) => s + d, 0));
const rev = (n) => BigInt((n < 0n ? -n : n).toString().split('').reverse().join('')) * (n < 0n ? -1n : 1n);
const HOLES = [1, 0, 0, 0, 1, 0, 1, 0, 2, 1];    // 숫자 모양의 동그란 구멍
const SEGMENTS = [6, 2, 5, 5, 4, 5, 6, 3, 7, 6]; // 디지털 시계 숫자의 막대 수
const both = (a, b) => [...digits(a), ...digits(b)];
const max = (a, b) => (a > b ? a : b);

export const RULES = [

  { id: 'concat', level: 2, f: (a, b) => BigInt(`${a}${b}`), desc: '두 수를 그대로 이어 붙여요' },
  { id: 'mulMinusA', level: 2, f: (a, b) => a * b - a, desc: '두 수를 곱하고 앞 수를 빼요' },
  { id: 'mulPlusSum', level: 2, f: (a, b) => a * b + a + b, desc: '두 수의 곱 + 두 수의 합' },
  { id: 'sqPlus', level: 2, f: (a, b) => a * a + b, desc: '앞 수의 제곱 + 뒤 수' },
  { id: 'twoAminusB', level: 2, f: (a, b) => 2n * a - b, desc: '앞 수 × 2 − 뒤 수' },
  { id: 'lastDigit', level: 2, f: (a, b) => (a + b) % 10n, desc: '두 수를 더한 값의 일의 자리' },
  { id: 'halfMul', level: 2, f: (a, b) => (a * b) / 2n, desc: '두 수를 곱하고 반으로 나눠요 (소수점 버림)' },

  { id: 'digitSum', level: 3, f: (a, b) => dsum(a) + dsum(b), desc: '두 수의 모든 자릿수 숫자를 더해요' },
  { id: 'mulDigitSum', level: 3, f: (a, b) => dsum(a * b), desc: '두 수를 곱한 결과의 자릿수를 모두 더해요' },
  { id: 'sqDiff', level: 3, f: (a, b) => a * a - b * b, desc: '앞 수의 제곱 − 뒤 수의 제곱' },
  { id: 'revSum', level: 3, f: (a, b) => rev(a + b), desc: '두 수의 합을 거꾸로 읽어요' },
  { id: 'modPlus1', level: 3, f: (a, b) => a % (b + 1n), desc: '앞 수를 (뒤 수 + 1)로 나눈 나머지' },
  { id: 'cond', level: 3, f: (a, b) => (a > b ? a - b : a * b), desc: '앞 수가 더 크면 빼고, 아니면 곱해요' },

  { id: 'holes', level: 4, f: (a, b) => BigInt(both(a, b).reduce((s, d) => s + HOLES[d], 0)), desc: '숫자 모양의 동그란 구멍 개수 (0·4·6·9는 1개, 8은 2개)' },
  { id: 'segments', level: 4, f: (a, b) => BigInt(both(a, b).reduce((s, d) => s + SEGMENTS[d], 0)), desc: '디지털 시계 숫자로 쓸 때 켜지는 막대 개수의 합' },
  { id: 'evenDigits', level: 4, f: (a, b) => BigInt(both(a, b).filter((d) => d % 2 === 0).length), desc: '두 수에 들어 있는 짝수 숫자(0·2·4·6·8)의 개수' },
  { id: 'sqSumMinusMul', level: 4, f: (a, b) => a * a + b * b - a * b, desc: '앞 수² + 뒤 수² − 두 수의 곱' },
  { id: 'revMul', level: 4, f: (a, b) => rev(a) * rev(b), desc: '두 수를 각각 거꾸로 읽은 뒤 곱해요' },
  { id: 'digitsMul', level: 4, f: (a, b) => both(a, b).reduce((s, d) => s * BigInt(d || 1), 1n), desc: '모든 자릿수 숫자를 곱해요 (0은 건너뛰기)' },
];

export const getRule = (id) => RULES.find((r) => r.id === id);

// 결과를 문자열로 (저장·비교용)
export const apply = (rule, a, b) => rule.f(BigInt(a), BigInt(b)).toString();

// 난이도 무작위 + 이미 나온 규칙은 피하기
export function pickRule(used = []) {
  const level = 2 + Math.floor(Math.random() * 3); // 보통 · 어려움 · 너무 어려움
  let pool = RULES.filter((r) => r.level === level && !used.includes(r.id));
  if (!pool.length) pool = RULES.filter((r) => !used.includes(r.id));
  if (!pool.length) pool = RULES;
  return pool[Math.floor(Math.random() * pool.length)];
}

// 문제 숫자 (1~12)
export function pickTarget() {
  const r = () => 1 + Math.floor(Math.random() * 12);
  return [r(), r()];
}
