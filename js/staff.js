// 감독(선임·효과)과 구단 수익 활동(스폰서 계약·굿즈·입장 수익·콘텐츠·팬 이벤트)
(function (G) {
  const L = G.LFM, W = L.world, M = L.manage, sim = L.sim, clamp = L.clamp, I = L.AI;
  const St = (L.staff = {});
  const S = () => W.get(), R = () => W.rng();

  // 감독 특성: 선수 능력치·성장·사기에 직접 영향
  St.TRAITS = {
    lane: { ko: '라인전 설계', desc: '선발 전원의 라인전 +1', attr: 'lan' },
    fight: { ko: '한타 조련', desc: '선발 전원의 한타 +1', attr: 'tf' },
    macro: { ko: '운영 설계', desc: '선발 전원의 운영 지능 +1', attr: 'mac' },
    eco: { ko: '성장 동선', desc: '선발 전원의 골드 수급 +1', attr: 'eco' },
    vision: { ko: '시야 설계', desc: '선발 전원의 시야 장악 +1', attr: 'vis' },
    clutch: { ko: '큰 경기 승부사', desc: '선발 전원의 클러치 +1', attr: 'clt' },
    mental: { ko: '멘탈 케어', desc: '선발 전원의 안정감 +1, 패배 후 사기 하락이 절반', attr: 'con' },
    bond: { ko: '팀 케미', desc: '선발 전원의 팀워크 +1, 팀 호흡이 빨리 오른다', attr: 'tw' },
    youth: { ko: '유망주 조련', desc: '21세 이하 선수의 성장 속도 +40%' },
    veteran: { ko: '베테랑 관리', desc: '26세 이상 선수의 기량 하락 속도 -40%' },
    meta: { ko: '메타 해석', desc: '어떤 조합 성향을 골라도 선수들이 능숙하게 소화한다' },
  };
  St.TRAIT_KEYS = Object.keys(St.TRAITS);
  St.ATTR = [['tac', '전술', '경기 중 운영 판단(오브젝트·교전 타이밍)을 끌어올린다'], ['draft', '밴픽', '조합 상성의 이득을 키우고 손해를 줄인다'], ['dev', '육성', '선수 성장 속도를 높인다'], ['mot', '동기부여', '선수 컨디션과 사기 회복을 돕는다']];
  St.rating = (c) => (c.tac + c.draft + c.dev + c.mot) / 4;
  St.wageOf = (c) => Math.round((Math.exp((St.rating(c) - 8) / 3.5) * 900 * W.infl()) / 100) * 100;
  St.of = (t) => (t && S().coaches ? S().coaches[t.coachId] : null);
  St.level = (c) => Math.round(c.tac * 0.6 + c.draft * 0.4);

  const CN = ['Kang', 'Moon', 'Seo', 'Hwang', 'Bae', 'Noh', 'Vega', 'Lind', 'Okoye', 'Brandt', 'Sato', 'Tran', 'Costa', 'Novak', 'Reyes', 'Ilves', 'Marsh', 'Duarte', 'Aydin', 'Volkov'];
  St.make = function (src, level) {
    const s = S(), r = R(), h = L.rng(L.hash((src && src.id) || 'gc' + s.nextId));
    const v = () => clamp(Math.round(level + h.norm(0, 2.1)), 3, 20);
    const c = {
      id: (src && src.id) || 'gc' + s.nextId++, n: (src && src.n) || `${r.pick(CN)} ${String.fromCharCode(65 + r.int(0, 25))}.`, rn: (src && src.rn) || '', c: (src && src.c) || '',
      by: (src && src.by) || s.year - r.int(28, 48), tac: v(), draft: v(), dev: v(), mot: v(), trait: h.pick(St.TRAIT_KEYS), style: h.pick(L.STYLE_KEYS), t: null, gen: src ? 0 : 1,
    };
    c.wage = St.wageOf(c); s.coaches[c.id] = c; return c;
  };
  St.assign = function (t, c) {
    const old = St.of(t); if (old) old.t = null;
    t.coachId = c.id; c.t = t.id; t.coach = St.level(c);
  };
  // 새 게임: 실제 감독을 팀에 배치하고, 없는 팀은 가상 감독으로 채운다
  St.init = function (D) {
    const s = S(); s.coaches = {};
    const lvl = (t) => clamp((t.rep - 40) / 3, 4, 17);
    for (const src of D.coaches || []) {
      const t = src.t && s.teams[src.t];
      const c = St.make(src, t ? lvl(t) + (src.wr - 0.5) * 4 : clamp((src.base - 40) / 3 - 1 + (src.wr - 0.5) * 3, 4, 16));
      if (t && !t.coachId) St.assign(t, c);
    }
    for (const lg of Object.values(s.leagues)) for (const tid of lg.teams) { const t = s.teams[tid]; if (!t.coachId) St.assign(t, St.make(null, lvl(t) - (t.created ? 2 : 0) + R().range(-1, 1))); }
    for (let i = 0; i < 24; i++) St.make(null, R().range(6, 15));
    const ut = s.teams[s.user]; ut.fans = St.fansBase(ut); St.newDeals(ut); ut.content = 0; ut.eventAt = -99;
  };

  // 경기에 들어가는 선수 정보: 감독 효과가 반영된 능력치
  St.view = function (t, tac) {
    const c = St.of(t), lu = sim.lineup(t), tr = c ? St.TRAITS[c.trait] : null, big = 0;
    const fm = c ? 1 + (c.mot - 10) * 0.002 + (tac && tac.style === c.style ? 0.012 : 0) : 1;
    return lu.map((p) => {
      let a = p.a, st = p.st;
      if (tr && tr.attr) { a = p.a.slice(); const k = I[tr.attr]; a[k] = Math.min(20, a[k] + 1 + big); }
      if (c && c.trait === 'meta' && tac && !st.includes(tac.style)) st = st.concat(tac.style);
      return { id: p.id, n: p.n, r: p.r, a, form: p.form * fm, morale: p.mor, st, sk: L.skillOf(p) };
    });
  };
  St.afterGame = function (t, win) {
    const c = St.of(t), s = S(); if (!c) return;
    if (c.trait === 'mental' && !win) for (const id of t.lineup) if (s.players[id]) s.players[id].mor = clamp(s.players[id].mor + 0.01, 0.05, 1);
    if (c.trait === 'bond') t.syn = clamp(t.syn + 0.004, 0.15, 1);
  };
  St.growMul = (t, age) => { const c = St.of(t); return c ? (c.dev - 10) * 0.03 + (c.trait === 'youth' && age <= 21 ? 0.4 : 0) : 0; };
  St.declMul = (t) => { const c = St.of(t); return c && c.trait === 'veteran' ? 0.6 : 1; };

  // 선임
  St.willing = (c, t) => St.rating(c) <= (t.rep - 40) / 3 + 4.5;
  St.hireCost = (c, t) => { const old = St.of(t); return Math.round(c.wage * 0.2 + (old ? old.wage * 0.5 : 0)); };
  St.hire = function (cid) {
    const s = S(), t = s.teams[s.user], c = s.coaches[cid], old = St.of(t);
    if (!c || c.t) return { ok: 0, msg: '이미 다른 팀과 계약한 감독입니다.' };
    if (!St.willing(c, t)) return { ok: 0, msg: `${c.n} 감독이 제안을 거절했습니다. 팀 명성이 더 높아져야 합니다.` };
    const cost = St.hireCost(c, t); if (t.money < cost) return { ok: 0, msg: '자금이 부족합니다.' };
    W.pay(t, -cost, `${c.n} 감독 선임${old ? ` · ${old.n} 감독 위약금` : ''}`); St.assign(t, c);
    W.news(`감독 선임: ${c.n}`, `${c.n} 감독이 지휘봉을 잡았습니다. 특성: ${St.TRAITS[c.trait].ko} (${St.TRAITS[c.trait].desc}). 선호 조합: ${L.STYLES[c.style].ko}.`, 'board');
    return { ok: 1, msg: `${c.n} 감독 선임 완료` };
  };
  St.retired = function (p) { // 이름 있는 선수가 은퇴하면 지도자로 돌아온다
    const peak = Math.max(0, ...p.car.map((x) => x.o || 0)); if (peak < 82 || p.gen) return;
    const c = St.make({ id: 'c:' + p.id, n: p.n, rn: p.rn, c: p.c, by: p.by }, clamp((peak - 62) / 3 + R().range(-2, 1), 5, 13));
    c.exPlayer = 1;
  };

  // ───────── 수익 활동 ─────────
  St.fansBase = (t) => Math.round(Math.exp((t.rep - 50) / 8) * 1500);
  St.fanRatio = (t) => clamp((t.fans || 1) / St.fansBase(t), 0.4, 2.5);
  St.newDeals = function (t) {
    const sp = W.sponsor(t), g = t.goalNow || W.goal(t), need = Math.max(1, g.need - 1), r100 = (v) => Math.round(v / 100) * 100;
    t.dealOffers = [
      { type: 'A', name: '안정형 계약', desc: '성적과 무관하게 고정 금액을 받습니다.', base: r100(sp * 0.4), win: 0 },
      { type: 'B', name: '성과형 계약', desc: '기본금은 적지만 시리즈를 이길 때마다 수당이 붙습니다. 많이 이기는 팀에 유리합니다.', base: r100(sp * 0.24), win: r100(sp * 0.011) },
      { type: 'C', name: '도전형 계약', desc: `가장 큰 금액을 받지만, 리그 최종 ${need}위 안에 들지 못하면 위약금을 냅니다.`, base: r100(sp * 0.56), win: 0, need, penalty: r100(sp * 0.28) },
    ];
    t.deal = t.dealOffers[0]; t.dealPicked = 0;
  };
  St.pickDeal = function (i) {
    const t = S().teams[S().user]; if (t.dealPicked) return { ok: 0, msg: '이번 시즌 스폰서 계약은 이미 맺었습니다.' };
    t.deal = t.dealOffers[i]; t.dealPicked = 1; return { ok: 1, msg: `${t.deal.name} 체결` };
  };
  St.weekly = function (t) { // 유저 팀의 주간 수입 내역
    const sp = W.sponsor(t), ratio = St.fanRatio(t);
    const items = [['리그 분배금·중계권', sp * 0.55 / 48], ['스폰서 계약', t.deal ? t.deal.base / 48 : 0], ['굿즈·유니폼 판매', (sp * 0.15 / 48) * ratio]];
    if (t.content) items.push(['콘텐츠·스트리밍', (sp * 0.1 / 48) * ratio]);
    return items.map(([n, v]) => [n, Math.round(v)]);
  };
  St.weeklyIncome = function (t) {
    const s = S();
    for (const [n, v] of St.weekly(t)) W.pay(t, v, n);
    if (t.content) for (const id of t.lineup) if (s.players[id]) s.players[id].form = clamp(s.players[id].form - 0.006, 0.9, 1.1);
  };
  St.ticket = (t, m) => Math.round(((W.sponsor(t) * 0.1) / 40) * St.fanRatio(t) * (m && m.stage !== 'reg' ? 2 : 1));
  St.afterSeries = function (m) {
    const s = S(); if (m.a !== s.user && m.b !== s.user) return;
    const t = s.teams[s.user], win = (m.res.s[0] > m.res.s[1]) === (m.a === s.user), c = s.comps[m.comp];
    W.pay(t, St.ticket(t, m), '경기 입장 수익');
    if (win && t.deal && t.deal.win) W.pay(t, t.deal.win, '스폰서 승리 수당');
    t.fans = Math.round(t.fans * (win ? 1.006 : 0.997));
    if (win && m.stage === 'final') t.fans = Math.round(t.fans * (c && c.type === 'intl' ? 1.25 : 1.1));
  };
  St.eventReady = (t) => (S().year * 336 + S().day) - (t.eventAt || -99) >= 28;
  St.eventGain = (t) => Math.round(W.sponsor(t) * 0.025 * St.fanRatio(t));
  St.fanEvent = function () {
    const s = S(), t = s.teams[s.user]; if (!St.eventReady(t)) return { ok: 0, msg: '팬 이벤트는 4주에 한 번 열 수 있습니다.' };
    const gain = St.eventGain(t); W.pay(t, gain, '팬미팅·사인회'); t.fans = Math.round(t.fans * 1.03); t.eventAt = s.year * 336 + s.day;
    for (const id of t.lineup) if (s.players[id]) s.players[id].form = clamp(s.players[id].form - 0.015, 0.9, 1.1);
    return { ok: 1, msg: `팬미팅 개최: +${L.fmtMoney(gain)}, 팬 3% 증가 (선수 컨디션 소폭 하락)` };
  };

  // 시즌 전환: 스폰서 정산, 팬 변동, 감독 이동
  St.rollover = function () {
    const s = S(), r = R(), ut = s.teams[s.user];
    if (ut.deal && ut.deal.type === 'C' && ut.dealPicked) {
      const rk = M.userRank();
      if (rk && rk.rank > ut.deal.need) { W.pay(ut, -ut.deal.penalty, '스폰서 목표 미달 위약금'); W.news('스폰서 위약금', `도전형 계약의 목표(리그 ${ut.deal.need}위 이내)를 달성하지 못해 위약금 ${L.fmtMoney(ut.deal.penalty)}을 냈습니다.`, 'board'); }
    }
    ut.fans = Math.round(ut.fans * 0.85 + St.fansBase(ut) * 0.15);
    for (const c of Object.values(s.coaches)) { const k = r.pick(['tac', 'draft', 'dev', 'mot']); c[k] = clamp(c[k] + r.int(-1, 1), 3, 20); c.wage = St.wageOf(c); if (!c.t && s.year - c.by > 58 && r() < 0.4) delete s.coaches[c.id]; }
    for (let i = 0; i < 4; i++) St.make(null, r.range(6, 14));
    // AI 팀: 성적 부진 팀은 감독 교체
    for (const lg of Object.values(s.leagues)) {
      const c2 = s.comps[`${lg.id}:summer`], rank = c2 && (c2.rank || c2.seeds);
      for (const tid of lg.teams) {
        const t = s.teams[tid]; if (W.managed(tid)) { const c = St.of(t); if (c) t.coach = St.level(c); continue; }
        const pos = rank ? rank.indexOf(tid) / Math.max(1, rank.length - 1) : 0.5, cur = St.of(t);
        if (!cur || r() < (pos > 0.7 ? 0.4 : 0.08)) {
          const cand = Object.values(s.coaches).filter((c) => !c.t && St.willing(c, t)).sort((a, b) => St.rating(b) - St.rating(a))[0];
          if (cand && (!cur || St.rating(cand) > St.rating(cur) - 1)) St.assign(t, cand); else if (!cur) St.assign(t, St.make(null, clamp((t.rep - 40) / 3, 4, 16)));
        }
        t.coach = St.level(St.of(t));
      }
    }
  };
  St.afterRollover = function () { const ut = S().teams[S().user]; St.newDeals(ut); };
})(typeof window !== 'undefined' ? window : globalThis);
