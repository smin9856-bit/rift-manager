import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../js/core.js';
import '../data/champions.js';
import '../js/champions.js';
import '../js/engine.js';
const L=globalThis.LFM,C=L.champions;
assert.equal(Object.keys(C.all).length,173);
for(const c of Object.values(C.all)) {
  for(const f of [`assets/champions/${c.id}.png`,`assets/passive/${c.passive.icon}`,...c.spells.map(s=>`assets/spells/${s.icon}`)]) {
    const b=fs.readFileSync(new URL('../'+f,import.meta.url));assert.equal(b.subarray(1,4).toString(),'PNG',f);
  }
}
const players=Array.from({length:10},(_,i)=>({id:'p'+i,n:'Player'+i,r:i%5,a:Array(10).fill(14)}));
for(let year=2014;year<=2026;year++)for(let seed=1;seed<=20;seed++) {
  const picks=C.draft(players,year,seed);assert.equal(new Set(picks).size,10);assert(picks.every(id=>C.get(id).year<=year));
}
let castCount=0,ultCount=0;
for(let seed=1;seed<=8;seed++) {
  const picks=C.draft(players,2026,seed), roster=players.map((p,i)=>({...p,champion:picks[i]}));
  const cfg={seed,year:2026,sides:[{name:'Blue',players:roster.slice(0,5)},{name:'Red',players:roster.slice(5)}]};
  const m=new L.Match({...cfg,visuals:true});let last=0;
  while(!m.done){m.step(1);assert(m.fx.length<=160);for(const e of m.fx.filter(e=>e.id>last)) {
    assert(Number.isFinite(e.amount));assert(Number.isFinite(e.tx));assert(Number.isFinite(e.ty));
    if(e.slot>=0){castCount++;const p=m.all[e.source];assert(p.cooldowns[e.slot]>m.t);if(e.slot===3){ultCount++;assert(p.lvl>=6);}}
  }last=m.fxSeq;}
  assert.deepEqual(m.result(),L.simulate(cfg),'Rendering must not change match outcome');
}
assert(castCount>0);assert(ultCount>0);
console.log(`PASS: 1,038 PNG assets, 2014–2026 drafts, bounded effects, ${castCount} casts / ${ultCount} ult effects, 8 deterministic full matches.`);
