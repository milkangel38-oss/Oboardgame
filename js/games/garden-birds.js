// 새들의 정원 — 새 카드 데이터와 그림 (모두 직접 만든 능력치·능력·그림)
// 서식지: f 숲 · g 들판 · w 물가 / 먹이: B 벌레 · S 씨앗 · F 열매 · I 물고기 · M 쥐 · * 아무거나
export const FOODS = ['B', 'S', 'F', 'I', 'M'];
export const FOOD = {
  B: { name: '벌레', icon: '🐛' }, S: { name: '씨앗', icon: '🌾' }, F: { name: '열매', icon: '🍒' },
  I: { name: '물고기', icon: '🐟' }, M: { name: '쥐', icon: '🐭' }, '*': { name: '아무 먹이', icon: '⭐' },
};
export const HAB = { f: { name: '숲', icon: '🌲' }, g: { name: '들판', icon: '🌾' }, w: { name: '물가', icon: '🌊' } };

// 능력: 언제 · 무엇
// 갈색(활성) = 이 새가 있는 줄의 행동을 할 때 · 흰색(놓을 때) · 분홍(다른 사람 차례에) · 초록(라운드 끝)
export function powerInfo(p) {
  if (!p) return null;
  const [k, x] = p.split(':');
  const f = (c) => FOOD[c]?.icon || "";
  const T = {
    gainFood: ['act', `공급처에서 ${f(x)} 1개 얻기`],
    eggSelf: ['act', '이 새에 알 1개 낳기'],
    eggAny: ['act', '알 1개 더 낳기 (빈자리 있는 새)'],
    draw: ['act', '새 카드 1장 뽑기'],
    flock: ['act', '덱 맨 위 카드를 이 새 밑에 끼우기 (1장당 1점)'],
    cache: ['act', `공급처의 ${f(x)} 1개를 이 새에 저장 (1개당 1점)`],
    hunt: ['act', `주사위를 굴려 ${f(x)}가 나오면 이 새에 저장 (1점)`],
    share: ['act', `모두 ${f(x)} 1개씩 얻고, 나는 1개 더`],
    tradeEgg: ['act', '먹이 1개를 내고 알 2개 낳기'],
    wFood: ["play", `${[...(x || "")].map(f).join(" ")} 얻기`],
    wDraw2: ['play', '새 카드 2장 뽑기'],
    wEgg2: ['play', '알 2개 낳기 (빈자리 있는 새)'],
    pEgg: ['pink', '다른 사람이 알 낳기를 하면 이 새에 알 1개'],
    pFood: ['pink', `다른 사람이 먹이 얻기를 하면 ${f(x)} 1개 얻기`],
    rEgg: ['round', '이 새에 알 1개 낳기'],
    rDraw: ['round', '새 카드 1장 뽑기'],
  }[k];
  if (!T) return null;
  const when = { act: '활성', play: '놓을 때', pink: '다른 사람 차례', round: '라운드 끝' }[T[0]];
  return { key: k, x, kind: T[0], when, text: T[1] };
}

// [이름, 모양, 서식지, 먹이, 점수, 알 칸, 능력, 색(몸·날개·배·머리·부리), 특징]
const RAW = [
  ['참새', 'song', 'gf', 'S', 2, 4, 'flock', '#a0764a,#6e4a2a,#ece0cc,#7a4a2a,#3a2a1a', 'cheek'],
  ['까치', 'crow', 'gf', 'B*', 4, 4, 'cache:B', '#151515,#1d2f6e,#f4f4f4,#151515,#151515', 'longtail'],
  ['까마귀', 'crow', 'fgw', 'M*', 5, 3, 'hunt:M', '#121218,#1a1a26,#20202a,#121218,#121218', ''],
  ['직박구리', 'song', 'f', 'F', 2, 3, 'gainFood:F', '#8a8f99,#6d727c,#a8adb5,#7b808a,#2a2a2a', 'brcheek'],
  ['박새', 'song', 'f', 'B', 2, 5, 'cache:S', '#5c6a4a,#4a5a6a,#f2f2ee,#151515,#151515', 'whitecheek'],
  ['동박새', 'song', 'f', 'F', 3, 3, 'eggAny', '#8fb53a,#6f9a2a,#f0e9a6,#8fb53a,#2a2a2a', 'eyering'],
  ['딱새', 'song', 'fg', 'B', 2, 4, 'draw', '#5a5a5a,#1d1d1d,#e8823a,#9a9a9a,#1a1a1a', ''],
  ['오목눈이', 'song', 'f', 'B', 3, 6, 'flock', '#e9e3dc,#5a4a4a,#f6efe8,#ffffff,#1a1a1a', 'longtail'],
  ['꾀꼬리', 'song', 'f', 'BF', 5, 3, 'wFood:FF', '#f2c81e,#1d1d1d,#f6d84a,#f2c81e,#e2567a', 'mask'],
  ['파랑새', 'song', 'f', 'B', 4, 3, 'pFood:B', '#2a5fae,#1e467e,#3a6fbe,#1e3a6e,#e0402a', ''],
  ['물총새', 'song', 'w', 'I', 4, 4, 'gainFood:I', '#1e8fc9,#1872a8,#e8823a,#1e8fc9,#151515', 'longbill'],
  ['원앙', 'duck', 'w', 'SF', 6, 4, 'wEgg2', '#c8743a,#4a3a7a,#f4f0e8,#2e6a5a,#e0402a', 'crest'],
  ['청둥오리', 'duck', 'wg', 'S*', 3, 5, 'eggSelf', '#9a9a9a,#6a5a4a,#cfc7bd,#1e6e3e,#f2c81e', ''],
  ['두루미', 'wader', 'gw', 'IS*', 8, 2, '', '#f6f6f2,#151515,#f6f6f2,#151515,#5a5a4a', 'redcap'],
  ['백로', 'wader', 'w', 'I', 3, 4, 'tradeEgg', '#fbfbf8,#eeeeea,#ffffff,#fbfbf8,#f2c81e', ''],
  ['왜가리', 'wader', 'w', 'II', 5, 3, 'hunt:I', '#9aa2ad,#6e7680,#e6e8ea,#e6e8ea,#d9a43a', 'mask'],
  ['황새', 'wader', 'wg', 'IM', 7, 2, 'rEgg', '#fbfbf8,#151515,#fbfbf8,#fbfbf8,#2a2a2a', 'redleg'],
  ['가마우지', 'duck', 'w', 'II', 4, 3, 'cache:I', '#1a1d1a,#2a2f2a,#2a2a28,#1a1d1a,#e0b23a', 'longneck'],
  ['물수리', 'raptor', 'w', 'II*', 6, 2, 'hunt:I', '#5a4030,#4a3020,#f6f2ea,#f6f2ea,#2a2a2a', 'mask'],
  ['갈매기', 'duck', 'wg', '*', 2, 3, 'share:I', '#f6f6f6,#9aa4b0,#ffffff,#f6f6f6,#f2c81e', ''],
  ['제비', 'song', 'g', 'B', 3, 4, 'pEgg', '#1e2a5a,#16204a,#f2ece4,#1e2a5a,#151515', 'forktail'],
  ['종다리', 'song', 'g', 'S', 2, 4, 'eggSelf', '#a8875a,#7a5f3a,#e9dcc2,#a8875a,#5a4a3a', 'crest'],
  ['꿩', 'ground', 'gf', 'SB', 5, 5, 'wFood:SS', '#b0602a,#7a4a2a,#c87a3a,#1e5a4a,#e2c87a', 'longtail,redface'],
  ['메추라기', 'ground', 'g', 'S', 1, 6, 'eggAny', '#a07a52,#7a5a3a,#d8c09a,#8a6a4a,#4a3a2a', ''],
  ['비둘기', 'song', 'gf', 'S', 1, 3, 'share:S', '#8a90a0,#6a7080,#9aa0ae,#5a7a8a,#2a2a2a', ''],
  ['뻐꾸기', 'song', 'fg', 'B', 4, 1, 'wEgg2', '#7a7f88,#5a5f68,#e8e8e0,#7a7f88,#2a2a2a', 'barred'],
  ['부엉이', 'owl', 'f', 'M*', 6, 2, 'hunt:M', '#8a6a4a,#6a4a2a,#c8a87a,#8a6a4a,#2a2a2a', 'tufts'],
  ['올빼미', 'owl', 'fg', 'M', 5, 3, 'rDraw', '#9a8a7a,#7a6a5a,#d8ccbc,#9a8a7a,#d9c07a', ''],
  ['매', 'raptor', 'gf', 'MM', 6, 2, 'cache:M', '#4a5a6a,#2a3a4a,#f2ede4,#2a2f3a,#f2c81e', 'barred'],
  ['황조롱이', 'raptor', 'g', 'MB', 4, 3, 'hunt:M', '#b8683a,#8a4a2a,#f0dcc0,#8a9aaa,#f2c81e', ''],
  ['수리부엉이', 'owl', 'f', 'MM*', 8, 1, '', '#7a5a3a,#5a3a1a,#b8946a,#7a5a3a,#2a2a2a', 'tufts,bigeye'],
  ['딱따구리', 'wood', 'f', 'B*', 4, 4, 'gainFood:B', '#1a1a1a,#1a1a1a,#f4f4f0,#f4f4f0,#2a2a2a', 'redcap'],
  ['동고비', 'wood', 'f', 'SB', 3, 5, 'cache:S', '#6a86a8,#4a6688,#f2e6d6,#6a86a8,#2a2a2a', 'mask'],
  ['어치', 'crow', 'f', 'SF', 3, 4, 'draw', '#c09080,#2a2a2a,#e0c8b8,#c09080,#2a2a2a', 'bluepatch'],
  ['후투티', 'song', 'g', 'B', 4, 4, 'wDraw2', '#e09050,#151515,#f0b070,#e09050,#2a2a2a', 'crest,barwing,longbill'],
  ['호반새', 'song', 'wf', 'IB', 5, 3, 'pFood:I', '#d0502a,#a03a1e,#f0905a,#d0502a,#e0302a', 'longbill'],
  ['저어새', 'wader', 'w', 'II', 7, 2, 'rDraw', '#fbfbf8,#eeeeea,#ffffff,#fbfbf8,#151515', 'spoon'],
  ['논병아리', 'duck', 'w', 'I', 2, 5, 'eggSelf', '#7a5a3a,#5a4a3a,#d8b890,#5a3a2a,#2a2a2a', ''],
  ['큰고니', 'duck', 'wg', 'SS*', 9, 2, '', '#ffffff,#f0f0ee,#ffffff,#ffffff,#f2c81e', 'longneck'],
  ['개개비', 'song', 'wg', 'B', 2, 4, 'pEgg', '#a08a62,#7a6a4a,#e8dcc0,#a08a62,#4a3a2a', ''],
  ['할미새', 'song', 'wg', 'B', 2, 4, 'draw', '#7a7f88,#151515,#f6f6f2,#151515,#151515', 'longtail,whitecheek'],
  ['흰뺨검둥오리', 'duck', 'w', 'S', 2, 4, 'share:S', '#6a5a4a,#4a3a2a,#9a8a7a,#d8ccbc,#151515', 'mask'],
];

export const BIRDS = RAW.map(([name, shape, hab, cost, pts, eggs, power, cols, flags], i) => {
  const [body, wing, belly, head, beak] = cols.split(',');
  return { i, name, shape, hab: hab.split(''), cost: cost.split(''), pts, eggs, power, c: { body, wing, belly, head, beak }, flags: flags ? flags.split(',') : [] };
});

// ── 새 그림 (SVG, 모양별) ──
export function birdSvg(b) {
  const { body, wing, belly, head, beak } = b.c;
  const F = new Set(b.flags);
  const eye = (x, y, r = 2.6) => `${F.has('eyering') ? `<circle cx="${x}" cy="${y}" r="${r + 2}" fill="#fff"/>` : ''}<circle cx="${x}" cy="${y}" r="${r}" fill="#111"/><circle cx="${x + 0.8}" cy="${y - 0.8}" r="${r / 3}" fill="#fff"/>`;
  const extras = (hx, hy, hr) => [
    F.has('cheek') ? `<circle cx="${hx - 1}" cy="${hy + hr * 0.45}" r="${hr * 0.35}" fill="#1a1a1a" opacity=".85"/>` : '',
    F.has('whitecheek') ? `<ellipse cx="${hx - 2}" cy="${hy + hr * 0.3}" rx="${hr * 0.55}" ry="${hr * 0.4}" fill="#fff"/>` : '',
    F.has('brcheek') ? `<ellipse cx="${hx - 1}" cy="${hy + hr * 0.3}" rx="${hr * 0.45}" ry="${hr * 0.3}" fill="#8a4a2a"/>` : '',
    F.has('mask') ? `<path d="M${hx - hr} ${hy - 1} L${hx + hr} ${hy - 2} L${hx + hr} ${hy + 2} L${hx - hr} ${hy + 2}Z" fill="#151515" opacity=".85"/>` : '',
    F.has('redcap') ? `<ellipse cx="${hx}" cy="${hy - hr * 0.75}" rx="${hr * 0.55}" ry="${hr * 0.35}" fill="#e0302a"/>` : '',
    F.has('redface') ? `<circle cx="${hx + 1}" cy="${hy}" r="${hr * 0.5}" fill="#e0302a"/>` : '',
    F.has('crest') ? `<path d="M${hx - hr * 0.4} ${hy - hr * 0.8} L${hx - hr * 1.6} ${hy - hr * 2} L${hx - hr * 0.3} ${hy - hr * 1.5} L${hx - hr * 0.6} ${hy - hr * 2.2} L${hx + hr * 0.4} ${hy - hr * 0.9}Z" fill="${F.has('barwing') ? '#e09050' : head}" stroke="${F.has('barwing') ? '#151515' : 'none'}" stroke-width=".8"/>` : '',
  ].join('');
  const tail = F.has('longtail') ? `<path d="M18 50 L-6 66 L-2 70 L22 56Z" fill="${wing}"/>` : F.has('forktail') ? `<path d="M20 50 L2 66 L10 58 L4 70 L24 55Z" fill="${wing}"/>` : `<path d="M20 50 L6 60 L10 63 L24 55Z" fill="${wing}"/>`;
  const wingDeco = F.has('barwing') ? `<path d="M36 40 l18 0 M34 46 l18 0 M36 52 l14 0" stroke="#fff" stroke-width="2.5"/>` : F.has('barred') ? `<path d="M40 52 l14 0 M38 57 l14 0 M42 62 l10 0" stroke="${wing}" stroke-width="1.6" opacity=".7"/>` : F.has('bluepatch') ? `<rect x="44" y="40" width="10" height="5" fill="#2a6ad0"/>` : '';
  const bill = (x, y, len = 9) => F.has('longbill') ? `<path d="M${x} ${y - 2} L${x + len + 8} ${y} L${x} ${y + 2}Z" fill="${beak}"/>` : `<path d="M${x} ${y - 2.5} L${x + len * 0.7} ${y} L${x} ${y + 2.5}Z" fill="${beak}"/>`;
  let g = '';
  switch (b.shape) {
    case 'duck': {
      const neck = F.has('longneck');
      g = `<path d="M8 62 Q50 72 92 62" stroke="#5ab0d8" stroke-width="3" fill="none" opacity=".7"/>
        <ellipse cx="46" cy="54" rx="30" ry="13" fill="${body}"/><ellipse cx="44" cy="50" rx="18" ry="8" fill="${wing}"/>
        <path d="M16 52 L6 46 L14 56Z" fill="${wing}"/>
        ${neck ? `<path d="M66 50 Q74 30 66 18" stroke="${head}" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="68" cy="17" r="6.5" fill="${head}"/>${eye(70, 15, 1.8)}${extras(68, 17, 6.5)}<path d="M73 15 L84 19 L73 21Z" fill="${beak}"/>`
          : `<circle cx="70" cy="38" r="9" fill="${head}"/>${eye(73, 36)}${extras(70, 38, 9)}<path d="M77 37 Q88 39 86 42 Q80 43 77 41Z" fill="${beak}"/>`}`;
      break;
    }
    case 'wader': {
      const legC = F.has('redleg') ? '#d0302a' : '#3a3a3a';
      g = `<path d="M44 58 L42 78 M52 58 L56 78" stroke="${legC}" stroke-width="2.4"/>
        <ellipse cx="46" cy="48" rx="20" ry="11" fill="${body}"/><path d="M30 44 Q46 36 62 46 Q50 54 30 50Z" fill="${wing}"/>
        <path d="M58 42 Q70 30 62 16" stroke="${head}" stroke-width="6" fill="none" stroke-linecap="round"/>
        <circle cx="63" cy="14" r="6" fill="${head}"/>${eye(65, 12, 1.8)}${extras(63, 14, 6)}
        ${F.has('spoon') ? `<path d="M68 13 L86 15" stroke="${beak}" stroke-width="2.5"/><ellipse cx="88" cy="15.5" rx="4" ry="3" fill="${beak}"/>` : `<path d="M68 12 L90 15 L68 16Z" fill="${beak}"/>`}`;
      break;
    }
    case 'raptor':
      g = `<path d="M40 70 L38 76 M52 70 L54 76" stroke="#d9a43a" stroke-width="3"/>
        <path d="M34 66 L26 78 L44 72Z" fill="${wing}"/>
        <ellipse cx="46" cy="50" rx="17" ry="22" fill="${belly}"/><path d="M30 38 Q22 58 34 72 L44 56Z" fill="${wing}"/><path d="M62 38 Q70 58 58 72 L50 56Z" fill="${body}"/>
        <circle cx="48" cy="26" r="11" fill="${head}"/>${eye(52, 24, 2.8)}${extras(48, 26, 11)}
        <path d="M57 26 Q64 26 62 33 Q60 30 57 31Z" fill="${beak}"/>${wingDeco}`;
      break;
    case 'owl':
      g = `<ellipse cx="50" cy="50" rx="22" ry="26" fill="${body}"/><ellipse cx="50" cy="56" rx="14" ry="17" fill="${belly}"/>
        <path d="M30 40 Q24 60 34 72 L40 52Z" fill="${wing}"/><path d="M70 40 Q76 60 66 72 L60 52Z" fill="${wing}"/>
        ${F.has('tufts') ? `<path d="M34 26 L30 10 L42 22Z M66 26 L70 10 L58 22Z" fill="${body}"/>` : ''}
        <circle cx="41" cy="34" r="${F.has('bigeye') ? 8 : 7}" fill="#f2b21e"/><circle cx="59" cy="34" r="${F.has('bigeye') ? 8 : 7}" fill="#f2b21e"/>
        <circle cx="41" cy="34" r="3.6" fill="#111"/><circle cx="59" cy="34" r="3.6" fill="#111"/>
        <path d="M47 40 L53 40 L50 46Z" fill="${beak}"/>
        <path d="M44 76 l-3 4 M50 77 l0 4 M56 76 l3 4" stroke="#d9a43a" stroke-width="2"/>`;
      break;
    case 'wood':
      g = `<rect x="66" y="0" width="16" height="80" rx="4" fill="#7a5a3a"/><path d="M70 10 l6 8 M72 40 l6 6 M70 62 l8 6" stroke="#5a3a1a" stroke-width="1.5"/>
        <path d="M46 62 L36 78 L50 70Z" fill="${wing}"/>
        <ellipse cx="54" cy="46" rx="11" ry="20" fill="${body}"/><ellipse cx="57" cy="48" rx="6" ry="15" fill="${belly}"/>
        <path d="M44 34 Q40 50 48 62 L52 44Z" fill="${wing}"/><path d="M46 40 l8 0 M45 46 l8 0 M46 52 l7 0" stroke="#fff" stroke-width="1.6" opacity="${b.c.body === '#1a1a1a' ? 1 : 0}"/>
        <circle cx="54" cy="24" r="9" fill="${head}"/>${eye(50, 22, 2.2)}${extras(54, 24, 9)}
        <path d="M46 23 L34 25 L46 27Z" fill="${beak}"/>`;
      break;
    case 'ground':
      g = `<path d="M44 66 L42 76 M54 66 L56 76" stroke="#7a6a5a" stroke-width="2.4"/>${F.has('longtail') ? `<path d="M26 50 L-4 40 L-2 46 L26 56Z" fill="${wing}"/><path d="M26 52 L-2 50 L0 54Z" fill="${body}"/>` : ''}
        <ellipse cx="48" cy="52" rx="24" ry="16" fill="${body}"/><ellipse cx="44" cy="50" rx="15" ry="9" fill="${wing}"/>
        <path d="M34 48 l12 2 M36 54 l10 1" stroke="${belly}" stroke-width="1.6" opacity=".7"/>
        <circle cx="68" cy="36" r="9" fill="${head}"/>${eye(71, 34)}${extras(68, 36, 9)}${bill(76, 37, 7)}`;
      break;
    case 'crow':
    case 'song':
    default: {
      const big = b.shape === 'crow';
      g = `<path d="M10 70 L92 64" stroke="#7a5a3a" stroke-width="4" stroke-linecap="round"/><path d="M70 66 L82 58" stroke="#6a8a3a" stroke-width="3"/>
        <path d="M44 62 L42 69 M52 62 L52 68" stroke="#4a3a2a" stroke-width="2"/>
        ${tail}
        <ellipse cx="46" cy="${big ? 47 : 50}" rx="${big ? 24 : 20}" ry="${big ? 15 : 13}" fill="${body}"/>
        <ellipse cx="50" cy="${big ? 52 : 54}" rx="${big ? 15 : 13}" ry="${big ? 9 : 8}" fill="${belly}"/>
        <path d="M30 ${big ? 42 : 46} Q46 ${big ? 34 : 38} 58 ${big ? 46 : 48} Q44 ${big ? 58 : 58} 28 ${big ? 52 : 54}Z" fill="${wing}"/>${wingDeco}
        <circle cx="${big ? 68 : 64}" cy="${big ? 32 : 36}" r="${big ? 12 : 10}" fill="${head}"/>${eye(big ? 72 : 67, big ? 30 : 34)}${extras(big ? 68 : 64, big ? 32 : 36, big ? 12 : 10)}
        ${bill(big ? 79 : 73, big ? 33 : 37, big ? 11 : 8)}`;
    }
  }
  return `<svg viewBox="0 0 100 80" class="bird-svg" aria-hidden="true">${g}</svg>`;
}
