// 선수 고유 스킬: 이름은 선수마다 다르고, 효과는 아래 21종 가운데 하나. 단계(1~3)가 높을수록 강하다.
(function (G) {
  const L = G.LFM;
  // key: [기본 이름, 설명]
  L.SKILLS = {
    cs: ['파밍 장인', '미니언을 놓치지 않는다. CS 수급 판정 +{6}%'],
    farmjg: ['정글 풀캠', '정글 캠프에서 얻는 골드와 경험치 +{8}%'],
    duel: ['손싸움 자신감', '1대1·소규모 교전(한쪽 2명 이하)에서 주는 피해 +{9}%'],
    tf: ['한타 집중력', '4명 이상이 모인 한타에서 주는 피해 +{7}%'],
    late: ['후반 캐리', '25분 이후 주는 피해 +{8}%'],
    early: ['라인 주도권', '14분 전까지 주는 피해 +{8}%'],
    comeback: ['역전의 명수', '팀 골드가 뒤지고 있을 때 주는 피해 +{8}%, 받는 피해 -{6}%'],
    big: ['강심장', '플레이오프·국제전 같은 큰 경기에서 모든 능력 +{5}%'],
    streak: ['연쇄 처치', '킬에 관여하면 10초 동안 주는 피해 +{12}%'],
    gank: ['날카로운 갱킹', '갱킹을 갔을 때 상대가 빠져나갈 확률 -{12}%p'],
    roam: ['로밍 설계', '로밍 갱킹 때 상대가 빠져나갈 확률 -{8}%p'],
    vision: ['시야 장인', '아군이 갱킹을 당했을 때 빠져나갈 확률 +{10}%p'],
    engage: ['이니시에이터', '교전을 걸었을 때 상대를 붙잡을 확률 +{10}%p'],
    flex: ['넓은 챔프폭', '저격 밴의 영향을 받지 않고 어떤 조합도 능숙하게 소화한다'],
    rock: ['꾸준함', '경기마다의 기복이 {60}% 줄어든다'],
    dice: ['고점과 저점', '경기마다 고점(능력 +{9}%)과 저점(능력 -{9}%)을 오간다'],
    split: ['사이드 운영', '구조물에 주는 피해 +{20}%'],
    shot: ['오더 담당', '팀 전체의 운영 판단이 좋아진다 (단계당 감독 전술 +1.5 상당)'],
    nexus: ['수비의 달인', '아군 구조물 근처에서 주는 피해 +{8}%, 받는 피해 -{8}%'],
    cover: ['든든한 동료', '같은 교전에 있는 아군이 받는 피해 -{5}%'],
    spring: ['봄의 강자', '스프링 시즌과 MSI에서 모든 능력 +{5}%'],
  };
  L.SK_MUL = [0, 0.5, 1, 1.5];
  L.skillDesc = function (sk) {
    const d = L.SKILLS[sk[1]]; if (!d) return '';
    return d[1].replace(/\{(\d+)\}/g, (_, n) => String(Math.round(Number(n) * L.SK_MUL[sk[2]] * 10) / 10));
  };
  // 능력치에서 자동으로 정해지는 기본 스킬 (전용 스킬이 없는 선수)
  const BY_ATTR = { lan: 'early', mec: 'duel', tf: 'tf', mac: 'shot', vis: 'vision', eco: 'cs', con: 'rock', pool: 'flex', clt: 'big', tw: 'cover' };
  L.skillOf = function (p) {
    if (p.sk) return p.sk;
    let bi = 0, bv = -1;
    for (let i = 0; i < 10; i++) { const v = p.a[i] * L.ROLE_W[p.r][i] ** 0.35 + ((L.hash(p.id + i) % 100) / 100) * 0.9; if (v > bv) { bv = v; bi = i; } }
    let k = BY_ATTR[L.ATTRS[bi]]; if (k === 'cs' && p.r === 1) k = 'farmjg'; if (k === 'cs' && p.r === 4) k = 'vision';
    return [L.SKILLS[k][0], k, 1];
  };
})(typeof window !== 'undefined' ? window : globalThis);
