import { person, ring } from './_kit.js';
const card = (r, w = 150) => `<div class="avc" style="width:${w}px"><img src="img/avalon/${r}.webp"></div>`;
const R5 = ring(5, 640, 300, 420, 220);
const seats = () => R5.map((p, i) => ({ h: person(i), ...p }));
export default {
  meta: { name: '아발론', emoji: '⚔️', sub: '보드게임 · 5~10명', pills: ['정의 팀 vs 악 팀', '원정 <b>5번</b>'] },
  scenes: [
    { step: '역할', stepNo: 1, d: 7.5, cap: '모두에게 <i>비밀 역할</i> · 정의 팀과 악 팀으로 나뉘어요',
      narr: '모두에게 비밀 역할이 주어져요. 멀린, 퍼시벌, 충신은 정의 팀, 암살자, 모르가나 같은 역할은 악 팀이에요. 멀린은 악 팀을 알고, 악 팀은 서로를 알아요.',
      items: [...['merlin', 'percival', 'servant'].map((r, i) => ({ h: card(r, 130), x: 200 + i * 150, y: 290, at: .3 + i * .25, pop: true })),
        ...['assassin', 'morgana', 'minion'].map((r, i) => ({ h: card(r, 130), x: 780 + i * 150, y: 290, at: 1.2 + i * .25, pop: true })),
        { h: '<div class="tag blue" style="font-size:26px">정의 팀</div>', x: 350, y: 460, at: 2.2 }, { h: '<div class="tag red" style="font-size:26px">악 팀</div>', x: 930, y: 460, at: 2.2 }] },
    { step: '원정대', stepNo: 2, d: 7, cap: '대표가 원정대를 고르고, 모두 <i>찬성 / 반대</i> 투표!',
      narr: '원정은 다섯 번이에요. 매번 대표가 정해진 인원만큼 원정대를 고르고, 모두 찬성 반대 투표를 해요. 찬성이 과반이면 출발, 아니면 다음 사람이 대표가 돼요.',
      items: [...seats(), { h: '<div class="t mid">👑</div>', x: R5[0].x, y: R5[0].y - 80, at: .3 },
        ...[1, 3].map((i, k) => ({ h: '<div class="t mid">🛡️</div>', x: R5[i].x + 50, y: R5[i].y - 40, at: 1 + k * .4, pop: true })),
        ...R5.map((p, i) => ({ h: `<div class="tag ${i === 2 ? 'red' : 'green'}">${i === 2 ? '반대' : '찬성'}</div>`, x: p.x, y: p.y + 85, at: 3, pop: true })),
        { h: '<div class="t mid green">찬성 4 : 1 → 출발!</div>', x: 640, y: 300, at: 4, pop: true }] },
    { step: '원정', stepNo: 3, d: 7.5, cap: '원정대는 몰래 <i>성공 / 실패</i>를 내요 · 실패가 1장이라도 있으면 원정 실패!',
      narr: '원정대는 몰래 성공이나 실패 카드를 내요. 정의 팀은 성공만 낼 수 있어요. 실패가 한 장이라도 있으면 원정은 실패예요.',
      items: [{ h: '<div class="avt"><img src="img/avalon/good.webp"></div>', x: 540, y: 250, at: .5, pop: true }, { h: '<div class="avt"><img src="img/avalon/evil.webp"></div>', x: 740, y: 250, at: 1.1, pop: true },
        { h: '<div class="t mid red">실패 1장 → 원정 실패!</div>', x: 640, y: 420, at: 2.4, pop: true }] },
    { step: '승리', stepNo: 4, d: 8, cap: '원정 3번 실패 → 악 팀 승리 · 3번 성공 → 암살자가 <i>멀린</i>을 지목!',
      narr: '원정이 세 번 실패하면 악 팀이 이겨요. 세 번 성공하면 마지막으로 암살자가 멀린을 지목해요. 맞히면 악 팀 역전승, 틀리면 정의 팀 승리! 이긴 팀 모두 가넷 두 개를 받아요.',
      items: [{ h: card('assassin', 150), x: 380, y: 280, at: .3 }, { h: '<div class="t big">🗡️ →</div>', x: 600, y: 280, at: 1.2, pop: true }, { h: card('merlin', 150), x: 820, y: 280, at: 1.6, pop: true },
        { h: '<div class="tag gold" style="font-size:26px">이긴 팀 가넷 +2</div>', x: 640, y: 480, at: 3, pop: true }] },
  ],
};
