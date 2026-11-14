// 3단계: 수집한 원자료 → 게임 데이터 (data/yYYYY.js, data/rookies.js, data/index.js)
// 능력치는 실제 경기 기록(KDA·CS·승률·챔피언 폭)을 같은 리그·포지션 안에서 비교해 산출한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import '../js/core.js';
import { CACHE_DIR } from './cargo.mjs';
import { REGIONS } from './leagues.mjs';
const L = globalThis.LFM;
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
fs.mkdirSync(OUT, { recursive: true });
const rd = (f, d) => (fs.existsSync(path.join(CACHE_DIR, f)) ? JSON.parse(fs.readFileSync(path.join(CACHE_DIR, f), 'utf8')) : d);
const raw = rd('_raw.json', { years: {} });
const pinfo = new Map(rd('_players.json', []).map((p) => [p.OverviewPage, p]));
const tinfo = new Map(rd('_teams.json', []).map((t) => [t.OverviewPage || t.Name, t]));
const REG = Object.fromEntries(REGIONS.map((r) => [r.id, r]));
const ROLE = { Top: 0, Jungle: 1, Mid: 2, Bot: 3, 'AD Carry': 3, ADC: 3, Bottom: 3, Support: 4 };
const num = (v) => (v === '' || v == null ? 0 : Number(v));
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-').replace(/^-|-$/g, '') || 'x' + L.hash(s);

// 국제전 보정: 월드 챔피언십·MSI에서 많이 이기고 잘할수록 가산 (조기 탈락은 소폭 감점)
const intlRaw = rd('_intl.json', {});
const intl = {};
for (const y in intlRaw) {
  const m = new Map();
  for (const r of intlRaw[y]) { if (!r.Link) continue; const o = m.get(r.Link) || { G: 0, K: 0, D: 0, A: 0, W: 0 }; o.G += num(r.G); o.K += num(r.K); o.D += num(r.D); o.A += num(r.A); o.W += num(r.W); m.set(r.Link, o); }
  const kd = [...m.values()].filter((o) => o.G >= 4).map((o) => Math.log((o.K + o.A + 2) / (o.D + 2)));
  const mean = kd.reduce((a, b) => a + b, 0) / (kd.length || 1), sd = Math.sqrt(kd.reduce((a, b) => a + (b - mean) ** 2, 0) / (kd.length || 1)) || 1;
  intl[y] = new Map();
  for (const [link, o] of m) {
    const z = L.clamp((Math.log((o.K + o.A + 2) / (o.D + 2)) - mean) / sd, -2, 2);
    intl[y].set(link, L.clamp((2 * o.W - o.G) * 0.17 + Math.min(o.G, 25) * 0.05 + z * 0.8 * (o.G / (o.G + 6)), -1, 5.5));
  }
}

// 사용자가 만든 전성기 프로필(tools/ref/legends.csv)을 '능력치 모양' 참고 자료로 쓴다.
// 종합 능력과 잠재력은 기록 기반 값을 유지하고, 어느 항목이 상대적으로 강한지만 가져온다.
function parseCsv(txt) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; } else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  const head = rows.shift().map((h) => h.replace(/^\ufeff/, ''));
  return rows.filter((r) => r.length > 5).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
const REF_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ref', 'legends.csv');
const CSV_MAP = { lan: 'EAR', mec: 'MEC', tf: 'FGT', mac: 'MAC', eco: 'ECO', con: 'STB', pool: 'FLEX', clt: 'CLT' };
const CSV_ROLE = { TOP: 0, JNG: 1, JGL: 1, MID: 2, BOT: 3, ADC: 3, SUP: 4 };
const CSV_REG = { LCK: 'KR', LPL: 'CN', LEC: 'EU', LCS: 'NA', LCP: 'TW', CBLOL: 'BR' };
// 직접 지정한 상징 능력 (CSV에 없는 시야·팀워크 등)
const MANUAL_SIG = { mata: { vis: 20 }, madlife: { mec: 20 }, corejj: { tw: 20 }, bengi: { clt: 20 }, score: { con: 20 }, beryl: { pool: 20 }, meiko: { tw: 20 }, wolf: { tw: 20 }, gorilla: { vis: 20 } };
// 고유 스킬: CSV의 스킬 이름을 그대로 쓰고, 이름의 뜻에 맞는 효과를 붙인다
const SKILL_RULES = [
  [/고사|불변|버팀목|육각형|안정|꾸준|변함없는|정밀한 마법사|북미의 중심|북미의 황제/, 'rock'],
  [/주사위|두두등장|변칙 돌파|기상천외|클랩스|돌발/, 'dice'],
  [/불사대마왕|불굴|중꺾마|복구/, 'comeback'],
  [/결승전|가을|빅게임|단판|승부사/, 'big'],
  [/봄의/, 'spring'],
  [/갈라쇼|처형|사냥꾼|광전사|연속/, 'streak'],
  [/갱킹|기습/, 'gank'],
  [/로밍/, 'roam'],
  [/시야|길목|균형/, 'vision'],
  [/그랩|이니시|개전|선봉|진입|점화|개척|침투/, 'engage'],
  [/역천괴|전장의 마법사|변칙의|역할 변환/, 'flex'],
  [/넥서스|철벽|수비|방패/, 'nexus'],
  [/신의 오른팔|보호|팀워크|완성형 서포터/, 'cover'],
  [/사령관|설계|지휘|조율/, 'shot'],
  [/포식자|침략자|동선|캐리 정글러/, 'farmjg'],
  [/황금|손길|완성형 캐리|극한 성장/, 'cs'],
  [/룰러엔딩|후반|마무리|중후반|북미의 전설/, 'late'],
  [/템포|초반|주도권|공격 본능|거친|공격적/, 'early'],
  [/결투|폭군|압살|괴물|저격수|암살|타격|돌격/, 'duel'],
  [/한타|화력|손끝/, 'tf'],
  [/사이드|탑솔러/, 'split'],
];
const ROLE_SKILL = { TOP: 'split', JNG: 'farmjg', JGL: 'farmjg', MID: 'roam', BOT: 'cs', ADC: 'cs', SUP: 'vision' };
const SKILL_L3 = new Set(['kiin', 'doran', 'faker', 'chovy', 'canyon', 'ruler', 'gala', 'keria', 'mata', 'madlife', 'bengi', 'deft', 'teddy', 'theshy', 'showmaker', 'gumayusi', 'score', 'xiaohu', 'doinb', 'rookie', 'bin', 'impact', 'corejj', 'uzi', 'kingen']);
function csvSkill(r) {
  const name = (r.skill || '').trim(); if (!name) return null;
  const key = (SKILL_RULES.find(([re]) => re.test(name)) || [0, ROLE_SKILL[r.role] || 'tf'])[1];
  const lv = SKILL_L3.has(r.name.toLowerCase()) ? 3 : r.score_basis === 'PRIOR_CURATED' ? 2 : 1;
  return [name, key, lv];
}
// 선수별 고정 능력치 (나머지 항목은 종합 능력이 유지되도록 다시 맞춘다)
const FIXED = { doran: { con: 3 } };
const legends = new Map();
if (fs.existsSync(REF_FILE)) for (const r of parseCsv(fs.readFileSync(REF_FILE, 'utf8'))) {
  const w = r.score_basis === 'PRIOR_CURATED' ? 1 : r.score_basis === 'HIST_ESTIMATE' ? 0.8 : r.score_basis === 'REGION_PLACEHOLDER' ? 0 : 0.5;
  if (!w) continue;
  const vals = Object.fromEntries(Object.entries(CSV_MAP).map(([k, c]) => [k, Number(r[c])])), list = Object.values(vals).filter((v) => v > 0);
  if (list.length < 8) continue;
  const mean = list.reduce((a, b) => a + b, 0) / list.length, dev = {}, sig = {};
  for (const k in vals) { dev[k] = L.clamp(((vals[k] - mean) / 5) * 1.5 * w, -3, 3); if (vals[k] >= 100 && w >= 0.8) sig[k] = 20; }
  const key = r.name.toLowerCase(); Object.assign(sig, MANUAL_SIG[key] || {});
  const e = { dev, sig: Object.keys(sig).length ? sig : null, role: CSV_ROLE[r.role], region: CSV_REG[r.league], sk: csvSkill(r), fix: FIXED[key] || null };
  if (!legends.has(key)) legends.set(key, []); legends.get(key).push(e);
}
for (const k in MANUAL_SIG) if (!legends.has(k)) legends.set(k, [{ dev: {}, sig: MANUAL_SIG[k], role: -1, region: null }]);
function legend(link, id, role, region) {
  const c = legends.get(String(id || link.replace(/\s*\(.*\)$/, '')).toLowerCase()); if (!c) return null;
  return c.find((e) => e.role === role && e.region === region) || c.find((e) => e.role === role) || c.find((e) => e.region === region) || (c.length === 1 && c[0].role === -1 ? c[0] : null);
}

function leagueBase(region, tier, year) {
  let b = REG[region].base;
  if (region === 'CN') b += year <= 2016 ? -2.5 : year <= 2017 ? -1 : 0;
  if (region === 'EU') b += year >= 2018 && year <= 2020 ? 1.5 : 0;
  if (region === 'NA') b += year >= 2021 ? -1 : 0;
  if (region === 'TW') b += year <= 2016 ? 2 : year >= 2020 ? -1 : 0;
  if (region === 'VN') b += year >= 2019 ? 1.5 : 0;
  if (tier === 2) b -= region === 'KR' || region === 'CN' ? 12 : 11;
  return b;
}

const years = Object.keys(raw.years).map(Number).sort();
// 선수 식별자 통일: 위키의 로스터 표와 경기 기록 표가 같은 선수를 대소문자·오타가 다른 이름으로 적는 경우가 많다
const canon = new Map();
for (const page of pinfo.keys()) canon.set(page.toLowerCase(), page);
for (const y of years) for (const lg of raw.years[y]) for (const r of lg.stats) if (r.Link && !canon.has(r.Link.toLowerCase())) canon.set(r.Link.toLowerCase(), r.Link);
for (const y of years) for (const lg of raw.years[y]) for (const r of lg.roster) { const l = r.Link || r.Player; if (l && !canon.has(l.toLowerCase())) canon.set(l.toLowerCase(), l); }
const fix = (l) => (l ? canon.get(l.toLowerCase()) || l : l);
function lev(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase(); const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
let fuzzy = 0;
for (const y of years) for (const lg of raw.years[y]) {
  for (const r of lg.stats) r.Link = fix(r.Link);
  for (const r of lg.roster) r.Link = fix(r.Link || r.Player);
  // 오타 보정: 같은 팀에서 기록은 있는데 로스터에 없는 선수와 이름이 거의 같으면 같은 사람으로 본다
  const statByTeam = new Map();
  for (const r of lg.stats) { if (!statByTeam.has(r.Team)) statByTeam.set(r.Team, new Set()); statByTeam.get(r.Team).add(r.Link); }
  const rosterSet = new Set(lg.roster.map((r) => r.Team + '|' + r.Link));
  for (const r of lg.roster) {
    const cand = statByTeam.get(r.Team); if (!cand || !r.Link || cand.has(r.Link) || ROLE[r.Role] == null) continue;
    const base = r.Link.replace(/\s*\(.*\)$/, '');
    const hit = [...cand].filter((c) => !rosterSet.has(r.Team + '|' + c)).map((c) => [lev(base, c.replace(/\s*\(.*\)$/, '')), c]).filter(([d, c]) => d <= (base.length >= 5 ? 2 : 1) && d < Math.min(base.length, c.length) / 2).sort((a, b) => a[0] - b[0])[0];
    if (hit) { canon.set(r.Link.toLowerCase(), hit[1]); r.Link = hit[1]; fuzzy++; }
  }
}
for (const y in intl) { const m = new Map(); for (const [l, v] of intl[y]) { const k = fix(l); m.set(k, Math.max(v, m.get(k) ?? -9)); } intl[y] = m; }
console.log('이름 통일: 표기', canon.size, '· 오타 보정', fuzzy);
const career = new Map(); // link → {year: {ovr, region, tier, role, a}}
const world = {};

for (const year of years) {
  const W = (world[year] = { year, leagues: [], teams: [], players: [], coaches: [] });
  const usedTeams = new Set(), usedPlayers = new Set(), seenCoach = new Set();
  for (const lg of raw.years[year]) {
    const base = leagueBase(lg.region, lg.tier, year);
    // 선수별 연간 기록 합산
    const st = new Map();
    for (const r of lg.stats) {
      const role = ROLE[r.Role]; if (role == null || !r.Link) continue;
      let s = st.get(r.Link);
      if (!s) st.set(r.Link, (s = { G: 0, K: 0, D: 0, A: 0, CS: 0, W: 0, CP: 0, roles: [0, 0, 0, 0, 0], teams: {} }));
      const g = num(r.G); s.G += g; s.K += num(r.K); s.D += num(r.D); s.A += num(r.A); s.CS += num(r.CS); s.W += num(r.W);
      s.CP = Math.max(s.CP, num(r.CP)); s.roles[role] += g; s.teams[r.Team] = (s.teams[r.Team] || 0) + g;
    }
    // 감독·코치 (로스터 표의 Coach 항목)
    const staff = new Map();
    for (const r of lg.roster) if (/coach/i.test(r.Role || '') && r.Link && r.Team) { if (!staff.has(r.Team)) staff.set(r.Team, []); if (!staff.get(r.Team).includes(r.Link)) staff.get(r.Team).push(r.Link); }
    // 팀 로스터 (첫 스플릿 기준)
    const teams = new Map();
    for (const r of lg.roster) {
      const role = ROLE[r.Role], link = r.Link || r.Player; if (role == null || !link || !r.Team) continue;
      if (!teams.has(r.Team)) teams.set(r.Team, new Map());
      if (!teams.get(r.Team).has(link)) teams.get(r.Team).set(link, role);
    }
    // 로스터 표가 비어 있으면 경기 기록으로 보충
    for (const [link, s] of st) {
      const team = Object.entries(s.teams).sort((a, b) => b[1] - a[1])[0][0];
      const role = s.roles.indexOf(Math.max(...s.roles));
      if (!teams.has(team)) { if (lg.roster.length) continue; teams.set(team, new Map()); }
      const t = teams.get(team);
      if (![...teams.values()].some((m) => m.has(link)) && ![...t.values()].includes(role)) t.set(link, role);
    }
    // 팀 승률
    const tw = new Map();
    for (const [, s] of st) for (const [tn, g] of Object.entries(s.teams)) { const o = tw.get(tn) || { g: 0, w: 0 }; o.g += g; o.w += s.W * (g / (s.G || 1)); tw.set(tn, o); }
    const wr = (tn) => { const o = tw.get(tn); return o && o.g >= 10 ? o.w / o.g : 0.5; };
    let list = [...teams.entries()].filter(([tn, m]) => m.size >= 3 && !usedTeams.has(tn));
    const cap = lg.tier === 1 ? 20 : 12;
    if (list.length > cap) list = list.sort((a, b) => (tw.get(b[0])?.g || 0) * wr(b[0]) - (tw.get(a[0])?.g || 0) * wr(a[0])).slice(0, cap);
    if (list.length < 4) continue;
    // 포지션별 기록 분포
    const dist = [0, 1, 2, 3, 4].map(() => ({ kda: [], cs: [], kg: [], dg: [], ag: [], cp: [] }));
    const feat = (s) => ({ kda: Math.log((s.K + s.A + 2) / (s.D + 2)), cs: s.CS / s.G, kg: s.K / s.G, dg: s.D / s.G, ag: s.A / s.G, cp: s.CP / Math.sqrt(s.G) });
    for (const [, s] of st) if (s.G >= 5) { const r = s.roles.indexOf(Math.max(...s.roles)), f = feat(s); for (const k in f) dist[r][k].push(f[k]); }
    const ms = (arr) => { if (arr.length < 3) return [0, 1]; const m = arr.reduce((a, b) => a + b, 0) / arr.length; const sd = Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length) || 1; return [m, sd]; };
    const stat = dist.map((d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, ms(v)])));
    const z = (r, k, v) => L.clamp((v - stat[r][k][0]) / stat[r][k][1], -2.5, 2.5);

    const lid = lg.region + lg.tier;
    const Lg = { id: lid, region: lg.region, tier: lg.tier, name: lg.label, base, teams: [] };
    for (const [tn, members] of list) {
      usedTeams.add(tn);
      const ti = tinfo.get(tn), tid = slug(tn);
      W.teams.push({ id: tid, name: tn, short: (ti && ti.Short) || tn.replace(/[^A-Za-z0-9 ]/g, '').split(' ').map((w) => w[0]).join('').slice(0, 4).toUpperCase() || tn.slice(0, 3).toUpperCase(), region: lg.region, league: lid });
      Lg.teams.push(tid);
      (staff.get(tn) || []).forEach((link, i) => { if (seenCoach.has(link)) return; seenCoach.add(link); const info = pinfo.get(link); W.coaches.push({ id: 'c:' + link, n: (info && info.ID) || link.replace(/\s*\(.*\)$/, ''), rn: (info && info.Name) || '', c: (info && info.Country) || '', by: info && info.Birthdate ? Number(info.Birthdate.slice(0, 4)) : 0, t: i === 0 ? tid : null, rg: lg.region, wr: +wr(tn).toFixed(3), base }); });
      const twr = wr(tn);
      for (const [link, role] of members) {
        if (usedPlayers.has(link)) continue; usedPlayers.add(link);
        const s = st.get(link), h = L.rng(L.hash(link + year));
        let ovr, dz = { lan: 0, mec: 0, tf: 0, mac: 0, vis: 0, eco: 0, con: 0, pool: 0, clt: 0, tw: 0 };
        if (s && s.G >= 3) {
          const f = feat(s), sh = s.G / (s.G + 8), wrp = s.W / s.G;
          const zk = z(role, 'kda', f.kda), zc = z(role, 'cs', f.cs), zkg = z(role, 'kg', f.kg), zd = z(role, 'dg', f.dg), za = z(role, 'ag', f.ag), zp = z(role, 'cp', f.cp);
          const perf = 0.36 * zk + (role === 4 ? 0.1 : 0.26) * zc + (role === 4 ? 0.3 * za : 0.14 * zkg) + (wrp - 0.5) * 2.2;
          ovr = base + (role === 4 ? 3.3 : 4.6) * perf * sh + (twr - 0.5) * (role === 4 ? 7 : 9) - (role === 4 ? 0.8 : 0);
          dz = { lan: zkg * 0.6 + zc * 0.4, mec: zkg * 0.7 + zk * 0.3, tf: zk * 0.8, mac: (wrp - 0.5) * 3, vis: (role === 4 || role === 1 ? za * 0.8 : 0), eco: zc * 1.3, con: -zd * 1.1, pool: zp * 1.4, clt: 0, tw: za * 0.6 };
        } else ovr = base - 3 + (twr - 0.5) * 8 + h.range(-3, 3);
        const ib = (intl[year] && intl[year].get(link)) || 0;
        ovr = L.clamp(ovr, base - 13, base + 13.5) + ib;
        if (ib) { dz.clt += ib * 0.6; dz.tf += ib * 0.2; }
        const ref = legend(link, (pinfo.get(link) || {}).ID, role, lg.region);
        const a = L.ATTRS.map((k) => ovr / 5 + (dz[k] || 0) * (ref ? 0.45 : 0.9) + (ref ? ref.dev[k] || 0 : 0) + h.norm(0, ref ? 0.35 : 0.85));
        for (let it = 0; it < 3; it++) { const cur = L.ovr({ a, r: role }); const d = (ovr - cur) / 5; for (let i = 0; i < 10; i++) a[i] = L.clamp(a[i] + d, 1, 20); }
        if (ref && ref.fix) { // 고정 항목을 넣고 나머지로 종합 능력을 다시 맞춘다
          for (const k in ref.fix) a[L.AI[k]] = ref.fix[k];
          for (let it = 0; it < 6; it++) { const d = (ovr - L.ovr({ a, r: role })) / 5 * 1.15; for (let i = 0; i < 10; i++) if (!(L.ATTRS[i] in ref.fix)) a[i] = L.clamp(a[i] + d, 1, 20); }
        }
        const ai = a.map((v) => Math.round(v));
        const sig = ref ? ref.sig : null;
        const info = pinfo.get(link);
        const P = { sig, id: link, n: (info && info.ID) || link.replace(/\s*\(.*\)$/, ''), rn: (info && info.Name) || '', nn: (info && info.NativeName) || '', c: (info && info.Country) || '', by: info && info.Birthdate ? Number(info.Birthdate.slice(0, 4)) : 0, r: role, t: tid, a: ai, g: s ? s.G : 0 };
        if (ref && ref.sk) P.sk = ref.sk;
        W.players.push(P);
        const c = career.get(link) || {}; c[year] = { ovr: L.ovr(P), region: lg.region, P }; career.set(link, c);
      }
    }
    W.leagues.push(Lg);
  }
}

// 출생 연도 추정, 잠재력, 자유계약, 신인
for (const [link, c] of career) {
  const ys = Object.keys(c).map(Number).sort((a, b) => a - b), first = ys[0];
  const h = L.rng(L.hash(link));
  let by = c[first].P.by || first - 18 - h.int(0, 3);
  for (const y of ys) {
    const P = c[y].P; P.by = by;
    const future = ys.filter((v) => v >= y).map((v) => c[v].ovr), peak = Math.max(...future), age = y - by;
    const head = y === years[years.length - 1] || peak <= c[y].ovr ? Math.max(0, (23 - age) * 1.3 + h.range(0, 2.5)) : 0;
    P.pot = Math.min(99, Math.round(Math.max(c[y].ovr, peak) + head + h.range(0, 1.5)));
  }
}
// 상징 능력: 전성기(자기 최고 종합 능력에서 5 이내)인 해에는 그 항목을 만점으로
for (const [, c] of career) {
  const peak = Math.max(...Object.values(c).map((x) => x.ovr));
  for (const y in c) { const P = c[y].P; if (P.sig && c[y].ovr >= peak - 5) for (const k in P.sig) P.a[L.AI[k]] = 20; delete P.sig; c[y].ovr = L.ovr(P); P.pot = Math.min(99, Math.max(P.pot, Math.round(c[y].ovr))); }
}
// 2015년 페이커를 전 연도 통틀어 종합 1위로
{
  const f = career.get('Faker');
  if (f && f[2015]) {
    let top = 0; for (const [link, c] of career) for (const y in c) if (!(link === 'Faker' && y === '2015')) top = Math.max(top, c[y].ovr);
    const P = f[2015].P; let guard = 0;
    while (L.ovr(P) <= top + 0.5 && guard++ < 200) { let k = 0, best = -1; for (let i = 0; i < 10; i++) if (P.a[i] < 20 && L.ROLE_W[2][i] > best) { best = L.ROLE_W[2][i]; k = i; } if (best < 0) break; P.a[k]++; }
    f[2015].ovr = L.ovr(P); P.pot = 99;
    for (const y in f) f[y].P.pot = Math.max(f[y].P.pot, Number(y) <= 2015 ? 99 : f[y].P.pot);
    console.log('2015 Faker 종합', f[2015].ovr.toFixed(1), '· 그 외 최고', top.toFixed(1), P.a.join(','));
  }
}
const rookies = {};
for (const year of years) {
  const W = world[year], inYear = new Set(W.players.map((p) => p.id)); W.fa = [];
  for (const [link, c] of career) {
    if (inYear.has(link)) continue;
    const ys = Object.keys(c).map(Number);
    const prev = ys.filter((v) => v < year && v >= year - 2).sort((a, b) => b - a)[0];
    if (prev) { // 최근 2년 안에 뛰었지만 올해는 소속이 없는 선수
      const src = c[prev].P, dec = (year - prev) * 0.25;
      W.fa.push({ ...src, t: null, a: src.a.map((v) => Math.max(1, Math.round(v - dec))), rg: c[prev].region, pot: src.pot, g: 0 });
    }
  }
  const deb = [];
  for (const [link, c] of career) {
    const first = Math.min(...Object.keys(c).map(Number));
    if (first === year) { const src = c[first].P; deb.push({ ...src, ot: src.t, t: null, rg: c[first].region, a: src.a.map((v) => Math.max(1, v - 1)) }); }
  }
  rookies[year] = deb;
}

const idx = [];
for (const year of years) {
  const W = world[year];
  fs.writeFileSync(path.join(OUT, `y${year}.js`), `window.LFM_DATA=window.LFM_DATA||{};LFM_DATA[${year}]=${JSON.stringify(W)};`);
  idx.push({ year, leagues: W.leagues.length, teams: W.teams.length, players: W.players.length, fa: W.fa.length, coaches: W.coaches.length });
  console.log(year, '리그', W.leagues.length, '팀', W.teams.length, '선수', W.players.length, 'FA', W.fa.length, '신인', rookies[year].length);
}
fs.writeFileSync(path.join(OUT, 'rookies.js'), `window.LFM_ROOKIES=${JSON.stringify(rookies)};`);
fs.writeFileSync(path.join(OUT, 'index.js'), `window.LFM_YEARS=${JSON.stringify(idx)};window.LFM_REGIONS=${JSON.stringify(REGIONS.map((r) => ({ id: r.id, name: r.name, base: r.base })))};`);

// 점검용: 연도별 상위 선수
if (process.argv.includes('--top')) for (const year of years) {
  const top = world[year].players.map((p) => [L.ovr(p), p]).sort((a, b) => b[0] - a[0]).slice(0, 12);
  console.log(year, top.map(([o, p]) => `${p.n}(${L.ROLES[p.r]} ${o.toFixed(0)}/${p.pot})`).join(' '));
}
