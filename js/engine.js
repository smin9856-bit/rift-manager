// 경기 시뮬레이션 엔진: 맵 위에서 10명이 초 단위로 움직이며, 모든 결과는 누적된 확률 판정에서 나온다.
(function (G) {
  const L = G.LFM, clamp = L.clamp, I = L.AI;
  const TOP = 0, JGL = 1, MID = 2, ADC = 3, SUP = 4;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // ───────── 맵 ─────────
  function poly(pts) {
    const seg = []; let len = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      seg.push({ a, b, d, start: len }); len += d;
    }
    return {
      len, pts,
      at(s) {
        const d = clamp(s, 0, 1) * len;
        for (const g of seg) if (d <= g.start + g.d + 1e-6) {
          const k = (d - g.start) / g.d;
          return { x: g.a[0] + (g.b[0] - g.a[0]) * k, y: g.a[1] + (g.b[1] - g.a[1]) * k };
        }
        const l = pts[pts.length - 1]; return { x: l[0], y: l[1] };
      },
    };
  }
  const LANES = [
    poly([[75, 925], [75, 185], [185, 75], [925, 75]]),
    poly([[75, 925], [925, 75]]),
    poly([[75, 925], [815, 925], [925, 815], [925, 75]]),
  ];
  const BASE = [{ x: 75, y: 925 }, { x: 925, y: 75 }];
  const mir = (p) => ({ x: 1000 - p.x, y: 1000 - p.y });
  const CAMPS0 = [{ x: 215, y: 560 }, { x: 300, y: 470 }, { x: 235, y: 395 }, { x: 440, y: 790 }, { x: 530, y: 715 }, { x: 605, y: 810 }];
  const CAMPS = [CAMPS0, CAMPS0.map(mir)];
  const PIT = { dragon: { x: 690, y: 705 }, baron: { x: 310, y: 295 } };
  const RIVER = [{ x: 250, y: 250 }, { x: 375, y: 375 }, { x: 500, y: 500 }, { x: 625, y: 625 }, { x: 750, y: 750 }];
  const S_STRUCT = [0.40, 0.27, 0.15, 0.10];
  const KINDS = ['t1', 't2', 't3', 'inh'];
  const HP_STRUCT = [3900, 3000, 2700, 2800];
  const BODY = 25, FIXED_DT = 0.05;
  const WALLS0 = [{x:230,y:640,r:30},{x:350,y:500,r:27},{x:475,y:820,r:28},{x:650,y:800,r:30}];
  const WALLS = WALLS0.concat(WALLS0.map(w=>({...mir(w),r:w.r})));
  function segmentDistance(a,b,p) { const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;const u=den?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/den,0,1):0;return Math.hypot(a.x+u*dx-p.x,a.y+u*dy-p.y); }
  const clearSegment = (a,b) => WALLS.every(w=>segmentDistance(a,b,w)>w.r+BODY+2);

  // 이동 그래프
  const NODES = [];
  for (let l = 0; l < 3; l++) for (let i = 0; i <= 10; i++) { if ((i === 0 || i === 10) && l > 0) continue; NODES.push(LANES[l].at(i / 10)); }
  NODES.push(...CAMPS[0], ...CAMPS[1], ...RIVER, PIT.dragon, PIT.baron);
  for(const w of WALLS)for(let i=0;i<8;i++){const a=i*Math.PI/4;NODES.push({x:w.x+Math.cos(a)*(w.r+BODY+15),y:w.y+Math.sin(a)*(w.r+BODY+15)});}
  const N = NODES.length, D = [], NX = [];
  for (let i = 0; i < N; i++) {
    D.push(new Float64Array(N).fill(1e9)); NX.push(new Int16Array(N).fill(-1));
    for (let j = 0; j < N; j++) {
      const d = dist(NODES[i], NODES[j]);
      if (i === j) { D[i][j] = 0; NX[i][j] = j; } else if (d < 196 && clearSegment(NODES[i],NODES[j])) { D[i][j] = d; NX[i][j] = j; }
    }
  }
  for (let k = 0; k < N; k++) for (let i = 0; i < N; i++) for (let j = 0; j < N; j++)
    if (D[i][k] + D[k][j] < D[i][j]) { D[i][j] = D[i][k] + D[k][j]; NX[i][j] = NX[i][k]; }
  function nearestNode(p) { let b = 0, bd = 1e9; for (let i = 0; i < N; i++) { const d = dist(p, NODES[i]); if (d < bd) { bd = d; b = i; } } return b; }
  function findPath(from, to) {
    if (dist(from, to) < 190 && clearSegment(from,to)) return [to];
    const tn = nearestNode(to); let sn = -1, best = 1e9;
    for (let i = 0; i < N; i++) { const d = dist(from, NODES[i]); if (d < 260 && clearSegment(from,NODES[i])) { const c = d + D[i][tn]; if (c < best) { best = c; sn = i; } } }
    if (sn < 0) sn = nearestNode(from);
    const path = []; let c = sn, guard = 0;
    while (c !== tn && guard++ < 60) { path.push(NODES[c]); c = NX[c][tn]; if (c < 0) break; }
    path.push(NODES[tn]);
    // 목적지에 이미 가까운 꼬리 노드 정리
    while (path.length > 1 && clearSegment(path[path.length-2],to) && dist(path[path.length - 2], to) < dist(path[path.length - 1], to) + 40 && dist(path[path.length - 2], to) < 190) path.pop();
    path.push(to);
    return path;
  }

  const LANE_OF = [0, -1, 1, 2, 2];
  const ROLE_DMG = [0.92, 0.86, 1.15, 1.22, 0.5];
  const ROLE_HP = [1.2, 1.14, 0.95, 0.9, 1.0];
  const FARM_W = [1, 0.5, 1.1, 1.5, 0.2];
  const LANE_KO = ['탑', '미드', '바텀'];

  // ───────── 경기 ─────────
  function Match(cfg) {
    const m = this;
    m.rnd = L.rng(cfg.seed || 1); m.t = 0; m.done = false; m.winner = -1; m.events = []; m.timeline = [];
    m.visuals = !!cfg.visuals; m.fx = []; m.fxSeq = 0;
    m.projectiles=[];m.shotSeq=0;m.physicsTicks=0;m.stepAcc=0;
    const y = (m.year = cfg.year || 2020);
    m.era = { herald: y >= 2016, soul: y >= 2020, plates: y >= 2019, dragonGold: y <= 2014 };
    m.imp = cfg.importance || 0;
    m.front = [0.5, 0.5, 0.5];
    m.fights = []; m.firstBlood = false; m.nextMacro = 75; m.proxAcc = 0; m.fleeAcc = 0;
    m.sides = cfg.sides.map((s, si) => {
      const tac = Object.assign({ style: 'teamfight', focus: -1, aggro: 1, obj: 'balanced', ban: -1 }, s.tactics || {});
      const side = {
        i: si, name: s.name, short: s.short || s.name, color: s.color, tactics: tac, coach: s.coach || 10,
        synergy: s.synergy == null ? 0.5 : s.synergy, plan: null, dragons: 0, soul: false, baronUntil: 0, elderUntil: 0,
        herald: false, kills: 0, towers: 0, barons: 0, players: [],
        st: [0, 1, 2].map((l) => KINDS.map((k, j) => {
          const sv = si === 0 ? S_STRUCT[j] : 1 - S_STRUCT[j]; const p = LANES[l].at(sv);
          return { k, s: sv, hp: HP_STRUCT[j], max: HP_STRUCT[j], x: p.x, y: p.y, side: si, lane: l, respawn: 0 };
        })),
        nt: { k: 'nt', hp: 5200, max: 5200, x: si === 0 ? 128 : 872, y: si === 0 ? 872 : 128, side: si },
        nx: { k: 'nx', hp: 5500, max: 5500, x: si === 0 ? 92 : 908, y: si === 0 ? 908 : 92, side: si },
        camps: CAMPS[si].map((c) => ({ x: c.x, y: c.y, ready: 90 })),
      };
      return side;
    });
    cfg.sides.forEach((s, si) => {
      const side = m.sides[si], enemyTac = m.sides[1 - si].tactics;
      s.players.forEach((p, role) => {
        const a = p.a, pool = a[I.pool], men = a[I.clt], con = a[I.con];
        let mult = (p.form || 1) * (1 + ((p.morale == null ? 0.5 : p.morale) - 0.5) * 0.06);
        mult *= m.rnd.norm(1, 0.012 + (20 - con) * 0.0022);
        mult *= 1 - m.imp * (12 - men) * 0.005;
        const st = p.st || L.playerStyles(p);
        mult *= st.includes(side.tactics.style) ? 1.02 : 1 - (20 - pool) * 0.003;
        if (enemyTac.ban === role) mult *= 0.99 - (20 - pool) * 0.005;
        if (p.r != null && p.r !== role) mult *= 0.88;
        const b = BASE[si];
        side.players.push({
          p, side: si, role, lane: LANE_OF[role], idx: si * 5 + role, x: si ? 840+(role%3)*55 : 50+(role%3)*55, y: si ? 55+Math.floor(role/3)*55 : 890-Math.floor(role/3)*55,
          px: b.x, py: b.y, hp: 600, lvl: 1, xp: 0, gold: 500, spent: 500, k: 0, d: 0, a: 0, cs: 0, dmg: 0, dead: 0,
          task: 'lane', path: null, dest: null, mult, tilt: 0, streak: 0, fight: null, hitBy: {}, say: '', sayT: 0,
          fleeUntil: 0, noEng: 0, recall: 0, stun: 0, tp: null, tpReady: 400, gank: null,
          nextGank: 150 + m.rnd.range(0, 40), nextRoam: 330 + m.rnd.range(0, 120), camp: -1, clearT: 0, tgt: null,
          champion: p.champion || null, cooldowns: [0, 0, 0, 0], castSlot: -1, castUntil: 0,
          vx:0,vy:0,attackReady:0,windupUntil:0,life:0,
        });
      });
      side.players.forEach((pl) => (pl.hp = m.mhp(pl)));
    });
    m.all = m.sides[0].players.concat(m.sides[1].players);
    m.obj = {
      dragon: { type: 'dragon', alive: false, next: 300, hp: 0, max: 0, need: 2, bite: 0.004, x: PIT.dragon.x, y: PIT.dragon.y, elder: false },
      baron: { type: 'baron', alive: false, next: 1200, hp: 0, max: 0, need: 3, bite: 0.009, x: PIT.baron.x, y: PIT.baron.y },
      herald: { type: 'herald', alive: false, next: m.era.herald ? 480 : 1e9, hp: 0, max: 0, need: 2, bite: 0.004, x: PIT.baron.x, y: PIT.baron.y },
    };
    for(const p of m.all){p.px=p.x;p.py=p.y;}
  }
  const P = Match.prototype;

  P.agg = function (pl) { return (this.eff(pl, I.lan) + this.eff(pl, I.mec)) / 2; }; // 공격성은 라인전·피지컬에서 나온다
  P.eff = function (pl, i) { return pl.p.a[i] * pl.mult * (1 - pl.tilt); };
  P.pow = function (pl) { return 40 + pl.lvl * 9 + pl.spent / 38; };
  P.mhp = function (pl) { return (560 + pl.lvl * 92 + pl.spent / 14) * ROLE_HP[pl.role]; };
  P.skill = function (pl) {
    const e = (i) => this.eff(pl, i);
    return 1 + 0.075 * (e(I.mec) * 0.45 + e(I.tf) * 0.35 + e(I.con) * 0.1 + e(I.clt) * 0.1 - 12) + (this.t > 1500 || this.imp > 0.5 ? (e(I.clt) - 12) * 0.008 : 0);
  };
  P.teamMult = function (si) {
    const s = this.sides[si], o = this.sides[1 - si], t = this.t, S = L.STYLES[s.tactics.style];
    let ph;
    if (t < 840) ph = S.early; else if (t < 1680) ph = S.early + (S.mid - S.early) * Math.min(1, (t - 840) / 300);
    else ph = S.mid + (S.late - S.mid) * Math.min(1, (t - 1680) / 400);
    let v = ph * (1 + L.COUNTER[s.tactics.style][o.tactics.style] * (1 + (s.coach - 10) * 0.03));
    v *= 1 + (s.synergy - 0.5) * 0.06;
    v *= 1 + s.dragons * 0.018 + (s.soul ? 0.06 : 0);
    if (t < s.baronUntil) v *= 1.06;
    if (t < s.elderUntil) v *= 1.15;
    return v;
  };
  P.strength = function (pl) { return this.pow(pl) * this.skill(pl) * (0.35 + 0.65 * pl.hp / this.mhp(pl)) * ROLE_DMG[pl.role] ** 0.5; };
  P.alive = function (si) { return this.sides[si].players.filter((p) => !p.dead); };
  P.teamGold = function (si) { return this.sides[si].players.reduce((s, p) => s + p.gold, 0); };
  P.ev = function (type, side, text, pos) { this.events.push({ t: this.t, type, side, text, x: pos ? pos.x : 0, y: pos ? pos.y : 0 }); };
  P.say = function (pl, text, ttl) { pl.say = text; pl.sayT = this.t + (ttl || 6); };
  P.effect = function (src, target, kind, amount, slot = -1) {
    if (!this.visuals) return;
    this.fx.push({ id:++this.fxSeq, t:this.t, source:src?.idx, target:target.idx, side:src?.side ?? 1-target.side,
      x:src?.x ?? target.x, y:src?.y ?? target.y-70, tx:target.x, ty:target.y, champion:src?.champion, kind, amount:Math.round(amount), slot });
    if (this.fx.length > 160) this.fx.splice(0, this.fx.length - 160);
  };
  P.limit = function (si, lane) { // si 진영의 그 라인 최전방 생존 구조물
    for (const st of this.sides[si].st[lane]) if (st.hp > 0) return st;
    return null;
  };
  P.limS = function (si, lane) { const st = this.limit(si, lane); return st ? st.s : si === 0 ? 0.05 : 0.95; };
  P.lanePt = function (lane, s) { return LANES[lane].at(s); };

  // ───────── 한 틱 ─────────
  P.step = function (dt) {
    if(!Number.isFinite(dt)||dt<=0||this.done)return;
    this.stepAcc+=dt;
    while(this.stepAcc+1e-9>=FIXED_DT&&!this.done){
      this.stepAcc-=FIXED_DT;this.physicsTicks++;this.t=this.physicsTicks*FIXED_DT;
      for(const p of this.all){p.px=p.x;p.py=p.y;}
      if(this.physicsTicks%20===0)this.strategyTick(1);
      if(this.done)break;
      this.move(FIXED_DT);this.resolveBodies();this.updateProjectiles(FIXED_DT);
    }
  };
  P.strategyTick = function (dt) {
    const m = this; if (m.done) return;
    const t = m.t;
    if (m.visuals) m.fx = m.fx.filter(e => t - e.t < 8);
    for (const pl of m.all) {
      if (pl.dead) {
        if (t >= pl.dead) { pl.dead = 0; const b = BASE[pl.side]; pl.x = b.x+(pl.role%2?40:-25); pl.y = b.y+(pl.side?1:-1)*Math.floor(pl.role/2)*53;pl.px=pl.x;pl.py=pl.y;pl.vx=pl.vy=0;pl.life++; pl.spent = pl.gold; pl.hp = m.mhp(pl); pl.path = null; pl.dest = null; pl.task = 'lane'; pl.hitBy = {}; }
        else continue;
      }
      if (t > 110) pl.gold += 2.04 * dt;
      const mh = m.mhp(pl);
      if (!pl.fight) pl.hp = Math.min(mh, pl.hp + mh * 0.0045 * dt);
      if (dist(pl, BASE[pl.side]) < 70) { pl.hp = Math.min(mh, pl.hp + mh * 0.12 * dt); pl.spent = pl.gold; }
      while (pl.lvl < 18 && pl.xp >= 180 + 100 * pl.lvl) { pl.xp -= 180 + 100 * pl.lvl; pl.lvl++; pl.hp += 92 * ROLE_HP[pl.role]; }
    }
    m.spawnObjectives();
    if (t >= m.nextMacro) { m.nextMacro = t + 8; m.decidePlan(0); m.decidePlan(1); }
    for (const pl of m.all) if (!pl.dead) m.assign(pl, dt);
    m.lanes(dt);
    m.proxAcc += dt; if (m.proxAcc >= 2) { m.proxAcc = 0; m.proximity(); }
    m.runFights(dt);
    m.runObjectives(dt);
    m.runStructures(dt);
    if (t >= (m.timeline.length + 1) * 60) m.timeline.push({ g: Math.round(m.teamGold(0) - m.teamGold(1)), k0: m.sides[0].kills, k1: m.sides[1].kills });
    if (t > 4500 && !m.done) m.finish(m.teamGold(0) >= m.teamGold(1) ? 0 : 1);
  };

  P.spawnObjectives = function () {
    const m = this, t = m.t, o = m.obj;
    if (!o.dragon.alive && t >= o.dragon.next) {
      o.dragon.alive = true; o.dragon.max = o.dragon.hp = 3000 + t * 2.4;
      o.dragon.elder = m.era.soul && (m.sides[0].soul || m.sides[1].soul);
      if (o.dragon.elder) o.dragon.max = o.dragon.hp = 7000 + t * 2;
    }
    if (!o.herald.alive && t >= o.herald.next && t < 1100) { o.herald.alive = true; o.herald.max = o.herald.hp = 5200; o.herald.next = 1e9; }
    if (o.herald.alive && t >= 1185) o.herald.alive = false;
    if (!o.baron.alive && t >= o.baron.next) { o.baron.alive = true; o.baron.max = o.baron.hp = 9000 + t * 2.6; }
    for (const s of m.sides) for (const ln of s.st) { const inh = ln[3]; if (inh.hp <= 0 && inh.respawn && t >= inh.respawn) { inh.hp = inh.max; inh.respawn = 0; m.ev('info', s.i, `${s.short} ${LANE_KO[inh.lane]} 억제기 재생성`, inh); } }
  };

  // ───────── 팀 운영 판단 ─────────
  P.decidePlan = function (si) {
    const m = this, s = m.sides[si], o = m.sides[1 - si], t = m.t, tac = s.tactics;
    if (s.players.some((p) => p.fight)) return;
    const pl = s.plan;
    if (pl && t < pl.until) {
      if (pl.type === 'dragon' || pl.type === 'baron' || pl.type === 'herald') { if (m.obj[pl.type].alive) return; }
      else return;
    }
    const me = m.alive(si), en = m.alive(1 - si), myDead = 5 - me.length, enDead = 5 - en.length;
    const g0 = m.teamGold(si), g1 = m.teamGold(1 - si), lead = clamp(((g0 - g1) / (g0 + g1)) * 7, -1, 1);
    const mac = me.reduce((a, p) => a + m.eff(p, I.mac), 0) / Math.max(1, me.length) + (s.coach - 10) * 0.25;
    const noise = () => m.rnd.norm(0, 0.34 * clamp(1.5 - mac / 20, 0.35, 1.2));
    const ag = (tac.aggro - 1) * 0.15, opts = [];
    const dW = tac.obj === 'dragon' ? 1.25 : tac.obj === 'towers' ? 0.85 : 1, tW = tac.obj === 'towers' ? 1.25 : tac.obj === 'dragon' ? 0.9 : 1;
    const numAdj = (enDead - myDead) * 0.4;
    opts.push({ type: 'lane', u: (t < 840 ? 1.7 - (t / 840) * 0.9 : 0.78 - Math.max(0, lead) * 0.1 - (t > 1800 ? 0.15 : 0)) + noise() * 0.5 });
    const dr = m.obj.dragon;
    if ((dr.alive || dr.next - t < 35) && me.length >= 3) {
      let u = 0.85 * dW + s.dragons * 0.13 + o.dragons * 0.08 + (t < 840 ? -0.2 : 0.2) + numAdj + lead * 0.2 + ag + noise();
      if (dr.elder) u += 0.5; if (m.era.soul && (s.dragons === 3 || o.dragons === 3)) u += 0.4;
      opts.push({ type: 'dragon', u });
    }
    const he = m.obj.herald;
    if ((he.alive || (he.next - t < 30 && he.next < 1e8)) && me.length >= 3) opts.push({ type: 'herald', u: 0.72 * tW + numAdj + ag + noise() });
    const ba = m.obj.baron;
    if ((ba.alive || (ba.next - t < 30 && t > 1100)) && me.length >= 4)
      opts.push({ type: 'baron', u: 0.5 + lead * 0.45 + enDead * 0.5 - myDead * 0.6 + ag + noise() * 1.2 });
    if (t > 780) {
      let best = -1, bs = -1e9; const deep = t > 1800 || t < s.baronUntil;
      for (let l = 0; l < 3; l++) {
        const dead = o.st[l].filter((x) => x.hp <= 0).length, f = si === 0 ? m.front[l] : 1 - m.front[l];
        const sc = (deep ? dead * 0.3 : (dead === 0 ? 0.5 : dead === 1 ? 0.25 : -0.2)) + f * 0.5 + (l === 1 ? 0.12 : 0) + (tac.focus === l ? 0.1 : 0) + m.rnd() * 0.4;
        if (sc > bs) { bs = sc; best = l; }
      }
      const buff = t < s.baronUntil || t < s.elderUntil ? 0.9 : 0;
      opts.push({ type: 'siege', lane: best, u: 0.55 * tW + lead * 0.4 + buff + numAdj * 0.9 + (t > 1500 ? 0.2 : 0) + ag + noise() });
      if (enDead >= 4 && t > 1200) opts.push({ type: 'siege', lane: best, u: 3.2, end: true });
    }
    // 수비: 상대가 우리 구조물을 두드리고 있는 라인
    let dl = -1, dn = 0;
    for (let l = 0; l < 3; l++) {
      const lim = m.limit(si, l), pos = lim || s.nt;
      const n = en.filter((p) => dist(p, pos) < 220).length;
      const crit = !lim || lim.k === 't3' || lim.k === 'inh' ? 0.6 : 0;
      if (n + crit > dn && n >= 1) { dn = n + crit; dl = l; }
    }
    if (dl >= 0 && (dn >= 3 || (dn >= 2 && t > 720))) opts.push({ type: 'defend', lane: dl, u: 0.7 + dn * 0.28 - Math.max(0, lead) * 0.1 + noise() * 0.6 });
    if (myDead >= 3) opts.forEach((x) => { if (x.type !== 'lane' && x.type !== 'defend') x.u -= 1.2; });
    opts.sort((a, b) => b.u - a.u);
    const c = opts[0], prev = pl ? pl.type : 'lane';
    const who = new Set([JGL, MID, ADC, SUP, TOP]);
    if (c.type === 'lane') { s.plan = { type: 'lane', until: t + 16, who: new Set() }; return; }
    const early = t < 840;
    if (c.type === 'dragon' && early) who.delete(TOP);
    if (c.type === 'herald' && early) { who.delete(ADC); who.delete(SUP); }
    if ((c.type === 'siege' || c.type === 'defend') && !c.end) {
      const split = tac.style === 'split' ? 0.85 : 0.25;
      if (t < 1900 && dn < 3 && m.rnd() < split) who.delete(TOP);
    }
    s.plan = { type: c.type, lane: c.lane, until: t + (c.end ? 70 : m.rnd.range(28, 48)), who, end: !!c.end };
    if (c.type !== prev && (c.type === 'dragon' || c.type === 'baron' || c.type === 'herald')) {
      const j = s.players[JGL]; if (!j.dead) m.say(j, c.type === 'dragon' ? '드래곤 집결' : c.type === 'baron' ? '바론 집결' : '전령 집결', 7);
    }
  };

  P.planDest = function (si) {
    const m = this, s = m.sides[si], pl = s.plan, dir = si === 0 ? 1 : -1;
    if (!pl) return null;
    if (pl.type === 'dragon' || pl.type === 'baron' || pl.type === 'herald') {
      const o = m.obj[pl.type]; return { x: o.x - dir * 30, y: o.y + dir * 30 };
    }
    if (pl.type === 'siege') {
      const lim = m.limS(1 - si, pl.lane), f = m.front[pl.lane];
      const sv = si === 0 ? Math.min(f + 0.01, lim - 0.02) : Math.max(f - 0.01, lim + 0.02);
      if (!m.limit(1 - si, pl.lane)) { const o = m.sides[1 - si]; const tg = o.nt.hp > 0 ? o.nt : o.nx; return { x: tg.x - dir * 45, y: tg.y + dir * 45 }; }
      return m.lanePt(pl.lane, sv);
    }
    if (pl.type === 'defend') {
      const lim = m.limit(si, pl.lane);
      if (!lim) { const b = s.nt.hp > 0 ? s.nt : s.nx; return { x: b.x + dir * 20, y: b.y - dir * 20 }; }
      return m.lanePt(pl.lane, lim.s - dir * 0.012);
    }
    return null;
  };

  // ───────── 개인 행동 ─────────
  P.assign = function (pl, dt) {
    const m = this, t = m.t, s = m.sides[pl.side], dir = pl.side === 0 ? 1 : -1;
    if (pl.fight || pl.stun > t) return;
    if (pl.tp) { if (t >= pl.tp.until) { pl.x = pl.tp.x; pl.y = pl.tp.y; pl.px = pl.x; pl.py = pl.y; pl.tp = null; pl.path = null; pl.dest = null; } return; }
    if (pl.recall) {
      if (t >= pl.recall) {
        const b = BASE[pl.side]; pl.x = b.x; pl.y = b.y; pl.px = pl.x; pl.py = pl.y; pl.recall = 0; pl.spent = pl.gold; pl.hp = m.mhp(pl); pl.path = null; pl.dest = null;
        m.say(pl, pl.role === JGL ? '정비 후 정글 복귀' : `정비 후 ${LANE_KO[pl.lane]} 복귀`, 9);
      }
      return;
    }
    if (pl.fleeUntil > t) { pl.task = 'flee'; const lim = pl.lane >= 0 ? m.limit(pl.side, pl.lane) : null; m.go(pl, lim && dist(pl, lim) < 400 ? lim : BASE[pl.side]); return; }
    const mh = m.mhp(pl), hr = pl.hp / mh;
    const enemyNear = m.sides[1 - pl.side].players.some((e) => !e.dead && dist(e, pl) < 150);
    const fightF = m.fights.find((f) => f.members.some((x) => x.side === pl.side && !x.dead));
    const wantsRecall = hr < 0.34 || (pl.gold - pl.spent > 1400 && hr < 0.75 && m.rnd() < 0.03 * dt) || (pl.gold - pl.spent > 2600 && m.rnd() < 0.02 * dt);
    if (wantsRecall && dist(pl, BASE[pl.side]) > 120 && !(s.plan && s.plan.end)) {
      if (enemyNear) { pl.task = 'flee'; pl.fleeUntil = t + 4; return; }
      pl.recall = t + 8; pl.task = 'recall'; pl.path = null; pl.gank = null; if (hr < 0.34) m.say(pl, '귀환', 5); return;
    }
    // 교전 합류
    if (fightF && hr > 0.4) {
      const d = dist(pl, fightF);
      if (d < 150) { m.joinFight(fightF, pl); return; }
      if (d < 420 && (t > 780 || pl.role === JGL || d < 230)) { pl.task = 'join'; m.go(pl, fightF); return; }
      if (pl.role === TOP && t > pl.tpReady && d > 480 && fightF.members.filter((x) => x.side === pl.side).length >= 2) {
        pl.tp = { until: t + 4, x: fightF.x - dir * 50, y: fightF.y + dir * 50 }; pl.tpReady = t + 330; m.say(pl, '순간이동', 5); return;
      }
    }
    const plan = s.plan;
    if (plan && plan.who.has(pl.role)) { const d = m.planDest(pl.side); if (d) { const angle=pl.role*Math.PI*2/5;pl.task = 'group'; pl.gank = null; m.go(pl, {x:d.x+Math.cos(angle)*58,y:d.y+Math.sin(angle)*58}); return; } }
    if (pl.gank) { m.doGank(pl); return; }
    if (pl.role === JGL) return m.jungle(pl, dt);
    // 라인 복귀·유지
    const lane = pl.lane, f = m.front[lane];
    if ((pl.role === MID || pl.role === SUP) && t > pl.nextRoam && t < 1500) {
      pl.nextRoam = t + m.rnd.range(100, 170);
      const adv = pl.side === 0 ? f - 0.5 : 0.5 - f;
      if (adv > -0.02 && hr > 0.6 && m.considerGank(pl, 1.05 - (m.agg(pl) - 12) * 0.02, lane)) return;
    }
    pl.task = 'lane';
    const mylim = m.limS(pl.side, lane);
    let sv = f - dir * (pl.role === ADC || pl.role === MID ? 0.026 : 0.02);
    sv = pl.side === 0 ? Math.max(sv, mylim - 0.03) : Math.min(sv, mylim + 0.03);
    const pt = m.lanePt(lane, sv);
    if (pl.role === SUP) { pt.x += 14; pt.y += 14; }
    m.go(pl, pt);
  };

  P.go = function (pl, d) {
    d={x:clamp(d.x,30,970),y:clamp(d.y,35,965)};
    for(const w of WALLS){const r=w.r+BODY+4,ds=dist(d,w);if(ds<r){const a=Math.atan2(d.y-w.y,d.x-w.x);d.x=w.x+Math.cos(a)*r;d.y=w.y+Math.sin(a)*r;}}
    if (!pl.dest || Math.hypot(pl.dest.x - d.x, pl.dest.y - d.y) > 45 || !pl.path) { pl.dest = { x: d.x, y: d.y }; pl.path = findPath(pl, pl.dest); }
    else { pl.dest.x = d.x; pl.dest.y = d.y; if (!pl.path.length) pl.path.push(pl.dest); }
  };

  P.move = function (dt) {
    const m = this, t = m.t;
    for (const pl of m.all) {
      if (pl.dead || pl.recall || pl.tp || pl.stun > t || pl.windupUntil>t) {pl.vx=pl.vy=0;continue;}
      let goal=null;
      if (pl.fight) {
        const enemies=pl.fight.members.filter(p=>!p.dead&&p.side!==pl.side);
        const target=pl.tgt&&!pl.tgt.dead?pl.tgt:enemies.sort((a,b)=>dist(pl,a)-dist(pl,b))[0];
        if(target){const d=dist(pl,target),range=m.attackRange(pl),dx=(pl.x-target.x)/(d||1),dy=(pl.y-target.y)/(d||1);
          if(d>range*.92)goal={x:target.x+dx*range*.85,y:target.y+dy*range*.85};
          else if(range>90&&d<range*.6)goal={x:target.x+dx*range*.8,y:target.y+dy*range*.8};
        }
      }else if(pl.path?.length){
        while(pl.path.length&&dist(pl,pl.path[0])<5)pl.path.shift();goal=pl.path?.[0];
      }
      let vx=0,vy=0;const speed=pl.fight?32:26*(dist(pl,BASE[pl.side])<250?1.25:1);
      if(goal){let dx=goal.x-pl.x,dy=goal.y-pl.y,d=Math.hypot(dx,dy);if(d>2){vx=dx/d*Math.min(speed,d*4);vy=dy/d*Math.min(speed,d*4);}}
      for(const q of m.all){if(q===pl||q.dead)continue;const dx=pl.x-q.x,dy=pl.y-q.y,d=Math.hypot(dx,dy);if(d>0.01&&d<66){const force=(66-d)*1.2;vx+=dx/d*force;vy+=dy/d*force;}}
      for(const w of WALLS){const d=dist(pl,w),r=w.r+BODY+16;if(d<r&&goal){const nx=(pl.x-w.x)/(d||1),ny=(pl.y-w.y)/(d||1),dot=vx*nx+vy*ny;if(dot<0){vx-=dot*nx;vy-=dot*ny;const sign=(goal.x-pl.x)*(-ny)+(goal.y-pl.y)*nx>=0?1:-1;vx+=-ny*sign*speed*.7;vy+=nx*sign*speed*.7;}}}
      const len=Math.hypot(vx,vy);if(len>speed){vx*=speed/len;vy*=speed/len;}
      const blend=1-Math.exp(-12*dt);pl.vx+=(vx-pl.vx)*blend;pl.vy+=(vy-pl.vy)*blend;
      pl.x+=pl.vx*dt;pl.y+=pl.vy*dt;
    }
  };
  P.resolveBodies = function () {
    const alive=this.all.filter(p=>!p.dead);
    for(let pass=0;pass<8;pass++){
      let correction=0;
      for(let i=0;i<alive.length;i++)for(let j=i+1;j<alive.length;j++){
        const a=alive[i],b=alive[j];let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=BODY*2)continue;
        if(d<.001){const angle=(a.idx*7+b.idx)*2.4;dx=Math.cos(angle);dy=Math.sin(angle);d=1;}
        const push=(BODY*2-d+.01)/2;correction=Math.max(correction,push);a.x-=dx/d*push;a.y-=dy/d*push;b.x+=dx/d*push;b.y+=dy/d*push;
      }
      for(const p of alive){for(const w of WALLS){const d=dist(p,w),r=w.r+BODY;if(d<r){correction=Math.max(correction,r-d);const a=Math.atan2(p.y-w.y,p.x-w.x);p.x=w.x+Math.cos(a)*r;p.y=w.y+Math.sin(a)*r;}}p.x=clamp(p.x,28,972);p.y=clamp(p.y,36,964);}
      if(correction<.01)break;
    }
  };
  P.attackRange = function(p){const ch=L.champions?.get(p.champion);return ch?(ch.range>300?clamp(ch.range*.26,120,180):68):([68,68,155,160,125][p.role]);};
  P.launchAttack = function(src,target,amount,F,kind='attack',slot=-1,splash=0) {
    if(src.dead||target.dead)return;
    const profile=L.champions?.profile(src.champion),melee=kind==='attack'&&this.attackRange(src)<90&&target.idx!=null;
    const windup=kind==='ultimate'?.4:slot>=0?.3:.18;
    const spellRange=slot>=0?L.champions?.get(src.champion)?.spells[slot]?.range?.[0]:0;
    src.windupUntil=this.t+windup;
    if(slot>=0)this.effect(src,target,'cast',0,slot);
    this.projectiles.push({id:++this.shotSeq,source:src.idx,sourceObj:src,target:target.idx,targetObj:target,life:target.life,sourceLife:src.life,side:src.side,champion:src.champion,
      kind,slot,amount,splash,F,x:src.x,y:src.y,px:src.x,py:src.y,tx:target.x,ty:target.y,start:this.t,launch:this.t+windup,expires:this.t+3,
      traveled:0,maxTravel:slot>=0?clamp((spellRange||650)*.25,(this.attackRange(src)||100)+30,slot===3?750:350):600,
      speed:kind==='attack'?280:230,melee,homing:kind==='attack'||kind==='poke'||kind==='tower'||slot===3,shape:profile?.signature||'bolt',launched:false});
  };
  P.updateProjectiles = function(dt){
    const keep=[];
    for(const s of this.projectiles){
      const src=this.all[s.source]||s.sourceObj,target=this.all[s.target]||s.targetObj;
      if(this.t>s.expires||target.dead||target.hp<=0||target.life!==s.life)continue;
      if(!s.launched){if(src.dead||src.hp<=0||src.life!==s.sourceLife)continue;s.x=src.x;s.y=src.y;s.px=s.x;s.py=s.y;if(this.t<s.launch){keep.push(s);continue;}
        s.launched=true;s.tx=target.x;s.ty=target.y;const d=dist(src,target)||1;s.dx=(s.tx-s.x)/d;s.dy=(s.ty-s.y)/d;
      }
      s.px=s.x;s.py=s.y;
      if(s.homing){const d=Math.hypot(target.x-s.x,target.y-s.y)||1;s.dx=(target.x-s.x)/d;s.dy=(target.y-s.y)/d;}
      if(s.melee){if(dist(src,target)<=this.attackRange(src)+12)this.hit(src,target,s.amount,s.F,'melee',s.slot);continue;}
      const travel=Math.min(s.speed*dt,s.maxTravel-s.traveled);s.traveled+=travel;s.x+=s.dx*travel;s.y+=s.dy*travel;
      let victim=null;
      const candidates=s.homing?[target]:this.all.filter(p=>!p.dead&&p.side!==s.side);
      // Swept segment collision: fast projectiles cannot tunnel through a unit.
      for(const p of candidates)if(segmentDistance({x:s.px,y:s.py},s,p)<=BODY+5){if(!victim||dist({x:s.px,y:s.py},p)<dist({x:s.px,y:s.py},victim))victim=p;}
      if(victim){if(victim.idx==null)this.worldImpact(src,victim,s.amount);else this.hit(s.source==null?null:src,victim,s.amount,s.F,s.kind,s.slot);
        if(s.splash>0){const nearby=this.all.filter(p=>!p.dead&&p.side!==s.side&&p!==victim&&dist(p,victim)<(s.slot===3?110:75));for(const p of nearby)this.hit(src,p,s.splash/nearby.length,s.F,'splash',-1);}
      }else if(s.traveled<s.maxTravel)keep.push(s);
    }
    this.projectiles=keep;
  };
  P.worldImpact = function(src,target,amount){
    if(target.hp<=0)return;
    const m=this,si=src.side,before=target.hp;target.hp-=amount;
    m.effect(src,target,'impact-attack',0);
    if(target.type){
      if(target.hp>0)return;
      let winner=si;const mj=m.sides[si].players[JGL],ej=m.sides[1-si].players[JGL];
      if(!ej.dead&&!ej.fight&&dist(ej,target)<170){const mine=mj.dead||dist(mj,target)>170?6:m.eff(mj,I.mec)*.5+m.eff(mj,I.clt)*.5;
        const chance=clamp(.2+(m.eff(ej,I.mec)*.5+m.eff(ej,I.clt)*.5-mine)*.022,.05,.55);
        if(m.rnd()<chance){winner=1-si;m.ev('steal',winner,`${ej.p.n} 스틸!`,target);m.say(ej,'스틸!',6);}}
      m.award(target.type,winner);
    }else if(target.k){
      const atk=m.sides[si].players.filter(p=>!p.dead&&dist(p,target)<160);
      if(target.k==='t1'&&m.t<840&&m.era.plates&&atk.length){const plates=Math.floor(before/1000)-Math.floor(Math.max(0,target.hp)/1000);if(plates>0)for(const p of atk)p.gold+=125*plates/atk.length;}
      if(target.hp<=0)m.destroyed(target,si,atk,target.lane??1);
    }
  };

  P.jungle = function (pl, dt) {
    const m = this, t = m.t, s = m.sides[pl.side];
    if (t > pl.nextGank) {
      const freq = (s.tactics.style === 'early' ? 0.75 : 1) * (1.15 - (m.agg(pl) - 12) * 0.03);
      pl.nextGank = t + m.rnd.range(55, 95) * freq;
      if (pl.hp / m.mhp(pl) > 0.55 && m.considerGank(pl, 0.56 - (m.agg(pl) - 12) * 0.02 - (s.tactics.style === 'early' ? 0.15 : 0), -1)) return;
    }
    pl.task = 'jungle';
    if (pl.camp < 0) {
      let b = -1, bd = 1e9;
      s.camps.forEach((c, i) => { if (c.ready <= t + 4) { const d = dist(pl, c); if (d < bd) { bd = d; b = i; } } });
      pl.camp = b; pl.clearT = 0;
    }
    if (pl.camp < 0) { // 캠프가 없으면 강가 시야 장악
      const r = RIVER[pl.side === 0 ? (Math.floor(t / 40) % 2 ? 1 : 3) : (Math.floor(t / 40) % 2 ? 3 : 1)];
      m.go(pl, { x: r.x + (pl.side === 0 ? -35 : 35), y: r.y + (pl.side === 0 ? 35 : -35) });
      return;
    }
    const c = s.camps[pl.camp];
    if (dist(pl, c) > 22) { m.go(pl, c); return; }
    if (!pl.clearT) pl.clearT = t + Math.max(5, 11 - pl.lvl * 0.3);
    m.effect(pl, c, 'attack', 0);
    if (t >= pl.clearT) {
      const q = 0.7 + m.eff(pl, I.eco) / 45; // 골드 수급이 좋은 정글러는 캠프에서 더 많이 챙긴다
      pl.gold += (88 + t / 30) * q; pl.cs += 4; pl.xp += 215 * (0.84 + m.eff(pl, I.eco) / 80); c.ready = t + 135; pl.camp = -1; pl.clearT = 0;
    }
  };

  P.considerGank = function (pl, thr, exclude) {
    const m = this, s = m.sides[pl.side], o = m.sides[1 - pl.side]; let best = -1, bs = -1e9;
    for (let l = 0; l < 3; l++) {
      if (l === exclude) continue;
      const en = o.players.filter((e) => !e.dead && e.lane === l && e.task === 'lane' && !e.fight);
      const al = s.players.filter((e) => !e.dead && e.lane === l && e.task === 'lane' && !e.fight);
      if (!en.length || !al.length) continue;
      const f = m.front[l], over = (pl.side === 0 ? 0.5 - f : f - 0.5) * 3.2;
      const ehr = en.reduce((a, e) => a + e.hp / m.mhp(e), 0) / en.length, ahr = al.reduce((a, e) => a + e.hp / m.mhp(e), 0) / al.length;
      const sc = 0.3 + (1 - ehr) * 0.9 + over + (ahr - 0.5) * 0.4 + (s.tactics.focus === l ? 0.3 : 0) + m.rnd.norm(0, 0.4 * clamp(1.4 - m.eff(pl, I.mac) / 20, 0.3, 1.1));
      if (sc > bs) { bs = sc; best = l; }
    }
    if (best < 0 || bs < thr) return false;
    pl.gank = { lane: best, until: m.t + 55 }; pl.task = 'gank'; pl.camp = -1;
    return true;
  };

  P.doGank = function (pl) {
    const m = this, t = m.t, g = pl.gank, o = m.sides[1 - pl.side], s = m.sides[pl.side], dir = pl.side === 0 ? 1 : -1;
    const en = o.players.filter((e) => !e.dead && e.lane === g.lane && e.task === 'lane' && !e.fight && !e.recall);
    if (t > g.until || !en.length) { pl.gank = null; return; }
    pl.task = 'gank';
    const tg = en[0];
    if (dist(pl, tg) > 105) { m.go(pl, { x: tg.x, y: tg.y }); return; }
    pl.gank = null;
    const al = s.players.filter((e) => !e.dead && e !== pl && !e.fight && !e.recall && dist(e, tg) < 220);
    const f = m.front[g.lane], lim = m.limS(1 - pl.side, g.lane);
    const underTower = Math.abs(f - lim) < 0.06, over = (pl.side === 0 ? 0.5 - f : f - 0.5);
    const vis = en.reduce((a, e) => a + m.eff(e, I.vis), 0) / en.length * 0.6 + m.eff(o.players[SUP], I.vis) * 0.4;
    const pEsc = clamp(0.36 + 0.024 * (vis - m.eff(pl, I.mac)) + (underTower ? 0.25 : 0) - over * 1.2 - (s.tactics.style === 'pick' ? 0.08 : 0), 0.08, 0.88);
    if (m.rnd() < pEsc) {
      en.forEach((e) => { e.hp = Math.max(e.hp * 0.85, 1); m.say(e, '갱킹 회피', 5); });
      m.front[g.lane] = clamp(f - dir * 0.03, 0.03, 0.97);
      pl.noEng = t + 10; return;
    }
    m.say(pl, `${LANE_KO[g.lane]} 갱킹`, 6);
    const F = m.newFight([pl, ...al, ...en]);
    const w = en.slice().sort((a, b) => a.hp - b.hp)[0];
    m.launchAttack(pl, w, m.mhp(w) * 0.15, F);
    // 역갱
    const ej = o.players[JGL];
    if (!ej.dead && !ej.fight && !ej.recall && dist(ej, tg) < 300 && m.rnd() < 0.3 + m.eff(ej, I.mac) / 40) { m.say(ej, '역갱', 5); ej.task = 'join'; }
  };

  // ───────── 라인전·미니언 ─────────
  P.lanes = function (dt) {
    const m = this, t = m.t;
    for (let l = 0; l < 3; l++) {
      const f = m.front[l], fp = m.lanePt(l, f), pr = [[], []], push = [10, 10];
      for (const pl of m.all) if (!pl.dead && !pl.fight && !pl.recall && dist(pl, fp) < 125 && pl.task !== 'gank' && pl.task !== 'flee') pr[pl.side].push(pl);
      for (let si = 0; si < 2; si++) {
        const s = m.sides[si];
        for (const pl of pr[si]) push[si] += 7 + m.pow(pl) * 0.028 * (0.6 + m.eff(pl, I.lan) / 30) * (pl.role === SUP ? 0.4 : 1);
        if (t < s.baronUntil && pr[si].length) push[si] *= 1.7;
        if (m.sides[1 - si].st[l][3].hp <= 0) push[si] += 15;
        if (t > 3300) push[si] *= 1 + (m.teamGold(si) > m.teamGold(1 - si) ? 1 : 0);
      }
      const lo = m.limS(0, l) + 0.004, hi = m.limS(1, l) - 0.004;
      let nf = f;
      if (!pr[0].length && !pr[1].length) {
        const bias = (m.sides[1].st[l][3].hp <= 0 ? 0.14 : 0) - (m.sides[0].st[l][3].hp <= 0 ? 0.14 : 0);
        const eq = clamp((lo + hi) / 2 + bias, lo, hi);
        nf += clamp(eq - f, -0.0012 * dt, 0.0012 * dt);
      } else nf += (push[0] - push[1]) * 0.00017 * dt;
      m.front[l] = clamp(nf, lo, hi);
      // CS·경험치·견제
      for (let si = 0; si < 2; si++) {
        const mine = pr[si], opp = pr[1 - si]; if (!mine.length) continue;
        const farmers = mine.filter((p) => p.role !== SUP), nf2 = Math.max(1, farmers.length), fw = farmers.reduce((a, p) => a + FARM_W[p.role], 0) || 1;
        const oppLan = opp.length ? opp.reduce((a, p) => a + m.eff(p, I.lan), 0) / opp.length : 0;
        const lim = m.limS(si, l), under = Math.abs(m.front[l] - lim) < 0.04;
        const share = mine.length === 1 ? 1 : mine.length === 2 ? 0.66 : 1.5 / mine.length;
        for (const pl of mine) {
          pl.xp += 13.5 * share * dt;
          if (pl.role === SUP && farmers.length) { if (m.rnd() < 0.012 * dt) { pl.cs++; pl.gold += 22; } pl.gold += 1.1 * dt; continue; }
          const lan = m.eff(pl, I.lan);
          let q = clamp(0.4 + 0.031 * (lan * 0.35 + m.eff(pl, I.eco) * 0.65) - (opp.length ? Math.max(0, oppLan - lan) * 0.014 : -0.05) - (under ? 0.05 : 0), 0.3, 1);
          if (m.sides[si].tactics.focus === l) q = Math.min(1, q + 0.02);
          const n = 0.275 * q * dt * (FARM_W[pl.role] / fw) * Math.sqrt(nf2);
          let got = Math.floor(n); if (m.rnd() < n - got) got++;
          if (got) { pl.cs += got; pl.gold += got * (19.5 + t / 170); m.effect(pl, fp, 'attack', 0); }
        }
      }
      // 견제와 올인: 같은 라인에서 마주 선 라이너끼리
      const A = pr[0].filter((p) => p.task === 'lane'), B = pr[1].filter((p) => p.task === 'lane');
      if (A.length && B.length && t > 95) {
        const sA = m.laneStr(A), sB = m.laneStr(B);
        const advA = clamp((sA - sB) / (sA + sB) * 2.2, -0.6, 0.6);
        const agA = m.aggF(A), agB = m.aggF(B);
        const uB = Math.abs(m.front[l] - m.limS(1, l)) < 0.05 ? 0.6 : 1, uA = Math.abs(m.front[l] - m.limS(0, l)) < 0.05 ? 0.6 : 1;
        for (const b of B) m.chip(A[0], b, (4 + m.pow(A[0]) * 0.026) * (1 + advA) * agA * uB * dt / B.length * A.length ** 0.5);
        for (const a of A) m.chip(B[0], a, (4 + m.pow(B[0]) * 0.026) * (1 - advA) * agB * uA * dt / A.length * B.length ** 0.5);
        const hA = Math.min(...A.map((p) => p.hp / m.mhp(p))), hB = Math.min(...B.map((p) => p.hp / m.mhp(p)));
        const mA = A.reduce((a, p) => a + p.hp / m.mhp(p), 0) / A.length, mB = B.reduce((a, p) => a + p.hp / m.mhp(p), 0) / B.length;
        let allin = false;
        if (hB < 0.45 && mA > hB + 0.2 + (uB < 1 ? 0.15 : 0) && m.rnd() < 0.04 * agA * dt) allin = true;
        if (hA < 0.45 && mB > hA + 0.2 + (uA < 1 ? 0.15 : 0) && m.rnd() < 0.04 * agB * dt) allin = true;
        if (allin) m.newFight([...A, ...B]);
      }
    }
  };
  P.laneStr = function (g) { let s = 0; for (const p of g) s += m_lan(this, p); return s; };
  function m_lan(m, p) { return m.pow(p) * (0.16 + m.eff(p, I.lan) / 14) * (p.role === SUP ? 0.6 : 1) * m.teamMult(p.side); }
  P.aggF = function (g) {
    const m = this, s = m.sides[g[0].side];
    const a = g.reduce((x, p) => x + m.agg(p), 0) / g.length;
    return clamp(1 + (a - 12) * 0.03 + (s.tactics.aggro - 1) * 0.18 + (s.tactics.style === 'early' ? 0.1 : 0), 0.5, 1.7);
  };
  P.chip = function (src, v, amt) { // 견제 피해: 죽이지는 못한다
    if(this.t<src.attackReady||dist(src,v)>this.attackRange(src)+15)return;
    src.attackReady=this.t+1;this.launchAttack(src,v,amt,null,'poke');
  };

  // ───────── 조우·교전 판단 ─────────
  P.proximity = function () {
    const m = this, t = m.t, seen = new Set();
    for (const a of m.sides[0].players) {
      if (a.dead || a.fight || a.recall || a.noEng > t || seen.has(a)) continue;
      for (const b of m.sides[1].players) {
        if (b.dead || b.fight || b.recall || b.noEng > t || seen.has(b)) continue;
        if (dist(a, b) > 100) continue;
        if (a.task === 'lane' && b.task === 'lane' && a.lane === b.lane) continue;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const A = m.sides[0].players.filter((p) => !p.dead && !p.fight && !p.recall && dist(p, mid) < 190);
        const B = m.sides[1].players.filter((p) => !p.dead && !p.fight && !p.recall && dist(p, mid) < 190);
        A.forEach((p) => seen.add(p)); B.forEach((p) => seen.add(p));
        m.evalEngage(A, B, mid); break;
      }
    }
  };

  P.groupInfo = function (g, pos, si) {
    const m = this, s = m.sides[si]; let S = 0, mac = 0, agg = 0, con = 0, vis = 0, mec = 0;
    for (const p of g) { S += m.strength(p); mac += m.eff(p, I.mac); agg += m.agg(p); con += m.eff(p, I.con); vis += m.eff(p, I.vis); mec += m.eff(p, I.mec); }
    const n = g.length; S *= m.teamMult(si) * (1 + (n - 1) * 0.04);
    let tower = false;
    for (const ln of s.st) for (const st of ln) if (st.hp > 0 && st.k !== 'inh' && dist(st, pos) < 135) tower = true;
    if (s.nt.hp > 0 && dist(s.nt, pos) < 150) tower = true;
    if (tower) S *= 1.15;
    return { S, n, mac: mac / n + (s.coach - 10) * 0.2, agg: agg / n, con: con / n, vis: vis / n, mec: mec / n, tower };
  };

  P.evalEngage = function (A, B, pos) {
    const m = this, t = m.t, gs = [m.groupInfo(A, pos, 0), m.groupInfo(B, pos, 1)], grp = [A, B], want = [false, false];
    for (let si = 0; si < 2; si++) {
      const me = gs[si], en = gs[1 - si], s = m.sides[si], pl = s.plan;
      const noise = 0.24 * clamp(1.5 - me.mac / 20, 0.3, 1.2);
      const ratio = (me.S * m.rnd.norm(1, noise * 0.5)) / (en.S * m.rnd.norm(1, noise));
      let thr = 1.3 - (s.tactics.aggro - 1) * 0.13 - (me.agg - 12) * 0.012;
      if (pl && (pl.type === 'dragon' || pl.type === 'baron' || pl.type === 'herald') && dist(m.obj[pl.type], pos) < 220) thr -= 0.12;
      if (me.tower) thr -= 0.05;
      if (pl && pl.end) thr -= 0.3;
      want[si] = ratio > thr;
    }
    if (want[0] && want[1]) { m.newFight([...A, ...B]); return; }
    if (!want[0] && !want[1]) {
      for (let si = 0; si < 2; si++) {
        if (m.sides[si].tactics.style === 'poke') for (const e of grp[1 - si]) m.chip(grp[si][0], e, m.mhp(e) * 0.035);
        for (const p of grp[si]) p.noEng = t + 5;
      }
      return;
    }
    const at = want[0] ? 0 : 1, df = 1 - at, a = gs[at], d = gs[df];
    const pc = clamp(0.3 + 0.02 * (a.agg + a.mec - d.con - d.vis) + (m.sides[at].tactics.style === 'pick' ? 0.15 : 0) + (m.sides[at].tactics.style === 'dive' ? 0.08 : 0) + (a.n > d.n ? 0.1 : 0) - (d.tower ? 0.15 : 0), 0.08, 0.85);
    if (m.rnd() < pc) {
      const F = m.newFight([...A, ...B]);
      const v = grp[df].slice().sort((x, y) => x.hp - y.hp)[0];
      m.launchAttack(grp[at][0], v, m.mhp(v) * 0.1, F); m.say(grp[at][0], '이니시에이팅', 5);
    } else {
      for (const p of grp[df]) { p.fleeUntil = t + 6; p.noEng = t + 18; }
      for (const p of grp[at]) p.noEng = t + 16;
      const pl = m.sides[df].plan; if (pl && pl.type !== 'defend') m.sides[df].plan = null;
    }
  };

  P.newFight = function (members) {
    const m = this; let F = members.map((x) => x.fight).find(Boolean);
    if (!F) { F = { members: [], x: 0, y: 0, start: m.t, endT: 0, kills: [0, 0] }; m.fights.push(F); }
    for (const p of members) m.joinFight(F, p);
    return F;
  };
  P.joinFight = function (F, p) {
    if (p.fight === F || p.dead) return;
    p.fight = F; p.recall = 0; p.gank = null; p.task = 'fight'; p.tgt = null; p.path = null; p.dest = null; F.members.push(p); F.endT = 0;
    let x = 0, y = 0, n = 0; for (const q of F.members) if (!q.dead) { x += q.x; y += q.y; n++; }
    if (n) { F.x = x / n; F.y = y / n; }
  };

  P.hit = function (src, v, amt, F, kind = 'attack', slot = -1) {
    const m = this; if (v.dead) return;
    const sup = m.sides[v.side].players[SUP];
    if (F && sup !== v && sup.fight === F && !sup.dead) amt *= 0.93 - (m.eff(sup, I.tf) - 12) * 0.004;
    amt *= clamp(1 - 0.04 * (m.eff(v, I.con) * 0.5 + m.eff(v, I.mec) * 0.3 + m.eff(v, I.mac) * 0.2 - 12), 0.55, 1.5);
    if(kind==='poke')amt=Math.min(amt,Math.max(0,v.hp-m.mhp(v)*.08));
    v.hp -= amt;
    m.effect(src, v, 'impact-'+(src ? kind : 'tower'), amt, slot);
    if (src) { src.dmg += amt; v.hitBy[src.idx] = m.t; }
    if (v.hp <= 0) m.kill(src, v, F);
  };

  P.kill = function (src, v, F) {
    const m = this, t = m.t, o = m.sides[1 - v.side];
    let killer = src;
    if (!killer) { let bt = -1; for (const k in v.hitBy) if (v.hitBy[k] > bt && t - v.hitBy[k] < 12) { bt = v.hitBy[k]; killer = m.all[k]; } }
    v.d++; v.hp = 0; v.fight = null; v.path = null; v.recall = 0; v.tp = null; v.gank = null;
    v.dead = t + Math.min(66, 8 + v.lvl * 2.7 + Math.max(0, t - 1300) / 40);
    const bounty = clamp(300 + v.streak * 70 - Math.max(0, v.d - v.k - 2) * 30, 120, 800);
    v.streak = 0;
    if (F) F.kills[1 - v.side]++;
    o.kills++;
    const assists = [];
    for (const k in v.hitBy) { const q = m.all[k]; if (q !== killer && q.side !== v.side && t - v.hitBy[k] < 12) assists.push(q); }
    // 같은 교전의 서폿은 피해가 없어도 어시스트
    if (F) for (const q of F.members) if (q.side !== v.side && !q.dead && q !== killer && q.role === SUP && !assists.includes(q)) assists.push(q);
    if (killer) {
      killer.k++; killer.streak++; killer.gold += bounty + (m.firstBlood ? 0 : 100); killer.xp += 70 + v.lvl * 22;
      for (const q of assists) { q.a++; q.gold += 150 / assists.length + 40; q.xp += (50 + v.lvl * 14) / assists.length; }
      m.ev('kill', killer.side, `${killer.p.n} ▶ ${v.p.n}` + (m.firstBlood ? '' : ' (퍼스트 블러드)'), v);
      Object.assign(m.events[m.events.length - 1], {killer:killer.champion, victim:v.champion});
      if (killer.streak === 3) m.say(killer, '킬링 스프리', 6);
    } else m.ev('kill', 1 - v.side, `${v.p.n} 처형`, v);
    m.firstBlood = true; v.hitBy = {};
    // 멘탈: 연속으로 죽으면 흔들린다
    if (v.d >= 2 && m.rnd() < 0.5 - m.eff(v, I.con) / 40) v.tilt = Math.min(0.12, v.tilt + 0.025);
    if (m.alive(v.side).length === 0) m.ev('ace', 1 - v.side, `${o.short} 에이스!`, v);
  };

  P.runFights = function (dt) {
    const m = this, t = m.t;
    m.fleeAcc += dt; const fleeTick = m.fleeAcc >= 1; if (fleeTick) m.fleeAcc = 0;
    for (let fi = m.fights.length - 1; fi >= 0; fi--) {
      const F = m.fights[fi];
      F.members = F.members.filter((p) => p.fight === F && !p.dead);
      const g = [F.members.filter((p) => p.side === 0), F.members.filter((p) => p.side === 1)];
      if (!g[0].length || !g[1].length) {
        if (!F.endT) F.endT = t + 1.5;
        if (t >= F.endT) { m.endFight(F, g); m.fights.splice(fi, 1); }
        continue;
      }
      let x = 0, y = 0; for (const p of F.members) { x += p.x; y += p.y; } F.x = x / F.members.length; F.y = y / F.members.length;
      const tm = [m.teamMult(0), m.teamMult(1)], S = [0, 0];
      for (let si = 0; si < 2; si++) for (const p of g[si]) S[si] += m.strength(p) * tm[si];
      for (let si = 0; si < 2; si++) {
        const s = m.sides[si], en = g[1 - si], big = g[si].length >= 4;
        const coord = 1 + (big ? (s.tactics.style === 'teamfight' ? 0.05 : s.tactics.style === 'split' ? -0.05 : 0) : s.tactics.style === 'pick' ? 0.05 : 0);
        for (const p of g[si]) {
          if (p.dead || p.stun > t || t<p.attackReady) continue;
          const live = en.filter((e) => !e.dead); if (!live.length) break;
          if (!p.tgt || p.tgt.dead || p.tgt.fight !== F || dist(p,p.tgt)>m.attackRange(p)+35) {
            const dive = s.tactics.style === 'dive' ? 1.7 : 1, ag = m.agg(p);
            let bw = -1; for (const e of live) {
              const back = e.role === ADC || e.role === MID;
              const w = (back ? 0.75 * dive * (1 + (ag - 12) * 0.03) : e.role === SUP ? 0.9 : 1.3) * (1.6 - e.hp / m.mhp(e)) / (1+dist(p,e)/55);
              if (w > bw) { bw = w; p.tgt = e; }
            }
          }
          if(dist(p,p.tgt)>m.attackRange(p)+10)continue;
          p.attackReady=t+1;
          const late = p.role === ADC ? 0.85 + Math.min(1, t / 2100) * 0.4 : 1;
          const dmg = m.pow(p) * 0.3 * ROLE_DMG[p.role] * late * m.skill(p) * tm[si] * coord * dt * m.rnd.range(0.6, 1.4);
          const others = live.filter((e) => e !== p.tgt), sp = others.length ? 0.28 * (0.6 + m.eff(p, I.tf) / 25) : 0;
          const ch = L.champions?.get(p.champion);
          let slot = -1;
          if (ch) {
            const order = p.lvl >= 6 ? [3, 0, 1, 2] : [0, 1, 2].slice(0, Math.min(3, p.lvl));
            slot = order.find(i => p.cooldowns[i] <= t) ?? -1;
            if (slot >= 0) {
              const cds = ch.spells[slot].cooldown, rank = slot === 3 ? Math.min(2, Math.floor((p.lvl - 6) / 5)) : Math.min(cds.length - 1, Math.floor(p.lvl / 3));
              p.cooldowns[slot] = t + Math.max(slot === 3 ? 30 : 4, cds[rank] || 8);
              p.castSlot = slot; p.castUntil = t + .6;
            }
          }
          m.launchAttack(p,p.tgt,dmg*(slot>=0?1-sp:1),F,slot>=0?(slot===3?'ultimate':'spell'):'attack',slot,slot>=0?dmg*sp:0);
        }
      }
      // 타워 어그로
      for (let si = 0; si < 2; si++) {
        const s = m.sides[si]; let tw = null;
        for (const ln of s.st) for (const st of ln) if (st.hp > 0 && st.k !== 'inh' && dist(st, F) < 100) tw = st;
        if (s.nt.hp > 0 && dist(s.nt, F) < 110) tw = s.nt;
        if (tw) { const e = g[1 - si].filter((p) => !p.dead&&dist(p,tw)<150).sort((a, b) => a.hp - b.hp)[0]; if (e) m.launchAttack(tw,e,(60+t/25)*dt,F,'tower'); }
      }
      if (fleeTick) for (let si = 0; si < 2; si++) {
        const r = S[si] / (S[1 - si] || 1);
        if (m.sides[si].plan && m.sides[si].plan.end) continue;
        for (const p of g[si]) {
          if (p.dead || p.fight !== F) continue;
          const hr = p.hp / m.mhp(p);
          if ((r < 0.75 && hr < 0.5) || r < 0.5) {
            if (m.rnd() < 0.5 * (0.6 + m.eff(p, I.mac) / 25)) {
              const en = g[1 - si].filter((e) => !e.dead), emec = en.reduce((a, e) => a + m.eff(e, I.mec), 0) / Math.max(1, en.length);
              if (m.rnd() < clamp(0.62 + 0.025 * (m.eff(p, I.con) - emec), 0.2, 0.9)) { p.fight = null; p.fleeUntil = t + 7; p.noEng = t + 8; p.task = 'flee'; }
              else p.stun = t + 1.5;
            }
          }
        }
      }
    }
  };

  P.endFight = function (F, g) {
    const m = this, t = m.t;
    for (const p of m.all) if (p.fight === F) p.fight = null;
    const win = g[0].length ? 0 : g[1].length ? 1 : -1;
    const tot = F.kills[0] + F.kills[1];
    if (tot >= 3) m.ev('fight', win, `교전 종료 ${m.sides[0].short} ${F.kills[0]} : ${F.kills[1]} ${m.sides[1].short}`, F);
    if (win < 0) return;
    const s = m.sides[win], enDead = 5 - m.alive(1 - win).length, myDead = 5 - m.alive(win).length, me = m.alive(win);
    const all = new Set([TOP, JGL, MID, ADC, SUP]);
    if (enDead >= 4 && t > 1300) { s.plan = { type: 'siege', lane: m.bestLane(win), until: t + 70, who: all, end: true }; return; }
    if (enDead - myDead >= 2 || enDead >= 3) {
      if (m.obj.baron.alive && me.length >= 3 && m.rnd() < 0.6) s.plan = { type: 'baron', until: t + 45, who: all };
      else if (m.obj.dragon.alive && m.rnd() < 0.5) s.plan = { type: 'dragon', until: t + 40, who: all };
      else if (t > 400) s.plan = { type: 'siege', lane: m.bestLane(win, F), until: t + 40, who: all };
    } else s.plan = null;
  };
  P.bestLane = function (si, near) {
    const m = this, o = m.sides[1 - si]; let b = 1, bs = -1e9;
    for (let l = 0; l < 3; l++) {
      const dead = o.st[l].filter((x) => x.hp <= 0).length, lim = m.limit(1 - si, l);
      const sc = dead * 0.5 + (l === 1 ? 0.2 : 0) + (near && lim ? -dist(lim, near) / 900 : 0) + m.rnd() * 0.2;
      if (sc > bs) { bs = sc; b = l; }
    }
    return b;
  };

  // ───────── 오브젝트 ─────────
  P.runObjectives = function (dt) {
    const m = this, t = m.t;
    for (const key of ['dragon', 'baron', 'herald']) {
      const o = m.obj[key]; if (!o.alive) continue;
      for (let si = 0; si < 2; si++) {
        const s = m.sides[si]; if (!s.plan || s.plan.type !== key) continue;
        const grp = s.players.filter((p) => !p.dead && !p.fight && !p.recall && dist(p, o) < 95);
        if (grp.length < o.need) continue;
        for(const p of grp){
          if(m.t>=p.attackReady){p.attackReady=m.t+1;m.launchAttack(p,o,m.pow(p)*.25*dt,null);}
          p.hp=Math.max(p.hp-m.mhp(p)*o.bite*dt,m.mhp(p)*.15);
        }
      }
    }
  };
  P.award = function (key, si) {
    const m = this, t = m.t, s = m.sides[si], o = m.obj[key]; o.alive = false;
    const all = new Set([TOP, JGL, MID, ADC, SUP]);
    if (key === 'dragon') {
      if (o.elder) { s.elderUntil = t + 150; o.next = t + 360; m.ev('dragon', si, `${s.short} 장로 드래곤 처치`, o); s.plan = { type: 'siege', lane: m.bestLane(si), until: t + 60, who: all }; return; }
      s.dragons++; o.next = t + 300;
      if (m.era.dragonGold) s.players.forEach((p) => (p.gold += 145));
      else s.players.forEach((p) => (p.gold += 25));
      if (m.era.soul && s.dragons === 4) { s.soul = true; m.ev('dragon', si, `${s.short} 드래곤 영혼 획득`, o); }
      else m.ev('dragon', si, `${s.short} 드래곤 처치 (${s.dragons}번째)`, o);
      s.plan = null;
    } else if (key === 'baron') {
      s.baronUntil = t + 180; s.barons++; o.next = t + 360; s.players.forEach((p) => (p.gold += 300));
      m.ev('baron', si, `${s.short} 바론 처치`, o);
      s.plan = { type: 'siege', lane: m.bestLane(si), until: t + 60, who: all };
    } else {
      s.herald = true; s.players.forEach((p) => (p.gold += 60)); m.ev('herald', si, `${s.short} 전령 획득`, o);
      s.plan = { type: 'siege', lane: m.bestLane(si, o), until: t + 50, who: new Set([TOP, JGL, MID]) };
    }
  };

  // ───────── 구조물 ─────────
  P.runStructures = function (dt) {
    const m = this, t = m.t;
    for (let l = 0; l < 3; l++) for (let at = 0; at < 2; at++) {
      const df = 1 - at, ds = m.sides[df], as = m.sides[at], f = m.front[l], lim = m.limS(df, l);
      if (at === 0 ? f < lim - 0.012 : f > lim + 0.012) continue;
      let st = m.limit(df, l);
      if (!st) st = ds.nt.hp > 0 ? ds.nt : ds.nx;
      const atk = as.players.filter((p) => !p.dead && !p.fight && !p.recall && dist(p, st) < 150);
      const def = ds.players.filter((p) => !p.dead && !p.fight && !p.recall && dist(p, st) < 175);
      const baron = t < as.baronUntil;
      let dmg = 14 * (baron ? 2.4 : 1) + (ds.st[l][3].hp <= 0 ? 16 : 0);
      for (const p of atk) dmg += m.pow(p) * 0.66 * (p.role === ADC ? 1.5 : p.role === SUP ? 0.5 : 1) * (baron ? 1.4 : 1) * (as.tactics.style === 'poke' ? 1.12 : 1) * (as.tactics.style === 'split' && p.role === TOP ? 1.25 : 1);
      if (def.length) dmg *= clamp(0.3 + 0.22 * (atk.length - def.length), 0.18, 1);
      if (t < 300) dmg *= 0.5;
      if (st.k === 't1' && t < 840 && m.era.plates) dmg *= 0.75;
      if (t > 3300) dmg *= 2;
      if (as.herald && atk.length && (st.k === 't1' || st.k === 't2' || st.k === 't3')) { as.herald = false; st.hp -= 2400; m.ev('herald', at, `${as.short} 전령 소환 — ${LANE_KO[l]} 타워 강타`, st); }
      const before = st.hp;
      const share=dmg*dt/(atk.length+1);st.hp-=share;
      for(const p of atk)if(m.t>=p.attackReady){p.attackReady=m.t+1;m.launchAttack(p,st,share,null);}
      if (st.k === 't1' && t < 840 && m.era.plates && atk.length) {
        const plates = Math.floor(before / 1000) - Math.floor(Math.max(st.hp, 0) / 1000);
        if (plates > 0) for (const p of atk) p.gold += (125 * plates) / atk.length;
      }
      if (st.hp <= 0) m.destroyed(st, at, atk, l);
      if (m.done) return;
    }
  };
  P.destroyed = function (st, at, atk, l) {
    const m = this, as = m.sides[at], t = m.t; st.hp = 0;
    if (st.k === 'nx') { m.ev('nexus', at, `${as.short} 넥서스 파괴 — 승리`, st); m.finish(at); return; }
    as.players.forEach((p) => (p.gold += st.k === 'inh' ? 30 : 90));
    atk.forEach((p) => (p.gold += (st.k === 'inh' ? 50 : 180) / Math.max(1, atk.length)));
    if (st.k === 'inh') { st.respawn = t + 300; m.ev('inhib', at, `${as.short} ${LANE_KO[l]} 억제기 파괴`, st); }
    else if (st.k === 'nt') m.ev('tower', at, `${as.short} 쌍둥이 타워 파괴`, st);
    else { as.towers++; m.ev('tower', at, `${as.short} ${LANE_KO[l]} ${st.k === 't1' ? '1차' : st.k === 't2' ? '2차' : '억제기'} 타워 파괴`, st); }
  };

  P.finish = function (w) {
    const m = this; m.done = true; m.winner = w; m.duration = m.t;
    const dm = [0, 0]; m.all.forEach((p) => (dm[p.side] += p.dmg));
    m.all.forEach((p) => {
      const mins = m.t / 60, share = p.dmg / (dm[p.side] || 1);
      let r = 6.2 + clamp(((p.k * 3 + p.a * 1.2 - p.d * 2.6) / mins) * 1.5, -1.9, 2.2) + (share - (p.role === SUP ? 0.08 : 0.22)) * 3 + (p.side === w ? 0.5 : -0.3);
      p.rating = clamp(r, 3, 10);
    });
  };
  P.result = function () {
    const m = this;
    return {
      winner: m.winner, duration: m.duration, kills: [m.sides[0].kills, m.sides[1].kills], towers: [m.sides[0].towers, m.sides[1].towers],
      dragons: [m.sides[0].dragons, m.sides[1].dragons], barons: [m.sides[0].barons, m.sides[1].barons],
      gold: [Math.round(m.teamGold(0)), Math.round(m.teamGold(1))], timeline: m.timeline,
      players: m.all.map((p) => ({ id: p.p.id, n: p.p.n, champion:p.champion, side: p.side, role: p.role, k: p.k, d: p.d, a: p.a, cs: p.cs, gold: Math.round(p.gold), dmg: Math.round(p.dmg), rating: p.rating, lvl: p.lvl })),
    };
  };

  L.Match = Match;
  L.simulate = function (cfg) { const m = new Match(cfg); let g = 0; while (!m.done && g++ < 5000) m.step(1); return m.result(); };
  L.MAP = { LANES, BASE, CAMPS, PIT, RIVER, NODES, WALLS, BODY, FIXED_DT, clearSegment };
})(typeof window !== 'undefined' ? window : globalThis);
