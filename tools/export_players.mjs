// 전체 선수 명단을 CSV로 내보내기: node tools/export_players.mjs
import fs from 'node:fs';
globalThis.window = globalThis;
const load = (f) => (0, eval)(fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'));
load('js/core.js'); load('data/index.js');
const L = globalThis.LFM, rows = [['연도', '리그', '팀', '포지션', '선수', '본명', '국적', '나이', '종합', '잠재력', ...L.ATTR_KO]];
const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
let show = '';
for (const { year } of globalThis.LFM_YEARS) {
  load(`data/y${year}.js`); const D = globalThis.LFM_DATA[year];
  const tm = Object.fromEntries(D.teams.map((t) => [t.id, t])), lg = Object.fromEntries(D.leagues.map((l) => [l.id, l]));
  const ps = D.players.slice().sort((a, b) => lg[tm[a.t].league].tier - lg[tm[b.t].league].tier || lg[tm[b.t].league].base - lg[tm[a.t].league].base || a.t.localeCompare(b.t) || a.r - b.r);
  for (const p of ps) rows.push([year, lg[tm[p.t].league].name, tm[p.t].name, L.ROLE_KO[p.r], p.n, p.nn || p.rn, p.c, year - p.by, Math.round(L.ovr(p)), p.pot, ...p.a]);
  for (const p of D.fa) rows.push([year, '무소속', '-', L.ROLE_KO[p.r], p.n, p.nn || p.rn, p.c, year - p.by, Math.round(L.ovr(p)), p.pot, ...p.a]);
  if (year === Number(process.argv[2] || 2026)) for (const tid of lg.KR1.teams) show += `${tm[tid].name}: ` + ps.filter((p) => p.t === tid).map((p) => `${L.ROLE_KO[p.r]} ${p.n}(${Math.round(L.ovr(p))})`).join(', ') + '\n';
}
fs.writeFileSync(new URL('../선수명단.csv', import.meta.url), '﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n'));
console.log('행', rows.length - 1); console.log(show);
