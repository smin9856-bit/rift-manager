// 결과 화면: 플레이오프 개막, 리그 우승, 국제 대회 개막·폐막, 승강전, 시즌 결산.
// 하루가 끝날 때마다 대회 상태를 이전과 비교해서 바뀐 순간을 잡아낸다 (리그·대회 코드는 건드리지 않는다).
(function (G) {
  const L = G.LFM, W = L.world;
  const Ce = (L.ceremony = {});
  const S = () => W.get();
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = (v) => L.fmtMoney(v);
  const stripYear = (n) => String(n || '').replace(/^\d+ /, '');

  function snapshot() {
    const s = S(), out = {};
    for (const id in s.comps) { const c = s.comps[id]; out[id] = c.stage + '|' + (c.done ? 1 : 0); }
    return out;
  }
  function push(ev) { const s = S(); s.ceremony = s.ceremony || []; s.ceremony.push(ev); if (s.ceremony.length > 6) s.ceremony.splice(0, s.ceremony.length - 6); }
  const mine = (c) => !!c && (c.lid === S().teams[S().user].league || (c.teams || []).includes(S().user));
  const win = (m) => (m.res.s[0] > m.res.s[1] ? m.a : m.b), lose = (m) => (m.res.s[0] > m.res.s[1] ? m.b : m.a);
  function bestPlayer(tid) {
    return W.roster(tid).filter((p) => p.ss.g >= 3).sort((a, b) => b.ss.r / b.ss.g - a.ss.r / a.ss.g)[0] || null;
  }
  function seasonRecord() { // 올해 사용자 팀의 시리즈·세트 전적
    const s = S(), r = { w: 0, l: 0, gw: 0, gl: 0 };
    for (const m of s.matches) if (m.res && (m.a === s.user || m.b === s.user)) {
      const i = m.a === s.user ? 0 : 1; r.gw += m.res.s[i]; r.gl += m.res.s[1 - i]; if (m.res.s[i] > m.res.s[1 - i]) r.w++; else r.l++;
    }
    return r;
  }

  const end = W.endOfDay;
  W.endOfDay = function () {
    const s = S(), before = snapshot(), year = s.year, day = s.day;
    let pre = null;
    if (day + 1 >= W.CAL.end) { // 곧 시즌이 끝난다: 지워지기 전에 기록을 남겨 둔다
      const t = s.teams[s.user];
      pre = { year, rec: seasonRecord(), team: t.id, league: t.league, money: t.money, conf: t.conf, top: W.roster(t.id).filter((p) => p.ss.g).sort((a, b) => b.ss.r / b.ss.g - a.ss.r / a.ss.g).slice(0, 3).map((p) => ({ id: p.id, n: p.n, r: (p.ss.r / p.ss.g).toFixed(2), g: p.ss.g, k: `${p.ss.k}/${p.ss.d}/${p.ss.a}` })) };
    }
    end.apply(this, arguments);
    try { detect(before, year, pre); } catch (e) { /* 결과 화면 오류가 진행을 막지 않게 */ }
  };

  function detect(before, year, pre) {
    const s = S(), user = s.user;
    for (const id in s.comps) {
      const c = s.comps[id], was = before[id];
      if (c.type === 'split' && mine(c)) {
        if (was && was.startsWith('reg|') && c.stage !== 'reg' && c.seeds) {
          const rank = c.seeds.indexOf(user) + 1, cut = c.seeds.length >= 8 ? 6 : 4;
          push({ kind: 'playoffs', comp: c.id, title: rank && rank <= cut ? '플레이오프 진출' : '정규 시즌 종료', sub: c.name, rank, cut, seeds: c.seeds.slice(0, Math.max(cut, Math.min(rank, 10))), ok: rank && rank <= cut });
        }
        if (was && !was.endsWith('|1') && c.done) {
          const f = W.compMatches(c.id, 'final')[0], rank = c.rank.indexOf(user) + 1;
          push({ kind: 'champion', comp: c.id, title: c.champ === user ? '우승' : rank === 2 ? '준우승' : `${c.name.replace(/^\d+ /, '')} 종료`, sub: c.name, champ: c.champ, runner: f ? lose(f) : null, score: f ? [Math.max(...f.res.s), Math.min(...f.res.s)] : null, rank, mvp: bestPlayer(c.champ) && bestPlayer(c.champ).id, mine: c.champ === user });
        }
      }
      if (c.type === 'intl') {
        if (!was) push({ kind: 'intl-start', comp: c.id, title: `${stripYear(c.name)} 개막`, sub: c.name, teams: c.teams.slice(), mine: c.teams.includes(user) });
        else if (!was.endsWith('|1') && c.done) {
          const f = W.compMatches(c.id, 'final')[0];
          const ko = W.compMatches(c.id).filter((m) => m.res && (m.a === user || m.b === user));
          const out = !c.teams.includes(user) ? null : c.champ === user ? '우승' : f && (f.a === user || f.b === user) ? '준우승' : ko.some((m) => m.stage === 'sf') ? '4강' : ko.some((m) => m.stage === 'qf') ? '8강' : ko.some((m) => m.stage === 'groups') ? '그룹 스테이지' : '플레이-인';
          push({ kind: 'intl-end', comp: c.id, title: c.champ === user ? '세계 정상' : `${stripYear(c.name)} 폐막`, sub: c.name, champ: c.champ, runner: f ? lose(f) : null, score: f ? [Math.max(...f.res.s), Math.min(...f.res.s)] : null, finish: out, mvp: bestPlayer(c.champ) && bestPlayer(c.champ).id, mine: c.champ === user });
        }
      }
      if (c.type === 'promo' && (c.teams || []).includes(user) && was && !was.endsWith('|1') && c.done) {
        const m = W.compMatches(c.id).find((x) => x.a === user || x.b === user), up = m && m.b === user, won = m && win(m) === user;
        push({ kind: 'promo', comp: c.id, title: up ? (won ? '1부 승격' : '승격 실패') : won ? '1부 잔류' : '2부 강등', sub: c.name, good: won, score: m ? [m.res.s[m.a === user ? 0 : 1], m.res.s[m.a === user ? 1 : 0]] : null, opp: m ? (m.a === user ? m.b : m.a) : null });
      }
    }
    if (pre && s.year !== year) {
      const t = s.teams[pre.team] || s.teams[user], hist = (t.hist || []).filter((h) => h.year === pre.year);
      push({ kind: 'season', title: `${pre.year} 시즌 결산`, sub: t.name, rec: pre.rec, hist, top: pre.top, moneyStart: pre.money, conf: pre.conf, leagueBefore: pre.league, leagueAfter: t.league, trophies: hist.filter((h) => h.rank === 1).length });
    }
  }

  // ───────── 화면 ─────────
  const TROPHY = `<svg class="cer-trophy" viewBox="0 0 120 150" aria-hidden="true"><defs><linearGradient id="cerg" x1="0" x2="1"><stop offset="0" stop-color="#8f7a45"/><stop offset=".45" stop-color="#f2dfa4"/><stop offset="1" stop-color="#a88f52"/></linearGradient></defs>
    <path d="M30 14h60v26c0 22-12 38-30 42-18-4-30-20-30-42Z" fill="url(#cerg)"/><path d="M30 22H14c0 18 8 28 20 30M90 22h16c0 18-8 28-20 30" fill="none" stroke="#c9b580" stroke-width="5"/>
    <path d="M52 82h16v22H52z" fill="#a88f52"/><path d="M36 104h48l6 14H30z" fill="url(#cerg)"/><rect x="26" y="118" width="68" height="16" rx="2" fill="#5e5131"/><path d="M48 30l12-8 12 8-12 26z" fill="#fff6" /></svg>`;
  const crest = (t) => `<i class="crest" style="background:${t.color}">${esc(String(t.short).slice(0, 4))}</i>`;
  const tname = (id) => (S().teams[id] ? S().teams[id].name : '');
  function teamRow(id, extra) { const t = S().teams[id]; return t ? `<div class="cer-team ${id === S().user ? 'me' : ''}">${crest(t)}<b>${esc(t.name)}</b>${extra || ''}</div>` : ''; }
  function mvpBlock(pid) {
    const p = pid && S().players[pid]; if (!p) return '';
    const sk = L.skillOf ? L.skillOf(p) : null;
    return `<div class="cer-mvp"><small>시즌 평점 최고</small><b>${esc(p.n)}</b><span>${L.ROLE_KO[p.r]}, 평점 ${(p.ss.r / Math.max(1, p.ss.g)).toFixed(2)}, ${p.ss.g}경기${sk ? `, ${esc(sk[0])}` : ''}</span></div>`;
  }

  function body(ev) {
    const s = S(), u = s.teams[s.user];
    if (ev.kind === 'champion' || ev.kind === 'intl-end') {
      const champ = s.teams[ev.champ];
      const head = `<div class="cer-hero ${ev.mine ? 'gold' : ''}" style="--tc:${champ ? champ.color : '#888'}">${ev.mine ? TROPHY : ''}<p class="cer-sub">${esc(ev.sub)}</p><h1>${esc(ev.title)}</h1>
        ${champ ? `<div class="cer-final">${teamRow(ev.champ, '<em>우승</em>')}${ev.score ? `<div class="cer-score">${ev.score[0]}<span>:</span>${ev.score[1]}</div>` : ''}${ev.runner ? teamRow(ev.runner, '<em>준우승</em>') : ''}</div>` : ''}</div>`;
      const mineLine = ev.kind === 'intl-end' ? (ev.finish ? `<p class="cer-line">우리 팀 최종 성적: <b>${esc(ev.finish)}</b></p>` : '') : ev.rank ? `<p class="cer-line">우리 팀 최종 순위: <b>${ev.rank}위</b></p>` : '';
      return head + `<div class="cer-grid">${mvpBlock(ev.mvp)}<div>${mineLine}${ev.mine ? `<p class="cer-line good">상금이 지급되고 구단 명성과 팬이 늘었습니다.</p>` : ''}</div></div>`;
    }
    if (ev.kind === 'playoffs') {
      return `<div class="cer-hero ${ev.ok ? '' : 'muted'}" style="--tc:${u.color}"><p class="cer-sub">${esc(ev.sub)}</p><h1>${esc(ev.title)}</h1><p class="cer-line">정규 시즌 <b>${ev.rank}위</b>${ev.ok ? `, 상위 ${ev.cut}팀 안에 들었습니다.` : `, 상위 ${ev.cut}팀에 들지 못했습니다.`}</p></div>
        <ol class="cer-table">${ev.seeds.map((id, i) => `<li class="${id === s.user ? 'me' : ''} ${i === ev.cut - 1 ? 'cut' : ''}"><span>${i + 1}</span>${teamRow(id)}</li>`).join('')}</ol>`;
    }
    if (ev.kind === 'intl-start') {
      const byReg = {};
      for (const id of ev.teams) { const t = s.teams[id]; if (!t) continue; const lg = s.leagues[t.league]; const k = lg ? lg.name : t.region; (byReg[k] = byReg[k] || []).push(id); }
      return `<div class="cer-hero" style="--tc:#c9b580"><p class="cer-sub">${esc(ev.sub)}</p><h1>${esc(ev.title)}</h1><p class="cer-line">${ev.mine ? '<b>우리 팀이 출전합니다.</b> ' : ''}${ev.teams.length}팀이 세계 정상을 다툽니다.</p></div>
        <div class="cer-regions">${Object.entries(byReg).map(([k, ids]) => `<div><h4>${esc(k)}</h4>${ids.map((id) => teamRow(id)).join('')}</div>`).join('')}</div>`;
    }
    if (ev.kind === 'promo') {
      return `<div class="cer-hero ${ev.good ? 'gold' : 'muted'}" style="--tc:${u.color}">${ev.good && /승격/.test(ev.title) ? TROPHY : ''}<p class="cer-sub">${esc(ev.sub)}</p><h1>${esc(ev.title)}</h1>${ev.score ? `<div class="cer-final">${teamRow(s.user)}<div class="cer-score">${ev.score[0]}<span>:</span>${ev.score[1]}</div>${teamRow(ev.opp)}</div>` : ''}</div>`;
    }
    if (ev.kind === 'season') {
      const lgB = s.leagues[ev.leagueBefore], lgA = s.leagues[ev.leagueAfter], moved = ev.leagueBefore !== ev.leagueAfter;
      return `<div class="cer-hero ${ev.trophies ? 'gold' : ''}" style="--tc:${u.color}">${ev.trophies ? TROPHY : ''}<p class="cer-sub">${esc(ev.sub)}</p><h1>${esc(ev.title)}</h1>
        <div class="cer-stats"><div><b>${ev.rec.w}<span>승</span> ${ev.rec.l}<span>패</span></b><small>시리즈 전적</small></div><div><b>${ev.rec.gw}–${ev.rec.gl}</b><small>세트 득실</small></div><div><b>${ev.trophies}</b><small>우승 트로피</small></div><div><b>${ev.conf == null ? '-' : ev.conf}</b><small>이사회 신임도</small></div></div></div>
        <div class="cer-grid"><div><h4>대회 성적</h4>${ev.hist.length ? `<ul class="cer-list">${ev.hist.map((h) => `<li><span>${esc(stripYear(h.comp))}</span><b class="${h.rank === 1 ? 'good' : ''}">${h.rank === 1 ? '우승' : h.rank + '위'}</b></li>`).join('')}</ul>` : '<p class="dim">기록이 없습니다.</p>'}
          ${moved ? `<p class="cer-line ${lgA && lgA.tier < (lgB ? lgB.tier : 2) ? 'good' : 'bad'}">다음 시즌 소속: <b>${esc(lgA ? lgA.name : '')}</b></p>` : ''}</div>
          <div><h4>시즌 MVP 후보</h4>${ev.top.length ? `<ul class="cer-list">${ev.top.map((p, i) => `<li><span>${i + 1}. ${esc(p.n)}</span><b>${p.r}</b><small>${p.g}경기 ${p.k}</small></li>`).join('')}</ul>` : '<p class="dim">출전 기록이 없습니다.</p>'}</div></div>`;
    }
    return '';
  }

  Ce.pending = () => (S() && S().ceremony ? S().ceremony.length : 0);
  Ce.show = function () {
    const s = S(); if (!s || !s.ceremony || !s.ceremony.length) return false;
    if (L.view && L.view.active()) return false;
    const m = document.getElementById('modal'); if (!m || m.classList.contains('on')) return false;
    const ev = s.ceremony.shift(), left = s.ceremony.length;
    m.innerHTML = `<div class="ceremony ${ev.kind}" role="dialog" aria-label="${esc(ev.title)}">${body(ev)}<div class="cer-actions"><button class="btn primary" data-act="cernext">${left ? `다음 소식 (${left})` : '계속'}</button></div></div>`;
    m.classList.add('on', 'cer-on'); setTimeout(() => { const b = m.querySelector('[data-act=cernext]'); if (b) b.focus(); }, 30);
    return true;
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act=cernext]'); if (!b) return;
    const m = document.getElementById('modal'); m.classList.remove('on', 'cer-on'); m.innerHTML = '';
    e.stopPropagation(); if (!Ce.show() && L.ui && L.ui.render) L.ui.render();
  }, true);
  // 결과 화면은 바깥을 눌러도 닫히지 않는다 (버튼으로만 넘긴다)
  document.addEventListener('click', (e) => { if (e.target.id === 'modal' && e.target.classList.contains('cer-on')) e.stopPropagation(); }, true);
  // 화면을 그릴 때마다 남은 결과가 있으면 띄운다 (신문보다 먼저)
  const hook = () => {
    const U = L.ui; if (!U || U._cerHooked || !U.render) return; U._cerHooked = true;
    const render = U.render; U.render = function () { render.apply(this, arguments); if (!U.remote && !(L.features && L.features.holiday)) Ce.show(); };
  };
  G.addEventListener('DOMContentLoaded', hook); hook();
})(window);
