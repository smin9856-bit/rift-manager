// 화면: 시작 메뉴, 구단 운영 화면 전체
(function (G) {
  const L = G.LFM, W = L.world, M = L.manage, sim = L.sim, V = L.view;
  const UI = (L.ui = { screen: 'home', lgSel: null, split: null, tf: { role: -1, fa: 0, maxAge: 40, minOvr: 0, region: '', q: '', sort: 'ovr' }, ng: { year: 2014, mode: 'team', lid: null, teamId: null } });
  const S = () => W.get();
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = L.fmtMoney;
  const CK = { 'South Korea': '한국', China: '중국', Taiwan: '대만', 'Hong Kong': '홍콩', Japan: '일본', Vietnam: '베트남', 'United States': '미국', Canada: '캐나다', Brazil: '브라질', Turkey: '튀르키예', Germany: '독일', France: '프랑스', Spain: '스페인', Denmark: '덴마크', Sweden: '스웨덴', Poland: '폴란드', 'United Kingdom': '영국', Netherlands: '네덜란드', Russia: '러시아', Ukraine: '우크라이나', Australia: '호주', 'New Zealand': '뉴질랜드', Mexico: '멕시코', Argentina: '아르헨티나', Chile: '칠레', Peru: '페루', Philippines: '필리핀', Thailand: '태국', Singapore: '싱가포르', Malaysia: '말레이시아', Belgium: '벨기에', Norway: '노르웨이', Greece: '그리스', Czechia: '체코', 'Czech Republic': '체코', Slovenia: '슬로베니아', Croatia: '크로아티아', Romania: '루마니아', Bulgaria: '불가리아', Portugal: '포르투갈', Italy: '이탈리아', Finland: '핀란드', Colombia: '콜롬비아', Uruguay: '우루과이', Venezuela: '베네수엘라', Indonesia: '인도네시아', Macau: '마카오' };
  const ctry = (c) => CK[c] || c || '-';
  const starHtml = (v) => `<span class="stars" title="전력 ${v} / 5"><i style="width:${v * 20}%"></i></span>`;
  const ac = (v) => (v >= 17 ? 'a5' : v >= 14 ? 'a4' : v >= 11 ? 'a3' : v >= 8 ? 'a2' : 'a1');
  const oc = (v) => (v >= 85 ? 'a5' : v >= 75 ? 'a4' : v >= 65 ? 'a3' : v >= 55 ? 'a2' : 'a1');
  const pl = (p, label) => `<a class="lnk" data-act="player" data-id="${esc(p.id)}">${esc(label || p.n)}</a>`;
  const tm = (t) => (t ? `<a class="lnk" data-act="team" data-id="${esc(t.id)}"><i class="dot" style="background:${t.color}"></i>${esc(t.name)}</a>` : '<span class="dim">무소속</span>');
  const potStars = (p) => { const v = p.pot >= 92 ? 5 : p.pot >= 86 ? 4.5 : p.pot >= 81 ? 4 : p.pot >= 76 ? 3.5 : p.pot >= 71 ? 3 : p.pot >= 66 ? 2.5 : p.pot >= 60 ? 2 : 1.5; return starHtml(v); };
  const toast = (msg, bad) => { const t = $('#toast'); t.textContent = msg; t.className = 'on' + (bad ? ' bad' : ''); clearTimeout(toast.t); toast.t = setTimeout(() => (t.className = ''), 3200); };
  const loadScript = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error(src)); document.head.appendChild(s); });
  const loadYear = (y) => (G.LFM_DATA && G.LFM_DATA[y] ? Promise.resolve() : loadScript(`data/y${y}.js`));
  const phase = (d) => (d < 14 ? '프리시즌' : d <= 83 ? '스프링 정규 시즌' : d < 104 ? '스프링 플레이오프' : d < 140 ? 'MSI 기간' : d <= 209 ? '서머 정규 시즌' : d < 232 ? '서머 플레이오프' : d < 245 ? '승강전' : d < 291 ? '월드 챔피언십' : '스토브리그');

  // ───────── 시작 메뉴 ─────────
  UI.boot = function () {
    $('#app').innerHTML = `<div class="start"><div class="logo">RIFT<span>MANAGER</span></div><p class="tag">2014–2026 · 실제 리그와 선수 데이터로 즐기는 e스포츠 구단 운영</p>
      <div class="startbtns"><button class="btn primary big" data-act="ng">새 게임</button>${W.hasSave(0) ? '<button class="btn big" data-act="loadgame">이어하기</button>' : ''}</div><a class="preview-link" href="match-preview.html">새로운 경기 중계 미리보기 ↗</a>
      <p class="credit">선수·팀·대회 기록 출처: Leaguepedia (CC BY-SA 3.0). 능력치는 실제 경기 기록에서 계산한 추정치이며 비공식 팬 프로젝트입니다.<br>챔피언·스킬 이미지 © Riot Games · Data Dragon. Riot Games가 보증하거나 공식적으로 관여하는 프로젝트가 아닙니다.</p></div>`;
  };
  UI.newGame = function () {
    const ng = UI.ng, ys = G.LFM_YEARS.map((y) => y.year);
    const yb = []; for (let y = 2014; y <= 2026; y++) { const info = G.LFM_YEARS.find((x) => x.year === y); yb.push(`<button class="ybtn ${ng.year === y ? 'sel' : ''}" ${ys.includes(y) ? '' : 'disabled'} data-act="ngyear" data-y="${y}"><b>${y}</b><span>${info ? `${info.leagues}개 리그 · ${info.teams}팀` : '데이터 없음'}</span></button>`); }
    const mode = (k, t, d, off) => `<button class="modecard ${ng.mode === k ? 'sel' : ''}" ${off ? 'disabled' : ''} data-act="ngmode" data-m="${k}"><b>${t}</b><span>${d}</span></button>`;
    $('#app').innerHTML = `<div class="wizard"><h1>새 게임</h1><h3>시작 연도</h3><div class="ygrid">${yb.join('')}</div>
      <h3>플레이 방식</h3><div class="modes">${mode('team', '기존 팀 선택', '실제 구단의 감독으로 부임합니다. 별이 많을수록 전력이 강한 팀입니다.')}${mode('create', '내 팀 창단', '새 구단을 만들어 2부 리그에서 시작해 정상까지 올라갑니다.')}${mode('player', '선수로 플레이', '준비 중입니다.', 1)}</div>
      <div class="actions"><button class="btn" data-act="boot">뒤로</button><button class="btn primary" data-act="ngnext">다음</button></div></div>`;
  };
  UI.ngStep2 = async function () {
    const ng = UI.ng; $('#app').innerHTML = '<div class="wizard"><h2>데이터를 불러오는 중…</h2></div>';
    try { await loadYear(ng.year); } catch (e) { $('#app').innerHTML = '<div class="wizard"><h2>데이터 파일을 찾을 수 없습니다.</h2><button class="btn" data-act="ng">뒤로</button></div>'; return; }
    ng.seed = ng.seed || ((Date.now() & 0x7fffffff) || 1);
    const D = G.LFM_DATA[ng.year];
    W.newGame({ year: ng.year, mode: 'team', teamId: D.leagues[0].teams[0], seed: ng.seed });
    if (ng.mode === 'create') return UI.ngCreate();
    const s = S(), lgs = Object.values(s.leagues).sort((a, b) => a.tier - b.tier || b.base - a.base);
    if (!ng.lid || !s.leagues[ng.lid]) ng.lid = lgs[0].id;
    const lg = s.leagues[ng.lid], teams = lg.teams.map((id) => s.teams[id]).sort((a, b) => W.teamOvr(b) - W.teamOvr(a));
    const card = (t) => {
      const top = sim.lineup(t).slice().sort((a, b) => L.ovr(b) - L.ovr(a)).slice(0, 3);
      return `<button class="teamcard ${ng.teamId === t.id ? 'sel' : ''}" data-act="ngteam" data-id="${esc(t.id)}"><i class="bar" style="background:${t.color}"></i><b>${esc(t.name)}</b>${starHtml(W.stars(t))}
        <span class="dim">평균 능력 ${Math.round(W.teamOvr(t))} · 자금 ${money(t.money)}</span><span class="sm">${top.map((p) => `${esc(p.n)} ${Math.round(L.ovr(p))}`).join(' · ')}</span><span class="sm dim">목표: ${W.goal(t).text}</span></button>`;
    };
    $('#app').innerHTML = `<div class="wizard wide"><h1>${ng.year} 시즌 · 팀 선택</h1>
      <div class="lgtabs">${[1, 2].map((tier) => `<div><span class="dim">${tier}부</span>${lgs.filter((l) => l.tier === tier).map((l) => `<button class="opt sm ${l.id === ng.lid ? 'sel' : ''}" data-act="nglg" data-id="${l.id}">${esc(l.name)}<small>${W.regionName(l.region)}</small></button>`).join('')}</div>`).join('')}</div>
      <div class="teamgrid">${teams.map(card).join('')}</div>
      <div class="actions"><button class="btn" data-act="ng">뒤로</button><button class="btn primary" ${ng.teamId && s.teams[ng.teamId] ? '' : 'disabled'} data-act="ngstart">이 팀으로 시작</button></div></div>`;
  };
  UI.ngCreate = function () {
    const s = S(), regs = Object.values(s.leagues).filter((l) => l.tier === 1).sort((a, b) => b.base - a.base), c = (UI.ng.create = UI.ng.create || { name: '', short: '', color: '#19c2a0', region: 'KR' });
    $('#app').innerHTML = `<div class="wizard"><h1>${UI.ng.year} 시즌 · 구단 창단</h1>
      <label>구단 이름<input id="cName" maxlength="24" value="${esc(c.name)}" placeholder="예: Seoul Phoenix"></label>
      <label>약칭 (2~4자)<input id="cShort" maxlength="4" value="${esc(c.short)}" placeholder="예: SPX"></label>
      <label>구단 색상<input id="cColor" type="color" value="${c.color}"></label>
      <label>연고 지역<select id="cRegion">${regs.map((l) => `<option value="${l.region}" ${c.region === l.region ? 'selected' : ''}>${W.regionName(l.region)} — ${esc(s.leagues[l.region + '2'].name)}에서 시작 (1부: ${esc(l.name)})</option>`).join('')}</select></label>
      <p class="dim">신생 구단은 무명 선수 7명과 소규모 자금으로 2부 리그에서 출발합니다. 서머 시즌 상위 2팀이 승강전에 나가 1부 승격에 도전합니다.</p>
      <div class="actions"><button class="btn" data-act="ng">뒤로</button><button class="btn primary" data-act="ngcreate">창단하기</button></div></div>`;
  };

  // ───────── 메인 화면 틀 ─────────
  const NAV = [['home', '홈'], ['inbox', '알림'], ['squad', '스쿼드'], ['tactics', '전술'], ['training', '훈련'], ['schedule', '일정'], ['league', '리그'], ['world', '국제 대회'], ['transfers', '이적 시장'], ['youth', '유스'], ['staff', '감독'], ['biz', '수익 활동'], ['club', '구단']];
  UI.main = function () {
    $('#app').innerHTML = `<div class="top"><div class="club" id="topClub"></div><div class="date" id="topDate"></div><div class="money" id="topMoney"></div>
      <button class="btn" data-act="save">저장</button><button class="btn primary" id="btnCont" data-act="continue">계속 진행</button></div>
      <div class="body"><nav id="nav"></nav><main id="main"></main></div>`;
    UI.go('home');
  };
  UI.go = function (scr) { UI.screen = scr; UI.render(); const m = $('#main'); if (m) m.scrollTop = 0; };
  UI.render = function () {
    const s = S(), t = s.teams[s.user], lg = s.leagues[t.league], um = W.userMatchToday();
    $('#topClub').innerHTML = `<i class="crest" style="background:${t.color}">${esc(t.short)}</i><div><b>${esc(t.name)}</b><span>${esc(lg.name)} · ${W.regionName(lg.region)}</span></div>`;
    $('#topDate').innerHTML = `<b>${W.dateStr(s.day, s.year)}</b><span>${phase(s.day)}${W.windowOpen() ? ' · 이적 시장 열림' : ''}</span>`;
    $('#topMoney').innerHTML = `<span>자금</span><b class="${t.money < 0 ? 'bad' : ''}">${money(t.money)}</b>`;
    $('#btnCont').textContent = um ? '경기 준비' : '계속 진행';
    const unread = s.news.filter((n) => !n.read).length;
    $('#nav').innerHTML = NAV.map(([k, label]) => `<button class="${UI.screen === k ? 'sel' : ''}" data-act="go" data-s="${k}">${label}${k === 'inbox' && unread ? `<em>${unread}</em>` : ''}${k === 'transfers' && (s.offers || []).length ? `<em>${s.offers.length}</em>` : ''}</button>`).join('');
    $('#main').innerHTML = SCREENS[UI.screen]();
  };

  const table = (head, rows, cls) => `<table class="tb ${cls || ''}"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`;
  const matchRow = (m) => {
    const s = S(), a = s.teams[m.a], b = s.teams[m.b], c = s.comps[m.comp];
    return `<tr><td class="dim">${W.shortDate(m.day, s.year)}</td><td class="dim">${esc(c ? c.name.replace(/^\d+ /, '') : '')}</td><td class="r">${tm(a)}</td><td class="c">${m.res ? `<b>${m.res.s[0]} : ${m.res.s[1]}</b>` : 'vs'}</td><td>${tm(b)}</td></tr>`;
  };
  const standings = (c, ms, teams, cut) => {
    const s = S(), tb = W.table(ms, teams);
    return table(['', '팀', '승', '패', '세트', '전력'], tb.map((x, i) => `<tr class="${x.t === s.user ? 'me' : ''} ${cut && i === cut - 1 ? 'cut' : ''}"><td>${i + 1}</td><td>${tm(s.teams[x.t])}</td><td>${x.w}</td><td>${x.l}</td><td>${x.gw}-${x.gl}</td><td>${starHtml(W.stars(s.teams[x.t]))}</td></tr>`));
  };
  const userComp = () => { const s = S(), t = s.teams[s.user]; return s.comps[`${t.league}:summer`] || s.comps[`${t.league}:spring`]; };

  const SCREENS = {
    home() {
      const s = S(), t = s.teams[s.user], nm = W.nextUserMatch(), c = userComp(), g = t.goalNow || W.goal(t);
      const recent = s.matches.filter((m) => m.res && (m.a === s.user || m.b === s.user)).slice(-5).reverse();
      let next = '<p class="dim">예정된 경기가 없습니다.</p>';
      if (nm) { const o = s.teams[nm.a === s.user ? nm.b : nm.a], cc = s.comps[nm.comp]; next = `<div class="nextm"><div><span class="dim">${W.shortDate(nm.day, s.year)} · ${esc(cc.name)}</span><h2>vs ${esc(o.name)}</h2>${starHtml(W.stars(o))} <span class="dim">상대 평균 능력 ${Math.round(W.teamOvr(o))} · 성향 ${L.STYLES[o.tactics.style].ko}</span></div>${nm.day === s.day ? '<button class="btn primary" data-act="continue">경기 준비</button>' : `<span class="dim">${nm.day - s.day}일 뒤</span>`}</div>`; }
      return `${todos()}<div class="grid2"><section class="card"><h3>다음 경기</h3>${next}</section>
        <section class="card"><h3>구단 현황</h3><div class="kv"><span>시즌 목표</span><b>${g.text}</b><span>이사회 신임도</span><b>${t.conf == null ? 60 : t.conf}</b><span>팀 전력</span><b>${starHtml(W.stars(t))} ${Math.round(W.teamOvr(t))}</b><span>팀 호흡</span><b>${Math.round(sim.synergy(t) * 100)}</b><span>주간 인건비</span><b>${money(Math.round(M.wages(t) / 48))}</b></div></section>
        <section class="card"><h3>${esc(c.name)} 순위</h3>${standings(c, W.compMatches(c.id, 'reg'), c.teams)}</section>
        <section class="card"><h3>최근 경기</h3>${recent.length ? table(['날짜', '대회', '', '', ''], recent.map(matchRow)) : '<p class="dim">아직 치른 경기가 없습니다.</p>'}
          <h3 style="margin-top:18px">최근 소식</h3>${s.news.slice(0, 5).map((n) => `<div class="newsline ${n.read ? '' : 'unread'}" data-act="go" data-s="inbox"><span class="dim">${W.shortDate(n.day, n.year)}</span> ${esc(n.title)}</div>`).join('')}</section></div>`;
    },
    inbox() {
      const s = S(); const html = s.news.slice(0, 80).map((n) => `<article class="news ${n.read ? '' : 'unread'}"><header><b>${esc(n.title)}</b><span class="dim">${W.dateStr(n.day, n.year)}</span></header><p>${esc(n.body)}</p></article>`).join('');
      s.news.forEach((n) => (n.read = 1)); setTimeout(() => { const e = document.querySelector('#nav em'); if (e && UI.screen === 'inbox') e.remove(); }, 0);
      return `<h2>소식</h2>${html || '<p class="dim">소식이 없습니다.</p>'}`;
    },
    squad() {
      const s = S(), t = s.teams[s.user], ros = W.roster(t.id).sort((a, b) => a.r - b.r || L.ovr(b) - L.ovr(a)); sim.lineup(t);
      const imp = t.lineup.filter((id) => W.isImport(s.players[id], t)).length;
      const slot = (i) => `<div class="slot"><span class="rolechip">${L.ROLE_KO[i]}</span><select data-chg="lineup" data-i="${i}">${ros.map((p) => `<option value="${esc(p.id)}" ${t.lineup[i] === p.id ? 'selected' : ''}>${esc(p.n)} (${L.ROLE_KO[p.r]}) — ${Math.round(L.ovr(p, i))}</option>`).join('')}</select></div>`;
      const row = (p) => {
        const st = t.lineup.indexOf(p.id), av = p.ss.g ? (p.ss.r / p.ss.g).toFixed(2) : '-';
        return `<tr class="${st >= 0 ? 'me' : ''}"><td><span class="rolechip">${L.ROLE_KO[p.r]}</span></td><td>${pl(p)} ${st >= 0 ? '<small class="tagc">주전</small>' : ''}${W.isImport(p, t) ? '<small class="tagc imp">용병</small>' : ''}${p.list ? '<small class="tagc">판매 등록</small>' : ''}</td><td title="${L.skillDesc(L.skillOf(p))}"><span class="sktag l${L.skillOf(p)[2]}">${esc(L.skillOf(p)[0])}</span></td><td>${s.year - p.by}</td><td>${ctry(p.c)}</td>
          <td class="${oc(L.ovr(p))}"><b>${Math.round(L.ovr(p))}</b></td><td>${potStars(p)}</td><td>${bar(((p.form - 0.9) / 0.2) * 100)}</td><td>${bar(p.mor * 100)}</td><td>${p.ss.g}</td><td>${p.ss.k}/${p.ss.d}/${p.ss.a}</td><td>${av}</td><td>${money(p.wage)}</td><td class="${p.cEnd <= s.year ? 'bad' : ''}">${p.cEnd}</td></tr>`;
      };
      return `<h2>스쿼드</h2><section class="card"><h3>선발 명단 <button class="btn sm" data-act="autolineup">자동 선발</button> <span class="${imp > 2 ? 'bad' : 'dim'}">용병 ${imp}/2명</span></h3><div class="slots">${[0, 1, 2, 3, 4].map(slot).join('')}</div>
        <p class="dim sm">자기 포지션이 아닌 자리에 세우면 능력이 약 14% 떨어집니다. 선발을 바꾸면 팀 호흡이 일시적으로 내려갑니다. 선발에 용병(외국 국적)은 2명까지 넣을 수 있습니다.</p></section>
        <section class="card">${table(['', '이름', '고유 스킬', '나이', '국적', '종합', '잠재력', '컨디션', '사기', '경기', 'K/D/A', '평점', '연봉', '계약'], ros.map(row))}</section>`;
    },
    tactics() {
      const s = S(), t = s.teams[s.user], tac = t.tactics, lu = sim.lineup(t);
      const opt = (k, v, label) => `<button class="opt ${tac[k] === v ? 'sel' : ''}" data-act="tac" data-k="${k}" data-v="${v}">${label}</button>`;
      return `<h2>전술</h2><p class="dim">여기서 정한 내용이 경기 전 밴픽 화면의 기본값이 됩니다. 경기마다 상대를 보고 바꿀 수 있습니다.</p>
        <section class="card"><h3>기본 조합 성향</h3><div class="styles">${L.STYLE_KEYS.map((k) => `<button class="stylecard ${tac.style === k ? 'sel' : ''}" data-act="tac" data-k="style" data-v="${k}"><b>${L.STYLES[k].ko}</b><span>${L.STYLES[k].desc}</span><em>숙련 선수 ${lu.filter((p) => p.st.includes(k)).length}명 · 초반 ${pct(L.STYLES[k].early)} 중반 ${pct(L.STYLES[k].mid)} 후반 ${pct(L.STYLES[k].late)}</em></button>`).join('')}</div></section>
        <section class="card rowopts"><div><h4>집중 라인</h4>${opt('focus', -1, '균형')}${opt('focus', 0, '탑')}${opt('focus', 1, '미드')}${opt('focus', 2, '바텀')}<p class="dim sm">정글러가 해당 라인을 더 자주 봐주고 그 라인의 성장이 조금 빨라집니다.</p></div>
        <div><h4>교전 성향</h4>${opt('aggro', 0, '신중하게')}${opt('aggro', 1, '보통')}${opt('aggro', 2, '공격적으로')}<p class="dim sm">공격적일수록 불리해 보이는 싸움도 겁니다. 실력이 앞서면 이득, 뒤지면 손해입니다.</p></div>
        <div><h4>오브젝트 우선순위</h4>${opt('obj', 'balanced', '균형')}${opt('obj', 'dragon', '드래곤')}${opt('obj', 'towers', '타워·전령')}</div></section>
        <section class="card"><h3>조합 상성표</h3>${table(['내 조합 ＼ 상대', ...L.STYLE_KEYS.map((k) => L.STYLES[k].ko)], L.STYLE_KEYS.map((a) => `<tr><td><b>${L.STYLES[a].ko}</b></td>${L.STYLE_KEYS.map((b) => { const v = L.COUNTER[a][b]; return `<td class="${v > 0 ? 'good' : v < 0 ? 'bad' : 'dim'}">${v > 0 ? '유리' : v < 0 ? '불리' : '·'}</td>`; }).join('')}</tr>`))}</section>`;
    },
    training() {
      const s = S(), t = s.teams[s.user], ros = W.roster(t.id).sort((a, b) => a.r - b.r);
      const row = (p) => { const age = s.year - p.by, o = L.ovr(p); return `<tr><td><span class="rolechip">${L.ROLE_KO[p.r]}</span></td><td>${pl(p)}</td><td>${age}</td><td class="${oc(o)}"><b>${Math.round(o)}</b></td><td>${potStars(p)}</td><td>${age <= 20 ? '<span class="good">빠른 성장기</span>' : age <= 23 ? '성장기' : age <= 26 ? '<span class="dim">전성기</span>' : '<span class="bad">하락기</span>'}</td>
        <td><select data-chg="train" data-id="${esc(p.id)}"><option value="-1">균형 훈련</option>${L.ATTRS.map((k, i) => `<option value="${i}" ${p.tr === i ? 'selected' : ''}>${L.ATTR_KO[i]} (${p.a[i]})</option>`).join('')}</select></td></tr>`; };
      return `<h2>훈련</h2><p class="dim">선수는 매달 성장 판정을 받습니다. 어릴수록, 잠재력과의 격차가 클수록, 주전으로 뛸수록, 시설과 코치진이 좋을수록 빨리 큽니다. 집중 훈련 항목은 그 능력이 오를 확률을 높입니다.</p>
        <section class="card">${table(['', '이름', '나이', '종합', '잠재력', '성장 단계', '집중 훈련'], ros.map(row))}</section>
        <section class="card"><div class="kv"><span>훈련 시설</span><b>${t.fac}단계</b><span>감독</span><b>${L.staff.of(t) ? esc(L.staff.of(t).n) + ' (육성 ' + L.staff.of(t).dev + ')' : '-'}</b><span>유스 아카데미</span><b>${t.youth}단계</b></div><p class="dim sm">시설과 코치진은 [구단] 화면에서 투자할 수 있습니다.</p></section>`;
    },
    schedule() {
      const s = S(), ms = s.matches.filter((m) => m.a === s.user || m.b === s.user).sort((a, b) => a.day - b.day);
      return `<h2>일정</h2><section class="card">${ms.length ? table(['날짜', '대회', '', '', ''], ms.map(matchRow)) : '<p class="dim">일정이 없습니다.</p>'}</section>`;
    },
    league() {
      const s = S(), lgs = Object.values(s.leagues).sort((a, b) => a.tier - b.tier || b.base - a.base);
      if (!UI.lgSel || !s.leagues[UI.lgSel]) UI.lgSel = s.teams[s.user].league;
      const lg = s.leagues[UI.lgSel], sp = UI.split && s.comps[`${lg.id}:${UI.split}`] ? UI.split : s.comps[`${lg.id}:summer`] ? 'summer' : 'spring', c = s.comps[`${lg.id}:${sp}`];
      const ms = W.compMatches(c.id), po = ms.filter((m) => m.stage !== 'reg'), promo = s.comps[`${lg.region}:promo`];
      const top = lg.teams.flatMap((id) => W.roster(id)).filter((p) => p.ss.g >= 4).sort((a, b) => b.ss.r / b.ss.g - a.ss.r / a.ss.g).slice(0, 12);
      return `<h2>리그</h2><div class="filters"><select data-chg="lgsel">${lgs.map((l) => `<option value="${l.id}" ${l.id === lg.id ? 'selected' : ''}>${l.tier}부 · ${W.regionName(l.region)} · ${esc(l.name)}</option>`).join('')}</select>
        <button class="opt sm ${sp === 'spring' ? 'sel' : ''}" data-act="split" data-v="spring">스프링</button><button class="opt sm ${sp === 'summer' ? 'sel' : ''}" data-act="split" data-v="summer" ${s.comps[`${lg.id}:summer`] ? '' : 'disabled'}>서머</button></div>
        <div class="grid2"><section class="card"><h3>${esc(c.name)} 정규 시즌</h3>${standings(c, ms.filter((m) => m.stage === 'reg'), c.teams, c.teams.length >= 8 ? 6 : 4)}<p class="dim sm">굵은 선 위쪽이 플레이오프 진출권입니다. ${lg.tier === 1 ? '서머 최하위 2팀은 승강전으로 내려갑니다.' : '서머 플레이오프 상위 2팀이 승강전에 나갑니다.'}</p></section>
        <div><section class="card"><h3>플레이오프</h3>${po.length ? table(['날짜', '대회', '', '', ''], po.map(matchRow)) : '<p class="dim">정규 시즌이 끝나면 대진이 정해집니다.</p>'}${c.champ ? `<p class="champ">우승: ${tm(s.teams[c.champ])}</p>` : ''}</section>
        ${promo && sp === 'summer' ? `<section class="card"><h3>${esc(promo.name)}</h3>${table(['날짜', '대회', '', '', ''], W.compMatches(promo.id).map(matchRow))}</section>` : ''}
        <section class="card"><h3>평점 순위</h3>${top.length ? table(['', '선수', '팀', '경기', 'K/D/A', '평점'], top.map((p, i) => `<tr><td>${i + 1}</td><td>${pl(p)} <span class="dim">${L.ROLE_KO[p.r]}</span></td><td>${esc(s.teams[p.t].short)}</td><td>${p.ss.g}</td><td>${p.ss.k}/${p.ss.d}/${p.ss.a}</td><td><b>${(p.ss.r / p.ss.g).toFixed(2)}</b></td></tr>`)) : '<p class="dim">아직 기록이 없습니다.</p>'}</section></div></div>`;
    },
    world() {
      const s = S(); let html = '<h2>국제 대회</h2>';
      for (const id of ['worlds', 'msi']) {
        const c = s.comps[id]; if (!c) continue; const ms = W.compMatches(id);
        html += `<section class="card"><h3>${esc(c.name)} ${c.champ ? `<span class="champ">우승: ${tm(s.teams[c.champ])}</span>` : ''}</h3>`;
        if (c.piGroups) html += `<h4>플레이-인</h4><div class="grid3">${c.piGroups.map((g, gi) => standings(c, ms.filter((m) => m.stage === 'playin' && m.grp === 'P' + (gi + 1)), g)).join('')}</div>`;
        if (c.groups) html += `<h4>그룹 스테이지</h4><div class="grid3">${c.groups.map((g, gi) => standings(c, ms.filter((m) => m.stage === 'groups' && m.grp === (c.kind === 'msi' ? 'A' : 'ABCD'[gi])), g, c.kind === 'msi' ? 4 : 2)).join('')}</div>`;
        const ko = ms.filter((m) => ['qf', 'sf', 'final'].includes(m.stage));
        if (ko.length) html += `<h4>토너먼트</h4>${table(['날짜', '대회', '', '', ''], ko.map(matchRow))}`;
        html += '</section>';
      }
      if (!s.comps.msi && !s.comps.worlds) html += `<p class="dim">MSI는 스프링 시즌 뒤(5월), 월드 챔피언십은 서머 시즌 뒤(9월)에 열립니다. 1부 리그 스프링 우승팀이 MSI에, 서머 상위 팀이 월드 챔피언십에 나갑니다.</p>`;
      const hist = s.hist.filter((h) => h.intl).reverse();
      html += `<section class="card"><h3>역대 우승</h3>${s.hist.length ? table(['연도', '대회', '우승'], [...hist, ...s.hist.filter((h) => !h.intl).reverse().slice(0, 60)].map((h) => `<tr class="${h.tid === s.user ? 'me' : ''}"><td>${h.year}</td><td>${esc(h.comp.replace(/^\d+ /, ''))}</td><td><b>${esc(h.champ)}</b></td></tr>`)) : '<p class="dim">아직 끝난 대회가 없습니다.</p>'}</section>`;
      return html;
    },
    transfers() {
      const s = S(), t = s.teams[s.user], f = UI.tf, q = f.q.toLowerCase(), open = W.windowOpen();
      const offers = (s.offers || []).map((o, i) => { const p = s.players[o.pid]; return p ? `<div class="reco"><div><b>${pl(p)}</b> <span class="dim">${L.ROLE_KO[p.r]} · 종합 ${Math.round(L.ovr(p))}</span><br><span>${esc(s.teams[o.from].name)}이(가) <b>${money(o.fee)}</b>을 제안했습니다. <span class="dim">(선수 가치 ${money(W.value(p))})</span></span></div><div><button class="btn sm primary" data-act="offerok" data-i="${i}">팔기</button> <button class="btn sm" data-act="offerno" data-i="${i}">거절</button></div></div>` : ''; }).join('');
      // 포지션별 추천
      const reco = M.recommend();
      const recoHtml = reco.map((r) => `<div class="recocol"><h4>${L.ROLE_KO[r.role]} <span class="dim">현재 주전 ${esc(r.cur.n)} ${Math.round(r.curOvr)}</span></h4>${r.list.length ? r.list.map((x) => buyCard(x.p, x.c, x.diff)).join('') : '<p class="dim sm">지금 자금으로 데려올 수 있는 더 좋은 선수가 없습니다.</p>'}</div>`).join('');
      // 직접 검색
      let list = Object.values(s.players).filter((p) => p.t !== s.user && !(p.t && s.teams[p.t].pseudo) && (f.role < 0 || p.r === f.role) && (!f.fa || !p.t) && s.year - p.by <= f.maxAge && L.ovr(p) >= f.minOvr && (!f.region || p.h === f.region) && (!q || p.n.toLowerCase().includes(q)));
      const key = f.sort === 'pot' ? (p) => p.pot : f.sort === 'age' ? (p) => -(s.year - p.by) : f.sort === 'value' ? (p) => W.value(p) : (p) => L.ovr(p);
      const total = list.length; list = list.sort((a, b) => key(b) - key(a)).slice(0, 60);
      const regs = [...new Set(Object.values(s.players).map((p) => p.h))].sort();
      const bench = W.roster(t.id).filter((p) => !t.lineup.includes(p.id));
      return `<h2>이적 시장</h2>
        <div class="banner ${open ? 'open' : ''}"><b>${open ? '이적 시장이 열려 있습니다' : '지금은 이적 시장이 닫혀 있습니다'}</b><span>${open ? '다른 팀 선수도 이적료를 내고 데려올 수 있습니다.' : '소속팀이 없는 자유계약 선수만 영입할 수 있습니다. 다른 팀 선수는 시즌이 끝난 뒤(11~1월)나 스프링·서머 사이(5월)에 영입할 수 있습니다.'}</span>
          <span>쓸 수 있는 자금 <b>${money(t.money)}</b> · 로스터 <b>${W.roster(t.id).length}/10명</b></span></div>
        ${offers ? `<section class="card"><h3>우리 선수를 사겠다는 제안</h3>${offers}</section>` : ''}
        <section class="card"><h3>추천 영입 <span class="dim sm">주전보다 능력이 높고, 지금 자금으로 데려올 수 있는 선수만 보여줍니다</span></h3><div class="recogrid">${recoHtml}</div></section>
        <details class="card" ${UI.tfOpen ? 'open' : ''} data-toggle="tf"><summary><b>직접 찾아보기</b> <span class="dim sm">이름·포지션·나이로 전체 선수 검색</span></summary>
          <div class="filters"><input data-chg="tfq" placeholder="선수 이름" value="${esc(f.q)}">
          <select data-chg="tfrole"><option value="-1">모든 포지션</option>${L.ROLE_KO.map((r, i) => `<option value="${i}" ${f.role === i ? 'selected' : ''}>${r}</option>`).join('')}</select>
          <select data-chg="tfregion"><option value="">모든 지역 출신</option>${regs.map((r) => `<option value="${r}" ${f.region === r ? 'selected' : ''}>${W.regionName(r)} 출신</option>`).join('')}</select>
          <select data-chg="tfage">${[40, 25, 22, 20, 18].map((a) => `<option value="${a}" ${f.maxAge === a ? 'selected' : ''}>${a === 40 ? '나이 상관없음' : a + '세 이하'}</option>`).join('')}</select>
          <select data-chg="tfovr">${[0, 60, 65, 70, 75, 80, 85].map((a) => `<option value="${a}" ${f.minOvr === a ? 'selected' : ''}>${a ? '종합 ' + a + ' 이상' : '능력 상관없음'}</option>`).join('')}</select>
          <select data-chg="tfsort">${[['ovr', '능력 높은 순'], ['pot', '잠재력 높은 순'], ['age', '어린 순'], ['value', '비싼 순']].map(([k, n]) => `<option value="${k}" ${f.sort === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
          <label class="chk"><input type="checkbox" data-chg="tffa" ${f.fa ? 'checked' : ''}> 자유계약 선수만</label></div>
          <p class="dim sm">${total.toLocaleString()}명 중 ${list.length}명 표시</p>
          ${table(['', '이름', '나이', '소속', '종합', '잠재력', '데려오는 비용', ''], list.map((p) => { const c = M.cost(p); return `<tr><td><span class="rolechip">${L.ROLE_KO[p.r]}</span></td><td>${pl(p)}${W.isImport(p, t) ? '<small class="tagc imp">용병</small>' : ''}</td><td>${s.year - p.by}</td><td>${tm(s.teams[p.t])}</td><td class="${oc(L.ovr(p))}"><b>${Math.round(L.ovr(p))}</b></td><td>${potStars(p)}</td><td>${costText(c)}</td><td>${c.ok ? `<button class="btn sm primary" data-act="buy" data-id="${esc(p.id)}">영입</button>` : `<span class="dim sm">${c.why}</span>`}</td></tr>`; }))}</details>
        <section class="card"><h3>선수 내보내기 <span class="dim sm">후보 선수를 팔거나 내보내 인건비를 줄입니다</span></h3>
          ${bench.length ? table(['', '이름', '나이', '종합', '연봉', '가치', ''], bench.map((p) => `<tr><td><span class="rolechip">${L.ROLE_KO[p.r]}</span></td><td>${pl(p)}</td><td>${s.year - p.by}</td><td class="${oc(L.ovr(p))}"><b>${Math.round(L.ovr(p))}</b></td><td>${money(p.wage)}</td><td>${money(W.value(p))}</td>
            <td><button class="btn sm" data-act="list" data-id="${esc(p.id)}">${p.list ? '판매 취소' : '팔려고 내놓기'}</button> <button class="btn sm danger" data-act="release" data-id="${esc(p.id)}">방출 (위약금 ${money(Math.round(p.wage * 0.3 * Math.max(1, p.cEnd - s.year + 1)))})</button></td></tr>`)) : '<p class="dim">후보 선수가 없습니다.</p>'}
          <p class="dim sm">"팔려고 내놓기"를 하면 이적 시장이 열려 있는 동안 다른 팀의 제안이 들어옵니다. 방출은 즉시 내보내는 대신 위약금을 냅니다.</p></section>`;
    },
    youth() {
      const s = S(), t = s.teams[s.user], Y = L.youth, sc = s.scout, acad = Y.academy(), pros = Y.prospects();
      const abs = s.year * 336 + s.day;
      const seen = (p) => { const v = p.potSeen || p.pot; return starHtml(v >= 92 ? 5 : v >= 86 ? 4.5 : v >= 81 ? 4 : v >= 76 ? 3.5 : v >= 71 ? 3 : v >= 66 ? 2.5 : v >= 60 ? 2 : 1.5); };
      const tiers = Y.TIERS.map((x) => `<div class="deal"><div><b>${x.name}</b><span class="dim">${x.desc}</span><span>비용 <b>${money(Y.cost(x))}</b> · ${x.days}일 · 후보 ${x.n}명</span></div><button class="btn sm primary" data-act="scout" data-k="${x.k}" ${sc ? 'disabled' : ''}>보내기</button></div>`).join('');
      const prow = (p, btns) => `<tr><td><span class="rolechip">${L.ROLE_KO[p.r]}</span></td><td>${pl(p)}</td><td>${s.year - p.by}</td><td>${ctry(p.c)}</td><td class="${oc(L.ovr(p))}"><b>${Math.round(L.ovr(p))}</b></td><td>${seen(p)}</td><td class="dim sm">${summary(p)}</td><td>${btns}</td></tr>`;
      return `<h2>유스</h2><p class="dim">스카우트를 보내 세상에 알려지지 않은 유망주를 찾고, 아카데미에서 키운 뒤 1군으로 올립니다. 아카데미 선수는 1군 로스터에 포함되지 않고 1군 후보보다 빨리 성장합니다. 예상 잠재력은 스카우트의 추정치라 실제와 다를 수 있으며, 유스 아카데미 등급(현재 ${t.youth}단계)이 높을수록 정확해지고 좋은 재능이 더 자주 나옵니다.</p>
        <div class="grid2"><section class="card"><h3>유스 발굴</h3>
          ${sc ? `<div class="banner open"><b>스카우트 활동 중</b><span>${W.regionName(sc.region)} · ${Y.TIERS.find((x) => x.k === sc.k).name} · ${Math.max(0, sc.until - abs)}일 뒤 보고</span></div>` : `<label class="chk">발굴 지역 <select id="scoutRegion">${Y.regions().map((l) => `<option value="${l.region}" ${l.region === t.region ? 'selected' : ''}>${W.regionName(l.region)}${l.region !== t.region ? ' (우리 팀에선 용병)' : ''}</option>`).join('')}</select></label>`}
          ${tiers}</section>
        <section class="card"><h3>발굴된 후보 <span class="dim sm">30일 안에 결정하지 않으면 다른 길을 찾아 떠납니다</span></h3>
          ${pros.length ? table(['', '이름', '나이', '국적', '현재', '예상 잠재력', '평가', ''], pros.map((p) => prow(p, `<button class="btn sm primary" data-act="ysign" data-id="${esc(p.id)}">입단 (${money(Y.signFee())})</button> <button class="btn sm" data-act="ydrop" data-id="${esc(p.id)}">거절</button>`))) : '<p class="dim">지금은 후보가 없습니다. 스카우트를 보내 보세요.</p>'}</section></div>
        <section class="card"><h3>아카데미 <span class="dim sm">${acad.length}/${Y.cap()}명 · 1인당 연 ${money(Y.wage())}</span></h3>
          ${acad.length ? table(['', '이름', '나이', '국적', '현재', '예상 잠재력', '평가', ''], acad.map((p) => prow(p, `<button class="btn sm primary" data-act="ypromote" data-id="${esc(p.id)}">1군 승격</button> <button class="btn sm danger" data-act="ydrop" data-id="${esc(p.id)}">내보내기</button>`))) : '<p class="dim">아카데미에 선수가 없습니다.</p>'}
          <p class="dim sm">20세가 되면 승격이나 방출을 결정해야 하고, 21세가 되면 자동으로 팀을 떠납니다. 정원과 성장 속도는 [구단] 화면의 유스 아카데미 확장으로 늘릴 수 있습니다.</p></section>`;
    },
    staff() {
      const s = S(), t = s.teams[s.user], St = L.staff, c = St.of(t);
      const bars = (x) => St.ATTR.map(([k, n, d]) => `<div class="attr" title="${d}"><span>${n}</span><b class="${ac(x[k])}">${x[k]}</b><i><u style="width:${x[k] * 5}%"></u></i></div>`).join('');
      const cur = c ? `<section class="card"><h3>현재 감독</h3><div class="coachhead"><div><h2>${esc(c.n)}</h2><span class="dim">${esc(c.rn || '')} ${c.exPlayer ? '· 선수 출신' : ''}${c.gen ? '· 가상 인물' : ''} · ${s.year - c.by}세 · 연봉 ${money(c.wage)}</span></div><div class="big ${ac(St.rating(c))}">${St.rating(c).toFixed(1)}<small>지도력</small></div></div>
          <div class="attrs">${bars(c)}</div>
          <div class="kv"><span>특성</span><b>${St.TRAITS[c.trait].ko} <span class="dim">— ${St.TRAITS[c.trait].desc}</span></b><span>선호 조합</span><b>${L.STYLES[c.style].ko} <span class="dim">— 이 조합으로 경기하면 선수 컨디션에 보너스</span></b></div></section>` : '';
      const list = Object.values(s.coaches).filter((x) => !x.t).sort((a, b) => St.rating(b) - St.rating(a)).slice(0, 40);
      return `<h2>감독</h2><p class="dim">감독은 경기 중 팀의 판단(전술), 조합 상성 활용(밴픽), 선수 성장(육성), 컨디션과 사기(동기부여)에 영향을 줍니다. 감독마다 특성이 하나씩 있어 선수 능력치나 성장 방식이 달라집니다.</p>${cur}
        <section class="card"><h3>선임 가능한 감독 <span class="dim sm">새 감독을 선임하면 현재 감독은 위약금(연봉의 절반)을 받고 떠납니다</span></h3>
        ${table(['이름', '나이', '지도력', '전술', '밴픽', '육성', '동기부여', '특성', '선호 조합', '연봉', ''], list.map((x) => { const will = St.willing(x, t), cost = St.hireCost(x, t); return `<tr><td><b>${esc(x.n)}</b>${x.exPlayer ? '<small class="tagc">선수 출신</small>' : ''}</td><td>${s.year - x.by}</td><td class="${ac(St.rating(x))}"><b>${St.rating(x).toFixed(1)}</b></td><td class="${ac(x.tac)}">${x.tac}</td><td class="${ac(x.draft)}">${x.draft}</td><td class="${ac(x.dev)}">${x.dev}</td><td class="${ac(x.mot)}">${x.mot}</td><td title="${St.TRAITS[x.trait].desc}">${St.TRAITS[x.trait].ko}</td><td>${L.STYLES[x.style].ko}</td><td>${money(x.wage)}</td>
          <td>${!will ? '<span class="dim sm">팀 명성 부족</span>' : t.money < cost ? `<span class="dim sm">자금 부족 (${money(cost)})</span>` : `<button class="btn sm primary" data-act="hirecoach" data-id="${esc(x.id)}">선임 (${money(cost)})</button>`}</td></tr>`; }))}</section>`;
    },
    biz() {
      const s = S(), t = s.teams[s.user], St = L.staff, wk = St.weekly(t), tot = wk.reduce((a, x) => a + x[1], 0), coach = St.of(t);
      const out = [['선수 주급', Math.round(M.wages(t) / 48)], ['감독 주급', coach ? Math.round(coach.wage / 48) : 0]];
      const deals = t.dealOffers.map((d, i) => `<div class="deal ${t.deal === d || (t.deal && t.deal.type === d.type) ? 'sel' : ''}"><div><b>${d.name}</b><span class="dim">${d.desc}</span><span>연 <b>${money(d.base)}</b>${d.win ? ` + 시리즈 승리당 <b>${money(d.win)}</b>` : ''}${d.penalty ? ` · 미달 시 위약금 <b class="bad">${money(d.penalty)}</b>` : ''}</span></div>
        ${t.dealPicked ? (t.deal.type === d.type ? '<span class="good">체결됨</span>' : '') : `<button class="btn sm primary" data-act="deal" data-i="${i}">이 계약 체결</button>`}</div>`).join('');
      return `<h2>수익 활동</h2><div class="grid2"><div><section class="card"><h3>스폰서 계약 <span class="dim sm">시즌마다 한 번 고릅니다${t.dealPicked ? '' : ' · 고르지 않으면 안정형이 적용됩니다'}</span></h3>${deals}</section>
        <section class="card"><h3>팬 활동</h3><div class="kv"><span>팬 수</span><b>${t.fans.toLocaleString()}명 <span class="dim">(명성 대비 ${Math.round(St.fanRatio(t) * 100)}%)</span></b></div>
          <p class="dim sm">팬은 경기를 이기면 늘고 지면 줄어듭니다. 우승하면 크게 늘어납니다. 팬이 많을수록 굿즈·입장·콘텐츠 수익이 커집니다.</p>
          <div class="upg"><div><b>콘텐츠·스트리밍 촬영</b><span class="dim">매주 수익이 들어오지만 선발 선수들의 컨디션이 조금씩 떨어집니다.</span></div><label class="chk"><input type="checkbox" data-chg="content" ${t.content ? 'checked' : ''}> 진행</label></div>
          <div class="upg"><div><b>팬미팅·사인회</b><span class="dim">4주에 한 번. 즉시 ${money(St.eventGain(t))} 수익과 팬 3% 증가, 선발 선수 컨디션 소폭 하락.</span></div>${St.eventReady(t) ? '<button class="btn sm primary" data-act="fanevent">개최</button>' : '<span class="dim sm">준비 중</span>'}</div></section></div>
        <div><section class="card"><h3>주간 수입·지출</h3>${table(['항목', '주간'], [...wk.map(([n, v]) => `<tr><td>${n}</td><td class="good">+${money(v)}</td></tr>`), ...out.map(([n, v]) => `<tr><td>${n}</td><td class="bad">-${money(v)}</td></tr>`), `<tr><td><b>주간 손익</b></td><td><b class="${tot - out[0][1] - out[1][1] < 0 ? 'bad' : 'good'}">${money(tot - out[0][1] - out[1][1])}</b></td></tr>`])}
          <p class="dim sm">이 밖에 경기마다 입장 수익(이번 경기 약 ${money(St.ticket(t))}, 플레이오프·국제전은 2배), 대회 상금, 목표 달성 보너스, 선수 이적료가 들어옵니다.</p></section>
        <section class="card"><h3>수익을 늘리는 방법</h3><ul class="tips"><li>많이 이길 자신이 있으면 <b>성과형</b>, 목표를 확실히 넘길 수 있으면 <b>도전형</b> 계약이 유리합니다.</li><li>우승과 국제전 성적은 상금과 팬 수를 함께 올립니다.</li><li>키운 유망주를 이적 시장에서 팔면 큰 수입이 됩니다.</li><li>후보 선수를 정리하면 인건비가 줄어듭니다.</li></ul></section></div></div>`;
    },
    club() {
      const s = S(), t = s.teams[s.user], g = t.goalNow || W.goal(t);
      const up = (kind, name, desc) => `<div class="upg"><div><b>${name} ${t[kind]}단계</b><span class="dim">${desc}</span></div>${t[kind] >= 5 ? '<span class="dim">최고 등급</span>' : `<button class="btn sm" data-act="upgrade" data-k="${kind}">확장 (${money(M.facCost(t[kind]))})</button>`}</div>`;
      return `<h2>구단</h2><div class="grid2"><section class="card"><h3>재정</h3><div class="kv"><span>보유 자금</span><b class="${t.money < 0 ? 'bad' : ''}">${money(t.money)}</b><span>주간 고정 수입</span><b>${money(L.staff.weekly(t).reduce((a, x) => a + x[1], 0))}</b><span>연간 인건비</span><b>${money(M.wages(t))}</b><span>올해 수입</span><b>${money(t.fin.inc)}</b><span>올해 지출</span><b>${money(t.fin.exp)}</b></div>
          <h4>최근 거래</h4>${table(['날짜', '내용', '금액'], t.fin.log.slice(0, 14).map((x) => `<tr><td class="dim">${W.shortDate(x.day, x.year)}</td><td>${esc(x.why)}</td><td class="${x.amt < 0 ? 'bad' : 'good'}">${x.amt < 0 ? '-' : '+'}${money(Math.abs(x.amt))}</td></tr>`))}</section>
        <div><section class="card"><h3>투자</h3>${up('fac', '훈련 시설', '선수 성장 속도가 빨라집니다.')}${up('youth', '유스 아카데미', '매년 올라오는 유망주의 수준이 높아집니다.')}
          <div class="upg"><div><b>감독 ${L.staff.of(t) ? esc(L.staff.of(t).n) : '-'}</b><span class="dim">감독 교체는 [감독] 화면, 스폰서·팬 활동은 [수익 활동] 화면에서 합니다.</span></div><button class="btn sm" data-act="go" data-s="staff">감독 화면</button></div></section>
        <section class="card"><h3>코치진에게 맡기기</h3><label class="chk"><input type="checkbox" data-chg="auto" data-k="renew" ${s.auto && s.auto.renew ? 'checked' : ''}> 주전·유망주 계약이 끝나면 자동으로 재계약</label><label class="chk"><input type="checkbox" data-chg="auto" data-k="lineup" ${s.auto && s.auto.lineup ? 'checked' : ''}> 경기 전에 선발 명단을 자동으로 구성</label><p class="dim sm">켜 두면 신경 쓰지 않아도 팀이 굴러갑니다. 직접 관리하고 싶으면 끄세요.</p></section>
        <section class="card"><h3>이사회</h3><div class="kv"><span>시즌 목표</span><b>${g.text}</b><span>신임도</span><b>${t.conf == null ? 60 : t.conf} / 100</b><span>구단 명성</span><b>${Math.round(t.rep)}</b></div></section>
        <section class="card"><h3>구단 연혁</h3>${t.hist.length ? table(['연도', '대회', '최종 순위'], t.hist.slice().reverse().map((h) => `<tr><td>${h.year}</td><td>${esc(h.comp.replace(/^\d+ /, ''))}</td><td>${h.rank === 1 ? '<b class="good">우승</b>' : h.rank + '위'}</td></tr>`)) : '<p class="dim">아직 기록이 없습니다.</p>'}</section></div></div>`;
    },
  };
  // ───────── 쉬운 영입 카드·도우미 ─────────
  const costText = (c) => (c.wage == null ? `<span class="dim">${c.why}</span>` : `${c.fa ? '계약금' : '이적료'} <b>${money(c.fee)}</b> <span class="dim">+ 연봉 ${money(c.wage)}</span>`);
  const buyCard = (p, c, diff) => {
    const s = S(), t = s.teams[s.user];
    return `<div class="reco"><div><b>${pl(p)}</b> <span class="${oc(L.ovr(p))}"><b>${Math.round(L.ovr(p))}</b></span> <span class="good sm">주전보다 +${Math.round(diff)}</span>${W.isImport(p, t) ? '<small class="tagc imp">용병</small>' : ''}<br>
      <span class="dim sm">${s.year - p.by}세 · ${p.t ? esc(s.teams[p.t].name) : '자유계약'} · 잠재력 ${potStars(p)}</span><br><span class="sm">${costText(c)}</span></div>
      <button class="btn sm primary" data-act="buy" data-id="${esc(p.id)}">영입</button></div>`;
  };
  const summary = (p) => { // 한 줄 평
    const idx = p.a.map((v, i) => [v, i]).filter(([, i]) => !(p.r !== 4 && p.r !== 1 && i === 4)).sort((a, b) => b[0] - a[0]);
    return `강점: ${idx.slice(0, 2).map(([, i]) => L.ATTR_KO[i]).join(', ')} · 약점: ${idx.slice(-1).map(([, i]) => L.ATTR_KO[i]).join(', ')}`;
  };
  // 홈 화면 "지금 할 일"
  const todos = () => {
    const s = S(), t = s.teams[s.user], out = [], ros = W.roster(t.id); sim.lineup(t);
    const imp = t.lineup.filter((id) => W.isImport(s.players[id], t)).length;
    if (imp > 2) out.push(['bad', `선발에 용병이 ${imp}명입니다. 2명까지만 뛸 수 있습니다.`, 'autolineup', '자동으로 고치기']);
    const cur = t.lineup.join('|'), best = W.autoLineup({ id: t.id, region: t.region, lineup: [] }).join('|');
    if (imp <= 2 && cur !== best) out.push(['', '코치가 지금보다 더 좋은 선발 명단을 추천합니다.', 'autolineup', '추천 명단 적용']);
    const exp = ros.filter((p) => p.cEnd <= s.year);
    if (exp.length && s.day > 120) out.push(['warn', `올해 계약이 끝나는 선수 ${exp.length}명: ${exp.map((p) => p.n).join(', ')}${s.auto && s.auto.renew ? ' — 주전은 자동으로 재계약됩니다.' : ''}`, 'renewall', '모두 재계약 (2년)']);
    if ((s.offers || []).length) out.push(['', `우리 선수를 사겠다는 제안이 ${s.offers.length}건 있습니다.`, 'gotf', '제안 보기']);
    const reco = M.recommend().filter((r) => r.list.length).sort((a, b) => b.list[0].diff - a.list[0].diff)[0];
    if (reco) { const x = reco.list[0]; out.push(['', `${L.ROLE_KO[reco.role]} 보강 추천: ${x.p.n} (종합 ${Math.round(L.ovr(x.p))}, 주전보다 +${Math.round(x.diff)}) — ${x.c.fa ? '계약금' : '이적료'} ${money(x.c.fee)}`, 'gotf', '이적 시장 보기']); }
    if (L.youth.prospects().length) out.push(['', `스카우트가 유망주 ${L.youth.prospects().length}명을 찾아왔습니다.`, 'goyouth', '후보 보기']);
    if (!t.dealPicked && s.day < 200) out.push(['warn', '이번 시즌 스폰서 계약을 아직 고르지 않았습니다.', 'gobiz', '계약 고르기']);
    if (t.money < 0) out.push(['bad', '자금이 적자입니다. 후보 선수를 내보내 인건비를 줄이세요.', 'gotf', '선수 내보내기']);
    if (ros.length < 6) out.push(['warn', `로스터가 ${ros.length}명뿐입니다. 부상·부진에 대비해 후보를 영입하세요.`, 'gotf', '이적 시장 보기']);
    return out.length ? `<section class="card todo"><h3>지금 할 일</h3>${out.map(([cls, text, act, label]) => `<div class="todoitem ${cls}"><span>${esc(text)}</span><button class="btn sm" data-act="${act}">${label}</button></div>`).join('')}</section>` : '';
  };

  const bar = (v) => `<span class="mbar"><i style="width:${Math.max(4, Math.min(100, v))}%;background:${v > 66 ? '#4fd67a' : v > 33 ? '#e6c44a' : '#f0564a'}"></i></span>`;
  const pct = (v) => (v >= 1 ? '+' : '') + Math.round((v - 1) * 100) + '%';

  // ───────── 모달 ─────────
  UI.playerModal = function (id) {
    const s = S(), p = s.players[id]; if (!p) return; const t = p.t ? s.teams[p.t] : null, ut = s.teams[s.user], mine = p.t === s.user, o = L.ovr(p);
    const attr = L.ATTRS.map((k, i) => `<div class="attr" title="${L.ATTR_DESC[i]}"><span>${L.ATTR_KO[i]}</span><b class="${ac(p.a[i])}">${p.a[i]}</b><i><u style="width:${p.a[i] * 5}%"></u></i></div>`).join('');
    let act = '';
    if (mine) act = `<button class="btn sm" data-act="renew" data-id="${esc(id)}" data-y="1">1년 재계약</button><button class="btn sm" data-act="renew" data-id="${esc(id)}" data-y="2">2년 재계약</button><button class="btn sm" data-act="renew" data-id="${esc(id)}" data-y="3">3년 재계약</button>
      <button class="btn sm" data-act="list" data-id="${esc(id)}">${p.list ? '판매 등록 취소' : '판매 등록'}</button><button class="btn sm danger" data-act="release" data-id="${esc(id)}">방출</button>`;
    else if (p.t === 'acad') act = `<button class="btn sm primary" data-act="ypromote" data-id="${esc(id)}">1군 승격</button>`;
    else if (p.t === 'scout') act = `<button class="btn sm primary" data-act="ysign" data-id="${esc(id)}">아카데미 입단</button>`;
    else if (!p.t) { const dm = M.demand(p, ut); act = dm == null ? '<span class="bad">이 선수는 우리 팀의 제안에 관심이 없습니다 (팀 명성 부족).</span>' : `<span class="dim">요구 연봉 ${money(dm)} · 계약금 ${money(Math.round(dm * 0.15))}</span> <button class="btn sm primary" data-act="sign" data-id="${esc(id)}" data-y="1">1년 계약</button><button class="btn sm primary" data-act="sign" data-id="${esc(id)}" data-y="2">2년 계약</button><button class="btn sm primary" data-act="sign" data-id="${esc(id)}" data-y="3">3년 계약</button>`; }
    else { const c = M.cost(p); act = `<span>${costText(c)}</span> ${c.ok ? `<button class="btn sm primary" data-act="buy" data-id="${esc(id)}">영입하기 (2년 계약)</button>` : `<span class="bad">${c.why}</span>`}`; }
    const car = p.car.slice().reverse().map((c) => `<tr><td>${c.y}</td><td>${esc(c.t)}</td><td>${c.g}</td><td>${c.w}</td><td>${c.k}/${c.d}/${c.a}</td><td>${c.r}</td><td>${c.o}</td></tr>`);
    $('#modal').innerHTML = `<div class="mbox"><button class="x" data-act="close">✕</button>
      <header><div><h2>${esc(p.n)} <span class="rolechip">${L.ROLE_KO[p.r]}</span></h2><span class="dim">${esc(p.nn || '')} ${esc(p.rn || '')}${p.gen ? ' (가상 선수)' : ''}</span></div>
        <div class="big ${oc(o)}">${Math.round(o)}<small>종합</small></div></header>
      <div class="kv k4"><span>나이</span><b>${s.year - p.by}세</b><span>국적</span><b>${ctry(p.c)}</b><span>소속</span><b>${tm(t)}</b><span>잠재력</span><b>${potStars(p)}</b>
        <span>연봉</span><b>${p.t ? money(p.wage) : '-'}</b><span>계약 만료</span><b>${p.t ? p.cEnd + '년' : '-'}</b><span>평가액</span><b>${money(W.value(p))}</b><span>선호 조합</span><b>${p.st.map((k) => L.STYLES[k].ko).join(', ')}</b>
        <span>컨디션</span><b>${bar(((p.form - 0.9) / 0.2) * 100)}</b><span>사기</span><b>${bar(p.mor * 100)}</b><span>올 시즌</span><b>${p.ss.g}경기 ${p.ss.k}/${p.ss.d}/${p.ss.a}</b><span>평점</span><b>${p.ss.g ? (p.ss.r / p.ss.g).toFixed(2) : '-'}</b></div>
      <p class="skillline"><b>고유 스킬 · ${esc(L.skillOf(p)[0])}</b> <span class="sklv">${'◆'.repeat(L.skillOf(p)[2])}</span> <span class="dim">${L.skillDesc(L.skillOf(p))}</span></p><p class="oneline">${summary(p)} <span class="dim sm">· 능력치는 1~20, 항목에 마우스를 올리면 설명이 나옵니다</span></p><div class="attrs">${attr}</div><div class="acts">${act}</div>
      ${car.length ? `<h4>경력</h4>${table(['연도', '팀', '경기', '승', 'K/D/A', '평점', '종합'], car)}` : ''}</div>`;
    $('#modal').classList.add('on');
  };
  UI.teamModal = function (id) {
    const s = S(), t = s.teams[id]; if (!t) return; const ros = W.roster(id).sort((a, b) => a.r - b.r || L.ovr(b) - L.ovr(a)), lg = s.leagues[t.league]; sim.lineup(t);
    $('#modal').innerHTML = `<div class="mbox"><button class="x" data-act="close">✕</button><header><div><h2><i class="dot" style="background:${t.color}"></i>${esc(t.name)}</h2><span class="dim">${esc(lg.name)} · ${W.regionName(t.region)}${t.gen ? ' · 가상 구단' : ''}</span></div><div>${starHtml(W.stars(t))}</div></header>
      <div class="kv k4"><span>평균 능력</span><b>${Math.round(W.teamOvr(t))}</b><span>명성</span><b>${Math.round(t.rep)}</b><span>조합 성향</span><b>${L.STYLES[t.tactics.style].ko}</b><span>감독</span><b>${L.staff.of(t) ? esc(L.staff.of(t).n) : '-'}</b></div>
      ${table(['', '이름', '나이', '국적', '종합', '잠재력', '경기', 'K/D/A', '평점'], ros.map((p) => `<tr class="${t.lineup.includes(p.id) ? 'me' : ''}"><td><span class="rolechip">${L.ROLE_KO[p.r]}</span></td><td>${pl(p)}</td><td>${s.year - p.by}</td><td>${ctry(p.c)}</td><td class="${oc(L.ovr(p))}"><b>${Math.round(L.ovr(p))}</b></td><td>${potStars(p)}</td><td>${p.ss.g}</td><td>${p.ss.k}/${p.ss.d}/${p.ss.a}</td><td>${p.ss.g ? (p.ss.r / p.ss.g).toFixed(2) : '-'}</td></tr>`))}
      ${t.hist.length ? `<h4>최근 성적</h4>${table(['연도', '대회', '순위'], t.hist.slice(-6).reverse().map((h) => `<tr><td>${h.year}</td><td>${esc(h.comp.replace(/^\d+ /, ''))}</td><td>${h.rank}위</td></tr>`))}` : ''}</div>`;
    $('#modal').classList.add('on');
  };
  const closeModal = () => { $('#modal').classList.remove('on'); $('#modal').innerHTML = ''; };

  // ───────── 진행 ─────────
  let busy = false;
  const sleep = () => new Promise((r) => setTimeout(r, 0));
  UI.openMatch = function (m) {
    const s = S(), t = s.teams[s.user]; sim.lineup(t);
    if (s.auto && s.auto.lineup) W.autoLineup(t);
    if (t.lineup.filter((id) => W.isImport(s.players[id], t)).length > 2) { toast('선발 명단에 용병이 2명을 넘습니다. 스쿼드에서 조정하세요.', 1); UI.go('squad'); return; }
    V.open(m, async () => { busy = true; W.advance(); busy = false; try { W.save(0); } catch (e) { /* 저장 실패는 무시 */ } UI.go('home'); });
  };
  UI.cont = async function () {
    if (busy || V.active()) return;
    const um = W.userMatchToday(); if (um) return UI.openMatch(um);
    busy = true; const s = S(), ov = $('#overlay'); ov.classList.add('on');
    const last = s.news[0] ? s.news[0].id : 0;
    for (let i = 0; i < 21; i++) {
      ov.textContent = `${W.dateStr(s.day, s.year)} 진행 중…`; await sleep();
      const r = W.advance(); if (r.match) break;
      if (W.userMatchToday()) break;
      if (s.news[0] && s.news[0].id !== last) break;
    }
    ov.classList.remove('on'); busy = false;
    if (s.day % 7 === 0) { try { W.save(0); } catch (e) { /* 무시 */ } }
    UI.go(s.news[0] && s.news[0].id !== last && !W.userMatchToday() ? 'inbox' : 'home');
  };

  // ───────── 이벤트 ─────────
  const ACT = {
    boot: () => UI.boot(), ng: () => UI.newGame(),
    ngyear: (d) => { UI.ng.year = Number(d.y); UI.ng.teamId = null; UI.ng.lid = null; UI.newGame(); },
    ngmode: (d) => { UI.ng.mode = d.m; UI.newGame(); },
    ngnext: () => UI.ngStep2(),
    nglg: (d) => { UI.ng.lid = d.id; UI.ng.teamId = null; UI.ngStep2(); },
    ngteam: (d) => { UI.ng.teamId = d.id; UI.ngStep2(); },
    ngstart: () => { const ng = UI.ng; W.newGame({ year: ng.year, mode: 'team', teamId: ng.teamId, seed: ng.seed }); UI.main(); },
    ngcreate: () => {
      const c = UI.ng.create; c.name = $('#cName').value.trim(); c.short = $('#cShort').value.trim().toUpperCase(); c.color = $('#cColor').value; c.region = $('#cRegion').value;
      if (c.name.length < 2 || c.short.length < 2) return toast('구단 이름과 약칭을 2자 이상 입력하세요.', 1);
      W.newGame({ year: UI.ng.year, mode: 'create', create: c, seed: UI.ng.seed }); UI.main();
    },
    loadgame: async () => { if (!W.load(0)) return toast('저장된 게임이 없습니다.', 1); try { await loadYear(S().startYear); } catch (e) { /* 진행에는 지장 없음 */ } UI.main(); },
    go: (d) => UI.go(d.s), continue: () => UI.cont(),
    save: () => toast(W.save(0) ? '저장했습니다.' : '저장에 실패했습니다 (브라우저 저장 공간 부족).', !W.save(0)),
    player: (d) => UI.playerModal(d.id), team: (d) => UI.teamModal(d.id), close: closeModal,
    autolineup: () => { W.autoLineup(S().teams[S().user]); UI.render(); },
    tac: (d) => { const t = S().teams[S().user]; t.tactics[d.k] = d.k === 'style' || d.k === 'obj' ? d.v : Number(d.v); UI.render(); },
    split: (d) => { UI.split = d.v; UI.render(); },
    sign: (d) => done(M.signFA(d.id, Number(d.y)), d.id), renew: (d) => done(M.renew(d.id, Number(d.y)), d.id),
    release: (d) => { const r = M.release(d.id); toast(r.msg, !r.ok); closeModal(); UI.render(); },
    list: (d) => { const p = S().players[d.id]; p.list = p.list ? 0 : 1; UI.playerModal(d.id); UI.render(); },
    bid: (d) => done(M.bid(d.id, Number($('#bidFee').value) || 0), d.id),
    buy: (d) => done(M.buy(d.id), d.id), gotf: () => UI.go('transfers'),
    renewall: () => { const r = M.renewAll(); toast(r.msg, !r.ok); UI.render(); },
    offerok: (d) => { const r = M.acceptOffer(Number(d.i)); toast(r.msg, !r.ok); UI.render(); },
    offerno: (d) => { S().offers.splice(Number(d.i), 1); UI.render(); },
    upgrade: (d) => { const r = M.upgrade(d.k); toast(r.msg, !r.ok); UI.render(); },
    scout: (d) => { const el = document.getElementById('scoutRegion'); const r = L.youth.start(el ? el.value : S().teams[S().user].region, d.k); toast(r.msg, !r.ok); UI.render(); },
    ysign: (d) => { const r = L.youth.sign(d.id); toast(r.msg, !r.ok); UI.render(); },
    ypromote: (d) => { const r = L.youth.promote(d.id); toast(r.msg, !r.ok); UI.render(); },
    ydrop: (d) => { L.youth.drop(d.id); UI.render(); }, goyouth: () => UI.go('youth'),
    hirecoach: (d) => { const r = L.staff.hire(d.id); toast(r.msg, !r.ok); UI.render(); },
    deal: (d) => { const r = L.staff.pickDeal(Number(d.i)); toast(r.msg, !r.ok); UI.render(); },
    fanevent: () => { const r = L.staff.fanEvent(); toast(r.msg, !r.ok); UI.render(); }, gobiz: () => UI.go('biz'),
  };
  function done(r, id) { toast(r.msg, !r.ok); if (r.ok) { W.autoLineup; closeModal(); } else UI.playerModal(id); UI.render(); }
  document.addEventListener('click', (e) => {
    if (e.target.id === 'modal') return closeModal();
    const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
    const f = ACT[el.dataset.act]; if (f) f(el.dataset);
  });
  document.addEventListener('change', (e) => {
    const el = e.target, k = el.dataset && el.dataset.chg; if (!k) return; const s = S(), f = UI.tf;
    if (k === 'lineup') { const t = s.teams[s.user], i = Number(el.dataset.i), j = t.lineup.indexOf(el.value); if (j >= 0 && j !== i) t.lineup[j] = t.lineup[i]; t.lineup[i] = el.value; }
    else if (k === 'content') s.teams[s.user].content = el.checked ? 1 : 0;
    else if (k === 'auto') { s.auto = s.auto || {}; s.auto[el.dataset.k] = el.checked ? 1 : 0; }
    else if (k === 'train') s.players[el.dataset.id].tr = Number(el.value);
    else if (k === 'lgsel') { UI.lgSel = el.value; UI.split = null; }
    else if (k === 'tfq') f.q = el.value; else if (k === 'tfrole') f.role = Number(el.value); else if (k === 'tfregion') f.region = el.value;
    else if (k === 'tfage') f.maxAge = Number(el.value); else if (k === 'tfovr') f.minOvr = Number(el.value); else if (k === 'tfsort') f.sort = el.value; else if (k === 'tffa') f.fa = el.checked ? 1 : 0;
    UI.render();
  });
  document.addEventListener('toggle', (e) => { if (e.target.dataset && e.target.dataset.toggle === 'tf') UI.tfOpen = e.target.open; }, true);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  G.addEventListener('DOMContentLoaded', UI.boot);
})(window);
