// 1단계: 2014~2026 공식 1·2부 대회 목록 수집
import fs from 'node:fs';
import path from 'node:path';
import { cargo, CACHE_DIR } from './cargo.mjs';

const all = [];
for (let y = 2014; y <= 2026; y++) {
  const rows = await cargo({
    tables: 'Tournaments',
    fields:
      'Name,OverviewPage,League,Region,Year,DateStart,Date,TournamentLevel,IsQualifier,IsPlayoffs,IsOfficial,Split,SplitNumber,StandardName',
    where: `Year="${y}" AND (TournamentLevel="Primary" OR TournamentLevel="Secondary")`,
    order_by: 'DateStart',
  });
  console.log(y, rows.length);
  all.push(...rows);
}
fs.writeFileSync(path.join(CACHE_DIR, '_tournaments.json'), JSON.stringify(all));

// 요약: 리그별 연도 분포
const m = new Map();
for (const t of all) {
  const k = `${t.TournamentLevel}|${t.Region}|${t.League}`;
  if (!m.has(k)) m.set(k, {});
  m.get(k)[t.Year] = (m.get(k)[t.Year] || 0) + 1;
}
const lines = [...m.entries()]
  .sort()
  .map(([k, ys]) => k + ' :: ' + Object.keys(ys).sort().map((y) => y.slice(2) + 'x' + ys[y]).join(' '));
fs.writeFileSync(path.join(CACHE_DIR, '_leagues_summary.txt'), lines.join('\n'));
console.log('리그 종류', lines.length);
