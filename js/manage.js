// 구단 운영: 이적 시장, 계약, 훈련·성장, 재정, 이사회 평가, 시즌 전환
(function (G) {
  const L = G.LFM, clamp = L.clamp, W = L.world;
  const M = (L.manage = {});
  const S = () => W.get(), R = () => W.rng();
  const CAL = W.CAL;

  M.imports = (t, exceptId) => W.roster(t.id).filter((p) => p.id !== exceptId && W.isImport(p, t)).length;
  M.wages = (t) => W.roster(t.id).reduce((a, p) => a + p.wage, 0);
  M.starter = (t, role) => S().players[t.lineup[role]];
  M.facCost = (lv) => Math.round(6000 * lv * W.infl());

  // ───────── 매일 ─────────
  M.daily = function () {
    const s = S(), d = s.day, r = R();
    for (const id in s.players) { const p = s.players[id]; p.form = clamp(p.form + (1 - p.form) * 0.04 + r.norm(0, 0.005), 0.9, 1.1); }
    if (d % 7 === 0) {
      for (const lg of Object.values(s.leagues)) for (const tid of lg.teams) {
        const t = s.teams[tid];
        W.pay(t, -Math.round(M.wages(t) / 48), '선수 주급'); const ch = L.staff.of(t); if (ch) W.pay(t, -Math.round(ch.wage / 48), '감독 주급');
        if (W.managed(tid)) L.staff.weeklyIncome(t); else W.pay(t, Math.round(W.sponsor(t) / 48), '');
        if (t.fac > 1) W.pay(t, -Math.round(M.facCost(t.fac) * 0.004), '시설 유지비');
        for (const p of W.roster(tid)) if (!t.lineup.includes(p.id)) p.mor = clamp(p.mor - (L.ovr(p) > W.teamOvr(t) - 3 ? 0.012 : 0.003), 0.05, 1); else p.mor = clamp(p.mor + (0.6 - p.mor) * 0.03, 0.05, 1);
      }
      if (W.windowOpen()) M.offersForUser();
    }
    L.youth.daily(); L.career.daily();
    if (d % 28 === 14) M.progress();
    if ([3, 10, 108, 122, 302, 309, 316, 323, 330].includes(d)) M.aiRound(d >= 300 ? 1 : 0.5);
    if (d === 250 && W.managed(s.user)) { const ex = W.roster(s.user).filter((p) => p.cEnd <= s.year); if (ex.length) W.news('계약 만료 예정', `올해로 계약이 끝나는 선수: ${ex.map((p) => p.n).join(', ')}. 재계약하지 않으면 스토브리그에 팀을 떠납니다.`, 'contract'); }
    if (d === CAL.off) { if (W.managed(s.user)) M.boardReview(); W.news('스토브리그 개막', '시즌이 끝나고 이적 시장이 열렸습니다. 계약 만료 선수는 며칠 뒤 자유계약으로 풀립니다.', 'transfer'); }
    if (d === CAL.expire) M.expire();
    if (d === 104) W.news('시즌 중 이적 시장 개막', '서머 시즌 개막 전까지 선수 영입과 방출이 가능합니다.', 'transfer');
  };

  // ───────── 성장과 노쇠 ─────────
  M.progress = function () {
    const s = S(), r = R();
    for (const id in s.players) {
      const p = s.players[id], t = p.t ? s.teams[p.t] : null, age = s.year - p.by, o = L.ovr(p), gap = p.pot - o;
      const af = age <= 18 ? 1.15 : age <= 20 ? 1 : age <= 22 ? 0.75 : age <= 24 ? 0.45 : age <= 26 ? 0.2 : 0.04;
      let env = t ? (1 + (t.fac - 1) * 0.07 + L.staff.growMul(t, age)) * (t.lineup.includes(id) ? 1.15 : 0.85) : 0.6;
      const w = L.ROLE_W[p.r], tw = w.reduce((a, b) => a + b, 0);
      if (p.t === 'acad') env = L.youth.env();
      const pickAttr = () => { let x = r() * (tw + (p.tr >= 0 ? w[p.tr] * 3 : 0)); if (p.tr >= 0) { if (x < w[p.tr] * 3) return p.tr; x -= w[p.tr] * 3; } let k = 0; while (k < 9 && x > w[k]) { x -= w[k]; k++; } return k; };
      for (let i = 0; i < 2; i++) {
        if (gap > 0 && r() < af * Math.min(0.5, gap / 18) * env) { const k = pickAttr(); if (p.a[k] < 20) p.a[k]++; }
        if (age >= 26 && r() < (age - 25) * 0.07 * (t ? L.staff.declMul(t) : 1)) { const k = r.pick([0, 1, 5, 2]); if (p.a[k] > 1) p.a[k]--; }
      }
    }
  };

  // ───────── 계약 ─────────
  M.demand = function (p, t) { // 선수가 요구하는 연봉. 팀 명성이 낮으면 더 부른다.
    const o = L.ovr(p), gap = o - t.rep;
    if (gap > 15) return null;
    return Math.round(W.wageAsk(p) * (gap > 8 ? 1.35 : gap > 3 ? 1.15 : 1) / 100) * 100;
  };
  M.signFA = function (pid, years) {
    const s = S(), p = s.players[pid], t = s.teams[s.user];
    if (p.t) return { ok: 0, msg: '자유계약 선수가 아닙니다.' };
    if (W.roster(t.id).length >= 10) return { ok: 0, msg: '로스터는 최대 10명입니다.' };
    const dm = M.demand(p, t); if (dm == null) return { ok: 0, msg: `${p.n}이(가) 제안을 거절했습니다. 팀의 명성이 선수의 기대에 미치지 못합니다.` };
    const fee = Math.round(dm * 0.15); if (t.money < fee) return { ok: 0, msg: `계약금 ${L.fmtMoney(fee)}을 낼 자금이 부족합니다.` };
    W.pay(t, -fee, `${p.n} 계약금`); p.t = t.id; p.wage = dm; p.cEnd = s.year + years - 1; p.mor = 0.7; p.list = 0;
    W.news(`영입 완료: ${p.n}`, `${p.n}(${L.ROLE_KO[p.r]})와(과) ${years}년 계약을 맺었습니다. 연봉 ${L.fmtMoney(dm)}.`, 'transfer');
    return { ok: 1, msg: `${p.n} 영입 완료` };
  };
  M.askFee = function (p, buyer) {
    const s = S(), seller = s.teams[p.t], v = W.value(p), starter = seller.lineup.includes(p.id);
    let f = v * (starter ? 1.5 : 1) * (seller.rep > buyer.rep ? 1.2 : 1) * (p.cEnd <= s.year ? 0.6 : 1) * (p.list ? 0.8 : 1);
    return Math.round(f / 100) * 100;
  };
  M.bid = function (pid, fee) {
    const s = S(), p = s.players[pid], t = s.teams[s.user], seller = s.teams[p.t];
    if (W.managed(p.t)) return { ok: 0, msg: '다른 참가자가 운영하는 팀의 선수는 영입할 수 없습니다.' };
    if (!W.windowOpen()) return { ok: 0, msg: '이적 시장이 닫혀 있습니다. 스토브리그나 시즌 중 이적 기간에 다시 시도하세요.' };
    if (W.roster(t.id).length >= 10) return { ok: 0, msg: '로스터는 최대 10명입니다.' };
    if (t.money < fee) return { ok: 0, msg: '자금이 부족합니다.' };
    const ask = M.askFee(p, t);
    if (fee < ask) return { ok: 0, msg: `${seller.name}이(가) 제안을 거절했습니다. 더 높은 금액을 원합니다.` };
    const dm = M.demand(p, t); if (dm == null) return { ok: 0, msg: `구단은 합의했지만 ${p.n}이(가) 이적을 거부했습니다.` };
    W.pay(t, -fee, `${p.n} 이적료`); W.pay(seller, fee, `${p.n} 이적료`);
    p.t = t.id; p.wage = dm; p.cEnd = s.year + 1; p.mor = 0.7; p.list = 0;
    W.autoLineup(seller); M.ensureRoles(seller);
    W.news(`영입 완료: ${p.n}`, `${seller.name}에 이적료 ${L.fmtMoney(fee)}을 내고 ${p.n}을(를) 영입했습니다. 연봉 ${L.fmtMoney(dm)}, 2년 계약.`, 'transfer');
    return { ok: 1, msg: `${p.n} 영입 완료` };
  };
  // 영입에 드는 비용을 한 번에 계산 (화면 표시용)
  M.cost = function (p) {
    const s = S(), t = s.teams[s.user], dm = M.demand(p, t);
    if (dm == null) return { ok: 0, why: '우리 팀에 올 생각이 없음 (팀 명성 부족)' };
    const full = W.roster(t.id).length >= 10;
    if (!p.t) { const fee = Math.round(dm * 0.15); return { ok: !full && t.money >= fee, why: full ? '로스터가 가득 참' : t.money >= fee ? '' : '자금 부족', fee, wage: dm, fa: 1 }; }
    if (W.managed(p.t)) return { ok: 0, why: '다른 참가자가 운영하는 팀의 선수' };
    const fee = M.askFee(p, t);
    if (!W.windowOpen()) return { ok: 0, why: '이적 시장이 열리면 영입 가능', fee, wage: dm };
    return { ok: !full && t.money >= fee, why: full ? '로스터가 가득 참' : t.money >= fee ? '' : '자금 부족', fee, wage: dm };
  };
  M.buy = function (pid) { const s = S(), p = s.players[pid]; return p.t ? M.bid(pid, M.askFee(p, s.teams[s.user])) : M.signFA(pid, 2); };
  // 포지션별 추천 영입: 주전보다 좋고, 지금 데려올 수 있는 선수
  M.recommend = function () {
    const s = S(), t = s.teams[s.user], out = [], impFull = t.lineup.filter((id) => s.players[id] && W.isImport(s.players[id], t)).length >= 2;
    const pool = Object.values(s.players).filter((p) => p.t !== s.user && !(p.t && s.teams[p.t].pseudo) && (!p.t || W.windowOpen()));
    for (let role = 0; role < 5; role++) {
      const cur = s.players[t.lineup[role]]; if (!cur) continue; const curOvr = L.ovr(cur, role), list = [];
      const cands = pool.filter((p) => p.r === role && L.ovr(p) > curOvr + 1 && !(impFull && W.isImport(p, t) && !W.isImport(cur, t))).sort((a, b) => L.ovr(b) - L.ovr(a));
      for (const p of cands) { const c = M.cost(p); if (c.ok) list.push({ p, c, diff: L.ovr(p) - curOvr }); if (list.length >= 3) break; }
      out.push({ role, cur, curOvr, list });
    }
    return out;
  };
  M.renewAll = function () {
    const s = S(), ok = [], no = [];
    for (const p of W.roster(s.user)) if (p.cEnd <= s.year) { const r = M.renew(p.id, 2); (r.ok ? ok : no).push(p.n); }
    return { ok: 1, msg: (ok.length ? ok.join(', ') + ' 재계약 완료. ' : '') + (no.length ? no.join(', ') + ' 거부.' : '') || '재계약할 선수가 없습니다.' };
  };
  M.release = function (pid) {
    const s = S(), p = s.players[pid], t = s.teams[s.user];
    if (W.roster(t.id).length <= 5) return { ok: 0, msg: '최소 5명은 보유해야 합니다.' };
    const cost = Math.round(p.wage * 0.3 * Math.max(1, p.cEnd - s.year + 1));
    W.pay(t, -cost, `${p.n} 계약 해지 위약금`); p.t = null; p.list = 0; t.lineup = t.lineup.filter((x) => x !== pid);
    return { ok: 1, msg: `${p.n} 방출 (위약금 ${L.fmtMoney(cost)})` };
  };
  M.renew = function (pid, years) {
    const s = S(), p = s.players[pid], t = s.teams[s.user], dm = M.demand(p, t);
    if (dm == null || (p.mor < 0.3 && R()() < 0.6)) return { ok: 0, msg: `${p.n}이(가) 재계약을 거부했습니다.` };
    const w = Math.max(p.wage, Math.round(dm * 1.05 / 100) * 100);
    p.wage = w; p.cEnd = s.year + years; p.mor = clamp(p.mor + 0.1, 0, 1);
    return { ok: 1, msg: `${p.n} 재계약 완료 (연봉 ${L.fmtMoney(w)}, ${p.cEnd}년까지)` };
  };
  M.expire = function () {
    const s = S(), r = R(), left = [], kept = [];
    for (const id in s.players) {
      const p = s.players[id]; if (!p.t || p.cEnd > s.year) continue;
      const t = s.teams[p.t];
      if (W.managed(t.id)) {
        if (s.auto && s.auto.renew && (t.lineup.includes(id) || (s.year - p.by <= 21 && p.pot >= t.rep)) && M.renew(id, 2).ok) { kept.push(p.n); continue; }
        left.push(p.n); p.t = null; t.lineup = t.lineup.filter((x) => x !== id); continue;
      }
      const want = L.ovr(p) >= W.rosterOvr(t.id) - 6 || (s.year - p.by <= 21 && p.pot > t.rep);
      if (want && r() < 0.72) { p.cEnd = s.year + r.int(1, 3); p.wage = W.wageAsk(p); } else { p.t = null; }
    }
    if (kept.length) W.news('자동 재계약', `코치진이 다음 선수들과 2년 재계약을 맺었습니다: ${kept.join(', ')}`, 'contract');
    if (left.length) W.news('계약 만료', `계약이 끝난 선수가 팀을 떠났습니다: ${left.join(', ')}`, 'contract');
    for (const lg of Object.values(s.leagues)) for (const tid of lg.teams) if (!W.managed(tid)) { W.autoLineup(s.teams[tid]); }
    L.career.afterExpire();
  };

  // ───────── AI 이적 ─────────
  M.ensureRoles = function (t) {
    const s = S(), ros = W.roster(t.id), lg = s.leagues[t.league];
    for (let role = 0; role < 5; role++) if (!ros.some((p) => p.r === role)) {
      const impN = M.imports(t), fa = Object.values(s.players).filter((p) => !p.t && p.r === role && (!W.isImport(p, t) || impN < 2) && L.ovr(p) <= t.rep + 8).sort((a, b) => L.ovr(b) - L.ovr(a))[0];
      if (fa && !W.managed(t.id) && L.ovr(fa) > lg.base - 12) { fa.t = t.id; fa.wage = W.wageAsk(fa); fa.cEnd = s.year + 1; }
      else { const p = W.genPlayer(t.region, role, lg.base - 5 + R().range(-2, 2), R().int(17, 21), lg.base + 8); p.t = t.id; if (t.id === s.user && W.managed(t.id)) W.news(`긴급 콜업: ${p.n}`, `${L.ROLE_KO[role]} 포지션에 뛸 선수가 없어 아카데미의 ${p.n}을(를) 급히 1군으로 올렸습니다.`, 'youth'); }
    }
    W.autoLineup(t);
  };
  M.aiRound = function (intensity) {
    const s = S(), r = R(), teams = r.shuffle(Object.values(s.leagues).flatMap((l) => l.teams).filter((id) => !W.managed(id)));
    const fa = Object.values(s.players).filter((p) => !p.t);
    const byRole = [0, 1, 2, 3, 4].map((role) => fa.filter((p) => p.r === role).sort((a, b) => L.ovr(b) - L.ovr(a)));
    for (const tid of teams) {
      const t = s.teams[tid]; M.ensureRoles(t);
      if (r() > intensity) continue;
      const roles = [0, 1, 2, 3, 4].map((role) => [L.ovr(M.starter(t, role), role), role]).sort((a, b) => a[0] - b[0]);
      const cap = W.sponsor(t) * 0.95 + t.money * 0.3; let done = false; const impN = M.imports(t), wg = M.wages(t);
      for (const [cur, role] of roles.slice(0, 3)) {
        const c = byRole[role].find((p) => !p.t && L.ovr(p) > cur + 1.5 && L.ovr(p) <= t.rep + 9 && (!W.isImport(p, t) || impN < 2) && wg + W.wageAsk(p) <= cap + 1);
        if (c) { c.t = tid; c.wage = W.wageAsk(c); c.cEnd = s.year + r.int(1, 3); c.mor = 0.7; done = true; break; }
      }
      // 하위 팀 선수 영입
      if (!done && r() < 0.3 * intensity && t.money > 0) {
        const [cur, role] = roles[0];
        const cands = Object.values(s.players).filter((p) => p.t && p.t !== tid && p.r === role && L.ovr(p) > cur + 3 && s.teams[p.t].rep < t.rep - 1.5 && (!W.isImport(p, t) || impN < 2));
        const c = cands.sort((a, b) => L.ovr(b) - L.ovr(a)).find((p) => W.value(p) * 1.15 <= t.money * 0.7);
        if (c) {
          const fee = Math.round(W.value(c) * 1.15 / 100) * 100;
          if (c.me) { /* 내 선수는 본인이 결정한다 */ } else if (c.t === s.user && W.managed(c.t)) { M.addOffer(c, t, fee); } else if (W.managed(c.t)) { /* 다른 사람이 운영하는 팀의 선수는 건드리지 않는다 */ }
          else { const sel = s.teams[c.t]; W.pay(t, -fee, ''); W.pay(sel, fee, ''); c.t = tid; c.wage = W.wageAsk(c); c.cEnd = s.year + 2; M.ensureRoles(sel); }
        }
      }
      const ros = W.roster(tid);
      if (ros.length > 8) { const out = ros.filter((p) => !t.lineup.includes(p.id) && !p.me).sort((a, b) => L.ovr(a) - L.ovr(b))[0]; if (out) out.t = null; }
      W.autoLineup(t);
      if (t.money < 0) t.money = Math.round(t.money * 0.5);
    }
  };
  M.addOffer = function (p, from, fee) {
    const s = S(); s.offers = s.offers || [];
    if (s.offers.some((o) => o.pid === p.id && o.from === from.id)) return;
    s.offers.push({ pid: p.id, from: from.id, fee, day: s.day, year: s.year });
    W.news(`이적 제안: ${p.n}`, `${from.name}이(가) ${p.n}의 이적료로 ${L.fmtMoney(fee)}을 제안했습니다. 이적 시장 화면에서 수락하거나 거절할 수 있습니다.`, 'transfer');
  };
  M.offersForUser = function () {
    const s = S(), r = R(), t = s.teams[s.user]; if (!W.managed(s.user)) return;
    s.offers = (s.offers || []).filter((o) => s.players[o.pid] && s.players[o.pid].t === s.user && (s.year - o.year) * 336 + s.day - o.day < 21);
    for (const p of W.roster(s.user)) {
      if (!p.list && r() > 0.03) continue;
      const o = L.ovr(p), teams = Object.values(s.leagues).flatMap((l) => l.teams).filter((id) => !W.managed(id)).map((id) => s.teams[id])
        .filter((x) => x.rep >= o - 9 && x.money > W.value(p) * 0.8 && o > L.ovr(M.starter(x, p.r), p.r) + 1 && (!W.isImport(p, x) || M.imports(x) < 2));
      if (!teams.length) continue;
      const from = r.pick(teams); M.addOffer(p, from, Math.round(W.value(p) * r.range(0.8, 1.25) / 100) * 100);
    }
    void t;
  };
  M.acceptOffer = function (i) {
    const s = S(), o = s.offers[i], p = s.players[o.pid], t = s.teams[s.user], from = s.teams[o.from];
    if (W.roster(t.id).length <= 5) return { ok: 0, msg: '최소 5명은 보유해야 합니다.' };
    W.pay(t, o.fee, `${p.n} 이적료 수입`); W.pay(from, -o.fee, '');
    p.t = from.id; p.wage = W.wageAsk(p); p.cEnd = s.year + 2; p.list = 0; t.lineup = t.lineup.filter((x) => x !== p.id);
    s.offers = s.offers.filter((x) => x.pid !== p.id); W.autoLineup(from);
    return { ok: 1, msg: `${p.n}을(를) ${from.name}에 ${L.fmtMoney(o.fee)}에 이적시켰습니다.` };
  };
  M.upgrade = function (kind) {
    const s = S(), t = s.teams[s.user], lv = t[kind]; if (lv >= 5) return { ok: 0, msg: '이미 최고 등급입니다.' };
    const cost = M.facCost(lv); if (t.money < cost) return { ok: 0, msg: '자금이 부족합니다.' };
    W.pay(t, -cost, kind === 'fac' ? '훈련 시설 확장' : '유스 아카데미 확장'); t[kind]++;
    return { ok: 1, msg: '확장 완료' };
  };
  M.hireCoach = function () {
    const s = S(), t = s.teams[s.user]; if (t.coach >= 19) return { ok: 0, msg: '이미 최고 수준의 코치진입니다.' };
    const cost = M.coachCost(t); if (t.money < cost) return { ok: 0, msg: '자금이 부족합니다.' };
    W.pay(t, -cost, '코치진 보강'); t.coach++;
    return { ok: 1, msg: `코치진 수준이 ${t.coach}(으)로 올랐습니다.` };
  };
  M.coachCost = (t) => Math.round(500 * (t.coach - 2) * W.infl());

  // ───────── 이사회 ─────────
  M.userRank = function () {
    const s = S(), t = s.teams[s.user], c = s.comps[`${t.league}:summer`] || s.comps[`${t.league}:spring`];
    if (!c) return null; const list = c.rank || c.seeds || W.table(W.compMatches(c.id, 'reg'), c.teams).map((x) => x.t);
    return { rank: list.indexOf(t.id) + 1, n: list.length };
  };
  M.boardReview = function () {
    const s = S(), t = s.teams[s.user], g = t.goalNow || W.goal(t), r = M.userRank(); if (!r) return;
    t.conf = t.conf == null ? 60 : t.conf;
    const ok = r.rank <= g.need, bonus = Math.round(W.sponsor(t) * 0.12);
    if (ok) { t.conf = clamp(t.conf + 15, 0, 100); W.pay(t, bonus, '목표 달성 보너스'); W.news('이사회 평가: 목표 달성', `시즌 목표 "${g.text}"을(를) 달성했습니다 (최종 ${r.rank}위). 이사회가 보너스 ${L.fmtMoney(bonus)}을 지급했습니다. 신임도 ${t.conf}.`, 'board'); }
    else { t.conf = clamp(t.conf - 20 - (r.rank - g.need) * 3, 0, 100); W.news('이사회 평가: 목표 미달', `시즌 목표 "${g.text}"에 미치지 못했습니다 (최종 ${r.rank}위). 신임도가 ${t.conf}(으)로 떨어졌습니다.${t.conf <= 15 ? ' 다음 시즌에도 부진하면 경질될 수 있습니다.' : ''}`, 'board'); }
  };

  // ───────── 시즌 전환 ─────────
  M.rollover = function () {
    const s = S(), r = R();
    for (const id in s.players) {
      const p = s.players[id];
      if (p.ss.g > 0) p.car.push({ y: s.year, t: p.t ? s.teams[p.t].short : '-', g: p.ss.g, w: p.ss.w, k: p.ss.k, d: p.ss.d, a: p.ss.a, r: +(p.ss.r / p.ss.g).toFixed(2), o: Math.round(L.ovr(p)) });
      else if (!p.t) p.idle = (p.idle || 0) + 1;
      if (p.ss.g > 0) p.idle = 0;
      p.ss = { g: 0, w: 0, k: 0, d: 0, a: 0, r: 0 };
    }
    // 승강
    for (const pr of s.promo) {
      const up = s.teams[pr.up], dn = s.teams[pr.down], l1 = s.leagues[dn.league], l2 = s.leagues[up.league];
      l1.teams[l1.teams.indexOf(dn.id)] = up.id; l2.teams[l2.teams.indexOf(up.id)] = dn.id; up.league = l1.id; dn.league = l2.id;
    }
    s.year++; s.day = 0; s.offers = [];
    // 은퇴
    for (const id of Object.keys(s.players)) {
      const p = s.players[id], age = s.year - p.by;
      if ((!p.t && ((p.idle || 0) >= 2 || (age >= 27 && r() < 0.5))) || (p.t && !W.managed(p.t) && !p.me && age >= 30 && r() < (age - 28) * 0.15 && L.ovr(p) < s.teams[p.t].rep - 4)) {
        if (p.t) { const t = s.teams[p.t]; t.lineup = t.lineup.filter((x) => x !== id); }
        L.staff.retired(p); delete s.players[id];
      } else if (age > 26 && p.pot > L.ovr(p)) p.pot = Math.max(Math.round(L.ovr(p)), p.pot - 2);
    }
    // 실제 역사 속 신인 합류
    const rk = (G.LFM_ROOKIES && G.LFM_ROOKIES[s.year]) || []; let joined = 0;
    for (const src of rk) {
      if (s.players[src.id]) continue;
      const p = { ...src, a: src.a.slice(), wage: 0 }; delete p.ot; s.players[p.id] = p; s.names[p.n.toLowerCase()] = 1;
      p.rg = src.rg; p.t = null; p.h = null;
      const t = src.ot && s.teams[src.ot];
      // initPlayer 대체
      p.form = 1; p.mor = 0.65; p.st = L.playerStyles(p); p.ss = { g: 0, w: 0, k: 0, d: 0, a: 0, r: 0 }; p.car = []; p.tr = -1; p.list = 0;
      p.h = W.homeOf(p); p.wage = W.wageAsk(p); p.cEnd = s.year + r.int(1, 2);
      if (t && !W.managed(t.id) && W.roster(t.id).length < 9 && r() < 0.75) { p.t = t.id; joined++; }
    }
    // 유스 승격과 팀 정비
    for (const lg of Object.values(s.leagues)) for (const tid of lg.teams) {
      const t = s.teams[tid], ros = W.roster(tid);
      if (ros.length < 8 && (tid !== s.user || true)) {
        const role = r.int(0, 4), p = W.genPlayer(t.region, role, lg.base - 9 + t.youth * 1.5 + r.range(-3, 3), r.int(16, 18), Math.min(97, lg.base + 6 + t.youth * 2.5 + r.range(0, 8)));
        p.t = tid; p.wage = Math.round(1500 * W.infl()); p.cEnd = s.year + 2;
        if (tid === s.user) W.news(`유스 승격: ${p.n}`, `아카데미에서 ${p.n}(${L.ROLE_KO[p.r]}, ${s.year - p.by}세)이(가) 1군에 합류했습니다.`, 'youth');
      }
      t.rep = clamp(t.rep * 0.75 + W.rosterOvr(tid) * 0.25, 30, 99); t.fin.inc = 0; t.fin.exp = 0;
      if (!W.managed(tid)) { M.ensureRoles(t); t.tactics.style = W.aiStyle(t); if (t.money < W.sponsor(t) * 0.1) t.money = Math.round(W.sponsor(t) * 0.1); }
    }
    M.aiRound(1);
    L.staff.rollover(); L.youth.rollover();
    W.setupYear();
    const ut = s.teams[s.user]; ut.goalNow = W.goal(ut); L.staff.afterRollover();
    W.news(`${s.year} 시즌 시작`, `새 시즌이 시작됩니다. 소속 리그: ${s.leagues[ut.league].name}. 이번 시즌 목표는 "${ut.goalNow.text}"입니다.${joined ? ` 올해 ${rk.length}명의 신인이 프로 무대에 등장했습니다.` : ''}`, 'board');
  };
})(typeof window !== 'undefined' ? window : globalThis);
