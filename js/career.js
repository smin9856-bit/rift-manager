// 선수 모드: 내 선수 한 명으로 데뷔해 주전 경쟁, 성장, 이적을 거치는 커리어
(function (G) {
  const L = G.LFM, W = L.world, M = L.manage, clamp = L.clamp, I = L.AI;
  const C = (L.career = {});
  const S = () => W.get(), R = () => W.rng();
  const now = () => S().year * 336 + S().day;
  C.me = () => S().players[S().me];
  C.on = () => !!S() && S().mode === 'player';

  C.TYPES = {
    mech: { ko: '피지컬 괴물', desc: '메카닉과 라인전이 뛰어나지만 운영은 서툽니다.', up: { mec: 2, lan: 2 }, down: { mac: 1.5 } },
    brain: { ko: '두뇌파', desc: '운영과 시야가 뛰어나지만 손은 평범합니다.', up: { mac: 2, vis: 2 }, down: { mec: 1.5 } },
    carry: { ko: '성장형 캐리', desc: '골드 수급과 한타에 강하지만 팀플레이가 약합니다.', up: { eco: 2, tf: 2 }, down: { tw: 1.5 } },
    clutch: { ko: '승부사', desc: '큰 경기에 강하지만 기복이 있습니다.', up: { clt: 3 }, down: { con: 1.5 } },
    steady: { ko: '꾸준한 살림꾼', desc: '기복이 없고 팀에 잘 녹아듭니다. 눈에 띄는 무기는 없습니다.', up: { con: 1.5, tw: 1.5, pool: 1.5 }, down: {} },
  };
  C.ACTS = {
    solo: { ko: '솔로 랭크', desc: '메카닉·라인전·골드 수급이 오를 수 있습니다. 컨디션이 조금 떨어집니다.', attrs: ['mec', 'lan', 'eco'], form: -0.004 },
    vod: { ko: 'VOD 분석', desc: '운영 지능·시야 장악·챔피언 폭이 오를 수 있습니다.', attrs: ['mac', 'vis', 'pool'], form: 0 },
    scrim: { ko: '팀 스크림 추가', desc: '한타·팀워크·클러치가 오를 수 있고 사기가 오릅니다. 컨디션이 떨어집니다.', attrs: ['tf', 'tw', 'clt'], form: -0.007, mor: 0.01 },
    rest: { ko: '휴식', desc: '컨디션을 회복합니다. 안정감이 오를 수 있습니다.', attrs: ['con'], form: 0.02, slow: 1 },
    stream: { ko: '개인 방송', desc: '수입이 생기지만 성장은 없고 컨디션이 조금 떨어집니다.', attrs: [], form: -0.004, cash: 1 },
  };

  // 새 커리어: 기존 팀 선택으로 만든 세계를 선수 모드로 바꾼다
  C.start = function (opt) {
    const s = S(), t = s.teams[opt.teamId], lg = s.leagues[t.league], ty = C.TYPES[opt.type];
    const p = W.genPlayer(opt.region, opt.role, lg.base - (lg.tier === 1 ? 7 : 4), 17, 99);
    delete s.names[p.n.toLowerCase()];
    p.n = opt.name; p.me = 1; p.gen = 0; p.h = opt.region === 'LAN' || opt.region === 'LAS' ? 'LAT' : opt.region;
    for (const k in ty.up) p.a[I[k]] = clamp(Math.round(p.a[I[k]] + ty.up[k]), 1, 20);
    for (const k in ty.down) p.a[I[k]] = clamp(Math.round(p.a[I[k]] - ty.down[k]), 1, 20);
    p.pot = 99; p.st = L.playerStyles(p); if (opt.skill) p.sk = opt.skill.slice();
    p.t = t.id; p.wage = Math.round(1200 * W.infl()); p.cEnd = s.year + 1; p.mor = 0.7;
    s.mode = 'player'; s.mgrs = []; s.me = p.id; s.user = t.id; s.act = 'solo'; s.cash = 0; s.poffers = []; s.news = []; s.joinY = s.year; s.force = 0; s.call = '';
    W.autoLineup(t);
    W.news('프로 데뷔', `${t.name}에 입단했습니다. 주전 자리는 실력으로 따내야 합니다. [활동]에서 이번 주에 무엇에 집중할지 정하고, 화면 오른쪽 위의 [계속 진행]을 눌러 시즌을 시작하세요.`, 'board');
    return p;
  };
  C.isStarter = () => { const s = S(), t = s.teams[s.user]; L.sim.lineup(t); return t.lineup.includes(s.me); };
  C.rival = function () { // 같은 팀의 포지션 경쟁자
    const s = S(), me = C.me(); return W.roster(s.user).filter((p) => p.r === me.r && p.id !== me.id).sort((a, b) => L.ovr(b) - L.ovr(a))[0];
  };

  C.daily = function () {
    if (!C.on()) return; const s = S(), me = C.me(); if (!me) return;
    // 소속 동기화: 방출·이적으로 팀이 바뀌면 따라간다
    if (!me.t || !s.teams[me.t] || s.teams[me.t].pseudo) C.findTeam('방출');
    if (me.t !== s.user) s.user = me.t;
    const t0 = s.teams[s.user]; if (s.force || s.call) { if (C.influence() < 45) { s.force = 0; s.call = ''; W.news('영향력 약화', '팀 내 영향력이 떨어져 감독이 다시 선발과 전술을 직접 정합니다.', 'board'); } else { C.applyForce(t0); if (s.call && C.influence() >= 70) t0.tactics.style = s.call; } }
    if (s.day % 7 === 0) C.weekly();
    s.poffers = s.poffers.filter((o) => now() - o.at < 21 && s.teams[o.tid] && o.tid !== me.t);
  };
  C.weekly = function () {
    const s = S(), me = C.me(), r = R(), act = C.ACTS[s.act] || C.ACTS.solo, age = s.year - me.by, gap = me.pot - L.ovr(me);
    const af = age <= 19 ? 1 : age <= 22 ? 0.8 : age <= 25 ? 0.5 : 0.2;
    if (act.attrs.length && gap > 0 && r() < (act.slow ? 0.06 : 0.14) * af * Math.min(1, gap / 8)) {
      const k = I[r.pick(act.attrs)]; if (me.a[k] < 20) { me.a[k]++; W.news(`성장: ${L.ATTR_KO[k]} ${me.a[k]}`, `${act.ko}의 성과로 ${L.ATTR_KO[k]}이(가) ${me.a[k]}(으)로 올랐습니다.`, 'youth'); }
    }
    me.form = clamp(me.form + act.form, 0.9, 1.1); if (act.mor) me.mor = clamp(me.mor + act.mor, 0.05, 1);
    s.cash += Math.round(me.wage / 48) + (act.cash ? Math.round(40 * W.infl() * (1 + Math.max(0, L.ovr(me) - 60) / 12)) : 0);
    if (W.windowOpen()) C.genOffers();
    C.checkSkillOffer(); if (s.day < 8) C.seasonSkill();
  };
  // 나를 주전으로 쓸 만한 팀들
  C.interested = function (wide) {
    const s = S(), me = C.me(), o = L.ovr(me), out = [];
    for (const lg of Object.values(s.leagues)) for (const tid of lg.teams) {
      const t = s.teams[tid]; if (tid === me.t) continue;
      const st = s.players[t.lineup[me.r]], so = st ? L.ovr(st, me.r) : 0;
      if (o < so + (wide ? -2.5 : me.list ? -1 : 0.5)) continue;
      if (t.rep > o + (wide ? 16 : 7)) continue;
      if (W.isImport(me, t) && M.imports(t) >= 2) continue;
      out.push(t);
    }
    return out.sort((a, b) => b.rep - a.rep);
  };
  C.genOffers = function () {
    const s = S(), me = C.me(), r = R();
    for (const t of C.interested().slice(0, 6)) {
      if (s.poffers.length >= 4 || s.poffers.some((x) => x.tid === t.id) || r() > 0.45) continue;
      const wage = Math.round((W.wageAsk(me) * r.range(0.9, 1.25)) / 100) * 100;
      s.poffers.push({ tid: t.id, wage, years: r.int(1, 3), at: now() });
      W.news(`이적 제안: ${t.name}`, `${t.name}(${s.leagues[t.league].name})이(가) 연봉 ${L.fmtMoney(wage)}에 영입을 제안했습니다. [이적 제안] 화면에서 확인하세요.`, 'transfer');
    }
  };
  C.join = function (t, wage, years, why) {
    const s = S(), me = C.me(), old = s.teams[me.t];
    me.t = t.id; me.wage = wage; me.cEnd = s.year + years - 1; me.mor = 0.75; me.list = 0; s.user = t.id; s.poffers = []; s.joinY = s.year; s.force = 0; s.call = '';
    if (old && !old.pseudo && old.id !== t.id) { old.lineup = old.lineup.filter((x) => x !== me.id); M.ensureRoles(old); }
    W.autoLineup(t);
    W.news(`${why}: ${t.name}`, `${t.name}(${s.leagues[t.league].name})에 합류했습니다. 연봉 ${L.fmtMoney(wage)}, ${me.cEnd}년까지.`, 'transfer');
  };
  C.accept = function (i) {
    const s = S(), o = s.poffers[i]; if (!o) return { ok: 0, msg: '제안이 만료되었습니다.' };
    if (!W.windowOpen()) return { ok: 0, msg: '이적 시장이 열려 있을 때만 팀을 옮길 수 있습니다.' };
    const t = s.teams[o.tid]; C.join(t, o.wage, o.years, '이적');
    return { ok: 1, msg: `${t.name} 이적 완료` };
  };
  C.findTeam = function (why) { // 소속이 없어지면 받아 주는 팀으로 간다
    const s = S(), me = C.me();
    const t = C.interested(true)[0] || Object.values(s.leagues).filter((l) => l.tier === 2).flatMap((l) => l.teams).map((id) => s.teams[id]).sort((a, b) => a.rep - b.rep)[0];
    C.join(t, W.wageAsk(me), 2, why === '방출' ? '새 팀 합류' : '이적');
  };
  // 팀 내 영향력(0~100): 명성, 팀 평균 대비 실력, 팀에서 보낸 시간
  C.influence = function () {
    const s = S(), me = C.me(), t = s.teams[s.user];
    return Math.round(clamp(L.recruit.fame(me) * 0.45 + (L.ovr(me) - W.teamOvr(t)) * 4 + (s.year - (s.joinY || s.year)) * 7 + 10, 0, 100));
  };
  C.applyForce = function (t) { // 감독의 선발을 무시하고 내가 뛴다
    const s = S(), me = C.me(); if (!s.force || t.lineup.includes(me.id) || t.lineup.length < 5) return;
    const out = s.players[t.lineup[me.r]]; t.lineup[me.r] = me.id; if (out) out.mor = clamp(out.mor - 0.01, 0.05, 1);
  };
  C.setForce = function (v) {
    const s = S(); if (v && C.influence() < 55) return { ok: 0, msg: '영향력 55 이상이어야 선발을 요구할 수 있습니다.' };
    s.force = v ? 1 : 0; return { ok: 1, msg: v ? '감독에게 선발 출전을 요구했습니다.' : '선발 결정을 감독에게 맡깁니다.' };
  };
  C.setCall = function (k) {
    const s = S(); if (k && C.influence() < 70) return { ok: 0, msg: '영향력 70 이상이어야 팀 전술에 입김을 넣을 수 있습니다.' };
    s.call = k || ''; return { ok: 1, msg: k ? `팀이 ${L.STYLES[k].ko} 조합 위주로 경기합니다.` : '전술을 감독에게 맡깁니다.' };
  };
  // 원하는 팀에 내가 먼저 입단을 타진한다
  C.approach = function (tid) {
    const s = S(), me = C.me(), t = s.teams[tid], r = R();
    if (!t || tid === me.t) return { ok: 0, msg: '지금 소속된 팀입니다.' };
    if (!W.windowOpen()) return { ok: 0, msg: '이적 시장이 열려 있을 때만 팀을 옮길 수 있습니다.' };
    s.asked = s.asked || {}; if (s.asked[tid] && now() - s.asked[tid] < 28) return { ok: 0, msg: '최근에 타진했던 팀입니다. 4주 뒤에 다시 시도할 수 있습니다.' };
    s.asked[tid] = now();
    if (W.isImport(me, t) && M.imports(t) >= 2) return { ok: 0, msg: `${t.name}은(는) 용병 자리가 없습니다.` };
    const st = s.players[t.lineup[me.r]], gap = L.ovr(me) - (st ? L.ovr(st, me.r) : 0);
    const p = clamp(0.45 + gap * 0.09 + (L.recruit.fame(me) - (t.rep - 44) / 0.46) / 120, 0.03, 0.95);
    if (r() > p) return { ok: 0, msg: `${t.name}이(가) 정중히 거절했습니다. 지금 ${L.ROLE_KO[me.r]} 자리에 만족하고 있습니다.` };
    C.join(t, Math.round((W.wageAsk(me) * (gap > 0 ? 1.05 : 0.8)) / 100) * 100, 2, '이적');
    return { ok: 1, msg: `${t.name} 입단 성사` };
  };
  // ───────── 고유 스킬 선택 ─────────
  // 처음에 무작위 3개 중 하나를 고르고, 명성이 오를 때마다 새 후보 3개가 나온다 (명성이 높을수록 단계가 높다)
  C.rollSkills = function (seed, lv) {
    const keys = Object.keys(L.SKILLS).filter((k) => k !== 'spring'), r = L.rng(L.hash('sk' + seed)), out = [];
    while (out.length < 3) { const k = keys[Math.floor(r() * keys.length)]; if (!out.some((x) => x[1] === k)) out.push([L.SKILLS[k][0], k, lv]); }
    return out;
  };
  C.skillLevel = (fame) => (fame >= 80 ? 3 : fame >= 55 ? 2 : 1);
  C.checkSkillOffer = function () {
    const s = S(), me = C.me(), fame = L.recruit.fame(me);
    if (s.skillNext == null) s.skillNext = 40;
    if (s.skillPick || fame < s.skillNext) return;
    s.skillPick = C.rollSkills(me.id + ':' + s.skillNext + ':' + s.year, C.skillLevel(fame));
    s.skillNext = s.skillNext >= 85 ? 999 : s.skillNext + 15; s.skillYear = s.year;
    W.news('새 고유 스킬 후보', `명성이 올라 새로운 플레이 스타일을 익힐 기회가 생겼습니다. [내 선수] 화면에서 세 가지 중 하나를 고르거나 지금 스킬을 유지할 수 있습니다.`, 'youth');
  };
  C.pickSkill = function (i) {
    const s = S(), me = C.me(); if (!s.skillPick) return { ok: 0, msg: '지금은 고를 수 있는 스킬이 없습니다.' };
    if (i >= 0 && s.skillPick[i]) { me.sk = s.skillPick[i].slice(); s.skillPick = null; return { ok: 1, msg: `고유 스킬을 ${me.sk[0]}(으)로 바꿨습니다.` }; }
    // 유지: 지금 스킬의 단계만 명성에 맞게 올린다
    const cur = L.skillOf(me), lv = Math.max(cur[2], C.skillLevel(L.recruit.fame(me))); me.sk = [cur[0], cur[1], lv]; s.skillPick = null;
    return { ok: 1, msg: `지금 스킬을 유지합니다 (${'◆'.repeat(lv)}).` };
  };
  // 명성이 정점에 오른 뒤에는 매 시즌 한 번씩 다시 고를 수 있다
  C.seasonSkill = function () {
    const s = S(); if (!C.on() || s.skillPick) return; const me = C.me();
    if (L.recruit.fame(me) >= 85 && s.skillYear !== s.year) { s.skillNext = 85; C.checkSkillOffer(); }
  };
  C.afterExpire = function () { if (C.on() && !C.me().t) C.findTeam('방출'); };
  C.season = function () { const me = C.me(); return me.ss.g ? { g: me.ss.g, w: me.ss.w, kda: `${me.ss.k}/${me.ss.d}/${me.ss.a}`, r: (me.ss.r / me.ss.g).toFixed(2) } : null; };
})(typeof window !== 'undefined' ? window : globalThis);
