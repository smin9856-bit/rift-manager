// 멀티플레이: 방장이 세계를 진행하고, 참가자는 방 코드로 접속해 같은 리그에서 각자 팀을 운영한다.
// 브라우저끼리 직접 연결(WebRTC, PeerJS)하며 전용 서버는 없다. 방장이 접속해 있어야 진행된다.
(function (G) {
  const L = G.LFM, W = L.world, sim = L.sim, St = L.staff;
  const N = (L.net = { role: null, peer: null, conns: [], code: '', tid: null, name: '', ready: {}, status: '', myReady: false });
  const S = () => W.get();
  const PEER_SRC = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js', PREFIX = 'riftmgr-';
  const ui = () => L.ui;
  const note = (msg, bad) => { N.status = msg; if (ui().toast) ui().toast(msg, bad); if (S() && document.getElementById('nav')) ui().render(); };

  function lib() {
    if (G.Peer) return Promise.resolve();
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = PEER_SRC; s.onload = res; s.onerror = () => rej(new Error('연결 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.')); document.head.appendChild(s); });
  }
  async function pack(obj) {
    const str = JSON.stringify(obj);
    if (!G.CompressionStream) return { z: 0, d: str };
    return { z: 1, d: await new Response(new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer() };
  }
  async function unpack(m) {
    if (!m.z) return JSON.parse(m.d);
    return JSON.parse(await new Response(new Blob([m.d]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
  }
  const code5 = () => Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

  // ───────── 방장 ─────────
  N.host = async function () {
    try { await lib(); } catch (e) { return note(e.message, 1); }
    const s = S(); s.mp = s.mp || { code: code5(), guests: [] };
    N.role = 'host'; N.code = s.mp.code; N.conns = []; N.ready = {};
    if (N.peer) N.peer.destroy();
    N.peer = new G.Peer(PREFIX + N.code);
    N.peer.on('open', () => note(`방을 열었습니다. 방 코드: ${N.code}`));
    N.peer.on('error', (e) => note(e.type === 'unavailable-id' ? '같은 방 코드가 이미 열려 있습니다. 잠시 뒤 다시 시도하세요.' : `연결 오류: ${e.type}`, 1));
    N.peer.on('connection', (conn) => {
      conn.on('data', (d) => hostMsg(conn, d));
      conn.on('close', () => { N.conns = N.conns.filter((c) => c !== conn); if (conn.tid) delete N.ready[conn.tid]; note(`${conn.gname || '참가자'} 연결 끊김`, 1); });
    });
  };
  function teamList() {
    const s = S();
    return Object.values(s.leagues).sort((a, b) => a.tier - b.tier || b.base - a.base).map((lg) => ({ name: lg.name, tier: lg.tier, teams: lg.teams.filter((id) => !W.managed(id)).map((id) => ({ id, name: s.teams[id].name, ovr: Math.round(W.teamOvr(s.teams[id])), stars: W.stars(s.teams[id]) })) }));
  }
  function initHuman(tid) { // 사람이 맡는 팀에 필요한 값
    const t = S().teams[tid];
    t.goalNow = W.goal(t); t.conf = 60; if (t.fans == null) t.fans = St.fansBase(t); St.newDeals(t); t.content = t.content || 0; t.eventAt = t.eventAt || -99;
  }
  function hostMsg(conn, d) {
    const s = S();
    if (d.t === 'hello') {
      conn.gname = String(d.name || '참가자').slice(0, 14); if (!N.conns.includes(conn)) N.conns.push(conn);
      const old = s.mp.guests.find((g) => g.name === conn.gname);
      if (old && W.managed(old.tid)) { conn.tid = old.tid; note(`${conn.gname} 재접속`); N.sync(); }
      else conn.send({ t: 'teams', year: s.year, list: teamList() });
    } else if (d.t === 'pick') {
      if (!s.teams[d.tid] || W.managed(d.tid) || s.teams[d.tid].pseudo) return conn.send({ t: 'msg', msg: '이미 다른 사람이 맡은 팀입니다.', bad: 1 });
      s.mgrs.push(d.tid); s.mp.guests.push({ name: conn.gname, tid: d.tid }); conn.tid = d.tid; initHuman(d.tid);
      W.news(`${conn.gname} 님 참가`, `${conn.gname} 님이 ${s.teams[d.tid].name}의 감독으로 합류했습니다.`, 'board');
      note(`${conn.gname} 님이 ${s.teams[d.tid].name}을(를) 맡았습니다.`); N.sync();
    } else if (!conn.tid) return;
    else if (d.t === 'act') { const msg = N.remote(conn.tid, () => ui().runAct(d.act, d.d || {})); if (msg) conn.send({ t: 'msg', msg: msg.msg, bad: msg.bad }); N.sync(); ui().render(); }
    else if (d.t === 'chg') { N.remote(conn.tid, () => ui().applyChange(d.k, d.ds || {}, d.value, d.checked)); N.sync(); }
    else if (d.t === 'ready') { N.ready[conn.tid] = !!d.v; ui().render(); }
  }
  // 참가자의 조작을 방장 쪽 세계에서 그 팀 이름으로 실행한다
  N.remote = function (tid, fn) {
    const s = S(), prev = s.user, U = ui(); s.user = tid; U.remote = true; U.remoteMsg = null;
    try { fn(); } catch (e) { U.remoteMsg = { msg: '처리하지 못했습니다: ' + e.message, bad: 1 }; } finally { s.user = prev; U.remote = false; }
    return U.remoteMsg;
  };
  let syncT = 0;
  N.sync = function () {
    if (N.role !== 'host') return; clearTimeout(syncT);
    syncT = setTimeout(async () => {
      const live = N.conns.filter((c) => c.open && c.tid); if (!live.length) return;
      const p = await pack(S());
      for (const c of live) c.send({ t: 'state', z: p.z, d: p.d, tid: c.tid, ready: N.ready });
    }, 120);
  };
  // 사람이 낀 경기: 방장이 결과를 계산하고, 같은 설정을 보내 각자 화면에서 재생한다
  N.playHuman = function (m) {
    const s = S(), a = s.teams[m.a], b = s.teams[m.b], need = Math.ceil(m.bo / 2), games = [];
    m.res = { s: [0, 0], g: [] }; let aBlue = W.rng()() < 0.5;
    const tacOf = (t, o) => (W.managed(t.id) ? Object.assign({}, t.tactics, { ban: -1 }) : sim.aiTactics(t, o));
    for (const t of [a, b]) if (!W.managed(t.id)) W.autoLineup(t);
    while (m.res.s[0] < need && m.res.s[1] < need) {
      const blue = aBlue ? a : b, red = aBlue ? b : a, cfg = sim.cfg(blue, red, m, tacOf(blue, red), tacOf(red, blue));
      cfg.sides[0].color = '#3b9eff'; cfg.sides[1].color = '#ff5a5f'; cfg.visuals = true;
      const draft=L.competition.draft([blue,red],m,cfg.sides.map(s=>s.tactics),m.res.g,m.id+':'+games.length);
      L.competition.decorate(cfg,[blue,red],draft.picks);
      const copy = JSON.parse(JSON.stringify(cfg)), res = L.simulate(cfg);
      res.draft=[{team:blue.id,picks:draft.picks.slice(0,5)},{team:red.id,picks:draft.picks.slice(5)}];res.bans=draft.bans;
      sim.record(m, res, aBlue); sim.apply(blue, red, res);
      games.push({ cfg: copy, blue: blue.id, red: red.id });
      aBlue = (res.winner === 0) === aBlue ? !aBlue : aBlue;
    }
    sim.finishSeries(m);
    const pkg = { t: 'replay', mid: m.id, a: m.a, b: m.b, games };
    for (const c of N.conns) if (c.open && (c.tid === m.a || c.tid === m.b)) c.send(pkg);
    return m.a === s.user || m.b === s.user ? pkg : null;
  };
  N.humanMatches = () => W.todayMatches().filter((m) => W.managed(m.a) || W.managed(m.b));
  N.waiting = () => (S().mp ? S().mp.guests.filter((g) => N.conns.some((c) => c.open && c.tid === g.tid) && !N.ready[g.tid]) : []);

  // ───────── 참가자 ─────────
  N.join = async function (code, name) {
    try { await lib(); } catch (e) { return note(e.message, 1); }
    N.role = 'guest'; N.code = String(code).trim().toUpperCase(); N.name = name; N.status = '방에 연결하는 중…';
    if (N.peer) N.peer.destroy();
    N.peer = new G.Peer();
    N.peer.on('error', (e) => { N.status = e.type === 'peer-unavailable' ? '방을 찾을 수 없습니다. 코드를 확인하고, 방장이 게임을 열어 두었는지 확인하세요.' : `연결 오류: ${e.type}`; ui().mpJoin(); });
    N.peer.on('open', () => {
      const conn = (N.conn = N.peer.connect(PREFIX + N.code, { reliable: true }));
      conn.on('open', () => conn.send({ t: 'hello', name }));
      conn.on('data', guestMsg);
      conn.on('close', () => { N.status = '방장과의 연결이 끊어졌습니다.'; if (ui().toast) ui().toast(N.status, 1); });
    });
  };
  async function guestMsg(d) {
    const U = ui();
    if (d.t === 'teams') U.mpPick(d);
    else if (d.t === 'state') {
      const first = !N.tid, s = await unpack(d);
      s.user = d.tid; s.mode = 'team'; W.set(s); N.tid = d.tid; N.status = '방장과 연결됨'; N.ready = d.ready || {}; N.myReady = !!N.ready[d.tid];
      if (first) U.main(); else if (!L.view.active()) U.render();
    } else if (d.t === 'msg') U.toast(d.msg, d.bad);
    else if (d.t === 'replay') U.mpReplay(d);
  }
  N.send = function (msg) { if (N.conn && N.conn.open) N.conn.send(msg); else if (ui().toast) ui().toast('방장과 연결되어 있지 않습니다.', 1); };
  N.setReady = function (v) { N.myReady = v; N.send({ t: 'ready', v }); };
})(window);
