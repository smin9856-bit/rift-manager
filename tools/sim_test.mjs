// 엔진 밸런스 점검: node tools/sim_test.mjs [경기수] [전력차]
import '../js/core.js';
import '../js/engine.js';
const L = globalThis.LFM;
const n = Number(process.argv[2] || 200), gap = Number(process.argv[3] || 0);
const r = L.rng(42);
function team(base, tag) {
  return [0, 1, 2, 3, 4].map((role) => ({ id: tag + role, n: tag + L.ROLES[role], r: role, a: Array.from({ length: 10 }, () => L.clamp(Math.round(r.norm(base, 1.6)), 1, 20)) }));
}
let w0 = 0, dur = 0, kills = 0, tw = 0, dr = 0, ba = 0, minD = 1e9, maxD = 0, cs = 0, t0 = Date.now(), long = 0, gold = 0;
const hist = {};
for (let i = 0; i < n; i++) {
  const res = L.simulate({ seed: 1000 + i, year: 2022, sides: [
    { name: 'A', players: team(14 + gap, 'A'), tactics: { style: r.pick(L.STYLE_KEYS) } },
    { name: 'B', players: team(14, 'B'), tactics: { style: r.pick(L.STYLE_KEYS) } }] });
  if (res.winner === 0) w0++;
  const d = res.duration / 60; dur += d; minD = Math.min(minD, d); maxD = Math.max(maxD, d); if (d > 50) long++;
  hist[Math.floor(d / 5) * 5] = (hist[Math.floor(d / 5) * 5] || 0) + 1;
  kills += res.kills[0] + res.kills[1]; tw += res.towers[0] + res.towers[1]; dr += res.dragons[0] + res.dragons[1]; ba += res.barons[0] + res.barons[1];
  cs += res.players.filter((p) => p.role === 3).reduce((a, p) => a + p.cs / d, 0) / 2; gold += (res.gold[0] + res.gold[1]) / 2 / d;
  if (i < 2) console.log(res.kills, res.towers, d.toFixed(1), res.players.map((p) => `${p.k}/${p.d}/${p.a} ${p.cs} ${p.gold} L${p.lvl} ${p.rating.toFixed(1)}`).join(' | '));
}
console.log(`블루 승률 ${(w0 / n * 100).toFixed(1)}%  평균 ${ (dur / n).toFixed(1)}분 (${minD.toFixed(0)}~${maxD.toFixed(0)}, 50분↑ ${long})  킬 ${(kills / n).toFixed(1)}  타워 ${(tw / n).toFixed(1)}  용 ${(dr / n).toFixed(1)}  바론 ${(ba / n).toFixed(2)}  원딜CS/분 ${(cs / n).toFixed(1)}  팀골드/분 ${(gold / n).toFixed(0)}  ${((Date.now() - t0) / n).toFixed(1)}ms/경기`);
console.log(hist);
