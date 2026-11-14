// Game design ratings (not official Riot balance ratings); real patch metadata lives in champions.js.
(function(G){
  const L=G.LFM,C=L.champions,D=L.competition={};
  const good={
    teamfight:'Amumu Annie Aphelios AurelionSol Azir Braum Galio Gnar JarvanIV Jinx Kennen Leona Lillia Malphite Maokai MissFortune MonkeyKing Nautilus Neeko Orianna Ornn Rakan Rell Renata Rumble Sejuani Seraphine Sona Swain Syndra Taric Varus Xayah Zac Ziggs',
    dive:'Aatrox Akali Alistar Camille Diana Ekko Galio Hecarim Irelia JarvanIV Jax Kaisa Kled LeeSin Leona Malphite MonkeyKing Nautilus Nocturne Pantheon Rakan Rell Renekton Rengar Sejuani Sylas Vi Viego XinZhao Yone Zac Zed',
    poke:'Ashe Caitlyn Corki Ezreal Heimerdinger Hwei Jayce Jhin Karma KogMaw Lux Maokai MissFortune Nidalee Seraphine Sivir Taliyah Varus Velkoz Viktor Xerath Ziggs Zoe Zyra',
    split:'Akali Camille DrMundo Fiora Gangplank Garen Gwen Irelia Jax Kayle Kennen Nasus Quinn Renekton Shen Singed Sion Teemo Trundle Tryndamere TwistedFate Udyr Urgot Vayne Volibear Yorick Yone Zed',
    pick:'Ahri Ashe Bard Blitzcrank Camille Elise Evelynn Fiddlesticks Galio Jhin Khazix Leblanc Leona Lissandra Lux Malzahar Morgana Nautilus Neeko Nocturne Poppy Pyke Rakan Rengar Sejuani Shaco Skarner Syndra Thresh TwistedFate Vi Zoe',
    early:'Annie Blitzcrank Caitlyn Darius Draven Elise JarvanIV Jayce Kalista Karma Kennen Kindred Leblanc LeeSin Leona Lucian MissFortune Nautilus Nidalee Nunu Olaf Pantheon Poppy Pyke RekSai Renekton Rengar Sett Talon Thresh Tristana Varus Vi Volibear XinZhao',
    late:'Anivia Aphelios AurelionSol Azir Cassiopeia Corki Fiora Gangplank Gwen Jax Jinx Kaisa Kassadin Kayle KogMaw Kindred Lulu Milio Nasus Orianna Ornn Ryze Senna Seraphine Sivir Smolder Sona Syndra Taric Tristana Twitch Vayne Veigar Viktor Vladimir Xayah Zeri'
  };
  const sets=Object.fromEntries(Object.entries(good).map(([k,v])=>[k,new Set(v.split(' '))]));
  D.fit=(id,style)=>{
    if(sets[style]?.has(id))return 1;
    const ch=C.get(id);if(!ch)return 0;
    if(style==='early'&&sets.late.has(id))return -1;
    if(style==='late'&&sets.early.has(id)&&!ch.tags.includes('Marksman'))return -1;
    if(style==='poke'&&ch.range<300&&!ch.tags.includes('Support')&&!sets.teamfight.has(id))return -1;
    if(style==='dive'&&['Xerath','Ziggs','Velkoz','KogMaw','Soraka','Janna','Sona','Yuumi'].includes(id))return -1;
    if(style==='teamfight'&&['Fiora','Tryndamere','Yorick','Quinn','Shaco','Rengar','Khazix'].includes(id))return -1;
    if(style==='split'&&['Amumu','Malphite','Rell','Nautilus','Leona','Alistar'].includes(id))return -1;
    return 0;
  };
  D.label=n=>n>0?'좋음':n<0?'나쁨':'보통';
  const masteryRanks=new Map();
  D.mastery=(p,id)=>{
    const role=p.r??0,pool=p.a?.[L.AI.pool]||10,key=p.id+':'+role;
    if(!masteryRanks.has(key))masteryRanks.set(key,C.pool(role,2026).slice().sort((a,b)=>L.hash(p.id+':'+a)-L.hash(p.id+':'+b)));
    const rank=masteryRanks.get(key).indexOf(id);
    const natural=rank>=0?(rank<3?74+pool*.65:39+pool*1.25+L.hash(p.id+id)%15):20+pool+L.hash(p.id+id)%18;
    return Math.round(L.clamp(natural+(p.championPractice?.[id]||0),10,100));
  };
  D.summary=(picks,style)=>{const values=picks.filter(Boolean).map(id=>D.fit(id,style)),avg=values.reduce((a,b)=>a+b,0)/Math.max(1,values.length),grade=avg>=.4?1:avg<=-.3?-1:0;return {grade,label:D.label(grade),factor:grade===1?1.08:grade===-1?.92:1,good:values.filter(x=>x===1).length,bad:values.filter(x=>x===-1).length};};
  D.fearless=(m,year,gameIndex=0)=>{
    const s=L.world?.get(),comp=s?.comps[m.comp],lg=comp?.lid?s.leagues[comp.lid]:null,name=lg?.name||comp?.name||'',region=lg?.region||comp?.region;
    if(m.bo<=1)return {mode:'none',label:'단판 · 일반 드래프트'};
    if(lg?.tier===2&&region==='CN'&&(year>2022||year===2022&&comp?.split==='summer')&&year<2025)return {mode:'soft',label:'LDL 소프트 피어리스 · 우리 팀 사용 챔피언 재선택 불가 (2022 서머 도입)'};
    if(lg?.tier===2&&region==='NA'&&year===2024){const summer=comp?.split==='summer';return {mode:summer?'hard':'soft',banCount:summer&&gameIndex===4?0:summer&&gameIndex===3?3:5,label:summer?'2024 NACL 서머 하드 피어리스 · 4세트 3밴 / 5세트 밴 없음':'2024 NACL 스프링 소프트 피어리스'};}
    if(lg?.tier===2&&region==='KR'&&year===2024&&comp?.split==='summer')return {mode:gameIndex===4?'none':'hard',label:gameIndex===4?'2024 LCK CL · 5세트 피어리스 제한 해제':'2024 LCK CL 하드 피어리스 · 5세트에서 제한 초기화'};
    if(year>=2025&&(comp?.type==='intl'||['KR','CN','EU','NA','TW','BR','LAT'].includes(region)||/LCK|LPL|LEC|LTA|LCP|LCS/.test(name)))return {mode:'hard',label:'하드 피어리스 · 양 팀이 이전 세트에 사용한 챔피언 재선택 불가'};
    if(year===2024&&region==='CN'&&comp?.split==='summer'&&m.stage==='reg')return {mode:'soft',label:'2024 LPL 소프트 피어리스 · 우리 팀 사용 챔피언 재선택 불가 (배치 단계 규칙을 게임 내 통합 정규 시즌에 적용)'};
    return {mode:'none',label:'일반 드래프트 · 세트마다 챔피언 재사용 가능'};
  };
  D.used=(history,teamId,mode)=>new Set((history||[]).flatMap(g=>(g.draft||[]).filter(x=>mode==='hard'||x.team===teamId).flatMap(x=>x.picks||[])));
  D.allowed=(id,{year,bans=[],taken=[],history=[],teamId,rule={mode:'none'}})=>C.get(id)?.year<=year&&!bans.includes(id)&&!taken.includes(id)&&(rule.mode==='none'||!D.used(history,teamId,rule.mode).has(id));
  D.choose=(p,role,style,context,seed)=>{
    let pool=C.pool(role,context.year).filter(id=>D.allowed(id,context));
    if(!pool.length)pool=C.available(context.year).map(c=>c.id).filter(id=>D.allowed(id,context));
    return pool.map(id=>({id,score:score(id)})).sort((a,b)=>b.score-a.score)[0]?.id;
    function score(id){return D.mastery(p,id)*.6+D.fit(id,style)*20+(L.hash(seed+':'+p.id+id)%100)*.12;}
  };
  D.draft=(teams,m,tactics,history=[],seed=1,bansOverride)=>{
    const year=L.world.get().year,rule=D.fearless(m,year,history.length),banCount=rule.banCount??(year>=2017?5:3),bans=bansOverride?bansOverride.slice():[];
    if(!bansOverride)for(let si=0;si<2;si++)for(let i=0;i<banCount;i++){
      const target=L.sim.lineup(teams[1-si])[i%5],id=D.choose(target,i%5,tactics[1-si].style,{year,bans,taken:[],history,teamId:teams[1-si].id,rule},seed+':ban');if(id)bans.push(id);
    }
    const picks=[];
    for(let si=0;si<2;si++)L.sim.lineup(teams[si]).forEach((p,i)=>picks.push(D.choose(p,i,tactics[si].style,{year,bans,taken:picks,history,teamId:teams[si].id,rule},seed)));
    return {picks,bans,rule,banCount};
  };
  D.decorate=(cfg,teams,picks)=>{
    cfg.sides.forEach((side,si)=>{side.tactics={...side.tactics,ban:-1};side.composition=D.summary(picks.slice(si*5,si*5+5),side.tactics.style);side.players.forEach((p,i)=>{
      const original=L.world.get().players[p.id]||p;p.champion=picks[si*5+i];p.championMastery=D.mastery(original,p.champion);p.championFit=D.fit(p.champion,side.tactics.style);
      p.draftFactor=(.72+p.championMastery*.0048)*(C.pool(i,cfg.year).includes(p.champion)?1:.86);
    });});return cfg;
  };
  D.seriesLength=()=>1; // 정규 시즌은 항상 단판
  D.video=(id,slot)=>{const key=String(C.get(id).key).padStart(4,'0');return `https://d28xe8vt774jo5.cloudfront.net/champion-abilities/${key}/ability_${key}_${'QWER'[slot]}1.webm`;};
})(typeof window!=='undefined'?window:globalThis);
