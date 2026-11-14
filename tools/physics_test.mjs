import assert from 'node:assert/strict';
import '../js/core.js';import '../data/champions.js';import '../js/champions.js';import '../js/engine.js';
const L=globalThis.LFM;
function config(seed=82){const champions=['Gnar','LeeSin','Ahri','Jinx','Thresh','Renekton','Elise','Orianna','Ashe','Nautilus'];return {seed,year:2026,visuals:true,sides:[0,1].map(side=>({name:'Team '+side,players:Array.from({length:5},(_,role)=>({id:side*5+role,n:'P'+side+role,r:role,champion:champions[side*5+role],a:Array(10).fill(14)}))}))};}
function duel(){const m=new L.Match(config());m.all.forEach(p=>p.dead=9999);const a=m.all[3],b=m.all[8];for(const p of[a,b]){p.dead=0;p.y=400;p.hp=3000;p.life=0;}a.x=400;b.x=560;return {m,a,b};}
{
  const {m,a,b}=duel(),hp=b.hp;m.launchAttack(a,b,100,null);
  let collisionAt=0;
  for(let i=1;i<40;i++){m.t=i*.05;b.y+=.3;m.updateProjectiles(.05);if(b.hp<hp){collisionAt=m.t;break;}assert.equal(b.hp,hp);}
  assert(collisionAt>.18,'No pre-windup damage');assert(collisionAt<2,'Homing projectile must reach moving target');assert.equal(m.projectiles.length,0,'One collision consumes projectile');
  const hp2=b.hp;m.updateProjectiles(.05);assert.equal(b.hp,hp2,'No duplicate damage');console.log('PASS: moving target impacted at',collisionAt.toFixed(2),'seconds, damage applied once.');
}
{
  const {m,a,b}=duel();m.launchAttack(a,b,100,null);a.dead=20;m.t=.5;m.updateProjectiles(.5);assert.equal(m.projectiles.length,0);assert.equal(b.hp,3000,'Death cancels windup');
}
{
  const {m,a,b}=duel();m.launchAttack(a,b,100,null);m.t=.2;m.updateProjectiles(.05);b.life++;m.t=.3;m.updateProjectiles(.1);assert.equal(m.projectiles.length,0);assert.equal(b.hp,3000,'Old projectile must not hit a respawn');
}
{
  const {m,a,b}=duel(),blocker=m.all[7];blocker.dead=0;blocker.hp=3000;blocker.x=480;blocker.y=400;
  m.launchAttack(a,b,100,null,'spell',0);m.t=.35;m.updateProjectiles(.05);const shot=m.projectiles[0];shot.speed=3000;m.t=.4;m.updateProjectiles(.05);
  assert(blocker.hp<3000,'Swept collision catches first blocker at high speed');assert.equal(b.hp,3000,'Skillshot does not hit through first blocker');
}
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
assert(maxOverlap<.5,'Unit circles must not overlap by more than half a map unit');assert(maxWallPenetration<.05,'Units must not penetrate visible terrain');assert(maxStep<5,'No non-teleport position jumps');
const a=new L.Match(config()),b=new L.Match(config());for(let i=0;i<200;i++)a.step(1);for(let i=0;i<4000;i++)b.step(.05);
assert.deepEqual(a.all.map(p=>[p.x,p.y,p.hp,p.gold]),b.all.map(p=>[p.x,p.y,p.hp,p.gold]),'Playback speed / step batching must not change simulation');
console.log('PASS: terrain, body separation, bounded movement, swept collision, windup cancellation, respawn isolation and step batching.');
