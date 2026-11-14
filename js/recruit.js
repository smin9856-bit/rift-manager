// 영입: 선수 명성·구단 충성도·인맥. 돈만으로는 안 되고, 제안을 넣어 선수가 받아들여야 온다.
(function (G) {
  const L = G.LFM, W = L.world, M = L.manage, clamp = L.clamp;
  const Rc = (L.recruit = {});
  const S = () => W.get(), R = () => W.rng();
  const now = () => S().year * 336 + S().day;

  // 명성(0~100): 실력과 성적에서 시작해 경기 평점에 따라 오르내린다
  Rc.fame = function (p) {
    if (p.fame == null) { const o = L.ovr(p); p.fame = Math.round(clamp((o - 58) * 2.3 + Math.max(0, p.pot - o) * 0.25 + (p.car ? p.car.length * 1.5 : 0), 0, 100)); }
    return p.fame;
  };
  // 충성도(0~100): 지금 구단에 대한 애착
  Rc.loy = function (p) {
    if (p.loy == null) p.loy = Math.round(clamp(52 + (L.hash(p.id + 'loy') % 41) - 20, 5, 95));
    return p.loy;
  };
  // 인맥: 그 팀에 예전 동료나 같은 나라 선수가 많을수록, 뛰어 본 팀일수록 높다
  Rc.bond = function (p, t) {
    let b = 0; const mates = p.mates || {};
    for (const q of W.roster(t.id)) { if (q.id === p.id) continue; if (mates[q.id]) b += Math.min(3, mates[q.id]) * 1.2; else if (q.c && q.c === p.c) b += 0.35; }
    if ((p.ex || []).includes(t.id)) b += 2.5;
    return Math.min(10, b);
  };
  Rc.friends = function (p, t) { const mates = p.mates || {}; return W.roster(t.id).filter((q) => mates[q.id]).map((q) => q.n); };
  // 선수가 기대하는 팀 명성
  Rc.expect = (p) => 44 + Rc.fame(p) * 0.46;

  // 제안이 받아들여질 확률
  Rc.chance = function (p, t, wageMul) {
    const s = S(), ask = W.wageAsk(p), cur = p.t ? s.teams[p.t] : null;
    const st = s.players[t.lineup[p.r]], starter = !st || L.ovr(p) > L.ovr(st, p.r) - 0.5;
    let x = 0.42 + (t.rep - Rc.expect(p)) / 18 + (wageMul - 1) * 1.1 + Rc.bond(p, t) * 0.045 + (starter ? 0.12 : -0.15);
    if (cur) x -= 0.12 + (Rc.loy(p) - 50) / 90 + (cur.rep > t.rep ? 0.1 : 0);
    else x += 0.1 + Math.min(0.2, (p.idle || 0) * 0.1);
    if (p.refused && p.refused[t.id] && now() - p.refused[t.id] < 21) x -= 0.5;
    return { p: clamp(x, 0.02, 0.97), ask, starter };
  };
  Rc.label = (v) => (v >= 0.75 ? ['매우 높음', 'good'] : v >= 0.5 ? ['높음', 'good'] : v >= 0.28 ? ['반반', 'warn'] : v >= 0.12 ? ['낮음', 'bad'] : ['거의 없음', 'bad']);

  // 영입 제안 (자유계약·이적 공통). 이적은 구단이 이적료에 동의해야 선수에게 제안이 간다.
  Rc.propose = function (pid, wageMul, years) {
    const s = S(), p = s.players[pid], t = s.teams[s.user];
    if (!p || p.t === t.id) return { ok: 0, msg: '제안할 수 없는 선수입니다.' };
    if (p.t && s.teams[p.t].pseudo) return { ok: 0, msg: '제안할 수 없는 선수입니다.' };
    if (W.roster(t.id).length >= 10) return { ok: 0, msg: '로스터는 최대 10명입니다.' };
    if (p.t && W.managed(p.t)) return { ok: 0, msg: '다른 참가자가 운영하는 팀의 선수는 영입할 수 없습니다.' };
    if (p.t && !W.windowOpen()) return { ok: 0, msg: '이적 시장이 닫혀 있습니다. 시즌 중에는 사전 접촉만 할 수 있습니다.' };
    const c = Rc.chance(p, t, wageMul), wage = Math.round((c.ask * wageMul) / 100) * 100;
    const fee = p.t ? M.askFee(p, t) : Math.round(wage * 0.15);
    if (t.money < fee) return { ok: 0, msg: `${p.t ? '이적료' : '계약금'} ${L.fmtMoney(fee)}을 낼 자금이 부족합니다.` };
    if (R()() > c.p) {
      p.refused = p.refused || {}; p.refused[t.id] = now();
      const why = t.rep < Rc.expect(p) - 4 ? '더 이름 있는 팀을 원합니다' : wageMul < 1.05 ? '연봉 조건이 만족스럽지 않습니다' : p.t && Rc.loy(p) > 65 ? '지금 팀에 남고 싶어 합니다' : '마음을 정하지 못했습니다';
      return { ok: 0, msg: `${p.n}이(가) 제안을 거절했습니다. ${why}. 3주 뒤에 다시 제안할 수 있습니다.` };
    }
    if (p.t) { const sel = s.teams[p.t]; W.pay(t, -fee, `${p.n} 이적료`); W.pay(sel, fee, `${p.n} 이적료`); p.t = t.id; W.autoLineup(sel); M.ensureRoles(sel); }
    else { W.pay(t, -fee, `${p.n} 계약금`); p.t = t.id; }
    Rc.joined(p, t, wage, years);
    W.news(`영입 완료: ${p.n}`, `${p.n}(${L.ROLE_KO[p.r]})이(가) 제안을 받아들였습니다. 연봉 ${L.fmtMoney(wage)}, ${years}년 계약.`, 'transfer');
    return { ok: 1, msg: `${p.n} 영입 완료` };
  };
  Rc.joined = function (p, t, wage, years) {
    const s = S(); p.ex = p.ex || []; if (!p.ex.includes(t.id)) p.ex.push(t.id);
    p.wage = wage; p.cEnd = s.year + years - 1; p.mor = 0.72; p.list = 0; p.loy = Math.round(clamp(46 + Rc.bond(p, t) * 3 + (t.rep - Rc.expect(p)) * 0.8, 20, 85)); p.pre = null;
    s.approach = (s.approach || []).filter((a) => a.pid !== p.id);
  };

  // 자유계약 선수가 먼저 입단을 희망해 온다
  Rc.approaches = function () {
    const s = S(), t = s.teams[s.user], r = R(); if (!W.managed(s.user)) return;
    s.approach = (s.approach || []).filter((a) => s.players[a.pid] && !s.players[a.pid].t && now() - a.at < 21);
    if (s.approach.length >= 3 || W.roster(t.id).length >= 10) return;
    const cands = Object.values(s.players).filter((p) => !p.t && !s.approach.some((a) => a.pid === p.id) && Rc.expect(p) <= t.rep + 4 && L.ovr(p) >= L.ovr(M.starter(t, p.r) || p, p.r) - 3);
    if (!cands.length || r() > 0.35) return;
    const p = cands.sort((a, b) => Rc.bond(b, t) * 2 + L.ovr(b) - (Rc.bond(a, t) * 2 + L.ovr(a)))[r.int(0, Math.min(4, cands.length - 1))];
    const wage = Math.round((W.wageAsk(p) * 0.9) / 100) * 100;
    s.approach.push({ pid: p.id, wage, at: now() });
    const fr = Rc.friends(p, t);
    W.news(`입단 희망: ${p.n}`, `자유계약 신분인 ${p.n}(${L.ROLE_KO[p.r]}, 종합 ${Math.round(L.ovr(p))})이(가) 우리 팀에서 뛰고 싶다고 연락해 왔습니다.${fr.length ? ` 옛 동료 ${fr.slice(0, 2).join(', ')}와(과) 다시 뛰고 싶어 합니다.` : ''} 희망 연봉 ${L.fmtMoney(wage)}. 이적 시장 화면에서 받아들일 수 있습니다.`, 'transfer');
  };
  Rc.acceptApproach = function (i) {
    const s = S(), a = (s.approach || [])[i], t = s.teams[s.user]; if (!a) return { ok: 0, msg: '이미 다른 팀을 찾아 떠났습니다.' };
    const p = s.players[a.pid]; if (!p || p.t) return { ok: 0, msg: '이미 다른 팀과 계약했습니다.' };
    if (W.roster(t.id).length >= 10) return { ok: 0, msg: '로스터는 최대 10명입니다.' };
    const fee = Math.round(a.wage * 0.1); if (t.money < fee) return { ok: 0, msg: '계약금을 낼 자금이 부족합니다.' };
    W.pay(t, -fee, `${p.n} 계약금`); p.t = t.id; Rc.joined(p, t, a.wage, 2); p.loy = clamp(p.loy + 12, 0, 95);
    return { ok: 1, msg: `${p.n} 입단` };
  };

  // 템퍼링: 시즌 중 다른 팀 선수에게 몰래 접촉해 시즌이 끝난 뒤 이적하기로 약속받는다
  Rc.tamperChance = function (p, t) {
    const cur = S().teams[p.t];
    return clamp(0.04 + (50 - Rc.loy(p)) / 90 + (t.rep - Rc.expect(p)) / 60 + Rc.bond(p, t) * 0.03 + (cur.rep < t.rep ? 0.05 : -0.05), 0.02, 0.85);
  };
  Rc.tamper = function (pid) {
    const s = S(), p = s.players[pid], t = s.teams[s.user], r = R();
    if (!p || !p.t || p.t === t.id || s.teams[p.t].pseudo || W.managed(p.t)) return { ok: 0, msg: '접촉할 수 없는 선수입니다.' };
    if (p.pre) return { ok: 0, msg: '이미 다른 팀과 이야기가 끝난 선수입니다.' };
    if (p.tamperAt && now() - p.tamperAt < 42) return { ok: 0, msg: '최근에 접촉했습니다. 6주 뒤에 다시 시도할 수 있습니다.' };
    p.tamperAt = now();
    const cur = s.teams[p.t], ok = r() < Rc.tamperChance(p, t);
    if (ok) {
      const wage = Math.round((W.wageAsk(p) * 1.1) / 100) * 100; p.pre = { tid: t.id, wage, years: 2 }; p.loy = clamp(Rc.loy(p) - 20, 0, 100);
      W.news(`사전 합의: ${p.n}`, `${p.n}이(가) 시즌이 끝나면 우리 팀으로 오기로 했습니다. 스토브리그가 열리면 ${p.cEnd <= s.year ? '자유계약으로' : `이적료 ${L.fmtMoney(Math.round(M.askFee(p, t) * 0.7))}에`} 합류합니다. 연봉 ${L.fmtMoney(wage)}.`, 'transfer');
      return { ok: 1, msg: `${p.n} 사전 합의 성공` };
    }
    p.loy = clamp(Rc.loy(p) + 6, 0, 100);
    if (r() < 0.3) { // 적발
      const fine = Math.round((W.sponsor(t) * 0.03) / 100) * 100; W.pay(t, -fine, '템퍼링 벌금'); t.rep = clamp(t.rep - 0.6, 30, 99);
      W.news('템퍼링 적발', `${cur.name}이(가) ${p.n}에 대한 사전 접촉을 리그에 신고했습니다. 벌금 ${L.fmtMoney(fine)}을 냈고 구단 명성이 떨어졌습니다.`, 'board');
      return { ok: 0, msg: `${p.n}이(가) 거절했고, 접촉 사실이 적발되어 벌금을 냈습니다.` };
    }
    return { ok: 0, msg: `${p.n}이(가) 거절했습니다. 지금 팀에 대한 애착이 큽니다.` };
  };
  // 스토브리그 개막: 사전 합의 이행
  Rc.settlePre = function () {
    const s = S();
    for (const p of Object.values(s.players)) {
      if (!p.pre) continue; const t = s.teams[p.pre.tid], pre = p.pre; p.pre = null;
      if (!t || !p.t || W.roster(t.id).length >= 10) continue;
      const sel = s.teams[p.t], fee = p.cEnd <= s.year ? 0 : Math.round(M.askFee(p, t) * 0.7);
      if (t.money < fee) { if (t.id === s.user) W.news(`사전 합의 무산: ${p.n}`, `이적료 ${L.fmtMoney(fee)}을 마련하지 못해 ${p.n}의 영입이 무산되었습니다.`, 'transfer'); continue; }
      if (fee) { W.pay(t, -fee, `${p.n} 이적료`); W.pay(sel, fee, `${p.n} 이적료`); }
      p.t = t.id; Rc.joined(p, t, pre.wage, pre.years); W.autoLineup(sel); M.ensureRoles(sel);
      if (t.id === s.user) W.news(`합류: ${p.n}`, `사전에 합의한 대로 ${p.n}이(가) 팀에 합류했습니다.`, 'transfer');
    }
  };

  // 주간 갱신: 명성·충성도, 내 선수에 대한 다른 팀의 접촉
  Rc.weekly = function () {
    const s = S(), r = R();
    for (const p of Object.values(s.players)) {
      if (!p.t || !s.teams[p.t] || s.teams[p.t].pseudo) continue;
      const g0 = p._g || 0, r0 = p._r || 0;
      if (p.ss.g < g0) { p._g = 0; p._r = 0; }
      else if (p.ss.g > g0) { const n = p.ss.g - g0, avg = (p.ss.r - r0) / n; p.fame = clamp(Rc.fame(p) + (avg - 6.45) * 1.1 * Math.sqrt(n), 0, 100); p._g = p.ss.g; p._r = p.ss.r; }
      const t = s.teams[p.t], starter = t.lineup.includes(p.id);
      p.loy = clamp(Rc.loy(p) + (starter ? 0.35 : L.ovr(p) > W.teamOvr(t) - 4 ? -0.7 : -0.1) + (p.mor - 0.55) * 0.8, 0, 100);
    }
    if (!W.managed(s.user)) return;
    Rc.approaches();
    // 다른 팀이 내 선수를 흔든다
    for (const p of W.roster(s.user)) {
      if (p.pre || Rc.loy(p) > 40 || r() > 0.05) continue;
      const suitors = Object.values(s.leagues).flatMap((l) => l.teams).filter((id) => !W.managed(id)).map((id) => s.teams[id]).filter((x) => x.rep >= Rc.expect(p) - 2 && L.ovr(p) > L.ovr(M.starter(x, p.r) || p, p.r) + 1);
      if (!suitors.length) continue; const x = r.pick(suitors);
      if (r() < clamp((45 - Rc.loy(p)) / 60 + 0.15, 0.1, 0.8)) {
        p.pre = { tid: x.id, wage: Math.round((W.wageAsk(p) * 1.15) / 100) * 100, years: 2 };
        W.news(`${p.n}, 마음이 떠났다`, `${p.n}이(가) ${x.name}의 접촉을 받고 시즌 뒤 이적하기로 마음을 굳힌 것으로 보입니다. 충성도가 낮은 선수는 다른 팀의 접촉에 쉽게 흔들립니다. 지금 재계약해 붙잡을 수도 있습니다.`, 'transfer');
      } else { p.loy = clamp(p.loy + 8, 0, 100); W.news(`${p.n}에게 접촉 시도`, `${x.name}이(가) ${p.n}에게 접촉했지만 ${p.n}이(가) 거절했습니다.`, 'transfer'); }
    }
  };
  // 시즌 전환: 한 팀에서 보낸 시즌을 인맥으로 기록
  Rc.rollover = function () {
    const s = S();
    for (const lg of Object.values(s.leagues)) for (const tid of lg.teams) {
      const ros = W.roster(tid);
      for (const p of ros) {
        p.ex = p.ex || []; if (!p.ex.includes(tid)) p.ex.push(tid);
        p.mates = p.mates || {}; for (const q of ros) if (q !== p) p.mates[q.id] = Math.min(5, (p.mates[q.id] || 0) + 1);
        const keys = Object.keys(p.mates); if (keys.length > 24) for (const k of keys.slice(0, keys.length - 24)) delete p.mates[k];
        p.fame = clamp(Rc.fame(p) * 0.96, 0, 100);
      }
    }
  };
  // 재계약 요구 연봉 배수: 충성도가 높으면 양보하고, 낮으면 더 부르거나 거부한다
  Rc.renewMul = (p) => (Rc.loy(p) >= 70 ? 0.9 : Rc.loy(p) >= 40 ? 1.05 : 1.25);
  Rc.renewRefuse = (p) => !!p.pre || (Rc.loy(p) < 25 && R()() < 0.6);
})(typeof window !== 'undefined' ? window : globalThis);
