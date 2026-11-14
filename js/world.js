// 게임 월드: 새 게임 생성, 일정, 리그·플레이오프·국제전, 하루 진행
(function (G) {
  const L = G.LFM, clamp = L.clamp;
  const W = (L.world = {});
  let S = null;
  W.get = () => S; W.set = (s) => { S = s; };
  W.managed = (tid) => !!S.mgrs && S.mgrs.includes(tid);

  const CAL = (W.CAL = { spring: [14, 83], springPO: [88, 93, 99], msi: 110, summer: [140, 209], summerPO: [214, 219, 225], promo: 236, worlds: 245, off: 291, expire: 300, end: 336 });
  W.dateStr = (day, year) => { const d = new Date(year, 0, 8 + day); return `${year}년 ${d.getMonth() + 1}월 ${d.getDate()}일`; };
  W.shortDate = (day, year) => { const d = new Date(year, 0, 8 + day); return `${d.getMonth() + 1}/${d.getDate()}`; };
  W.windowOpen = () => S.day >= CAL.off || S.day < CAL.spring[0] || (S.day >= 104 && S.day < CAL.summer[0]);

  const HOME = {
    KR: ['South Korea'], CN: ['China'], TW: ['Taiwan', 'Hong Kong', 'Macau'], VN: ['Vietnam'], JP: ['Japan'], BR: ['Brazil'], TR: ['Turkey', 'Türkiye'],
    OCE: ['Australia', 'New Zealand'], NA: ['United States', 'Canada'], CIS: ['Russia', 'Ukraine', 'Belarus', 'Kazakhstan', 'Armenia', 'Latvia', 'Lithuania', 'Estonia', 'Georgia', 'Azerbaijan', 'Moldova', 'Uzbekistan', 'Kyrgyzstan'],
    LAT: ['Mexico', 'Argentina', 'Chile', 'Peru', 'Colombia', 'Uruguay', 'Venezuela', 'Ecuador', 'Costa Rica', 'Paraguay', 'Bolivia', 'Panama', 'Guatemala', 'Dominican Republic', 'Puerto Rico', 'El Salvador', 'Honduras'],
    SEA: ['Philippines', 'Thailand', 'Singapore', 'Malaysia', 'Indonesia'],
  };
  const C2R = {}; for (const r in HOME) for (const c of HOME[r]) C2R[c] = r;
  const LATG = (r) => (r === 'LAN' || r === 'LAS' ? 'LAT' : r);
  W.home = (p) => p.h;
  W.isImport = (p, team) => LATG(p.h) !== LATG(team.region) && !(team.region === 'TW' && (p.h === 'SEA' || p.h === 'VN' || p.h === 'JP' || p.h === 'OCE') && S.year >= 2025);
  W.regionName = (id) => (G.LFM_REGIONS.find((r) => r.id === id) || { name: id }).name;

  // ───────── 가치·연봉 ─────────
  W.infl = () => 1 + (S.year - 2014) * 0.33;
  W.value = function (p) {
    const o = L.ovr(p), age = S.year - p.by;
    const af = age <= 19 ? 1.35 : age <= 21 ? 1.25 : age <= 23 ? 1.1 : age <= 25 ? 0.95 : age <= 27 ? 0.7 : 0.45;
    return Math.round(600 * Math.exp((o - 60) / 7.5) * af * (1 + Math.max(0, p.pot - o) * 0.035) * W.infl());
  };
  W.wageAsk = (p) => Math.max(1200, Math.round(W.value(p) * 0.3 / 100) * 100);

  // ───────── 가상 선수·팀 생성 ─────────
  const ID_A = ['Dark', 'Night', 'Star', 'Sun', 'Moon', 'Ice', 'Fire', 'Wind', 'Iron', 'Swift', 'Lucky', 'Silent', 'Wild', 'Neo', 'Crazy', 'Blue', 'Red', 'Ghost', 'Sky', 'Storm'];
  const ID_B = ['Wolf', 'Fox', 'Hawk', 'Tiger', 'Blade', 'Arrow', 'King', 'Sage', 'Bear', 'Rain', 'Step', 'Shot', 'Mind', 'Soul', 'Flow', 'Zero', 'Kid', 'Ace', 'Jin', 'Bin'];
  const ID_C = ['Kyo', 'Rin', 'Tao', 'Miru', 'Haru', 'Sol', 'Juno', 'Kai', 'Lux', 'Nova', 'Rex', 'Ash', 'Zen', 'Vex', 'Coda', 'Echo', 'Pax', 'Onyx', 'Tempo', 'Vero', 'Dawn', 'Hush', 'Moro', 'Ciel', 'Rune', 'Yuki', 'Bom', 'Daon', 'Garam', 'Narae'];
  const CITY = {
    KR: ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Gwangju', 'Daejeon', 'Ulsan', 'Suwon', 'Jeju', 'Changwon'], CN: ['Shanghai', 'Beijing', 'Chengdu', 'Wuhan', 'Hangzhou', 'Xian', 'Nanjing', 'Shenzhen', 'Suzhou', 'Chongqing'],
    EU: ['Berlin', 'Madrid', 'Paris', 'Warsaw', 'Lisbon', 'Vienna', 'Prague', 'Oslo', 'Milan', 'Athens'], NA: ['Austin', 'Seattle', 'Denver', 'Boston', 'Toronto', 'Chicago', 'Miami', 'Phoenix', 'Portland', 'Dallas'],
    TW: ['Taipei', 'Kaohsiung', 'Taichung', 'Tainan', 'Hsinchu', 'Kowloon', 'Macau', 'Keelung'], SEA: ['Manila', 'Bangkok', 'Jakarta', 'Singapore', 'Kuala Lumpur', 'Cebu', 'Penang', 'Davao'],
    VN: ['Hanoi', 'Saigon', 'Da Nang', 'Hue', 'Can Tho', 'Hai Phong', 'Nha Trang', 'Da Lat'], BR: ['Sao Paulo', 'Rio', 'Curitiba', 'Recife', 'Salvador', 'Brasilia', 'Fortaleza', 'Manaus'],
    JP: ['Tokyo', 'Osaka', 'Nagoya', 'Fukuoka', 'Sapporo', 'Kyoto', 'Sendai', 'Kobe'], TR: ['Istanbul', 'Ankara', 'Izmir', 'Bursa', 'Antalya', 'Adana', 'Konya', 'Trabzon'],
    CIS: ['Moscow', 'Kyiv', 'Minsk', 'Kazan', 'Almaty', 'Riga', 'Tbilisi', 'Sochi'], OCE: ['Sydney', 'Melbourne', 'Perth', 'Brisbane', 'Auckland', 'Adelaide', 'Hobart', 'Darwin'],
    LAT: ['Lima', 'Bogota', 'Santiago', 'Mexico City', 'Quito', 'Caracas', 'Monterrey', 'Rosario'], LAN: ['Mexico City', 'Bogota', 'Monterrey', 'Lima', 'Quito', 'Guadalajara', 'Medellin', 'San Jose'], LAS: ['Buenos Aires', 'Santiago', 'Montevideo', 'Rosario', 'Cordoba', 'Valparaiso', 'Asuncion', 'Mendoza'],
  };
  const CTRY = { KR: 'South Korea', CN: 'China', EU: 'Germany', NA: 'United States', TW: 'Taiwan', SEA: 'Philippines', VN: 'Vietnam', BR: 'Brazil', JP: 'Japan', TR: 'Turkey', CIS: 'Russia', OCE: 'Australia', LAT: 'Mexico', LAN: 'Mexico', LAS: 'Argentina' };
  const TSUF = ['Phoenix', 'Dragons', 'Titans', 'Vipers', 'Knights', 'Wolves', 'Spirit', 'Legion', 'Storm', 'Guardians', 'Rising', 'Nova', 'Esports', 'Gaming', 'Academy', 'United'];
  let R = L.rng(1);
  W.rng = () => R;

  W.genPlayer = function (region, role, ovr, age, potMax) {
    let n; for (let i = 0; i < 20; i++) { n = R() < 0.45 ? R.pick(ID_C) : R.pick(ID_A) + R.pick(ID_B); if (!S.names[n.toLowerCase()]) break; n += R.int(1, 99); }
    S.names[n.toLowerCase()] = 1;
    const a = L.ATTRS.map(() => ovr / 5 + R.norm(0, 1.1)), p = { id: 'g' + S.nextId++, n, rn: '', nn: '', c: CTRY[region] || '', by: S.year - age, r: role, t: null, a, gen: 1, g: 0 };
    for (let it = 0; it < 3; it++) { const d = (ovr - L.ovr(p)) / 5; for (let i = 0; i < 10; i++) a[i] = clamp(a[i] + d, 1, 20); }
    p.a = a.map(Math.round); p.pot = Math.round(clamp(L.ovr(p) + Math.max(0, (24 - age) * R.range(0.6, 2.2)), L.ovr(p), potMax || 92));
    p.h = LATG(region); initPlayer(p); S.players[p.id] = p; return p;
  };
  W.homeOf = (p) => C2R[p.c] || (p.c ? 'EU' : LATG(p.rg || (p.t && S.teams[p.t] ? S.teams[p.t].region : 'EU')));
  function initPlayer(p) {
    if (!p.h) p.h = W.homeOf(p);
    p.form = 1; p.mor = 0.6; p.st = L.playerStyles(p); p.ss = { g: 0, w: 0, k: 0, d: 0, a: 0, r: 0 }; p.car = p.car || []; p.tr = -1; p.list = 0;
    if (!p.wage) { p.wage = Math.round(W.wageAsk(p) * R.range(0.75, 1.05) / 100) * 100; p.cEnd = S.year + R.int(0, 2); }
    return p;
  }
  W.teamColor = (id) => { const h = L.hash(id) % 360; return `hsl(${h},62%,52%)`; };
  function initTeam(t) {
    t.color = t.color || W.teamColor(t.id); t.syn = 0.5; t.tactics = { style: 'teamfight', focus: -1, aggro: 1, obj: 'balanced', ban: -1 };
    t.lineup = []; t.fac = 1; t.youth = 1; t.hist = []; t.fin = { inc: 0, exp: 0, log: [] };
    return t;
  }
  W.roster = (tid) => Object.values(S.players).filter((p) => p.t === tid);
  W.teamOvr = function (t) {
    const lu = t.lineup.map((id) => S.players[id]).filter(Boolean);
    if (lu.length < 5) return 40;
    return lu.reduce((s, p, i) => s + L.ovr(p, i), 0) / 5;
  };
  W.autoLineup = function (t) {
    const ros = W.roster(t.id), used = new Set(), lu = []; let imp = 0;
    for (let role = 0; role < 5; role++) {
      const c = ros.filter((p) => !used.has(p.id)).map((p) => [L.ovr(p, role) + (p.form - 1) * 20, p]).sort((a, b) => b[0] - a[0]);
      let pick = c.find(([, p]) => !(W.isImport(p, t) && imp >= 2)) || c[0];
      if (!pick) break; if (W.isImport(pick[1], t)) imp++;
      used.add(pick[1].id); lu.push(pick[1].id);
    }
    // 포지션 맞교환으로 개선되는지 한 번 확인
    t.lineup = lu; return lu;
  };
  function fillRoster(t, base) {
    const ros = W.roster(t.id);
    for (let role = 0; role < 5; role++) if (!ros.some((p) => p.r === role)) { const p = W.genPlayer(t.region, role, base - 5 + R.range(-2, 2), R.int(18, 23), base + 6); p.t = t.id; }
  }
  function genTeam(region, lid, base, i) {
    let name; const cities = CITY[region] || CITY.EU;
    for (let k = 0; k < 30; k++) { name = `${cities[(i + k) % cities.length]} ${R.pick(TSUF)}`; if (!Object.values(S.teams).some((t) => t.name === name)) break; }
    const id = 'gt' + S.nextId++, t = initTeam({ id, name, short: name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 3) + (i % 10), region, league: lid, gen: 1 });
    S.teams[id] = t;
    for (let role = 0; role < 5; role++) { const p = W.genPlayer(region, role, base + R.range(-4, 3), R.int(17, 25), base + 9); p.t = id; }
    for (let k = 0; k < 2; k++) { const p = W.genPlayer(region, R.int(0, 4), base - 5 + R.range(-2, 2), R.int(16, 20), base + 10); p.t = id; }
    return t;
  }

  // ───────── 새 게임 ─────────
  W.newGame = function (opt) {
    const D = G.LFM_DATA[opt.year]; R = L.rng(opt.seed || (Date.now() & 0x7fffffff));
    S = { v: 1, year: opt.year, startYear: opt.year, day: 0, user: null, mode: opt.mode, leagues: {}, teams: {}, players: {}, matches: [], comps: {}, news: [], hist: [], nextId: 1, names: {}, mid: 1, promo: [], champs: {}, seed: opt.seed || 0, auto: { renew: 1, lineup: 0 } };
    for (const t of D.teams) S.teams[t.id] = initTeam({ ...t });
    for (const lg of D.leagues) S.leagues[lg.id] = { ...lg, teams: lg.teams.slice() };
    for (const p of D.players.concat(D.fa || [])) { const q = { ...p, a: p.a.slice() }; S.names[q.n.toLowerCase()] = 1; S.players[q.id] = q; }
    for (const id in S.players) initPlayer(S.players[id]);
    // 2부 리그가 없는 지역은 가상 팀으로 구성
    for (const lg of Object.values(S.leagues).filter((l) => l.tier === 1)) {
      const id2 = lg.region + '2';
      if (!S.leagues[id2]) {
        const l2 = (S.leagues[id2] = { id: id2, region: lg.region, tier: 2, name: lg.name + ' 챌린저스', base: lg.base - 11, teams: [], gen: 1 });
        for (let i = 0; i < 8; i++) l2.teams.push(genTeam(lg.region, id2, l2.base, i).id);
      }
    }
    for (const id of Object.keys(S.leagues)) if (S.leagues[id].tier === 2 && !S.leagues[S.leagues[id].region + '1']) { for (const t of S.leagues[id].teams) delete S.teams[t]; delete S.leagues[id]; }
    for (const lg of Object.values(S.leagues)) for (const tid of lg.teams) fillRoster(S.teams[tid], lg.base);
    if (opt.mode === 'create') {
      const c = opt.create, lg = S.leagues[c.region + '2'];
      const weak = lg.teams.map((id) => [W.rosterOvr(id), id]).sort((a, b) => a[0] - b[0])[0][1];
      for (const p of W.roster(weak)) { if (p.gen) delete S.players[p.id]; else p.t = null; }
      delete S.teams[weak];
      const t = initTeam({ id: 'user', name: c.name, short: c.short, region: c.region, league: lg.id, color: c.color, created: 1 });
      S.teams.user = t; lg.teams[lg.teams.indexOf(weak)] = 'user';
      for (let role = 0; role < 5; role++) { const p = W.genPlayer(c.region, role, lg.base - 2 + R.range(-2, 2), R.int(17, 22), lg.base + 12); p.t = 'user'; }
      for (let k = 0; k < 2; k++) { const p = W.genPlayer(c.region, k ? 3 : 2, lg.base - 6, 17, lg.base + 14); p.t = 'user'; }
      S.user = 'user';
    } else S.user = opt.teamId;
    S.mgrs = [S.user];
    for (const lg of Object.values(S.leagues)) for (const tid of lg.teams) {
      const t = S.teams[tid]; W.autoLineup(t);
      t.rep = Math.round(W.teamOvr(t)); t.coach = clamp(Math.round((t.rep - 40) / 3 + R.range(-2, 2)), 4, 19);
      const wages = W.roster(tid).reduce((s, p) => s + p.wage, 0);
      t.money = Math.round((wages * 0.5 + W.sponsor(t) * 0.35) / 100) * 100;
      t.tactics.style = W.aiStyle(t);
    }
    if (opt.mode === 'create') S.teams.user.money = Math.round(8000 * W.infl());
    S.teams[S.user].goalNow = W.goal(S.teams[S.user]);
    L.staff.init(D);
    W.setupYear();
    const ut = S.teams[S.user]; ut.conf = 60;
    W.news('구단주 인사', `${ut.name}의 감독으로 부임하신 것을 환영합니다. 이번 시즌 목표는 "${W.goalText(ut)}"입니다. 스쿼드와 전술을 점검한 뒤 화면 오른쪽 위의 [계속 진행]을 눌러 시즌을 시작하세요.`, 'board');
    return S;
  };
  W.rosterOvr = (tid) => { const r = W.roster(tid).map((p) => L.ovr(p)).sort((a, b) => b - a).slice(0, 5); return r.reduce((a, b) => a + b, 0) / Math.max(1, r.length); };
  W.sponsor = (t) => { const lg = S.leagues[t.league]; return Math.round(Math.exp((t.rep - 55) / 9) * 1350 * (lg.tier === 1 ? 1 : 0.45) * W.infl() / 100) * 100; };
  W.aiStyle = function (t) {
    const cnt = {}; for (const id of t.lineup) for (const s of S.players[id].st) cnt[s] = (cnt[s] || 0) + 1;
    return Object.entries(cnt).sort((a, b) => b[1] - a[1] + (R() - 0.5))[0][0];
  };
  W.goalText = function (t) {
    const g = W.goal(t); return g.text;
  };
  W.goal = function (t) {
    const lg = S.leagues[t.league], ranks = lg.teams.map((id) => [S.teams[id].rep, id]).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
    const r = ranks.indexOf(t.id) + 1, n = ranks.length;
    if (lg.tier === 2) return r <= 2 ? { text: '1부 리그 승격', need: 2 } : r <= n / 2 ? { text: '플레이오프 진출', need: Math.min(6, n - 1) } : { text: '중위권 도약', need: Math.ceil(n * 0.7) };
    if (r <= 2) return { text: '리그 우승 경쟁', need: 2 };
    if (r <= Math.ceil(n / 2)) return { text: '플레이오프 진출', need: Math.min(6, n - 2) };
    return { text: '강등권 탈출', need: n - 2 };
  };
  W.news = function (title, body, type, data) { S.news.unshift({ id: S.mid++, day: S.day, year: S.year, title, body, type: type || 'info', read: 0, data }); if (S.news.length > 300) S.news.length = 300; };

  // ───────── 일정 ─────────
  function roundRobin(teams, double) {
    const t = teams.slice(); if (t.length % 2) t.push(null);
    const n = t.length, rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const ms = [];
      for (let i = 0; i < n / 2; i++) { const a = t[i], b = t[n - 1 - i]; if (a && b) ms.push(r % 2 ? [b, a] : [a, b]); }
      rounds.push(ms); t.splice(1, 0, t.pop());
    }
    if (double) for (const ms of rounds.slice()) rounds.push(ms.map(([a, b]) => [b, a]));
    return rounds;
  }
  function addMatch(comp, stage, day, a, b, bo, extra) { const m = Object.assign({ id: S.mid++, day, comp, stage, a, b, bo, res: null }, extra || {}); S.matches.push(m); return m; }
  function addRR(comp, stage, teams, double, bo, d0, d1, extra) {
    const rounds = roundRobin(R.shuffle(teams.slice()), double), span = d1 - d0;
    rounds.forEach((ms, r) => { const day = d0 + Math.floor((r * span) / Math.max(1, rounds.length - 1 || 1)); for (const [a, b] of ms) addMatch(comp, stage, rounds.length === 1 ? d0 : day, a, b, bo, Object.assign({ round: r + 1 }, extra)); });
  }
  W.compMatches = (comp, stage) => S.matches.filter((m) => m.comp === comp && (!stage || m.stage === stage));
  W.table = function (ms, teams) {
    const tb = {}; for (const t of teams) tb[t] = { t, w: 0, l: 0, gw: 0, gl: 0 };
    for (const m of ms) if (m.res && tb[m.a] && tb[m.b]) {
      const [x, y] = m.res.s; tb[m.a].gw += x; tb[m.a].gl += y; tb[m.b].gw += y; tb[m.b].gl += x;
      if (x > y) { tb[m.a].w++; tb[m.b].l++; } else { tb[m.b].w++; tb[m.a].l++; }
    }
    return Object.values(tb).sort((a, b) => b.w - a.w || (b.gw - b.gl) - (a.gw - a.gl) || b.gw - a.gw || (S.teams[b.t] ? S.teams[b.t].rep : 0) - (S.teams[a.t] ? S.teams[a.t].rep : 0));
  };

  W.setupYear = function () {
    S.matches = []; S.comps = {}; S.promo = []; S.champs = {};
    for (const lg of Object.values(S.leagues)) startSplit(lg, 'spring');
  };
  function startSplit(lg, split) {
    const id = `${lg.id}:${split}`, n = lg.teams.length, win = split === 'spring' ? CAL.spring : CAL.summer;
    S.comps[id] = { id, type: 'split', lid: lg.id, split, stage: 'reg', teams: lg.teams.slice(), name: `${S.year} ${lg.name} ${split === 'spring' ? '스프링' : '서머'}`, done: 0, rank: null };
    addRR(id, 'reg', lg.teams, n < 12, 1, win[0], win[1]);
  }

  function progressSplit(c) {
    const lg = S.leagues[c.lid], po = c.split === 'spring' ? CAL.springPO : CAL.summerPO, ms = W.compMatches(c.id);
    const open = (st) => ms.some((m) => m.stage === st && !m.res), has = (st) => ms.some((m) => m.stage === st);
    const tb = () => W.table(ms.filter((m) => m.stage === 'reg'), c.teams).map((x) => x.t);
    const win = (m) => (m.res.s[0] > m.res.s[1] ? m.a : m.b), lose = (m) => (m.res.s[0] > m.res.s[1] ? m.b : m.a);
    if (c.stage === 'reg' && !open('reg')) {
      const t = tb(); c.seeds = t;
      if (t.length >= 8) { c.stage = 'po1'; addMatch(c.id, 'po1', po[0], t[2], t[5], 3); addMatch(c.id, 'po1', po[0], t[3], t[4], 3); }
      else { c.stage = 'po2'; addMatch(c.id, 'po2', po[1], t[0], t[3], 3); addMatch(c.id, 'po2', po[1], t[1], t[2], 3); }
      if (c.teams.includes(S.user)) { const r = t.indexOf(S.user) + 1; W.news(`${c.name} 정규 시즌 종료`, `정규 시즌을 ${r}위로 마쳤습니다. ${r <= (t.length >= 8 ? 6 : 4) ? '플레이오프에 진출합니다.' : '플레이오프 진출에 실패했습니다.'}`, 'league'); }
    } else if (c.stage === 'po1' && !open('po1')) {
      const w = ms.filter((m) => m.stage === 'po1').map(win).sort((a, b) => c.seeds.indexOf(a) - c.seeds.indexOf(b));
      c.stage = 'po2'; addMatch(c.id, 'po2', po[1], c.seeds[0], w[1], 3); addMatch(c.id, 'po2', po[1], c.seeds[1], w[0], 3);
    } else if (c.stage === 'po2' && has('po2') && !open('po2')) {
      const s = ms.filter((m) => m.stage === 'po2'); c.stage = 'final'; addMatch(c.id, 'final', po[2], win(s[0]), win(s[1]), 5);
    } else if (c.stage === 'final' && has('final') && !open('final')) {
      const f = ms.find((m) => m.stage === 'final'), champ = win(f);
      const others = [lose(f), ...ms.filter((m) => m.stage === 'po2').map(lose).sort((a, b) => c.seeds.indexOf(a) - c.seeds.indexOf(b)), ...ms.filter((m) => m.stage === 'po1').map(lose).sort((a, b) => c.seeds.indexOf(a) - c.seeds.indexOf(b))];
      c.rank = [champ, ...others, ...c.seeds.filter((t) => t !== champ && !others.includes(t))];
      c.done = 1; c.champ = champ; c.stage = 'done';
      S.hist.push({ year: S.year, comp: c.name, champ: S.teams[champ].name, tid: champ });
      const prize = Math.round(W.sponsor(S.teams[champ]) * 0.25);
      W.pay(S.teams[champ], prize, `${c.name} 우승 상금`); S.teams[champ].rep = Math.min(99, S.teams[champ].rep + (lg.tier === 1 ? 1.5 : 1));
      if (lg.id === S.teams[S.user].league || lg.tier === 1 && ['KR', 'CN', 'EU', 'NA'].includes(lg.region))
        W.news(`${c.name} 우승: ${S.teams[champ].name}`, `${S.teams[champ].name}이(가) 결승에서 ${S.teams[lose(f)].name}을(를) ${Math.max(...f.res.s)}:${Math.min(...f.res.s)}로 꺾고 우승했습니다.`, 'league');
      for (const tid of c.teams) { const t = S.teams[tid], r = c.rank.indexOf(tid); t.hist.push({ year: S.year, comp: c.name, rank: r + 1 }); }
    }
  }

  // 국제전 공통: 조별 리그 → 4강 토너먼트
  function startIntl(id, name, teams, day, kind) {
    const c = (S.comps[id] = { id, type: 'intl', kind, name: `${S.year} ${name}`, teams: teams.slice(), stage: '', done: 0, day, groups: null });
    const base = (t) => S.leagues[S.teams[t].league].base + S.teams[t].rep / 100;
    const seeded = teams.slice().sort((a, b) => (c.seedv ? 0 : 0) + base(b) - base(a));
    const mainN = kind === 'msi' ? 6 : 16;
    if (teams.length > mainN) {
      const directN = kind === 'msi' ? 4 : 12; c.direct = seeded.slice(0, directN); c.pi = seeded.slice(directN); c.stage = 'playin';
      const half = Math.ceil(c.pi.length / 2), gA = c.pi.filter((_, i) => i % 2 === 0), gB = c.pi.filter((_, i) => i % 2 === 1);
      c.piGroups = kind === 'msi' || c.pi.length < 6 ? [c.pi] : [gA, gB];
      c.piGroups.forEach((g, gi) => addRR(id, 'playin', g, false, 1, day, day + 5, { grp: 'P' + (gi + 1) }));
      void half;
    } else { c.direct = seeded; c.pi = []; startMain(c, seeded); }
    const ut = S.user; if (teams.includes(ut)) W.news(`${c.name} 진출`, `${S.teams[ut].name}이(가) ${c.name}에 출전합니다.`, 'intl');
    return c;
  }
  function startMain(c, teams) {
    const d = c.day + 8; c.stage = 'groups'; c.main = teams.slice();
    if (c.kind === 'msi') { c.groups = [teams]; addRR(c.id, 'groups', teams, true, 1, d, d + 6, { grp: 'A' }); }
    else {
      const base = (t) => S.leagues[S.teams[t].league].base + S.teams[t].rep / 100;
      const sorted = teams.slice().sort((a, b) => base(b) - base(a)), ng = 4, groups = [[], [], [], []];
      // 시드 순서대로 뱀 모양 배정, 같은 지역은 가능한 한 분리
      sorted.forEach((t, i) => {
        const pot = Math.floor(i / ng); let order = [0, 1, 2, 3].filter((g) => groups[g].length === pot);
        if (!order.length) order = [0, 1, 2, 3].sort((a, b) => groups[a].length - groups[b].length);
        R.shuffle(order); const g = order.find((gi) => !groups[gi].some((x) => S.teams[x].region === S.teams[t].region)); groups[g == null ? order[0] : g].push(t);
      });
      c.groups = groups.filter((g) => g.length); c.groups.forEach((g, gi) => addRR(c.id, 'groups', g, true, 1, d, d + 13, { grp: 'ABCD'[gi] }));
    }
  }
  function progressIntl(c) {
    const ms = W.compMatches(c.id), open = (st) => ms.some((m) => m.stage === st && !m.res), has = (st) => ms.some((m) => m.stage === st);
    const win = (m) => (m.res.s[0] > m.res.s[1] ? m.a : m.b), lose = (m) => (m.res.s[0] > m.res.s[1] ? m.b : m.a);
    if (c.stage === 'playin' && !open('playin')) {
      const adv = []; const need = (c.kind === 'msi' ? 6 : 16) - c.direct.length;
      const tabs = c.piGroups.map((g, gi) => W.table(ms.filter((m) => m.stage === 'playin' && m.grp === 'P' + (gi + 1)), g).map((x) => x.t));
      for (let i = 0; adv.length < need && i < 10; i++) for (const t of tabs) if (t[i] && adv.length < need) adv.push(t[i]);
      startMain(c, c.direct.concat(adv));
    } else if (c.stage === 'groups' && !open('groups')) {
      const d = c.kind === 'msi' ? c.day + 16 : c.day + 30;
      const tabs = c.groups.map((g, gi) => W.table(ms.filter((m) => m.stage === 'groups' && m.grp === (c.kind === 'msi' ? 'A' : 'ABCD'[gi])), g).map((x) => x.t));
      if (c.kind === 'msi') { const t = tabs[0]; c.stage = 'sf'; if (t.length >= 4) { addMatch(c.id, 'sf', d, t[0], t[3], 5); addMatch(c.id, 'sf', d + 1, t[1], t[2], 5); } else addMatch(c.id, 'sf', d, t[0], t[1], 5); }
      else {
        c.stage = 'qf'; const n = tabs.length;
        if (n === 4) { addMatch(c.id, 'qf', d, tabs[0][0], tabs[1][1], 5); addMatch(c.id, 'qf', d, tabs[2][0], tabs[3][1], 5); addMatch(c.id, 'qf', d + 1, tabs[1][0], tabs[0][1], 5); addMatch(c.id, 'qf', d + 1, tabs[3][0], tabs[2][1], 5); }
        else { const q = tabs.flatMap((t) => t.slice(0, 2)).slice(0, 4); c.stage = 'sf'; addMatch(c.id, 'sf', d + 6, q[0], q[3], 5); addMatch(c.id, 'sf', d + 7, q[1], q[2], 5); }
      }
    } else if (c.stage === 'qf' && has('qf') && !open('qf')) {
      const q = ms.filter((m) => m.stage === 'qf').map(win), d = c.day + 37; c.stage = 'sf';
      addMatch(c.id, 'sf', d, q[0], q[1], 5); addMatch(c.id, 'sf', d + 1, q[2], q[3], 5);
    } else if (c.stage === 'sf' && has('sf') && !open('sf')) {
      const s = ms.filter((m) => m.stage === 'sf'), d = c.kind === 'msi' ? c.day + 20 : c.day + 44; c.stage = 'final';
      if (s.length >= 2) addMatch(c.id, 'final', d, win(s[0]), win(s[1]), 5); else { finishIntl(c, s[0]); }
    } else if (c.stage === 'final' && has('final') && !open('final')) finishIntl(c, ms.find((m) => m.stage === 'final'));
    function finishIntl(c2, f) {
      const champ = win(f), t = S.teams[champ]; c2.done = 1; c2.stage = 'done'; c2.champ = champ;
      S.hist.push({ year: S.year, comp: c2.name, champ: t.name, tid: champ, intl: 1 });
      W.pay(t, Math.round((c2.kind === 'msi' ? 6000 : 18000) * W.infl()), `${c2.name} 우승 상금`); t.rep = Math.min(99, t.rep + (c2.kind === 'msi' ? 2 : 4));
      t.hist.push({ year: S.year, comp: c2.name, rank: 1 });
      W.news(`${c2.name} 우승: ${t.name}`, `${t.name}이(가) 결승에서 ${S.teams[lose(f)].name}을(를) ${Math.max(...f.res.s)}:${Math.min(...f.res.s)}로 꺾고 세계 정상에 올랐습니다.`, 'intl');
    }
  }
  W.worldsSlots = function (lg) { const b = lg.base; return b >= 76 ? (S.year >= 2021 ? 4 : 3) : b >= 70 ? 3 : b >= 65 ? 2 : 1; };

  function startPromo() {
    for (const l1 of Object.values(S.leagues).filter((l) => l.tier === 1)) {
      const l2 = S.leagues[l1.region + '2']; if (!l2) continue;
      const c1 = S.comps[`${l1.id}:summer`], c2 = S.comps[`${l2.id}:summer`]; if (!c1 || !c2 || !c2.rank) continue;
      const bottom = c1.seeds.slice(-2).reverse(), top = c2.rank.slice(0, 2), id = `${l1.region}:promo`;
      S.comps[id] = { id, type: 'promo', name: `${S.year} ${l1.name} 승강전`, region: l1.region, teams: [...bottom, ...top], stage: 'promo', done: 0 };
      addMatch(id, 'promo', CAL.promo, bottom[0], top[0], 5); addMatch(id, 'promo', CAL.promo + 1, bottom[1], top[1], 5);
      if (bottom.includes(S.user) || top.includes(S.user)) W.news('승강전 진출', `${S.comps[id].name}에 출전합니다. 5전 3선승제 시리즈로 다음 시즌 소속 리그가 결정됩니다.`, 'league');
    }
  }
  function progressPromo(c) {
    const ms = W.compMatches(c.id); if (ms.some((m) => !m.res)) return;
    c.done = 1; c.stage = 'done';
    for (const m of ms) {
      const upWon = m.res.s[1] > m.res.s[0]; // b = 2부 팀
      if (upWon) { S.promo.push({ up: m.b, down: m.a, region: c.region }); if (m.a === S.user || m.b === S.user || c.region === S.teams[S.user].region) W.news(`승격: ${S.teams[m.b].name}`, `${S.teams[m.b].name}이(가) 승강전에서 ${S.teams[m.a].name}을(를) 꺾고 다음 시즌 1부 리그로 올라갑니다. ${S.teams[m.a].name}은(는) 강등됩니다.`, 'league'); }
    }
  }

  // ───────── 하루 진행 ─────────
  W.todayMatches = () => S.matches.filter((m) => m.day === S.day && !m.res);
  W.userMatchToday = () => W.todayMatches().find((m) => m.a === S.user || m.b === S.user);
  W.nextUserMatch = () => S.matches.filter((m) => !m.res && (m.a === S.user || m.b === S.user)).sort((a, b) => a.day - b.day)[0];

  // 하루를 끝낸다. 유저 경기가 남아 있으면 진행하지 않고 그 경기를 돌려준다.
  W.advance = function () {
    const um = W.userMatchToday(); if (um) return { match: um };
    const uLg = S.teams[S.user].league;
    for (const m of W.todayMatches()) {
      const full = false; // 물리 엔진은 직접 보는 경기에만 쓴다 (AI끼리는 같은 승률 곡선의 간이 계산)
      L.sim.playSeries(m, full);
    }
    W.endOfDay();
    return { day: S.day };
  };
  W.endOfDay = function () {
    for (const c of Object.values(S.comps)) if (!c.done) { if (c.type === 'split') progressSplit(c); else if (c.type === 'intl') progressIntl(c); else if (c.type === 'promo') progressPromo(c); }
    const d = S.day;
    if (d === CAL.msi - 1) {
      const champs = Object.values(S.comps).filter((c) => c.type === 'split' && c.split === 'spring' && c.champ && S.leagues[c.lid].tier === 1).map((c) => c.champ);
      if (champs.length >= 2) startIntl('msi', 'MSI', champs, CAL.msi, 'msi');
    }
    if (d === CAL.summer[0] - 2) for (const lg of Object.values(S.leagues)) startSplit(lg, 'summer');
    if (d === CAL.promo - 2) startPromo();
    if (d === CAL.worlds - 2) {
      const teams = [];
      for (const lg of Object.values(S.leagues).filter((l) => l.tier === 1)) {
        const su = S.comps[`${lg.id}:summer`], sp = S.comps[`${lg.id}:spring`]; if (!su || !su.rank) continue;
        const order = su.rank.slice(); if (sp && sp.champ && order.indexOf(sp.champ) > 1) { order.splice(order.indexOf(sp.champ), 1); order.splice(1, 0, sp.champ); }
        teams.push(...order.slice(0, W.worldsSlots(lg)));
      }
      if (teams.length >= 4) startIntl('worlds', '월드 챔피언십', teams, CAL.worlds, 'worlds');
    }
    L.manage.daily();
    S.day++;
    if (S.day >= CAL.end) L.manage.rollover();
  };

  // ───────── 저장 ─────────
  W.save = function (slot) {
    try { localStorage.setItem('lfm2_save_' + (slot || 0), JSON.stringify(S)); return true; } catch (e) { return false; }
  };
  W.load = function (slot) {
    const s = localStorage.getItem('lfm2_save_' + (slot || 0)); if (!s) return false;
    S = JSON.parse(s); if (!S.mgrs) S.mgrs = [S.user]; R = L.rng((Date.now() & 0x7fffffff) || 1); return true;
  };
  W.hasSave = (slot) => { try { return !!localStorage.getItem('lfm2_save_' + (slot || 0)); } catch (e) { return false; } };
  W.pay = function (t, amt, why) { t.money += amt; if (amt >= 0) t.fin.inc += amt; else t.fin.exp -= amt; if (t.id === S.user) { t.fin.log.unshift({ day: S.day, year: S.year, amt, why }); if (t.fin.log.length > 60) t.fin.log.length = 60; } };
  W.stars = function (t) { // 전력 별점 0.5~5
    const all = Object.values(S.leagues).flatMap((l) => l.teams).map((id) => W.teamOvr(S.teams[id])).sort((a, b) => a - b);
    const o = W.teamOvr(t), lo = all[0], hi = all[all.length - 1];
    return Math.max(0.5, Math.round(((o - lo) / (hi - lo || 1)) ** 0.9 * 10) / 2);
  };
})(typeof window !== 'undefined' ? window : globalThis);
