// Persistent management systems. Dates use the game's 336-day season calendar.
(function(G){
  const L=G.LFM,W=L.world,D=L.competition,F=L.features={};
  F.day=()=>W.get().year*336+W.get().day;
  F.train=(pid,id)=>{const s=W.get(),p=s.players[pid];if(!p||p.t!==s.user||(s.mode==='player'&&pid!==s.me)||id&&(!L.champions.get(id)||L.champions.get(id).year>s.year))return false;p.championTraining=id||null;return true;};
  F.loanLimit=t=>Math.max(0,Math.floor(W.sponsor(t)*.6/100)*100);
  F.borrow=(amount,weeks)=>{
    const s=W.get(),t=s.teams[s.user];amount=Number(amount);weeks=Number(weeks);
    if(s.mode==='player'||t.loan?.balance>0)return {ok:false,msg:'구단당 대출은 하나만 유지할 수 있습니다.'};
    if(!Number.isSafeInteger(amount)||amount<100||amount>F.loanLimit(t)||![12,24,48].includes(weeks))return {ok:false,msg:'대출 한도 안에서 100 이상의 정수 금액과 기간을 선택하세요.'};
    t.loan={principal:amount,balance:amount,weeks,left:weeks,rate:.08,next:F.day()+7,paidInterest:0};
    W.pay(t,amount,'대출 원금 입금');t.fin.inc-=amount;
    return {ok:true,msg:'대출이 실행되었습니다. 7일마다 원금과 이자가 자동 상환됩니다.'};
  };
  F.repay=()=>{const t=W.get().teams[W.get().user],loan=t.loan;if(!loan?.balance)return {ok:false,msg:'상환할 대출이 없습니다.'};if(t.money<loan.balance)return {ok:false,msg:'잔여 원금을 갚을 자금이 부족합니다.'};const n=loan.balance;W.pay(t,-n,'대출 중도 상환');t.fin.exp-=n;loan.balance=0;loan.left=0;return {ok:true,msg:'수수료 없이 전액 상환했습니다.'};};
  F.finance=()=>{const now=F.day()+1;for(const t of Object.values(W.get().teams)){const l=t.loan;if(!l?.balance||now<l.next)continue;const principal=l.left===1?l.balance:Math.min(l.balance,Math.ceil(l.principal/l.weeks)),interest=Math.round(l.balance*l.rate/48);W.pay(t,-principal-interest,'대출 정기 상환 (이자 '+L.fmtMoney(interest)+')');t.fin.exp-=principal;l.balance-=principal;l.left--;l.next+=7;l.paidInterest+=interest;if(t.money<0&&t.id===W.get().user)W.news('대출 상환 후 자금 부족','대출 상환으로 구단 잔액이 적자가 되었습니다. 재정 화면에서 지출을 조정하세요.','board');}};
  F.rules=lg=>{const s=W.get(),pair=Object.values(s.leagues).find(x=>x.region===lg.region&&x.tier!==lg.tier);if(!pair)return '이 리그에는 게임 내 연결된 상·하부 리그가 없어 승강전을 치르지 않습니다.';return `${lg.name} ↔ ${pair.name}. 게임 내 규칙: 1부 서머 정규 시즌 최하위 vs 2부 서머 최종 1위, 1부 끝에서 두 번째 vs 2부 최종 2위. 각 5전 3선승, 시즌 ${W.CAL.promo+1}~${W.CAL.promo+2}일에 진행. 2부 팀이 승리하면 다음 연도부터 두 팀의 소속 리그를 교환합니다. 실제 프랜차이즈 제도와 구분되는 이 게임의 공통 승강 규칙입니다.`;};
  F.publish=()=>{
    const s=W.get(),stamp=F.day()+1;if(s.pressLast===stamp)return;
    const played=s.matches.some(m=>m.res&&m.day===s.day&&(m.a===s.user||m.b===s.user));
    const special=s.news.filter(n=>n.day===s.day&&n.year===s.year&&/템퍼링|사전 합의|마음이 떠났다|접촉 시도|승격|영입 완료|입단 희망|이적 제안|감독 선임|유스 발굴|1군 승격|합류|이사회|스폰서 위약금|새 시즌 챔피언|프로 데뷔|고유 스킬/.test(n.title)).slice(0,2);
    if(!played&&!special.length)return;
    s.pressLast=stamp;s.press ||= [];const articles=special.map(n=>({tag:'속보',title:n.title,body:n.body})),name=id=>s.teams[id]?.name||id;
    const recent=s.matches.filter(m=>m.res&&m.day>=s.day-2&&m.day<=s.day).sort((a,b)=>(b.a===s.user||b.b===s.user)-(a.a===s.user||a.b===s.user)||b.day-a.day);
    if(recent.length){const m=recent[0],win=m.res.s[0]>m.res.s[1]?m.a:m.b,loss=win===m.a?m.b:m.a,k=m.res.g.reduce((n,g)=>n+g.k[0]+g.k[1],0);articles.push({tag:'MATCH REPORT',title:[`${name(win)}, ${name(loss)} 상대로 승전보`,`${name(win)}의 승리로 끝난 맞대결`,`${name(win)}, 승점 경쟁에 탄력을 받다`][stamp%9/3|0],body:`${s.comps[m.comp]?.name||'공식 경기'}에서 ${name(m.a)}와 ${name(m.b)}가 ${m.res.s.join(' : ')}의 결과를 남겼다. ${m.res.g.length}세트 동안 양 팀 합계 ${k}킬이 기록됐다. ${m.res.g.some(g=>g.draft?.length)?'챔피언 선택과 시리즈 운영이 다음 맞대결에서도 관전 포인트다.':''}`});}
    const next=s.matches.filter(m=>!m.res&&m.day>s.day&&m.day<=s.day+12).sort((a,b)=>(b.a===s.user||b.b===s.user)-(a.a===s.user||a.b===s.user)||a.day-b.day)[0];
    if(next){const a=s.teams[next.a],b=s.teams[next.b],pr=Math.round(100/(1+Math.exp(-.08*(W.teamOvr(a)-W.teamOvr(b)))));articles.push({tag:'PREVIEW',title:`${a.short} vs ${b.short}, ${L.STYLES[a.tactics.style].ko}와 ${L.STYLES[b.tactics.style].ko}의 대결`,body:`${W.shortDate(next.day,s.year)} 예정된 경기. 현재 선발 종합 능력을 기준으로 한 본지 모델은 ${a.name}의 승리 가능성을 ${pr}%로 예상한다. 밴픽 이전의 추정치이며 실제 결과를 보장하지 않는다. ${L.STYLES[a.tactics.style].desc}`});}
    const rookies=Object.values(s.players).filter(p=>p.t&&s.year-p.by<=21).sort((a,b)=>L.ovr(b)-L.ovr(a)),rookie=rookies[Math.floor(stamp/3)%Math.min(rookies.length,24)];
    if(rookie)articles.push({tag:'RISING STAR',title:`${s.year-rookie.by}세 ${rookie.n}, 미래를 향한 성장`,body:`${name(rookie.t)}의 ${L.ROLE_KO[rookie.r]} ${rookie.n}를 주목한다. 현재 종합 능력 ${Math.round(L.ovr(rookie))}, 시즌 ${rookie.ss.g}경기${rookie.ss.g?' 평균 평점 '+(rookie.ss.r/rookie.ss.g).toFixed(2):''}. ${rookie.championTraining?L.champions.get(rookie.championTraining).name+' 집중 훈련으로 챔피언 폭도 넓히고 있다.':'출전 경험과 챔피언 숙련을 쌓는 과정이 다음 시즌의 관건이다.'}`});
    const t=s.teams[s.user],players=W.roster(t.id),p=players[Math.floor(stamp/3)%players.length];
    if(p){const picks=L.champions.pool(p.r,s.year).sort((a,b)=>D.mastery(p,b)-D.mastery(p,a)),id=picks[0];articles.push({tag:['TACTICS','TRAINING','CLUB WATCH'][Math.floor(stamp/3)%3],title:[`${t.short}, ${L.STYLES[t.tactics.style].ko} 조합의 열쇠는?`,`${p.n}의 주력 챔피언을 살펴보다`,`${t.name} 훈련장 리포트`][Math.floor(stamp/3)%3],body:`${p.n}의 ${L.champions.get(id)?.name||'주력 챔피언'} 숙련도는 ${D.mastery(p,id)}. 현재 팀 전술과의 적합도는 ‘${D.label(D.fit(id,t.tactics.style))}’로 분류된다. ${p.championTraining?'집중 훈련 중인 챔피언은 '+L.champions.get(p.championTraining).name+'이다.':'피어리스 시리즈에서는 두 번째, 세 번째 선택지까지 준비할 필요가 있다.'} 이 수치는 게임 내 선수·전술 평가에 따른 분석이다.`});}
    s.pressCount=(s.pressCount||0)+1;s.press.unshift({number:s.pressCount,id:stamp,year:s.year,day:s.day,read:false,articles});s.press.length=Math.min(40,s.press.length);
  };
  const daily=L.manage.daily;
  L.manage.daily=function(){daily();const s=W.get();for(const p of Object.values(s.players)){let id=p.championTraining;if(!id&&p.t&&!W.managed(p.t))id=L.champions.pool(p.r,s.year)[Math.floor(s.day/28)%L.champions.pool(p.r,s.year).length];if(!id||L.champions.get(id)?.year>s.year)continue;p.championPractice ||= {};const skill=D.mastery(p,id),fac=s.teams[p.t]?.fac||1;p.championPractice[id]=Math.min(80,(p.championPractice[id]||0)+(.14+fac*.02)*(1-skill/130));}F.finance();F.publish();};
  const load=W.load;W.load=function(slot){const ok=load(slot);if(ok){const s=W.get();for(const m of s.matches){const c=s.comps[m.comp];if(!m.res&&m.stage==='reg'&&c?.lid)m.bo=1;}}return ok;};
  const rollover=L.manage.rollover;L.manage.rollover=function(){const before=new Set(CAvailable());rollover();const added=L.champions.available(W.get().year).filter(c=>!before.has(c.id));if(added.length)W.news('새 시즌 챔피언 합류',added.map(c=>c.name).join(', ')+' 챔피언이 출시 연도에 따라 밴픽과 훈련에 추가되었습니다.','info');};
  function CAvailable(){return L.champions.available(W.get().year).map(c=>c.id);}
  F.holiday=null;
  F.vacation=async(days,stopAtMatch,onProgress)=>{
    if(F.holiday||L.view?.active()||L.net?.role)return {ok:false,msg:'휴가는 싱글플레이의 경기 밖에서 시작할 수 있습니다.'};
    days=Number(days);if(!Number.isInteger(days)||days<1||days>336)return {ok:false,msg:'휴가 기간은 1~336일입니다.'};
    const s=W.get(),job=F.holiday={cancel:false,days,done:0,wins:0,losses:0};let reason='예정된 복귀일 도착';
    try{while(job.done<days&&!job.cancel&&W.get()===s){const m=W.userMatchToday();if(m){if(stopAtMatch){reason='다음 경기 전 복귀';break;}if(s.auto?.lineup)W.autoLineup(s.teams[s.user]);L.sim.playSeries(m,false);const mine=m.a===s.user?0:1;if(m.res.s[mine]>m.res.s[1-mine])job.wins++;else job.losses++;}W.advance();job.done++;onProgress?.(job);await new Promise(r=>setTimeout(r,0));}if(job.cancel)reason='휴가 중단';return {ok:true,msg:`${reason} · ${job.done}일 진행 · ${job.wins}승 ${job.losses}패`,...job};}finally{F.holiday=null;}
  };
})(typeof window!=='undefined'?window:globalThis);
