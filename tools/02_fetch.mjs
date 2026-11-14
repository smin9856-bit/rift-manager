// 2단계: 연도·리그별 로스터와 실제 경기 기록 수집 → cache/_raw.json
import fs from 'node:fs';
import path from 'node:path';
import { cargo, CACHE_DIR, inList, chunk } from './cargo.mjs';
import { REGIONS } from './leagues.mjs';

const T = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, '_tournaments.json'), 'utf8'));
const only = process.argv[2] ? process.argv[2].split(',').map(Number) : null;
const rawFile = path.join(CACHE_DIR, '_raw.json');
const raw = fs.existsSync(rawFile) ? JSON.parse(fs.readFileSync(rawFile, 'utf8')) : { years: {} };

function pick(cands, year) {
  for (const [wiki, label, opt = {}] of cands) {
    let ts = T.filter((t) => t.League === wiki && Number(t.Year) === year && t.IsOfficial === '1');
    if (opt.primaryOnly) ts = ts.filter((t) => t.TournamentLevel === 'Primary');
    else if (opt.secondaryOnly) ts = ts.filter((t) => t.TournamentLevel === 'Secondary');
    const regular = ts
      .filter((t) => t.IsQualifier !== '1' && t.IsPlayoffs !== '1' && t.DateStart)
      .sort((a, b) => a.DateStart.localeCompare(b.DateStart));
    if (!regular.length) continue;
    // 그 해에 시작한 첫 정규 시즌(같은 시기에 열린 조별 리그 포함)
    const inYear = regular.filter((t) => t.DateStart >= `${year}-01-01`);
    const first = (inYear.length ? inYear : regular)[0];
    const d0 = new Date(first.DateStart).getTime();
    const rosterT = regular.filter((t) => Math.abs(new Date(t.DateStart).getTime() - d0) < 15 * 864e5);
    const statT = ts.filter((t) => t.IsQualifier !== '1');
    return { wiki, label, roster: rosterT.map((t) => t.OverviewPage), stats: statT.map((t) => t.OverviewPage) };
  }
  return null;
}

const STAT_FIELDS =
  'Link,Team,Role,OverviewPage,COUNT(*)=G,SUM(Kills)=K,SUM(Deaths)=D,SUM(Assists)=A,SUM(CS)=CS,SUM(Gold)=Gold,COUNT(Gold)=GN,' +
  'SUM(DamageToChampions)=Dmg,COUNT(DamageToChampions)=DN,SUM(VisionScore)=VS,COUNT(VisionScore)=VN,SUM(TeamKills)=TK,COUNT(TeamKills)=TKN,' +
  'SUM(IF(PlayerWin="Yes",1,0))=W,COUNT(DISTINCT Champion)=CP';

for (let year = 2014; year <= 2026; year++) {
  if (only && !only.includes(year)) continue;
  if (raw.years[year] && !only) { console.log(year, '이미 수집됨'); continue; }
  const leagues = [];
  for (const R of REGIONS) for (const tier of [1, 2]) {
    const sel = pick(tier === 1 ? R.t1 : R.t2, year);
    if (sel) leagues.push({ region: R.id, tier, wiki: sel.wiki, label: sel.label, rosterPages: sel.roster, statPages: sel.stats, roster: [], stats: [] });
  }
  // 연도 전체를 묶어서 요청 (위키의 요청 수 제한 때문)
  const rp = [...new Set(leagues.flatMap((l) => l.rosterPages))], sp = [...new Set(leagues.flatMap((l) => l.statPages))];
  const tp = [], st = [];
  for (const part of chunk(rp, 40))
    tp.push(...(await cargo({ tables: 'TournamentPlayers', fields: 'Team,Player,Role,OverviewPage,Link', where: `OverviewPage IN ${inList(part)}` })));
  for (const part of chunk(sp, 30))
    st.push(...(await cargo({ tables: 'ScoreboardPlayers', fields: STAT_FIELDS, where: `OverviewPage IN ${inList(part)}`, group_by: 'OverviewPage,Link,Team,Role' })));
  for (const l of leagues) {
    l.roster = tp.filter((r) => l.rosterPages.includes(r.OverviewPage));
    l.stats = st.filter((r) => l.statPages.includes(r.OverviewPage));
    console.log(year, l.region, l.tier, l.label, '로스터', l.roster.length, '기록', l.stats.length);
  }
  raw.years[year] = leagues;
  fs.writeFileSync(rawFile, JSON.stringify(raw));
}

// 선수 신상 정보
const links = new Set();
const teams = new Set();
for (const y of Object.keys(raw.years))
  for (const L of raw.years[y]) {
    for (const r of L.roster) { links.add(r.Link || r.Player); teams.add(r.Team); }
    for (const s of L.stats) { links.add(s.Link); teams.add(s.Team); }
  }
links.delete(''); links.delete(undefined); teams.delete('');
console.log('선수', links.size, '팀', teams.size);
const players = [];
for (const part of chunk([...links].sort(), 150)) {
  players.push(...(await cargo({
    tables: 'Players', fields: 'ID,OverviewPage,Name,NativeName,Country,Birthdate,Role',
    where: `OverviewPage IN ${inList(part)}`,
  })));
}
fs.writeFileSync(path.join(CACHE_DIR, '_players.json'), JSON.stringify(players));
console.log('선수 정보', players.length);
const tinfo = [];
for (const part of chunk([...teams].sort(), 150)) {
  tinfo.push(...(await cargo({
    tables: 'Teams', fields: 'Name,OverviewPage,Short,Region', where: `OverviewPage IN ${inList(part)}`,
  })));
}
fs.writeFileSync(path.join(CACHE_DIR, '_teams.json'), JSON.stringify(tinfo));
console.log('팀 정보', tinfo.length, '완료');
