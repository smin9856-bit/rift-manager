// 경기 화면: 밴픽(전술 선택) → 미니맵 실시간 중계 → 결과
(function (G) {
  const L = G.LFM, W = L.world, sim = L.sim, MAP = L.MAP;
  const V = (L.view = {});
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const BLUE = '#3b9eff', RED = '#ff5a5f';
  const SPEEDS = [0, 4, 10, 20, 40, 110]; // 실제 1초당 게임 내 초
  const C = L.champions, B = L.broadcast;
  let st = null; // 현재 시리즈 상태

  V.active = () => !!st; V.state = () => st;
  V.open = function (m, onDone) {
    const s = W.get(), ua = m.a === s.user;
    st = { m, onDone, me: s.teams[s.user], opp: s.teams[ua ? m.b : m.a], ua, need: Math.ceil(m.bo / 2), meBlue: W.rng()() < 0.5, phase: 'draft', match: null, speed: 3, boxes: [], selected:2, camera:'combat', effects:true, combatSlow:true };
    st.res = { s: [0, 0], g: [] };
    st.effects = !G.matchMedia('(prefers-reduced-motion: reduce)').matches;
    st.tac = Object.assign({}, st.me.tactics);
    st.oppTac = sim.aiTactics(st.opp, st.me);
    preparePicks();
    V.render();
  };
  const myScore = () => st.res.s[st.ua ? 0 : 1], opScore = () => st.res.s[st.ua ? 1 : 0];
  function preparePicks() {
    const teams = st.meBlue ? [st.me, st.opp] : [st.opp, st.me];
    st.picks = C.draft(teams.flatMap(t => sim.lineup(t)), W.get().year, `${st.m.id || st.m.a}:${st.res.g.length}`);
  }

  V.render = function () {
    const root = document.getElementById('matchRoot'); root.classList.add('on');
    if (st.phase === 'draft') root.innerHTML = draftHtml();
    else if (st.phase === 'live') { root.innerHTML = liveHtml(); startLive(); }
    else root.innerHTML = resultHtml();
  };
  V.close = function () { stopLoop(); const cb = st.onDone; st = null; const root = document.getElementById('matchRoot'); root.classList.remove('on'); root.innerHTML = ''; cb && cb(); };

  // ───────── 밴픽 ─────────
  function lineupCol(t, side) {
    const lu = sim.lineup(t), offset = side === 'blue' ? 0 : 5;
    return `<div class="lu ${side}"><h3 style="border-color:${side === 'blue' ? BLUE : RED}">${esc(t.name)} <span class="dim">${side === 'blue' ? '블루' : '레드'} 진영</span></h3>` +
      lu.map((p, i) => `<div class="lurow"><img class="draft-portrait" src="${C.icon(st.picks[offset+i])}" alt="${esc(C.get(st.picks[offset+i])?.name || '')}"><span class="rolechip">${L.ROLE_KO[i]}</span><b>${esc(p.n)}</b><span class="ovr">${Math.round(L.ovr(p, i))}</span>
        <label class="pick-label"><select data-pick="${offset+i}" aria-label="${esc(p.n)} 챔피언" ${t.id !== st.me.id ? 'disabled' : ''}>${C.available(W.get().year).sort((a,b)=>a.name.localeCompare(b.name,'ko')).map(ch=>`<option value="${ch.id}" ${ch.id===st.picks[offset+i]?'selected':''} ${st.picks.includes(ch.id)&&ch.id!==st.picks[offset+i]?'disabled':''}>${C.pool(i,W.get().year).includes(ch.id)?'★ ':''}${esc(ch.name)}</option>`).join('')}</select></label></div>`).join('') +
      `<div class="dim sm">팀 호흡 ${Math.round(sim.synergy(t) * 100)} · 감독 ${L.staff.of(t) ? esc(L.staff.of(t).n) + ' (' + L.staff.TRAITS[L.staff.of(t).trait].ko + ')' : '-'}</div></div>`;
  }
  function draftHtml() {
    const s = W.get(), c = s.comps[st.m.comp], lu = sim.lineup(st.me), olu = sim.lineup(st.opp), tac = st.tac;
    const opt = (key, val, label, extra) => `<button class="opt ${tac[key] === val ? 'sel' : ''}" data-mact="tac" data-k="${key}" data-v="${val}">${label}${extra || ''}</button>`;
    const blueT = st.meBlue ? st.me : st.opp, redT = st.meBlue ? st.opp : st.me;
    return `<div class="draft">
      <div class="mhead"><div><b>${esc(c ? c.name : '')}</b> <span class="dim">${stageKo(st.m)} · ${st.m.bo}전 ${st.need}선승 · ${st.res.g.length + 1}세트</span></div>
        <div class="score">${esc(st.me.short)} <b>${myScore()}</b> : <b>${opScore()}</b> ${esc(st.opp.short)}</div></div>
      <p class="draft-hint">CHAMPION SELECT <span>선수별 챔피언을 선택하세요. ★는 포지션 추천 · 해당 시즌에 출시된 챔피언만 표시됩니다.</span></p>
      <div class="lus">${lineupCol(blueT, 'blue')}${lineupCol(redT, 'red')}</div>
      <div class="panel"><h4>조합 성향 <span class="dim">상대의 평소 성향: ${L.STYLES[st.opp.tactics.style].ko}</span></h4><div class="styles">` +
      L.STYLE_KEYS.map((k) => {
        const n = lu.filter((p) => p.st.includes(k)).length, cv = L.COUNTER[k][st.opp.tactics.style];
        return `<button class="stylecard ${tac.style === k ? 'sel' : ''}" data-mact="tac" data-k="style" data-v="${k}"><b>${L.STYLES[k].ko}</b><span>${L.STYLES[k].desc}</span>
          <em>숙련 선수 ${n}명${cv > 0 ? ' · <u class="good">상대 성향에 유리</u>' : cv < 0 ? ' · <u class="bad">상대 성향에 불리</u>' : ''}</em></button>`;
      }).join('') + `</div>
      <div class="rowopts"><div><h4>저격 밴 <span class="dim">챔피언 폭이 좁은 선수일수록 타격이 큽니다</span></h4>${opt('ban', -1, '없음')}${olu.map((p, i) => opt('ban', i, `${L.ROLE_KO[i]} ${esc(p.n)}`, ` <small>폭 ${p.a[L.AI.pool]}</small>`)).join('')}</div>
      <div><h4>집중 라인</h4>${opt('focus', -1, '균형')}${opt('focus', 0, '탑')}${opt('focus', 1, '미드')}${opt('focus', 2, '바텀')}</div>
      <div><h4>교전 성향</h4>${opt('aggro', 0, '신중하게')}${opt('aggro', 1, '보통')}${opt('aggro', 2, '공격적으로')}</div>
      <div><h4>오브젝트 우선순위</h4>${opt('obj', 'balanced', '균형')}${opt('obj', 'dragon', '드래곤')}${opt('obj', 'towers', '타워·전령')}</div></div>
      <div class="actions"><button class="btn primary" data-mact="start">경기 시작</button><button class="btn" data-mact="instant">결과만 보기</button></div></div></div>`;
  }
  const stageKo = (m) => ({ reg: `정규 시즌 ${m.round || ''}라운드`, po1: '플레이오프 1라운드', po2: '플레이오프 준결승', final: '결승', playin: '플레이-인', groups: '그룹 스테이지', qf: '8강', sf: '4강', promo: '승강전' }[m.stage] || '');

  function begin() {
    const s = W.get(); s.teams[s.user].tactics = Object.assign({}, st.tac, { ban: -1 });
    st.oppTac = sim.aiTactics(st.opp, st.me);
    const blue = st.meBlue ? st.me : st.opp, red = st.meBlue ? st.opp : st.me;
    st.blue = blue; st.red = red;
    const cfg = sim.cfg(blue, red, st.m, st.meBlue ? st.tac : st.oppTac, st.meBlue ? st.oppTac : st.tac);
    cfg.sides[0].color = BLUE; cfg.sides[1].color = RED;
    cfg.visuals = true;
    cfg.sides.forEach((s,si)=>s.players.forEach((p,i)=>p.champion=st.picks[si*5+i]));
    st.particles = []; st.lastFx = 0; st.visualTime = 0; st.cameraTransform=null;st.lastCameraTargets=null;st.lastCombatTime=-Infinity;
    st.match = new L.Match(cfg); st.evShown = 0;
  }
  function finishGame() {
    stopLoop();
    const res = st.match.result(), aBlue = st.ua ? st.meBlue : !st.meBlue;
    sim.record(st, res, aBlue); sim.apply(st.blue, st.red, res);
    st.last = res; st.won = (res.winner === 0) === st.meBlue; st.boxes.push(res);
    if (!st.won) st.meBlue = true; else st.meBlue = false; // 진 팀이 블루 진영
    st.phase = 'result'; V.render();
  }

  // ───────── 중계 ─────────
  function liveHtml() {
    const m = st.match, mySide = st.meBlue ? 0 : 1;
    const ord = (k, v, label) => '<button class="opt sm '+(m.sides[mySide].tactics[k]===v?'sel':'')+'" data-mact="order" data-k="'+k+'" data-v="'+v+'">'+label+'</button>';
    return `<div class="live">
      <header class="broadcast-head"><div class="broadcast-brand"><span class="brand-mark">R</span><div>RIFT <b>MANAGER</b><small>MATCH CENTER / 경기 중계</small></div></div><div class="match-meta">${esc(W.get().comps[st.m.comp]?.name || '프로 리그')} <span>${stageKo(st.m)} · GAME ${st.res.g.length+1}</span></div><span id="liveStatus" class="live-indicator">● LIVE</span></header>
      <div class="livebar"><div class="teamtag"><span class="team-monogram">${esc(st.blue.short.slice(0,3))}</span><div>${esc(st.blue.name)}<small>BLUE SIDE</small></div></div><div id="lvScore" class="lvscore"></div><div class="teamtag redteam"><div>${esc(st.red.name)}<small>RED SIDE</small></div><span class="team-monogram">${esc(st.red.short.slice(0,3))}</span></div></div>
      <div class="livebody"><aside class="side blue-side" id="sbBlue"></aside>
      <section class="arena"><div class="arena-toolbar"><span><i class="live-dot"></i> SUMMONER’S RIFT</span><div><button class="opt sm ${st.camera==='combat'?'sel':''}" data-mact="camera" data-v="combat">교전 카메라</button><button class="opt sm ${st.camera==='overview'?'sel':''}" data-mact="camera" data-v="overview">전체 맵</button><button class="opt sm" data-mact="camera" data-v="follow">선수 추적</button><button class="opt sm ${st.effects?'sel':''}" data-mact="effects" aria-pressed="${st.effects}">이펙트</button></div></div><div id="objectiveTimers" class="objective-timers"></div><div class="mapwrap"><canvas id="mapCv" aria-label="실시간 경기 전장. 챔피언을 클릭하여 선택"></canvas><div id="caption" class="caption" aria-live="polite"></div></div><div id="selectedPlayer" class="selected-player"></div></section>
      <aside class="side red-side" id="sbRed"></aside></div>
      <div class="broadcast-controls"><div class="speeds">${['Ⅱ','느리게','보통','빠르게','매우 빠르게','초고속'].map((t,i)=>`<button class="opt sm ${st.speed===i?'sel':''}" data-mact="speed" data-v="${i}" aria-label="${i?t+' 재생':'일시정지'}">${t}</button>`).join('')}<button class="opt sm skip-btn" data-mact="skip">경기 끝까지 ↗</button><button class="opt sm ${st.combatSlow?'sel':''}" data-mact="combatSlow" aria-pressed="${st.combatSlow}">교전 시 1×</button></div><span class="control-hint">선수 카드 또는 맵의 챔피언을 선택하세요</span></div>
      <div class="livefoot"><section class="orders"><div class="section-label">COACH’S DESK <span>작전 지시</span></div><div>${ord('aggro',0,'신중하게')}${ord('aggro',1,'균형')}${ord('aggro',2,'공격적으로')}</div><div>${ord('obj','balanced','균형 운영')}${ord('obj','dragon','드래곤 우선')}${ord('obj','towers','타워 우선')}</div><small id="orderStatus">전술은 다음 팀 판단에 반영됩니다</small></section><section class="gold-panel"><div class="section-label">GOLD ADVANTAGE <span id="goldLead">골드 격차</span></div><canvas id="goldCv" width="420" height="70"></canvas></section><section class="events-panel"><div class="section-label">LIVE TIMELINE <span>경기 주요 장면</span></div><div id="feed" class="feed"><div class="feed-empty">미니언이 소환되기를 기다리는 중…</div></div></section></div>
    </div>`;
  }
  let raf = 0, lastTs = 0, acc = 0, sbT = 0;
  function stopLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; if(st?.resizeObserver)st.resizeObserver.disconnect(); if(st?.finishTimer)clearTimeout(st.finishTimer); }
  function startLive() {
    const cv = document.getElementById('mapCv');
    if (!document.getElementById('announce')) { const a = document.createElement('div'); a.id = 'announce'; a.className = 'announce'; cv.parentElement.appendChild(a); }
    st.annIdx = null;
    if (!document.getElementById('winBar')) { const b = document.createElement('div'); b.id = 'winBar'; b.className = 'winbar'; cv.parentElement.appendChild(b); }
    st.cv = cv; st.ctx = cv.getContext('2d');
    lastTs = 0; acc = 0; sbT = 0; stopLoop();
    B.resize(st); st.resizeObserver = new ResizeObserver(()=>st && st.phase==='live' && B.resize(st));st.resizeObserver.observe(cv.parentElement);
    cv.addEventListener('click',e=>{const r=cv.getBoundingClientRect(),tr=st.cameraTransform||{zoom:1,cx:500,cy:500},sw=st.stageW||1000,sh=st.stageH||1000;const x=((e.clientX-r.left)/r.width*sw-sw/2)/tr.zoom+tr.cx,y=((e.clientY-r.top)/r.height*sh-sh/2)/tr.zoom+tr.cy;const p=(st.positions||[]).find(p=>Math.hypot(p.x-x,p.y-y)<25);if(p){st.selected=p.idx;scoreboard(st.match);}});
    scoreboard(st.match);
    const loop = (ts) => {
      if (!st || st.phase !== 'live') return;
      const m = st.match; if (!lastTs) lastTs = ts;
      const dt = Math.min(0.5, (ts - lastTs) / 1000); lastTs = ts;
      const fighting=m.fights.some(f=>f.members.some(p=>!p.dead&&p.side===0)&&f.members.some(p=>!p.dead&&p.side===1));
      st.effectiveSpeed=st.combatSlow&&fighting?Math.min(5,SPEEDS[st.speed]):SPEEDS[st.speed];
      acc += dt * st.effectiveSpeed;
      let n = 0; while (acc+1e-9 >= MAP.FIXED_DT && !m.done && n++ < 160) { m.step(MAP.FIXED_DT); acc -= MAP.FIXED_DT; }
      if (n >= 160) acc = 0;
      draw(m, m.done ? 1 : L.clamp(acc/MAP.FIXED_DT,0,1), dt);
      if (ts - sbT > 200) { sbT = ts; scoreboard(m); }
      if (m.done) { scoreboard(m); st.finishTimer=setTimeout(() => st && st.phase === 'live' && finishGame(), 1400); return; }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
  }

  // ───────── 중계 알림 (퍼스트 블러드·멀티 킬·오브젝트) ─────────
  const MULTI = ['', '', '더블 킬!', '트리플 킬!', '쿼드라 킬!', '펜타 킬!'];
  function announce(m) {
    if (st.annIdx == null) { st.annIdx = 0; st.annQ = []; st.multi = {}; st.annUntil = 0; }
    const rec = (n) => st.multi[n] || (st.multi[n] = { n: 0, t: -99, spree: 0 });
    while (st.annIdx < m.events.length) {
      const e = m.events[st.annIdx++], side = e.side ? 'red' : 'blue', team = m.sides[e.side] ? m.sides[e.side].short : '';
      let big = '', sub = '', pri = 1;
      if (e.type === 'kill') {
        const parts = e.text.replace(' (퍼스트 블러드)', '').split(' ▶ ');
        if (parts.length < 2) { big = '처형되었습니다'; sub = e.text; }
        else {
          const k = rec(parts[0]), v = rec(parts[1]), shut = v.spree >= 3;
          k.n = e.t - k.t <= 10 ? k.n + 1 : 1; k.t = e.t; k.spree++; v.spree = 0; v.n = 0;
          sub = `${parts[0]}  ⚔  ${parts[1]}`;
          if (k.n >= 2) { big = MULTI[Math.min(5, k.n)]; pri = 3; }
          else if (/퍼스트 블러드/.test(e.text)) { big = '퍼스트 블러드!'; pri = 3; }
          else if (shut) { big = '제압되었습니다!'; pri = 2; }
          else if (k.spree === 3) { big = '학살 중입니다!'; pri = 2; }
          else if (k.spree === 5) { big = '도저히 막을 수 없습니다!'; pri = 2; }
          else if (k.spree >= 7) { big = '전설의 출현!'; pri = 2; }
          else { big = '적을 처치했습니다'; pri = 0; }
        }
      } else if (e.type === 'ace') { big = '에이스!'; sub = team; pri = 3; }
      else if (e.type === 'steal') { big = '스틸!'; sub = e.text; pri = 3; }
      else if (e.type === 'baron' || e.type === 'dragon' || e.type === 'herald' || e.type === 'inhib' || e.type === 'nexus') { big = e.text; pri = e.type === 'nexus' ? 4 : 2; }
      else if (e.type === 'tower') { big = '포탑이 파괴되었습니다'; sub = e.text; pri = 1; }
      else continue;
      st.annQ.push({ big, sub, side, pri, type: e.type });
    }
    // 밀리면 덜 중요한 알림부터 버린다
    while (st.annQ.length > 3) { const i = st.annQ.reduce((b, x, j) => (x.pri < st.annQ[b].pri ? j : b), 0); st.annQ.splice(i, 1); }
    const nowT = performance.now(), el = document.getElementById('announce');
    if (!el) return;
    if (nowT >= st.annUntil) {
      const a = st.annQ.shift();
      if (a) {
        st.annUntil = nowT + (a.pri >= 3 ? 2300 : a.pri >= 2 ? 1800 : 1200);
        el.className = `announce on ${a.side} p${a.pri}`; el.innerHTML = `<b>${esc(a.big)}</b>${a.sub ? `<span>${esc(a.sub)}</span>` : ''}`;
        void el.offsetWidth; el.classList.add('pop');
      } else if (el.classList.contains('on')) el.className = 'announce';
    }
  }

  function draw(m, al, dt) {
    B.draw(st,m,al,dt); announce(m);
    const cap=document.getElementById('caption');
    const e=m.events.slice(-6).reverse().find(e=>m.t-e.t<6);
    if(cap){cap.textContent=e?e.text:'';cap.style.opacity=e?1:0;}
  }

  const clock = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const taskName = p => p.dead ? '부활 대기' : p.recall ? '귀환 중' : p.tp ? '순간이동' : ({lane:'라인 관리',fight:'교전 중',join:'교전 합류',gank:'갱킹',flee:'후퇴 중',jungle:'정글 사냥',dragon:'드래곤 공략',baron:'바론 공략',herald:'전령 공략',siege:'라인 압박',defend:'수비 중',group:'팀 작전 수행'}[p.task] || '이동 중');
  function spellHtml(p, t) {
    const ch=C.get(p.champion);if(!ch)return '';
    return ch.spells.map((s,i)=>{
      const locked=p.lvl<(i===3?6:i+1), left=Math.max(0,Math.ceil(p.cooldowns[i]-t)), casting=p.castSlot===i&&p.castUntil>t;
      return `<span class="spell ${left||locked?'cooldown':''} ${casting?'casting':''}" title="${esc(s.name)}${locked?' · 미습득':left?' · '+left+'초':' · 준비됨'}"><img src="assets/spells/${s.icon}" alt="${esc(s.name)}"><b>${['Q','W','E','R'][i]}</b>${locked?'<em>−</em>':left?`<em>${left}</em>`:''}</span>`;
    }).join('');
  }
  // 승리 확률: 골드 격차를 중심으로 타워·드래곤·바론·생존 인원을 반영한 추정치
  function winProb(m, g) {
    const t = m.t, a = m.sides[0], b = m.sides[1];
    let x = ((g[0] - g[1]) / (1800 + t * 1.5)) * 1.25 + (a.towers - b.towers) * 0.14 + (a.dragons - b.dragons) * 0.1 + (a.soul ? 0.5 : 0) - (b.soul ? 0.5 : 0);
    x += (t < a.baronUntil ? 0.6 : 0) - (t < b.baronUntil ? 0.6 : 0) + (t < a.elderUntil ? 0.8 : 0) - (t < b.elderUntil ? 0.8 : 0);
    if (t > 1200) x += (m.alive(0).length - m.alive(1).length) * 0.12;
    if (m.done) return m.winner === 0 ? 1 : 0;
    return 1 / (1 + Math.exp(-x));
  }
  function winBar(m, g) {
    const el = document.getElementById('winBar'); if (!el) return;
    const p = winProb(m, g); st.wp = st.wp == null ? p : st.wp + (p - st.wp) * 0.25;
    const bp = Math.round(st.wp * 100), d = g[0] - g[1], lead = Math.abs(d) < 50 ? '' : (d > 0 ? 'blue' : 'red');
    el.innerHTML = `<div class="wb-team blue"><b>${esc(st.blue.short)}</b><span>${bp}%</span></div>
      <div class="wb-mid"><div class="wb-gold ${lead}">${lead ? (d > 0 ? '◀ ' : '') + '골드 +' + (Math.abs(d) / 1000).toFixed(1) + 'k' + (d < 0 ? ' ▶' : '') : '골드 동률'}</div>
      <div class="wb-bar"><i style="width:${bp}%"></i></div><div class="wb-label">승리 확률</div></div>
      <div class="wb-team red"><span>${100 - bp}%</span><b>${esc(st.red.short)}</b></div>`;
  }
  function scoreboard(m) {
    const t = m.t, g = [m.teamGold(0), m.teamGold(1)];
    const sc = document.getElementById('lvScore'); if (!sc) return;
    sc.innerHTML = `<div class="score-side blue-score"><b>${m.sides[0].kills}</b><small>${(g[0]/1000).toFixed(1)}k GOLD</small></div><div class="score-center"><small>GAME ${st.res.g.length+1}</small><span class="clock">${clock(t)}</span><small>${myScore()} : ${opScore()} SERIES</small></div><div class="score-side red-score"><b>${m.sides[1].kills}</b><small>${(g[1]/1000).toFixed(1)}k GOLD</small></div>`;
    document.getElementById('liveStatus').textContent=st.speed?(st.effectiveSpeed<SPEEDS[st.speed]?'● 교전 집중':'● LIVE'):'Ⅱ PAUSED';
    winBar(m, g);
    document.getElementById('goldLead').textContent=`${g[0]>=g[1]?st.blue.short:st.red.short} +${(Math.abs(g[0]-g[1])/1000).toFixed(1)}k`;
    document.getElementById('objectiveTimers').innerHTML=[m.obj.dragon,t>=1200?m.obj.baron:m.obj.herald].filter(o=>o.next<1e8).map(o=>`<span class="objective ${o.alive?'alive':''}"><i>${o.type==='dragon'?'◇':'◈'}</i> ${o.type==='dragon'?(o.elder?'장로 드래곤':'드래곤'):o.type==='baron'?'바론':'협곡의 전령'} <b>${o.alive?'생존':clock(Math.max(0,o.next-t))}</b></span>`).join('')+`<span class="phase-tag">${t<840?'라인전':t<1680?'중반 운영':'후반 한타'}</span>`;
    for (let si = 0; si < 2; si++) {
      const s = m.sides[si], el = document.getElementById(si ? 'sbRed' : 'sbBlue');
      el.innerHTML = `<div class="roster-heading"><b>${esc(s.short)}</b><span>${si?'RED':'BLUE'} ROSTER</span></div><div class="tstat"><span>타워 <b>${s.towers}</b></span><span>용 <b>${s.dragons}${s.soul ? '★' : ''}</b></span><span>바론 <b>${s.barons}</b></span></div>
        ${t < s.baronUntil ? '<div class="buff">바론 버프</div>' : ''}${t < s.elderUntil ? '<div class="buff">장로 버프</div>' : ''}` +
        s.players.map((p) => {
          const hr = p.dead ? 0 : Math.max(0, p.hp / m.mhp(p));
          const ch=C.get(p.champion);
          return `<button class="prow ${p.dead?'dead':''} ${st.selected===p.idx?'selected':''}" data-mact="player" data-v="${p.idx}" aria-pressed="${st.selected===p.idx}"><div class="player-main"><div class="portrait-wrap"><img src="${C.icon(p.champion)}" alt="${esc(ch?.name||'챔피언')}"><span>${p.lvl}</span>${p.dead?`<em>${Math.ceil(p.dead-t)}</em>`:''}</div><div class="player-identity"><div class="pl1"><b>${esc(p.p.n)}</b><span class="position-label">${L.ROLES[p.role]}</span></div><div class="champion-name">${esc(ch?.name||'')} <span class="player-kda">${p.k} / ${p.d} / ${p.a}</span></div><div class="hpbar"><i style="width:${hr*100}%"></i></div></div></div><div class="player-bottom"><div class="spell-row">${spellHtml(p,t)}</div><div class="farm-stat"><b>${p.cs} <small>CS</small></b><span>${(p.gold/1000).toFixed(1)}k</span></div></div><div class="player-task ${p.fight?'fighting':''}"><i></i>${taskName(p)}</div></button>`;
        }).join('');
    }
    const p=m.all[st.selected??2], ch=C.get(p.champion);
    document.getElementById('selectedPlayer').innerHTML=`<img class="selected-portrait" src="${C.icon(p.champion)}" alt="${esc(ch?.name||'')}"><div class="selected-identity"><small>선택한 선수 · ${L.ROLE_KO[p.role]}</small><b>${esc(p.p.n)} <span>${esc(ch?.name||'')}</span></b><span>${p.dead?'부활 '+Math.ceil(p.dead-t)+'초':Math.ceil(p.hp)+' / '+Math.ceil(m.mhp(p))+' HP'} · ${taskName(p)}</span></div><div class="selected-spells">${spellHtml(p,t)}</div><div class="selected-damage"><small>챔피언 피해량</small><b>${(p.dmg/1000).toFixed(1)}<small>k</small></b></div>`;
    const feed = document.getElementById('feed');
    if (feed && m.events.length !== st.evShown) {
      st.evShown = m.events.length;
      feed.innerHTML = m.events.slice(-40).reverse().map((e) => `<div class="ev ${e.type}"><time>${clock(e.t)}</time>${e.killer?`<img src="${C.icon(e.killer)}" alt="${esc(C.get(e.killer)?.name||'')}">`:`<span style="color:${e.side?RED:BLUE}">◆</span>`}<span>${esc(e.text)}</span>${e.victim?`<img src="${C.icon(e.victim)}" alt="${esc(C.get(e.victim)?.name||'')}">`:''}</div>`).join('');
    }
    const gc = document.getElementById('goldCv');
    if (gc) {
      const c = gc.getContext('2d'), w = gc.width, h = gc.height, tl = m.timeline; c.clearRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,.2)'; c.beginPath(); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
      if (tl.length > 1) {
        const mx = Math.max(3000, ...tl.map((x) => Math.abs(x.g))), n = Math.max(30, tl.length);
        c.beginPath(); tl.forEach((x, i) => { const px = (i / (n - 1)) * w, py = h / 2 - (x.g / mx) * (h / 2 - 4); i ? c.lineTo(px, py) : c.moveTo(px, py); });
        c.strokeStyle = '#e8d48a'; c.lineWidth = 2; c.stroke();
        const lastG = tl[tl.length - 1].g; c.fillStyle = lastG >= 0 ? BLUE : RED; c.font = '12px sans-serif'; c.fillText(`골드 격차 ${lastG >= 0 ? '+' : ''}${(lastG / 1000).toFixed(1)}k`, 6, 14);
      }
    }
  }

  // ───────── 결과 ─────────
  function resultHtml() {
    const r = st.last, over = myScore() >= st.need || opScore() >= st.need;
    const row = (p) => `<tr><td>${L.ROLE_KO[p.role]}</td><td>${p.champion?`<img class="result-portrait" src="${C.icon(p.champion)}" alt="${esc(C.get(p.champion)?.name||'')}">`:''}<b>${esc(p.n)}</b>${p.champion?`<small class="result-champion">${esc(C.get(p.champion)?.name||'')}</small>`:''}</td><td>${p.k}/${p.d}/${p.a}</td><td>${p.cs == null ? '-' : p.cs}</td><td>${p.gold == null ? '-' : (p.gold / 1000).toFixed(1) + 'k'}</td><td>${p.dmg == null ? '-' : (p.dmg / 1000).toFixed(1) + 'k'}</td><td class="rt ${p.rating >= 8 ? 'good' : p.rating < 5.5 ? 'bad' : ''}">${p.rating.toFixed(1)}</td></tr>`;
    const mvp = r.players.filter((p) => p.side === r.winner).sort((a, b) => b.rating - a.rating)[0];
    const tbl = (si) => `<div class="box"><h3 style="color:${si ? RED : BLUE}">${esc((si ? st.red : st.blue).name)} ${r.winner === si ? '<span class="win">승리</span>' : ''}</h3>
      <div class="dim sm">킬 ${r.kills[si]} · 타워 ${r.towers[si]} · 드래곤 ${r.dragons[si]} · 바론 ${r.barons[si]} · 골드 ${(r.gold[si] / 1000).toFixed(1)}k</div>
      <table class="tb"><tr><th></th><th>선수</th><th>K/D/A</th><th>CS</th><th>골드</th><th>피해량</th><th>평점</th></tr>${r.players.filter((p) => p.side === si).map(row).join('')}</table></div>`;
    return `<div class="result"><div class="mhead"><div><h2 class="${st.won ? 'good' : 'bad'}">${st.won ? '승리' : '패배'}</h2><span class="dim">${st.res.g.length}세트 · ${clock(r.duration)} · MVP ${esc(mvp.n)} (${mvp.rating.toFixed(1)})</span></div>
      <div class="score">${esc(st.me.short)} <b>${myScore()}</b> : <b>${opScore()}</b> ${esc(st.opp.short)}</div></div>
      <div class="boxes">${tbl(0)}${tbl(1)}</div>
      <div class="actions"><button class="btn primary" data-mact="${over ? 'end' : 'next'}">${over ? '시리즈 종료' : '다음 세트'}</button></div></div>`;
  }

  document.addEventListener('change',e=>{
    const el=e.target.closest('[data-pick]');if(!el||!st||st.phase!=='draft')return;
    const i=Number(el.dataset.pick), id=el.value;
    if((i<5)!==st.meBlue||st.picks.includes(id)||!C.get(id)||C.get(id).year>W.get().year)return;
    st.picks[i]=id;V.render();
  });
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-mact]'); if (!el || !st) return;
    const a = el.dataset.mact, k = el.dataset.k, v = el.dataset.v;
    if (a === 'tac') { st.tac[k] = k === 'style' || k === 'obj' ? v : Number(v); V.render(); }
    else if (a === 'start') { begin(); st.phase = 'live'; V.render(); }
    else if (a === 'instant') { begin(); let g = 0; while (!st.match.done && g++ < 6000) st.match.step(1); finishGame(); }
    else if (a === 'speed') { st.speed = Number(v); document.querySelectorAll('[data-mact="speed"]').forEach((b) => b.classList.toggle('sel', b.dataset.v === v));scoreboard(st.match); }
    else if (a === 'player') { st.selected=Number(v);scoreboard(st.match); }
    else if (a === 'camera') { st.camera=v;document.querySelectorAll('[data-mact="camera"]').forEach(b=>b.classList.toggle('sel',b.dataset.v===v)); }
    else if (a === 'effects') { st.effects=!st.effects;el.classList.toggle('sel',st.effects);el.setAttribute('aria-pressed',String(st.effects)); }
    else if (a === 'combatSlow') { st.combatSlow=!st.combatSlow;el.classList.toggle('sel',st.combatSlow);el.setAttribute('aria-pressed',String(st.combatSlow)); }
    else if (a === 'skip') { let g = 0; while (!st.match.done && g++ < 6000) st.match.step(1); }
    else if (a === 'order') { const side = st.match.sides[st.meBlue ? 0 : 1]; side.tactics[k] = k === 'obj' ? v : Number(v); document.querySelectorAll(`[data-mact="order"][data-k="${k}"]`).forEach((b) => b.classList.toggle('sel', b.dataset.v === v)); }
    else if (a === 'next') { stopLoop();st.phase = 'draft'; st.tac.ban = -1;preparePicks(); V.render(); }
    else if (a === 'end') { st.m.res = st.res; sim.finishSeries(st.m); V.close(); }
  });
})(window);
