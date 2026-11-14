import fs from 'node:fs';import assert from 'node:assert/strict';
globalThis.window=globalThis;const store={};globalThis.localStorage={setItem:(k,v)=>store[k]=v,getItem:k=>store[k]};
for(const f of ['data/index.js','data/y2024.js','data/y2026.js','data/rookies.js','js/core.js','js/skills.js','data/champions.js','js/champions.js','js/engine.js','js/abilities.js','js/world.js','js/sim.js','js/competition.js','js/manage.js','js/staff.js','js/youth.js','js/career.js','js/systems.js'])(0,eval)(fs.readFileSync(new URL('../'+f,import.meta.url),'utf8'));
const L=LFM,W=L.world,D=L.competition,F=L.features,C=L.champions;
let s=W.newGame({year:2026,mode:'team',teamId:LFM_DATA[2026].leagues[0].teams[0],seed:71}),t=s.teams[s.user],p=W.roster(t.id)[0];
assert(!C.available(2014).some(c=>c.id==='Bard'));assert(C.available(2015).some(c=>c.id==='Bard'));
const id=C.pool(p.r,s.year).sort((a,b)=>D.mastery(p,a)-D.mastery(p,b))[0],old=D.mastery(p,id);assert(F.train(p.id,id));assert(!F.train(p.id,'NotAChampion'));
const n=Math.min(1000,F.loanLimit(t)),cash=t.money,inc=t.fin.inc;assert(F.borrow(n,12).ok);assert.equal(t.money,cash+n);assert.equal(t.fin.inc,inc);assert(!F.borrow(500,24).ok);assert(!F.borrow(NaN,12).ok);
const holiday=await F.vacation(30,false);assert(holiday.ok);assert.equal(s.day,30);assert.equal(s.press.length,10);assert.equal(new Set(s.press.map(x=>x.id)).size,10);assert(D.mastery(p,id)>old);assert(t.loan.balance<n);assert(t.loan.paidInterest>0);
const before=t.money,balance=t.loan.balance,exp=t.fin.exp;assert(F.repay().ok);assert.equal(t.money,before-balance);assert.equal(t.fin.exp,exp);
// Fearless needs a series fixture even when the season's regular matches are BO1.
const fixture=s.matches.find(m=>s.comps[m.comp]?.lid===t.league&&!m.res);assert(fixture);const m={...fixture,bo:3};L.sim.playSeries(m,false);const seen=new Set();for(const g of m.res.g){assert.equal(g.draft.length,2);assert.equal(g.bans.length,10);for(const pick of g.draft.flatMap(d=>d.picks)){assert(!seen.has(pick),'Hard fearless reuse');assert(!g.bans.includes(pick));seen.add(pick);}}
const teams=[s.teams[m.a],s.teams[m.b]],cfg=L.sim.cfg(...teams,m,teams[0].tactics,teams[1].tactics),draft=D.draft(teams,m,teams.map(t=>t.tactics));D.decorate(cfg,teams,draft.picks);const live=new L.Match(cfg);assert.equal(live.sides[0].composition.factor,cfg.sides[0].composition.factor);assert(cfg.sides[0].players.every(p=>p.championMastery&&p.draftFactor));
assert(W.save(0));assert(W.load(0));s=W.get();assert.equal(s.players[p.id].championTraining,id);assert.equal(s.press.length,10);assert.equal(s.teams[t.id].loan.balance,0);
const day=s.day;const stop=await F.vacation(90,true);assert(stop.ok);assert(W.userMatchToday());assert(s.day>=day);const same=s.day;const cancel=await F.vacation(30,false,()=>{F.holiday.cancel=true;});assert.equal(cancel.done,1);assert.equal(s.day,same+1);
const d2024=LFM_DATA[2024];s=W.newGame({year:2024,mode:'team',teamId:d2024.leagues[0].teams[0],seed:3});s.comps.test={lid:'NA2',split:'spring'};assert.equal(D.fearless({comp:'test',bo:5},2024).mode,'soft');s.comps.test.split='summer';assert.equal(D.fearless({comp:'test',bo:5},2024,4).banCount,0);s.comps.test.lid='KR2';assert.equal(D.fearless({comp:'test',bo:5},2024,4).mode,'none');
const hp=[{draft:[{team:'a',picks:['Ahri']},{team:'b',picks:['Lux']}]}];assert.deepEqual([...D.used(hp,'a','soft')],['Ahri']);assert.equal(D.used(hp,'b','hard').size,2);
// A full holiday crosses the season boundary with finances, press and mastery intact.
t=s.teams[s.user];assert(F.borrow(Math.min(1000,F.loanLimit(t)),48).ok);s.day=330;const rollover=await F.vacation(14,false);assert(rollover.ok);assert.equal(s.year,2025);assert.equal(s.day,8);assert(s.teams[t.id].loan.balance>0);assert(s.press.length>=4);
console.log('PASS: year unlocks, mastery training, loans/accounting, 3-day newspaper, save/load, vacation/cancel/stop, season rollover, hard/soft fearless and live draft modifiers.');
