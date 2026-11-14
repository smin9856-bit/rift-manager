// 공통 상수·유틸 (브라우저와 Node 양쪽에서 로드 가능)
(function (G) {
  const L = (G.LFM = G.LFM || {});

  L.rng = function (seed) {
    let a = seed >>> 0 || 1;
    const f = function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.range = (lo, hi) => lo + (hi - lo) * f();
    f.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * f());
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    f.chance = (p) => f() < p;
    // 정규분포 근사
    f.norm = (m = 0, sd = 1) => m + sd * ((f() + f() + f() + f() + f() + f() - 3) / 0.7071);
    f.shuffle = (arr) => {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(f() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };
    return f;
  };
  L.hash = function (s) {
    let h = 2166136261;
    s = String(s);
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  };
  L.clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

  L.ROLES = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'];
  L.ROLE_KO = ['탑', '정글', '미드', '원딜', '서폿'];
  // 세부 능력치 (1~20)
  L.ATTRS = ['lan', 'mec', 'tf', 'mac', 'vis', 'eco', 'con', 'pool', 'clt', 'tw'];
  L.ATTR_KO = ['라인전', '메카닉', '한타', '운영 지능', '시야 장악', '골드 수급', '안정감', '챔피언 폭', '클러치', '팀워크'];
  L.ATTR_DESC = ['라인전 단계에서 상대를 압박하고 주도권을 잡는 능력', '피지컬. 교전에서 스킬을 맞히고 피하는 손놀림', '5대5 한타에서의 위치 선정과 화력', '오브젝트·교전 타이밍을 읽는 판단력', '와드와 시야 싸움. 갱킹과 기습을 미리 읽는다', 'CS와 정글 캠프를 빠짐없이 챙겨 성장 격차를 벌리는 능력', '멘탈과 꾸준함. 실수가 적고 연속으로 죽어도 흔들리지 않는다', '다룰 수 있는 챔피언의 폭. 저격 밴과 조합 변화에 강하다', '결승·5세트·후반 한타 같은 중요한 순간의 집중력', '팀원과의 호흡과 연계'];
  L.AI = {}; L.ATTRS.forEach((k, i) => (L.AI[k] = i));
  // 포지션별 종합 능력 가중치
  L.ROLE_W = [
    [3.0, 2.4, 2.0, 1.6, 0.8, 1.7, 1.6, 1.4, 1.4, 1.0], // 탑
    [1.2, 2.0, 2.0, 3.0, 2.2, 1.7, 1.4, 1.2, 1.4, 1.6], // 정글
    [2.6, 3.0, 2.2, 1.8, 0.8, 1.8, 1.4, 1.6, 1.4, 1.0], // 미드
    [2.6, 3.0, 2.8, 1.0, 0.6, 2.2, 1.8, 1.0, 1.4, 1.0], // 원딜
    [1.6, 1.4, 2.2, 2.4, 3.0, 0.3, 1.4, 1.4, 1.4, 2.2], // 서폿
  ];
  L.ovr = function (p, role) {
    const w = L.ROLE_W[role == null ? p.r : role];
    let s = 0, ws = 0;
    for (let i = 0; i < 10; i++) { s += w[i] * p.a[i]; ws += w[i]; }
    const v = (s / ws) * 5;
    return role != null && role !== p.r ? v * 0.86 : v; // 포지션 외 기용 불이익
  };

  // 조합 성향
  L.STYLES = {
    teamfight: { ko: '한타', desc: '5대5 정면 한타에 강합니다. 포킹에 약하고 스플릿에 흔들립니다.', early: 0.97, mid: 1.03, late: 1.05 },
    dive: { ko: '돌진', desc: '후방 딜러를 직접 노립니다. 포킹 조합의 천적입니다.', early: 1.02, mid: 1.05, late: 0.97 },
    poke: { ko: '포킹', desc: '대치 구도에서 체력을 깎고 타워를 빠르게 밉니다. 돌진에 약합니다.', early: 1.0, mid: 1.04, late: 1.0 },
    split: { ko: '스플릿', desc: '탑이 사이드를 밀며 상대를 갈라놓습니다. 캐치 조합에 끊기기 쉽습니다.', early: 1.0, mid: 1.02, late: 1.02 },
    pick: { ko: '캐치', desc: '시야 싸움으로 한 명씩 끊습니다. 뭉쳐 다니는 한타 조합엔 효과가 줄어듭니다.', early: 1.01, mid: 1.04, late: 0.99 },
    early: { ko: '초반 스노우볼', desc: '갱킹과 초반 교전으로 굴립니다. 길어지면 힘이 빠집니다.', early: 1.09, mid: 1.0, late: 0.91 },
    late: { ko: '후반 밸류', desc: '초반을 버티고 후반 화력으로 역전합니다.', early: 0.92, mid: 1.0, late: 1.1 },
  };
  L.STYLE_KEYS = Object.keys(L.STYLES);
  // 상성: COUNTER[a][b] > 0 이면 a가 b에게 유리
  const C = (L.COUNTER = {});
  L.STYLE_KEYS.forEach((a) => { C[a] = {}; L.STYLE_KEYS.forEach((b) => (C[a][b] = 0)); });
  const adv = (a, b, v) => { C[a][b] = v; C[b][a] = -v; };
  adv('dive', 'poke', 0.05); adv('poke', 'teamfight', 0.04); adv('teamfight', 'dive', 0.03);
  adv('split', 'teamfight', 0.03); adv('pick', 'split', 0.05); adv('teamfight', 'pick', 0.04);
  adv('early', 'late', 0.03); adv('late', 'poke', 0.02); adv('dive', 'late', 0.02); adv('poke', 'split', 0.02);

  // 선수가 편하게 다루는 조합 성향 2개 (능력치와 ID에서 결정)
  L.playerStyles = function (p) {
    const a = p.a, I = L.AI;
    const sc = {
      teamfight: a[I.tf] + a[I.tw] * 0.5, dive: (a[I.lan] + a[I.mec]) / 2 + a[I.mec] * 0.5, poke: a[I.con] + a[I.lan] * 0.5,
      split: a[I.lan] + a[I.mec] * 0.4 + (p.r === 0 ? 3 : -2), pick: a[I.vis] + a[I.mac] * 0.5,
      early: (a[I.lan] + a[I.mec]) / 2 + a[I.lan] * 0.5, late: a[I.con] + a[I.tf] * 0.5,
    };
    const h = L.rng(L.hash(p.id));
    return L.STYLE_KEYS.map((k) => [k, sc[k] + h() * 6]).sort((x, y) => y[1] - x[1]).slice(0, 2).map((x) => x[0]);
  };

  L.fmtMoney = function (v) { // 단위: 만원
    if (Math.abs(v) >= 10000) return (v / 10000).toFixed(v % 10000 === 0 ? 0 : 1) + '억';
    return Math.round(v).toLocaleString() + '만';
  };
})(typeof window !== 'undefined' ? window : globalThis);
