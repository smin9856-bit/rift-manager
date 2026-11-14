// 시즌 전체를 자동 진행해 보는 점검 스크립트: node tools/season_test.mjs [연도] [시즌 수] [팀id]
import fs from 'node:fs';
globalThis.window = globalThis;
const store = {}; globalThis.localStorage = { getItem: (k) => store[k] || null, setItem: (k, v) => { store[k] = v; } };
const load = (f) => (0, eval)(fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8'));
const year = Number(process.argv[2] || 2014), seasons = Number(process.argv[3] || 1);
['data/index.js', `data/y${year}.js`, 'data/rookies.js', 'js/core.js', 'js/skills.js', 'js/engine.js', 'js/world.js', 'js/sim.js', 'js/manage.js', 'js/recruit.js', 'js/staff.js', 'js/youth.js', 'js/career.js'].forEach(load);
const L = globalThis.LFM, W = L.world;
const D = globalThis.LFM_DATA[year];
const S = W.newGame({ year, mode: process.argv[4] === 'create' ? 'create' : 'team', teamId: process.argv[4] || D.leagues[0].teams[0], seed: 7, create: { name: 'Test FC', short: 'TST', color: '#f0f', region: 'KR' } });
console.log('리그', Object.keys(S.leagues).length, '팀', Object.keys(S.teams).length, '선수', Object.keys(S.players).length, '유저', S.teams[S.user].name, '별', W.stars(S.teams[S.user]));
const t0 = Date.now(); let games = 0;
for (let i = 0; i < 336 * seasons; i++) {
  let r = W.advance();
  while (r.match) { L.sim.playSeries(r.match, true); games++; r = W.advance(); }
  if (S.day === 100 || S.day === 232) {
    const lg = S.leagues[S.teams[S.user].league], c = S.comps[`${lg.id}:${S.day === 100 ? 'spring' : 'summer'}`];
    console.log(S.year, c.name, '우승', S.teams[c.champ]?.name, '| 순위', W.table(W.compMatches(c.id, 'reg'), c.teams).slice(0, 6).map((x) => `${S.teams[x.t].short} ${x.w}-${x.l}(${Math.round(W.teamOvr(S.teams[x.t]))})`).join(' '));
  }
  if (S.day === 0) console.log('→', S.year, '시작. 선수', Object.keys(S.players).length, 'FA', Object.values(S.players).filter((p) => !p.t).length, '유저 리그', S.teams[S.user].league, '자금', L.fmtMoney(S.teams[S.user].money), ((Date.now() - t0) / 1000).toFixed(1) + 's');
}
console.log(S.hist.filter((h) => h.intl || /LCK|LPL|LEC|EU LCS|LCS/.test(h.comp)).map((h) => `${h.comp}: ${h.champ}`).join('\n'));
console.log('유저 시리즈', games, '소식', S.news.length, '저장', W.save(0), (JSON.stringify(S).length / 1e6).toFixed(2) + 'MB', ((Date.now() - t0) / 1000).toFixed(1) + 's');
