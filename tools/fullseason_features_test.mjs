import './features_test.mjs';
const W=LFM.world,F=LFM.features,s=W.get(),year=s.year,day=s.day;
const start=performance.now();const result=await F.vacation(336,false,j=>{if(j.done%84===0)console.log('Season progression',j.done,'days');});
if(!result.ok||s.year!==year+1||s.day!==day)throw Error('Full-season progression failed');
for(const t of Object.values(s.teams))if(!Number.isFinite(t.money)||t.loan?.balance<0)throw Error('Invalid finance state');
console.log('PASS: complete season, competitions, promotion/relegation, rollover, press, training and finance in',((performance.now()-start)/1000).toFixed(1),'seconds');
