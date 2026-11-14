// 유스 발굴: 스카우트를 보내 가상의 유망주를 찾고, 아카데미에서 키워 1군으로 올린다
(function (G) {
  const L = G.LFM, W = L.world, clamp = L.clamp;
  const Y = (L.youth = {});
  const S = () => W.get(), R = () => W.rng();
  const now = () => S().year * 336 + S().day;

  Y.TIERS = [
    { k: 'local', name: '지역 대회 관찰', desc: '가까운 아마추어 대회를 둘러봅니다. 싸고 빠르지만 대어는 드뭅니다.', cost: 400, days: 14, n: 2, q: 0 },
    { k: 'camp', name: '유망주 캠프 개최', desc: '지원자를 모아 직접 테스트합니다. 무난한 선택입니다.', cost: 1200, days: 21, n: 3, q: 1 },
    { k: 'wide', name: '전담 스카우트 파견', desc: '솔로 랭크 상위권과 학생 대회를 샅샅이 뒤집니다. 비싸지만 특급 재능을 찾을 확률이 높습니다.', cost: 3200, days: 28, n: 4, q: 2 },
  ];
  Y.cost = (tier) => Math.round((tier.cost * W.infl()) / 100) * 100;
  Y.signFee = () => Math.round((300 * W.infl()) / 100) * 100;
  Y.wage = () => Math.round((600 * W.infl()) / 100) * 100;
  Y.cap = () => 3 + S().teams[S().user].youth;
  function pseudo(id, name) {
    const s = S(), u = s.teams[s.user];
    if (!s.teams[id]) s.teams[id] = { id, name, short: id === 'acad' ? 'ACA' : '-', region: u.region, league: null, color: u.color, lineup: [], rep: 999, fac: 1, youth: 1, syn: 0.5, tactics: { style: 'teamfight' }, hist: [], fin: { inc: 0, exp: 0, log: [] }, money: 0, pseudo: 1 };
    s.teams[id].region = u.region; return s.teams[id];
  }
  Y.academy = () => W.roster('acad');
  Y.prospects = () => W.roster('scout');
  Y.regions = () => Object.values(S().leagues).filter((l) => l.tier === 1).sort((a, b) => b.base - a.base);

  Y.start = function (region, k) {
    const s = S(), t = s.teams[s.user], tier = Y.TIERS.find((x) => x.k === k);
    if (s.scout) return { ok: 0, msg: '이미 스카우트가 활동 중입니다.' };
    const cost = Y.cost(tier); if (t.money < cost) return { ok: 0, msg: '자금이 부족합니다.' };
    W.pay(t, -cost, `유스 발굴: ${tier.name}`); s.scout = { region, k, until: now() + tier.days };
    return { ok: 1, msg: `${W.regionName(region)}에서 ${tier.name} 시작 (${tier.days}일 소요)` };
  };
  Y.daily = function () {
    const s = S(), t = s.teams[s.user];
    if (s.scout && now() >= s.scout.until) {
      const sc = s.scout, tier = Y.TIERS.find((x) => x.k === sc.k), r = R(); s.scout = null; pseudo('scout', '발굴 후보');
      const base = (s.leagues[sc.region + '1'] || { base: 60 }).base, names = [];
      for (let i = 0; i < tier.n; i++) {
        const age = r.int(15, 17), ovr = clamp(base - 23 + tier.q * 1.5 + t.youth + r.norm(0, 3), 35, 72);
        const p = W.genPlayer(sc.region, r.int(0, 4), ovr, age, 99), o = L.ovr(p);
        const gem = r() < 0.05 + tier.q * 0.035 + t.youth * 0.01;
        p.pot = Math.round(clamp(gem ? r.range(88, 97) : 63 + r.norm(0, 8) + tier.q * 3 + t.youth * 1.5 + (base - 60) * 0.35, o + 3, 97));
        p.potSeen = Math.round(clamp(p.pot + r.norm(0, Math.max(1.5, 7 - t.youth)), o + 1, 99)); // 스카우트 보고서의 예상치 (아카데미 등급이 높을수록 정확)
        p.t = 'scout'; p.cEnd = s.year + 9; p.wage = 0; p.found = now(); p.youthOf = 1; names.push(`${p.n}(${L.ROLE_KO[p.r]}, ${age}세)`);
      }
      W.news('유스 발굴 보고', `${W.regionName(sc.region)} ${tier.name} 결과, 유망주 ${tier.n}명을 찾았습니다: ${names.join(', ')}. 30일 안에 [유스] 화면에서 아카데미 입단 여부를 정하세요.`, 'youth');
    }
    for (const p of Y.prospects()) if (now() - p.found > 30) delete s.players[p.id];
    if (s.day % 7 === 0) { const n = Y.academy().length; if (n) W.pay(t, -Math.round((n * Y.wage()) / 48), '아카데미 운영비'); }
  };
  Y.sign = function (pid) {
    const s = S(), t = s.teams[s.user], p = s.players[pid];
    if (Y.academy().length >= Y.cap()) return { ok: 0, msg: `아카데미 정원(${Y.cap()}명)이 찼습니다. 유스 아카데미를 확장하거나 선수를 정리하세요.` };
    const fee = Y.signFee(); if (t.money < fee) return { ok: 0, msg: '자금이 부족합니다.' };
    pseudo('acad', `${t.name} 아카데미`); W.pay(t, -fee, `${p.n} 아카데미 입단`); p.t = 'acad'; p.wage = Y.wage();
    return { ok: 1, msg: `${p.n} 아카데미 입단` };
  };
  Y.promote = function (pid) {
    const s = S(), t = s.teams[s.user], p = s.players[pid];
    if (W.roster(t.id).length >= 10) return { ok: 0, msg: '1군 로스터가 가득 찼습니다 (10명).' };
    p.t = t.id; p.wage = Math.max(Math.round(1200 * W.infl()), Math.round((W.wageAsk(p) * 0.6) / 100) * 100); p.cEnd = s.year + 2; p.mor = 0.8; delete p.potSeen;
    W.news(`1군 승격: ${p.n}`, `아카데미에서 직접 키운 ${p.n}(${L.ROLE_KO[p.r]}, ${s.year - p.by}세)이(가) 1군에 합류했습니다.`, 'youth');
    return { ok: 1, msg: `${p.n} 1군 승격` };
  };
  Y.drop = function (pid) { delete S().players[pid]; return { ok: 1, msg: '내보냈습니다.' }; };
  // 아카데미 선수의 성장 환경 (1군 벤치보다 빠르다)
  Y.env = function () { const t = S().teams[S().user], c = L.staff.of(t); return 1.05 + t.youth * 0.13 + (c ? (c.dev - 10) * 0.03 + (c.trait === 'youth' ? 0.4 : 0) : 0); };
  Y.rollover = function () {
    const s = S(), old = Y.academy().filter((p) => s.year - p.by >= 20);
    for (const p of Y.academy()) p.cEnd = s.year + 9;
    if (old.length) W.news('아카데미 졸업 대상', `${old.map((p) => p.n).join(', ')} 선수가 20세가 되었습니다. 1군으로 올리거나 내보낼 때입니다. 21세가 되면 자동으로 팀을 떠납니다.`, 'youth');
    for (const p of Y.academy()) if (s.year - p.by >= 21) { p.t = null; p.cEnd = s.year; p.wage = W.wageAsk(p); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
