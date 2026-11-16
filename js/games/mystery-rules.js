// 미스터리 사인 문제 규칙 (O게임 오리지널)
// level 1(쉬움) ~ 4(넌센스). 라운드가 진행될수록 높은 단계가 나와요.
// f(a, b): 두 수 a, b(0~99)에 미스터리 사인 ◆를 적용한 결과 (정수)

const digits = (n) => String(Math.abs(n)).split('').map(Number);
const dsum = (n) => digits(n).reduce((s, d) => s + d, 0);
const rev = (n) => Number(String(Math.abs(n)).split('').reverse().join('')) * Math.sign(n || 1);
const HOLES = [1, 0, 0, 0, 1, 0, 1, 0, 2, 1]; // 숫자 모양의 동그란 구멍
const SEGMENTS = [6, 2, 5, 5, 4, 5, 6, 3, 7, 6]; // 디지털 시계 숫자의 막대 수
const both = (a, b) => [...digits(a), ...digits(b)];

export const RULES = [
  { id: 'plus1', level: 1, f: (a, b) => a + b + 1, desc: '두 수를 더하고 1을 더해요' },
  { id: 'sum2x', level: 1, f: (a, b) => (a + b) * 2, desc: '두 수를 더한 뒤 2배 해요' },
  { id: 'absdiff', level: 1, f: (a, b) => Math.abs(a - b), desc: '큰 수에서 작은 수를 빼요' },
  { id: 'a2b', level: 1, f: (a, b) => a + 2 * b, desc: '앞 수 + 뒤 수 × 2' },
  { id: 'max2x', level: 1, f: (a, b) => Math.max(a, b) * 2, desc: '더 큰 수의 2배' },

  { id: 'concat', level: 2, f: (a, b) => Number(`${a}${b}`), desc: '두 수를 그대로 이어 붙여요' },
  { id: 'mulMinusA', level: 2, f: (a, b) => a * b - a, desc: '두 수를 곱하고 앞 수를 빼요' },
  { id: 'mulPlusSum', level: 2, f: (a, b) => a * b + a + b, desc: '두 수의 곱 + 두 수의 합' },
  { id: 'sqPlus', level: 2, f: (a, b) => a * a + b, desc: '앞 수의 제곱 + 뒤 수' },
  { id: 'twoAminusB', level: 2, f: (a, b) => 2 * a - b, desc: '앞 수 × 2 − 뒤 수' },
  { id: 'lastDigit', level: 2, f: (a, b) => (a + b) % 10, desc: '두 수를 더한 값의 일의 자리' },
  { id: 'halfMul', level: 2, f: (a, b) => Math.floor((a * b) / 2), desc: '두 수를 곱하고 반으로 나눠요 (소수점 버림)' },

  { id: 'digitSum', level: 3, f: (a, b) => dsum(a) + dsum(b), desc: '두 수의 모든 자릿수 숫자를 더해요' },
  { id: 'mulDigitSum', level: 3, f: (a, b) => dsum(a * b), desc: '두 수를 곱한 결과의 자릿수를 모두 더해요' },
  { id: 'sqDiff', level: 3, f: (a, b) => a * a - b * b, desc: '앞 수의 제곱 − 뒤 수의 제곱' },
  { id: 'revSum', level: 3, f: (a, b) => rev(a + b), desc: '두 수의 합을 거꾸로 읽어요' },
  { id: 'modPlus1', level: 3, f: (a, b) => a % (b + 1), desc: '앞 수를 (뒤 수 + 1)로 나눈 나머지' },
  { id: 'cond', level: 3, f: (a, b) => (a > b ? a - b : a * b), desc: '앞 수가 더 크면 빼고, 아니면 곱해요' },

  { id: 'holes', level: 4, f: (a, b) => both(a, b).reduce((s, d) => s + HOLES[d], 0), desc: '숫자 모양의 동그란 구멍 개수 (0·4·6·9는 1개, 8은 2개)' },
  { id: 'segments', level: 4, f: (a, b) => both(a, b).reduce((s, d) => s + SEGMENTS[d], 0), desc: '디지털 시계 숫자로 쓸 때 켜지는 막대 개수의 합' },
  { id: 'evenDigits', level: 4, f: (a, b) => both(a, b).filter((d) => d % 2 === 0).length, desc: '두 수에 들어 있는 짝수 숫자(0·2·4·6·8)의 개수' },
  { id: 'digitsMul', level: 4, f: (a, b) => both(a, b).reduce((s, d) => s * (d || 1), 1), desc: '모든 자릿수 숫자를 곱해요 (0은 건너뛰기)' },
];

export const getRule = (id) => RULES.find((r) => r.id === id);

// 라운드 i(1부터) / 전체 n 라운드 → 난이도
export function levelFor(i, n) {
  return Math.min(4, 1 + Math.floor(((i - 1) * 4) / n));
}

export function pickRule(level, used = []) {
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
