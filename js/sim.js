// 경기 실행: 엔진 설정 생성, 시리즈 진행, 간이 시뮬레이션, 결과 반영
(function (G) {
  const L = G.LFM, clamp = L.clamp, W = L.world;
  const sim = (L.sim = {});
  const S = () => W.get();

  sim.lineup = function (t) {
    const s = S(); let ok = t.lineup.length === 5 && new Set(t.lineup).size === 5 && t.lineup.every((id) => s.players[id] && s.players[id].t === t.id);
    if (!ok) { W.autoLineup(t); if (t.lineup.length < 5) L.manage.ensureRoles(t); }
    return t.lineup.map((id) => s.players[id]);
  };
  sim.importance = function (m) {
    const c = S().comps[m.comp]; if (!c) return 0.2;
    if (c.type === 'intl') return m.stage === 'final' ? 1 : m.stage === 'sf' || m.stage === 'qf' ? 0.85 : 0.6;
    if (c.type === 'promo') return 0.8;
    return m.stage === 'final' ? 0.8 : m.stage === 'reg' ? 0.2 : 0.6;
  };
  // AI 팀의 경기별 전술 선택
  sim.aiTactics = function (t, opp) {
    const R = W.rng(), lu = sim.lineup(t), olu = sim.lineup(opp), tac = Object.assign({}, t.tactics);
    if (R() < 0.15 + t.coach * 0.02) {
      let best = tac.style, bs = -1e9;
      for (const k of L.STYLE_KEYS) { const sc = L.COUNTER[k][opp.tactics.style] * 12 + lu.filter((p) => p.st.includes(k)).length * 0.5 + R() * 1.2; if (sc > bs) { bs = sc; best = k; } }
      tac.style = best;
    }
    const tgt = olu.map((p, i) => [L.ovr(p, i) - p.a[L.AI.pool] * 1.5, i]).sort((a, b) => b[0] - a[0])[0];
    tac.ban = R() < 0.75 ? tgt[1] : -1;
    const star = lu.map((p, i) => [L.ovr(p, i), i]).sort((a, b) => b[0] - a[0])[0][1];
    tac.focus = star === 0 ? 0 : star === 2 ? 1 : star >= 3 ? 2 : -1;
    const ag = lu.reduce((a, p) => a + (p.a[L.AI.lan] + p.a[L.AI.mec]) / 2, 0) / 5; tac.aggro = ag > 13.6 ? 2 : ag < 10.6 ? 0 : 1;
    tac.obj = R() < 0.5 ? 'balanced' : R() < 0.5 ? 'dragon' : 'towers';
    return tac;
  };
  sim.side = function (t, tac) {
    const lu = sim.lineup(t);
    return { name: t.name, short: t.short, color: t.color, coach: t.coach, synergy: sim.synergy(t), tactics: tac, players: L.staff.view(t, tac) };
  };
  sim.synergy = function (t) { // 호흡: 함께 뛴 시간 + 같은 언어권 비율
    const lu = sim.lineup(t), cnt = {}; lu.forEach((p) => (cnt[p.h] = (cnt[p.h] || 0) + 1));
    return clamp(t.syn * 0.8 + (Math.max(...Object.values(cnt)) / 5) * 0.2, 0, 1);
  };
  sim.cfg = function (blue, red, m, tacB, tacR) {
    return { seed: (W.rng()() * 2147483647) | 0, year: S().year, importance: sim.importance(m), sides: [sim.side(blue, tacB), sim.side(red, tacR)] };
  };
  sim.power = function (t, tac, otac) {
    const lu = L.staff.view(t, tac);
    return lu.reduce((s, p, i) => s + L.ovr(p, i) * p.form * (1 + (p.morale - 0.5) * 0.06), 0) / 5 + (t.coach - 10) * 0.15 + (sim.synergy(t) - 0.5) * 3 + L.COUNTER[tac.style][otac.style] * 20;
  };

  const KW = [0.2, 0.18, 0.25, 0.3, 0.07], DW = [0.22, 0.2, 0.19, 0.17, 0.22], AW = [0.15, 0.25, 0.2, 0.15, 0.25];
  function spread(n, w, R) { const out = [0, 0, 0, 0, 0]; for (let i = 0; i < n; i++) { let x = R(), k = 0; while (k < 4 && x > w[k]) { x -= w[k]; k++; } out[k]++; } return out; }
  // 간이 시뮬레이션: 다른 리그 경기용. 엔진과 같은 승률 곡선을 쓴다.
  sim.quick = function (blue, red, m, tacB, tacR) {
    const R = W.rng(), pa = sim.power(blue, tacB, tacR), pb = sim.power(red, tacR, tacB);
    const w = R() < 1 / (1 + Math.exp(-0.135 * (pa - pb))) ? 0 : 1, dur = 1500 + R() * 1100;
    const kw = Math.max(5, Math.round(R.norm(15, 4))), kl = clamp(Math.round(R.norm(8.5, 3.5)), 1, kw + 3), kills = w === 0 ? [kw, kl] : [kl, kw];
    const players = [];
    [blue, red].forEach((t, si) => {
      const k = spread(kills[si], KW, R), d = spread(kills[1 - si], DW, R), a = spread(Math.round(kills[si] * 1.9), AW, R);
      sim.lineup(t).forEach((p, i) => {
        const r = clamp(6.2 + clamp(((k[i] * 3 + a[i] * 1.2 - d[i] * 2.6) / (dur / 60)) * 1.5, -1.9, 2.2) + (si === w ? 0.5 : -0.3) + R.norm(0, 0.3), 3, 10);
        players.push({ id: p.id, n: p.n, side: si, role: i, k: k[i], d: d[i], a: a[i], rating: r });
      });
    });
    return { winner: w, duration: dur, kills, players, quick: 1 };
  };

  // 한 경기 결과를 선수·팀에 반영
  sim.apply = function (blue, red, res) {
    const s = S();
    for (const pr of res.players) {
      const p = s.players[pr.id]; if (!p) continue; const win = pr.side === res.winner;
      p.ss.g++; if (win) p.ss.w++; p.ss.k += pr.k; p.ss.d += pr.d; p.ss.a += pr.a; p.ss.r += pr.rating;
      p.form = clamp(p.form + (pr.rating - 6.5) * 0.005, 0.92, 1.08);
      p.mor = clamp(p.mor + (win ? 0.018 : -0.02) + (pr.rating > 8 ? 0.01 : 0), 0.05, 1);
    }
    L.staff.afterGame(blue, res.winner === 0); L.staff.afterGame(red, res.winner === 1);
    for (const t of [blue, red]) {
      const key = t.lineup.join('|');
      if (t.luKey && t.luKey !== key) { const prev = t.luKey.split('|'); const ch = t.lineup.filter((id, i) => prev[i] !== id).length; t.syn = clamp(t.syn - ch * 0.06, 0.15, 1); }
      t.luKey = key; t.syn = clamp(t.syn + 0.006, 0.15, 1);
    }
  };

  // AI 시리즈 전체 진행
  sim.playSeries = function (m, full) {
    const s = S(), a = s.teams[m.a], b = s.teams[m.b], R = W.rng(), need = Math.ceil(m.bo / 2);
    m.res = { s: [0, 0], g: [] };
    let aBlue = R() < 0.5;
    while (m.res.s[0] < need && m.res.s[1] < need) {
      const ta = sim.aiTactics(a, b), tb = sim.aiTactics(b, a);
      const blue = aBlue ? a : b, red = aBlue ? b : a, tB = aBlue ? ta : tb, tR = aBlue ? tb : ta;
      const res = full ? L.simulate(sim.cfg(blue, red, m, tB, tR)) : sim.quick(blue, red, m, tB, tR);
      sim.record(m, res, aBlue); sim.apply(blue, red, res);
      aBlue = (res.winner === 0) === aBlue ? !aBlue : aBlue; // 진 팀이 블루 진영 선택
    }
    sim.finishSeries(m);
  };
  sim.record = function (m, res, aBlue) {
    const aw = (res.winner === 0) === aBlue;
    m.res.s[aw ? 0 : 1]++;
    m.res.g.push({ w: aw ? 0 : 1, dur: Math.round(res.duration), k: aBlue ? res.kills : [res.kills[1], res.kills[0]] });
  };
  sim.finishSeries = function (m) {
    const s = S(), a = s.teams[m.a], b = s.teams[m.b], aw = m.res.s[0] > m.res.s[1];
    const exp = 1 / (1 + Math.exp(-0.2 * (a.rep - b.rep))), d = ((aw ? 1 : 0) - exp) * 0.25;
    a.rep = clamp(a.rep + d, 30, 99); b.rep = clamp(b.rep - d, 30, 99);
    L.staff.afterSeries(m);
  };
})(typeof window !== 'undefined' ? window : globalThis);
