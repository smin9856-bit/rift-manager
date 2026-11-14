// 국제전(월드 챔피언십·MSI) 선수 기록 수집 → cache/_intl.json
import fs from 'node:fs';
import path from 'node:path';
import { cargo, CACHE_DIR, inList } from './cargo.mjs';
const T = JSON.parse(fs.readFileSync(path.join(CACHE_DIR, '_tournaments.json'), 'utf8'));
const out = {};
for (let y = 2014; y <= 2026; y++) {
  const pages = T.filter((t) => Number(t.Year) === y && t.Region === 'International' && t.TournamentLevel === 'Primary' && t.IsQualifier !== '1' &&
    (t.League === 'World Championship' || t.League === 'Mid-Season Invitational')).map((t) => t.OverviewPage);
  if (!pages.length) { out[y] = []; continue; }
  out[y] = await cargo({
    tables: 'ScoreboardPlayers',
    fields: 'Link,Role,COUNT(*)=G,SUM(Kills)=K,SUM(Deaths)=D,SUM(Assists)=A,SUM(IF(PlayerWin="Yes",1,0))=W',
    where: `OverviewPage IN ${inList(pages)}`, group_by: 'Link,Role',
  });
  console.log(y, pages.join(' | '), '→', out[y].length);
}
fs.writeFileSync(path.join(CACHE_DIR, '_intl.json'), JSON.stringify(out));
