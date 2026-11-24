// 꿈틀 포격전 무기 · 아이템 목록 (cat: atk 공격 / move 이동 / util 유틸, n: 라운드당 개수, -1 = 무제한)
export const WEAPONS = [
  { id: 'shell', cat: 'atk', icon: '🚀', name: '일반 포탄', n: -1, charge: true, desc: '꾹 눌러 힘을 모아 쏘는 기본 포탄. 바람의 영향을 받고, 닿는 즉시 폭발해요.' },
  { id: 'homing', cat: 'atk', icon: '🎯', name: '유도탄', n: 1, charge: true, desc: '작은 미사일 6발이 날아가다가 가까운 적을 스스로 찾아가 타격해요.' },
  { id: 'grenade', cat: 'atk', icon: '💣', name: '수류탄', n: 3, charge: true, desc: '고르는 순간 5초 카운트다운 시작! 땅에 닿아도 튕기기만 하고, 시간이 되면 폭발해요. 손에 들고 있으면 내가 터져요!' },
  { id: 'flame', cat: 'atk', icon: '🔥', name: '화염방사기', n: 2, desc: '앞쪽 일직선으로 불을 내뿜어 맞은 적을 밀어내요.' },
  { id: 'mine', cat: 'atk', icon: '🧨', name: '지뢰', n: 2, charge: true, desc: '던져서 설치해요. 상대 팀에게는 보이지 않고, 상대가 가까이 오면 폭발해요.' },
  { id: 'pistol', cat: 'atk', icon: '🔫', name: '권총', n: -1, desc: '조준한 방향 일직선으로 한 발을 쏴요.' },
  { id: 'mg', cat: 'atk', icon: '🪖', name: '기관총', n: 2, desc: '조준한 방향으로 여러 발을 연속으로 쏴요. 조금씩 퍼져요.' },
  { id: 'radio', cat: 'atk', icon: '📻', name: '무전기', n: 1, target: true, desc: '화면을 눌러 목표를 찍고 발사! 전투기가 날아와 미사일 3발을 가로로 떨어뜨려요.' },
  { id: 'chicken', cat: 'atk', icon: '🐔', name: '닭', n: 1, desc: '닭 한 마리가 보는 방향으로 달려가요. 발사 버튼을 한 번 더 누르면 꼬끼오! 하고 크게 폭발해요.' },
  { id: 'tele', cat: 'move', icon: '🌀', name: '이동탄', n: 2, charge: true, desc: '쏜 탄이 떨어진 곳으로 순간이동해요. (차례가 끝나지 않아요)' },
  { id: 'drill', cat: 'move', icon: '🪛', name: '드릴', n: 2, desc: '발사 버튼을 누르고 있는 동안 조준한 방향으로 땅굴을 파며 나아가요.' },
  { id: 'rope', cat: 'move', icon: '🪢', name: '로프', n: -1, desc: '로프를 쏴서 지형에 걸어요. 좌우로 흔들고 위아래로 줄을 감거나 풀어요. 발사 버튼을 다시 누르면 놓고 날아가요.' },
  { id: 'jet', cat: 'move', icon: '🎒', name: '제트배낭', n: 1, desc: '5초 동안 로켓처럼 날아다녀요. 조이스틱 위로 상승, 좌우로 이동. 시간이 끝나면 그 자리에서 떨어져요.' },
  { id: 'chute', cat: 'move', icon: '🪂', name: '낙하산', n: -1, desc: '떨어지는 중에 발사 버튼을 누르면 낙하산이 펴져 천천히 내려가요 (바람에 밀려요). 한 번 더 누르면 접혀요.' },
  { id: 'pill', cat: 'util', icon: '💊', name: '알약', n: 2, desc: '꿈틀이 체력을 30 회복해요.' },
  { id: 'medkit', cat: 'util', icon: '🧰', name: '구급상자', n: 1, desc: '꿈틀이 체력을 60 회복해요.' },
  { id: 'tornado', cat: 'util', icon: '🌪️', name: '토네이도', n: 1, desc: '내 앞에 회오리바람을 만들어요. 날아오는 탄을 튕겨 되돌려 보내요. (2턴 유지)' },
  { id: 'fog', cat: 'util', icon: '🌫️', name: '안개', n: 1, desc: '안개가 깔려서 모두 자기 팀 꿈틀이만 보여요. (2턴 유지)' },
];
export const WMAP = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));
export const CATS = { atk: '공격', move: '이동', util: '유틸' };
export const startInv = () => Object.fromEntries(WEAPONS.map((w) => [w.id, w.n]));
