// 선수 모드 자동 진행 점검: node tools/career_test.mjs [연도] [시즌 수]
import fs from 'node:fs';
globalThis.window = globalThis; const store = {}; globalThis.localStorage = { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; } };
const load = (f) => (0, eval)(fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'));
const year = Number(process.argv[2] || 2018), seasons = Number(process.argv[3] || 3);
['data/index.js', `data/y${year}.js`, 'data/rookies.js', 'js/core.js', 'js/skills.js', 'js/engine.js', 'js/world.js', 'js/sim.js', 'js/manage.js', 'js/recruit.js', 'js/staff.js', 'js/youth.js', 'js/career.js'].forEach(load);
const L = globalThis.LFM, W = L.world, C = L.career;
let S = W.newGame({ year, mode: 'team', teamId: globalThis.LFM_DATA[year].leagues[0].teams[0], seed: 11 });
const lg = S.leagues.KR2, tid = lg.teams.map((id) => S.teams[id]).sort((a, b) => a.rep - b.rep)[0].id;
C.start({ name: 'Tester', role: 2, type: 'mech', region: 'KR', teamId: tid }); S = W.get();
const t0 = Date.now(); let played = 0, bench = 0;
for (let i = 0; i < 336 * seasons; i++) {
  let r = W.advance();
  while (r.match) { const t = S.teams[S.user]; W.autoLineup(t); if (t.lineup.includes(S.me)) played++; else bench++; L.sim.playSeries(r.match, false); r = W.advance(); }
  if (W.windowOpen() && S.poffers.length && S.day % 20 === 0) { const best = S.poffers.map((o, i) => [S.teams[o.tid].rep, i]).sort((a, b) => b[0] - a[0])[0]; if (best[0] > S.teams[S.user].rep + 1) C.accept(best[1]); }
  if (S.day === 0) { const me = C.me(), c = me.car[me.car.length - 1]; console.log(S.year - 1, '종료 → 팀', S.teams[S.user].name, S.teams[S.user].league, '종합', Math.round(L.ovr(me)), '잠재', me.pot, '시즌', c ? `${c.g}경기 평점 ${c.r}` : '출전 없음', '자산', L.fmtMoney(S.cash), '제안', S.poffers.length); }
}
console.log('출전 시리즈', played, '벤치', bench, 'mgrs', JSON.stringify(S.mgrs), ((Date.now() - t0) / 1000).toFixed(1) + 's', '저장', W.save(0));
