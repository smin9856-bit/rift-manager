import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from './browser-test/node_modules/playwright/index.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});
const base=process.env.BASE_URL||'http://127.0.0.1:8765';
try{
  const page=await browser.newPage({viewport:{width:1200,height:1050}}),errors=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).hostname==='127.0.0.1')failed.push(r.url());});
  await page.goto(base+'/particle-preview.html');await page.evaluate(()=>LFM.nativeVfx.ready);
  assert.equal(await page.evaluate(()=>LFM.nativeVfx.stats().loaded),37);
  await page.getByRole('button',{name:'일시정지',exact:true}).click();
  const time=await page.evaluate(()=>preview.time);await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>preview.time),time);
  const proof=await page.evaluate(()=>{
    const data=JSON.stringify(LFM_PARTICLES);Math.random=()=>{throw Error('Visual renderer consumed RNG');};
    const freeze=o=>{if(o&&typeof o==='object'&&!Object.isFrozen(o)){Object.freeze(o);Object.values(o).forEach(freeze);}};freeze(LFM_PARTICLES);
    preview.time=1.08;preview.draw();const first=[...document.querySelectorAll('canvas')].map(c=>c.toDataURL());
    preview.time=2.4;preview.draw();preview.time=1.08;preview.draw();const second=[...document.querySelectorAll('canvas')].map(c=>c.toDataURL());
    const pixels=[...document.querySelectorAll('canvas')].map(c=>{const p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<p.length;i+=4)if(p[i+3]>60&&Math.max(p[i],p[i+1],p[i+2])>90)n++;return n;});
    return {equal:first.every((v,i)=>v===second[i]),unchanged:JSON.stringify(LFM_PARTICLES)===data,pixels,stats:LFM.nativeVfx.stats()};
  });
  assert(proof.equal,'same simulation time must produce the same pixels');assert(proof.unchanged);assert(proof.pixels.every(n=>n>150),'each skill must be visibly rendered');assert.equal(proof.stats.meshes,2);assert(proof.stats.tints<=96);
  await fs.mkdir('tools/test-output',{recursive:true});await page.screenshot({path:'tools/test-output/particles-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'tools/test-output/particles-mobile.png',fullPage:true});
  // Actual match wiring, including deterministic read-only replay of a representative shot.
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+'/match-preview.html');await page.evaluate(()=>LFM.nativeVfx.ready);
  const hooks=await page.evaluate(()=>{
    LFM.view.state().speed=0;
    const snapshot=m=>{const seen=new WeakSet();return JSON.stringify(m,(k,v)=>{if(v&&typeof v==='object'){if(seen.has(v))return '[reference]';seen.add(v);}return v;});};
    const canvas=document.createElement('canvas');canvas.width=canvas.height=1000;const c=canvas.getContext('2d');
    const used=new Set();for(const key of ['projectile','impact','beam','telegraph']){const fn=LFM.nativeVfx[key];LFM.nativeVfx[key]=(...args)=>{const ok=fn(...args);if(ok)used.add(key);return ok;};}
    let same=true;
    for(const[id,slot]of [['Ahri',0],['Ahri',2],['Ashe',3],['Lux',0],['Lux',3]]){
      const m=new LFM.Match({seed:42,visuals:true,year:2026,sides:[0,1].map(s=>({name:'T'+s,players:Array.from({length:5},(_,i)=>({id:s*5+i,n:'P'+i,r:i,champion:s?'Garen':id,a:Array(10).fill(14)}))}))});
      m.all.forEach(p=>p.dead=9999);const p=m.all[0],q=m.all[5];for(const a of[p,q]){a.dead=0;a.hp=3000;a.y=500;}p.x=350;q.x=500;
      m.launchAttack(p,q,50,null,'spell',slot);
      for(let i=0;i<32;i++){m.t+=.05;m.updateProjectiles(.05);const before=snapshot(m);LFM.combatVfx.draw(c,m,m.t,1);same&&=before===snapshot(m);}
    }
    return {same,used:[...used]};
  });
  assert(hooks.same,'rendering must not mutate match state');for(const hook of ['projectile','impact','beam','telegraph'])assert(hooks.used.includes(hook),'live '+hook+' hook');
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);console.log(JSON.stringify({passed:true,proof,hooks}));
}finally{await browser.close();}
