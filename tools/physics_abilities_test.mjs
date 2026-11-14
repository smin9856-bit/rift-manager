import assert from 'node:assert/strict';
import '../js/core.js';import '../data/champions.js';import '../js/champions.js';import '../js/engine.js';import '../js/abilities.js';
const L=globalThis.LFM;
function config(seed=82){const champions=['Gnar','LeeSin','Ahri','Jinx','Thresh','Renekton','Elise','Orianna','Ashe','Nautilus'];return {seed,year:2026,visuals:true,sides:[0,1].map(side=>({name:'Team '+side,players:Array.from({length:5},(_,role)=>({id:side*5+role,n:'P'+side+role,r:role,champion:champions[side*5+role],a:Array(10).fill(14)}))}))};}
function duel(){const m=new L.Match(config());m.all.forEach(p=>p.dead=9999);const a=m.all[3],b=m.all[8];for(const p of[a,b]){p.dead=0;p.y=400;p.hp=3000;p.life=0;}a.x=400;b.x=560;return {m,a,b};}
let minGap=Infinity,maxOverlap=0,maxWallPenetration=0,maxStep=0,frames=0;
const m=new L.Match(config());const start=performance.now();
while(m.t<600&&!m.done){
  const before=m.all.map(p=>({x:p.x,y:p.y,dead:p.dead,recall:p.recall,tp:!!p.tp}));m.step(.05);frames++;
  const alive=m.all.filter(p=>!p.dead);
  for(let i=0;i<alive.length;i++){
    const p=alive[i],old=before[p.idx];if(!old.dead&&!old.recall&&!old.tp)maxStep=Math.max(maxStep,Math.hypot(p.x-old.x,p.y-old.y));
    for(let j=i+1;j<alive.length;j++){const d=Math.hypot(p.x-alive[j].x,p.y-alive[j].y);minGap=Math.min(minGap,d);maxOverlap=Math.max(maxOverlap,L.MAP.BODY*2-d);}
    for(const w of L.MAP.WALLS)maxWallPenetration=Math.max(maxWallPenetration,w.r+L.MAP.BODY-Math.hypot(p.x-w.x,p.y-w.y));
    assert(Number.isFinite(p.x)&&Number.isFinite(p.hp));
  }
}
console.log(JSON.stringify({frames,gameMinutes:m.t/60,minGap,maxOverlap,maxWallPenetration,maxStep,msPerPhysicsFrame:(performance.now()-start)/frames},null,2));
assert(maxOverlap<.5,'Unit circles must not overlap by more than half a map unit');assert(maxWallPenetration<.05,'Units must not penetrate visible terrain');assert(maxStep<30,'Dash and displacement have bounded per-frame movement');
const a=new L.Match(config()),b=new L.Match(config());for(let i=0;i<200;i++)a.step(1);for(let i=0;i<4000;i++)b.step(.05);
assert.deepEqual(a.all.map(p=>[p.x,p.y,p.hp,p.gold]),b.all.map(p=>[p.x,p.y,p.hp,p.gold]),'Playback speed / step batching must not change simulation');
console.log('PASS: integrated ability movement, terrain, body separation and step batching.');
