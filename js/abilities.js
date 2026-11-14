// Web simulation of champion mechanics; Riot descriptions/ranges are source metadata.
// Geometry, damage scaling and durations below are explicit simulation adaptations.
(function(G){
  const L=G.LFM,C=L.champions,A=L.abilities={},P=L.Match.prototype;
  const kits={
    Ahri:['return','target','charm','dash'],Ashe:['buff','volley','vision','arrow'],Blitzcrank:['hook','buff','knockup','silence'],
    Thresh:['hook','shield','sweep','zone'],Nautilus:['hook','shield','slowarea','knockupTarget'],Pyke:['hook','buff','dashstun','execute'],
    Malphite:['slowtarget','buff','slowarea','dashknockup'],Orianna:['ball','ballzone','shield','shockwave'],Lux:['root','shield','zone','laser'],
    Morgana:['root','zone','shield','stunarea'],Leona:['buff','shield','dashroot','stunarea'],Amumu:['dashstun','aura','area','stunarea'],
    JarvanIV:['line','shield','area','dasharea'],XinZhao:['buff','line','dashtarget','sweep'],LeeSin:['line','shield','slowarea','kick'],
    Sejuani:['dashknockup','sweep','stuntarget','arrow'],Vi:['dashknockup','passive','buff','dashknockup'],Rakan:['lineheal','dashknockup','shield','charmarea'],
    Rell:['lineStun','dashknockup','buff','magnet'],Alistar:['knockuparea','dashtarget','stunarea','resist'],Braum:['slowline','shield','shield','waveknockup'],
    Nami:['bubble','heal','buff','waveknockup'],Janna:['tornado','slowtarget','shield','healarea'],Soraka:['zoneheal','heal','silencezone','healall'],
    Lulu:['line','polymorph','shield','grow'],Karma:['line','roottarget','shield','buff'],Renata:['hook','shield','line','berserk'],
    Sona:['target','healarea','buff','lineStun'],Seraphine:['area','healarea','root','charmline'],Milio:['knockback','healarea','shield','healarea'],
    Zilean:['bomb','buff','slowtarget','revive'],Taric:['heal','shield','lineStun','invulnerable'],Yuumi:['slowline','heal','shield','waveheal'],
    Annie:['target','cone','shield','summon'],Brand:['lineStun','area','target','bounce'],Veigar:['line','area','cage','execute'],
    Syndra:['sphere','area','push','target'],Viktor:['shieldtarget','slowzone','laser','storm'],Azir:['line','summon','dash','wallpush'],
    Kennen:['line','area','dash','stormstun'],Rumble:['flamecone','shield','slowline','fireline'],Cassiopeia:['poison','poisonzone','target','stuncone'],
    Anivia:['slowline','wall','target','storm'],Lissandra:['slowline','rootarea','dash','stuntarget'],Galio:['area','taunt','dashknockup','arrival'],
    TwistedFate:['volley','stuntarget','passive','teleport'],Ryze:['line','roottarget','bounce','teleport'],Leblanc:['target','dasharea','root','target'],
    Zoe:['line','teleport','sleep','teleport'],Zed:['line','dash','sweep','execute'],Akali:['cone','stealth','dash','dasharea'],
    Yasuo:['tornado','windwall','dashtarget','knockupTarget'],Yone:['line','shieldcone','dash','dashknockup'],
    Jinx:['buff','slowline','rootzone','rocket'],Ezreal:['line','line','dash','laser'],Jhin:['target','root','trap','snipe'],
    Caitlyn:['line','rootzone','dash','snipe'],Varus:['line','buff','slowzone','root'],MissFortune:['bounce','buff','slowzone','barrage'],
    Lucian:['laser','line','dash','barrage'],Sivir:['return','buff','shield','buff'],Xayah:['line','buff','root','volley'],
    Kaisa:['volley','line','buff','shielddash'],Kalista:['line','vision','target','arrival'],Vayne:['dash','passive','knockback','buff'],
    Draven:['buff','buff','push','return'],Tristana:['buff','dasharea','bomb','knockback'],Aphelios:['line','buff','passive','area'],
    Smolder:['target','cone','dash','waveheal'],Zeri:['line','laser','dash','storm'],Corki:['area','dash','flamecone','rocket'],
    Gnar:['return','lineStun','dasharea','wallpush'],Ornn:['line','flamecone','dashknockup','waveknockup'],Sion:['knockuparea','shield','slowline','dashknockup'],
    Renekton:['drainarea','stuntarget','dash','resist'],Darius:['drainarea','slowtarget','pull','execute'],Garen:['silencetarget','resist','aura','execute'],
    Aatrox:['knockuparea','root','dash','resist'],Camille:['buff','cone','dashstun','dasharea'],Fiora:['dashtarget','parry','buff','healarea'],
    Jax:['dashtarget','buff','stunarea','resist'],Gwen:['cone','resist','dash','volley'],Irelia:['dashtarget','resist','lineStun','zone'],
    Shen:['buff','parry','taunt','shieldall'],Sett:['buff','shieldcone','pull','dasharea'],Poppy:['area','resist','dashstun','knockback'],
    Wukong:['buff','stealth','dashtarget','stormknockup'],MonkeyKing:['buff','stealth','dashtarget','stormknockup'],
    Gangplank:['target','selfheal','bomb','storm'],Nasus:['buff','slowtarget','zone','resist'],Vladimir:['drain','resist','drainarea','zone'],
    Maokai:['knockback','dashroot','trap','rootwave'],Zac:['pull','area','arrival','knockuparea'],Nocturne:['line','shield','fear','dashtarget'],
    Hecarim:['sweep','healarea','dash','fearwave'],Lillia:['sweep','area','slowline','sleepall'],Fiddlesticks:['fear','drainarea','silence','storm'],
    Elise:['target','buff','stuntarget','transform'],Nidalee:['line','trap','heal','transform'],Jayce:['line','buff','knockback','transform'],
    Viego:['line','lineStun','stealth','execute'],Kindred:['dash','buff','slowtarget','invulnerable'],Graves:['line','slowzone','dash','rocket'],
    Taliyah:['volley','push','slowzone','wall'],Sylas:['sweep','drain','dashstun','copy'],
    Malzahar:['silence','summon','poison','suppress'],Warwick:['drain','buff','fear','dashstun'],Pantheon:['line','dashstun','parry','arrival'],
    Akshan:['return','stealth','dash','snipe'],Ambessa:['cone','shieldarea','slowarea','dashstun'],AurelionSol:['flamecone','dash','gravity','knockuparea'],
    Aurora:['return','dash','slowbeam','slowzone'],Belveth:['dash','lineKnockup','resist','transform'],Briar:['dashstun','buff','push','fearwave'],
    Chogath:['knockuparea','silencecone','buff','execute'],Diana:['area','shieldarea','dashtarget','magnet'],Ekko:['return','stunzone','dash','rewind'],
    DrMundo:['slowline','resist','buff','selfheal'],Evelynn:['line','charmtarget','dashtarget','execute'],Fizz:['dashtarget','buff','dasharea','fish'],
    Gragas:['slowzone','resist','dashstun','blast'],Heimerdinger:['summon','volley','stunarea','buff'],Hwei:['area','shield','root','storm'],
    Illaoi:['line','heal','line','summon'],Ivern:['root','shield','shield','summon'],Kassadin:['shieldtarget','buff','slowcone','dasharea'],
    Katarina:['bounce','area','dash','daggerstorm'],Kayle:['slowline','heal','buff','invulnerable'],Kayn:['dasharea','lineKnockup','resist','drain'],
    Kled:['hook','buff','dash','dashknockup'],Khazix:['target','volley','dasharea','stealth'],KogMaw:['line','buff','slowline','area'],
    KSante:['lineKnockup','dashknockup','shielddash','kick'],Locke:['volley','drainbuff','dash','execute'],Mel:['area','reflect','root','global'],
    Mordekaiser:['line','shield','pull','realm'],MasterYi:['dashtarget','selfheal','buff','buff'],Naafiri:['line','dashtarget','dasharea','buff'],
    Nilah:['line','parry','dash','magnet'],Olaf:['slowline','shield','target','unstoppable'],Qiyana:['line','dash','stealth','wallpush'],
    Quinn:['blind','vision','dashtarget','buff'],Rammus:['dashstun','resist','taunt','arrival'],Rengar:['buff','selfheal','root','stealth'],
    RekSai:['buff','knockuparea','dashtarget','execute'],Riven:['dashknockup','stunself','shielddash','cone'],Senna:['lineheal','root','resist','globalshield'],
    Samira:['line','windwall','dash','daggerstorm'],Shaco:['dash','feartrap','slowtarget','summon'],Shyvana:['buff','aura','line','dasharea'],
    Skarner:['slowline','shieldarea','dashstun','suppresscone'],Swain:['cone','area','root','drainzone'],Talon:['dashtarget','return','dash','stealth'],
    TahmKench:['slowline','dashknockup','shield','suppress'],Trundle:['slowtarget','buff','slowzone','drain'],Twitch:['stealth','poisonzone','execute','buff'],
    Tryndamere:['selfheal','slowarea','dasharea','undying'],Urgot:['line','buff','dashstun','execute'],Udyr:['buff','shield','stuntarget','storm'],
    Vex:['line','shieldfear','area','dashfear'],Velkoz:['slowline','line','knockuparea','laser'],Volibear:['stuntarget','drain','shieldarea','arrival'],
    Xerath:['laser','area','lineStun','artillery'],Yorick:['buff','cage','slowline','summon'],Zaahen:['drain','hook','dasharea','drainarea'],
    Yunara:['buff','slowline','dash','transform'],Ziggs:['area','blast','slowzone','artillery'],Zyra:['area','summon','root','knockupzone'],
    Karthus:['area','slowzone','aura','global'],Teemo:['blind','buff','passive','trap'],Singed:['poisonzone','slowzone','kick','resist'],
    Bard:['lineStun','heal','teleport','stasis'],Neeko:['area','root','stealth','knockuparea'],Nunu:['drain','dashknockup','root','slowarea']
  };
  const specs={
    shieldarea:{type:'selfarea',shield:true,radius:95},gravity:{type:'zone',radius:100,duration:3,cc:'pull'},lineKnockup:{type:'missile',cc:'airborne',duration:1},
    silencecone:{type:'cone',cc:'silence',duration:1.5},stunzone:{type:'zone',radius:95,duration:2,cc:'stun'},charmtarget:{type:'target',cc:'charm',duration:1.4},
    fish:{type:'missile',radius:100,cc:'airborne',duration:1,shape:'fish'},blast:{type:'area',radius:100,cc:'knockback',duration:.5},
    slowbeam:{type:'beam',cc:'slow',duration:2},slowcone:{type:'cone',cc:'slow',duration:2},daggerstorm:{type:'selfzone',radius:130,duration:2.5,shape:'daggers'},
    drainbuff:{type:'buff',heal:true},reflect:{type:'reflect'},realm:{type:'realm'},unstoppable:{type:'unstoppable'},stunself:{type:'selfarea',radius:75,cc:'stun',duration:.8},
    globalshield:{type:'globalshield'},feartrap:{type:'zone',radius:55,duration:5,cc:'fear'},suppresscone:{type:'cone',cc:'stun',duration:1.5},
    drainzone:{type:'selfzone',radius:130,duration:5,heal:true},undying:{type:'undying'},shieldfear:{type:'selfarea',radius:100,shield:true,cc:'fear',duration:1.3},
    dashfear:{type:'dash',cc:'fear',duration:1.3},artillery:{type:'area',radius:110,range:5000,delay:.8},knockupzone:{type:'zone',radius:120,duration:2,cc:'airborne'},rewind:{type:'rewind'},
    aura:{type:'selfzone',radius:95,duration:4},line:{type:'missile'},target:{type:'target'},return:{type:'missile',pierce:true,returning:true,shape:'orb'},charm:{type:'missile',cc:'charm',duration:1.4,shape:'heart'},
    hook:{type:'missile',cc:'pull',duration:.7,shape:'hook',range:1050},root:{type:'missile',cc:'root',duration:1.6},rootwave:{type:'missile',pierce:true,cc:'root',duration:1.6,shape:'wave'},
    slowline:{type:'missile',cc:'slow',duration:2},slowtarget:{type:'target',cc:'slow',duration:2},roottarget:{type:'target',cc:'root',duration:1.3},stuntarget:{type:'target',cc:'stun',duration:1.2},
    lineStun:{type:'missile',cc:'stun',duration:1.2},arrow:{type:'missile',cc:'stun',duration:2,shape:'arrow',range:25000},rocket:{type:'missile',radius:85,shape:'rocket'},
    laser:{type:'beam',pierce:true,width:22,shape:'beam'},volley:{type:'cone',width:.55,shape:'volley'},cone:{type:'cone',width:.8},stuncone:{type:'cone',width:.8,cc:'stun',duration:1.5},
    area:{type:'area',radius:85},stunarea:{type:'area',radius:90,cc:'stun',duration:1.3},knockuparea:{type:'selfarea',radius:90,cc:'airborne',duration:1},slowarea:{type:'selfarea',radius:110,cc:'slow',duration:2},
    rootarea:{type:'selfarea',radius:100,cc:'root',duration:1.5},sweep:{type:'selfarea',radius:95},pull:{type:'selfarea',radius:110,cc:'pull',duration:.6},
    zone:{type:'zone',radius:80,duration:3},storm:{type:'zone',radius:115,duration:4,shape:'storm'},stormstun:{type:'selfzone',radius:105,duration:3,cc:'stun',shape:'storm'},
    stormknockup:{type:'selfzone',radius:90,duration:3,cc:'airborne',shape:'wind'},slowzone:{type:'zone',radius:85,duration:3,cc:'slow'},
    poison:{type:'zone',radius:65,duration:3,shape:'poison'},poisonzone:{type:'zone',radius:85,duration:4,shape:'poison'},fireline:{type:'zone',radius:110,duration:4,shape:'fire'},
    flamecone:{type:'cone',width:.65,shape:'fire'},barrage:{type:'cone',width:.5,shape:'volley',damage:2.8},snipe:{type:'missile',shape:'arrow',range:3000,damage:2},
    shield:{type:'shield'},heal:{type:'heal'},selfheal:{type:'selfheal'},healarea:{type:'healarea',radius:150},healall:{type:'healall'},shieldall:{type:'shieldall'},
    buff:{type:'buff'},passive:{type:'passive'},vision:{type:'buff'},transform:{type:'buff'},resist:{type:'resist'},parry:{type:'parry'},stealth:{type:'resist'},
    dash:{type:'dash'},dashtarget:{type:'dash',damage:1.5},dasharea:{type:'dash',radius:85},dashknockup:{type:'dash',radius:90,cc:'airborne',duration:1.2},
    dashstun:{type:'dash',cc:'stun',duration:1},dashroot:{type:'dash',cc:'root',duration:1.2},shielddash:{type:'dash',shield:true},arrival:{type:'dash',radius:120,cc:'airborne',duration:1,delay:1.2},
    bubble:{type:'area',radius:60,cc:'airborne',duration:1.3},tornado:{type:'missile',pierce:true,cc:'airborne',duration:1,shape:'wind'},waveknockup:{type:'missile',pierce:true,cc:'airborne',duration:1.4,shape:'wave',width:50},
    knockupTarget:{type:'target',cc:'airborne',duration:1},knockup:{type:'target',cc:'airborne',duration:1,range:200},kick:{type:'target',cc:'knockback',duration:.5},knockback:{type:'target',cc:'knockback',duration:.5},
    push:{type:'cone',cc:'knockback',duration:.5},wallpush:{type:'cone',cc:'knockback',duration:1.2},silence:{type:'selfarea',cc:'silence',radius:105,duration:1.5},silencetarget:{type:'target',cc:'silence',duration:1.5},
    silencezone:{type:'zone',radius:75,duration:2,cc:'silence'},fear:{type:'target',cc:'fear',duration:1.5},fearwave:{type:'dash',radius:90,cc:'fear',duration:1.3},
    taunt:{type:'selfarea',radius:100,cc:'taunt',duration:1.3},charmarea:{type:'selfarea',radius:100,cc:'charm',duration:1.3},charmline:{type:'missile',pierce:true,cc:'charm',duration:1.5,shape:'heart'},
    polymorph:{type:'target',cc:'stun',duration:1.5,damage:0},sleep:{type:'missile',cc:'sleep',duration:2},sleepall:{type:'area',radius:200,cc:'sleep',duration:2},
    berserk:{type:'missile',pierce:true,cc:'stun',duration:1.8,shape:'wave'},suppress:{type:'target',cc:'stun',duration:2.5},blind:{type:'target',cc:'blind',duration:2},
    ball:{type:'area',radius:45,shape:'orb',ball:true},ballzone:{type:'ballarea',radius:100,cc:'slow',duration:2},shockwave:{type:'ballarea',radius:120,cc:'pull',duration:.8,shape:'shockwave'},
    drain:{type:'target',heal:true},drainarea:{type:'selfarea',radius:100,heal:true},zoneheal:{type:'area',radius:75,heal:true},lineheal:{type:'missile',heal:true},
    execute:{type:'target',execute:true,damage:2},bounce:{type:'target',radius:110},summon:{type:'zone',radius:80,duration:5,shape:'summon'},sphere:{type:'area',radius:65,shape:'orb'},
    bomb:{type:'area',radius:80,delay:.8},trap:{type:'zone',radius:55,duration:5,cc:'slow'},rootzone:{type:'zone',radius:60,duration:3,cc:'root'},
    cage:{type:'zone',radius:115,duration:3,cc:'stun'},wall:{type:'zone',radius:70,duration:3,cc:'slow'},windwall:{type:'windwall',radius:110,duration:3},
    shieldtarget:{type:'target',shield:true},shieldcone:{type:'cone',shield:true},grow:{type:'shield',radius:75},revive:{type:'revive'},invulnerable:{type:'invulnerable'},
    stasis:{type:'area',cc:'stasis',duration:2,damage:0},magnet:{type:'selfzone',radius:110,duration:2,cc:'pull'},teleport:{type:'dash',damage:0},global:{type:'global',delay:2,damage:2},waveheal:{type:'missile',pierce:true,heal:true,shape:'wave'},copy:{type:'area',radius:90}
  };
  A.get=(id,slot)=>{
    const ch=C.get(id),sp=ch?.spells[slot];if(!sp)return {type:'missile',shape:'orb',range:650};
    let key=kits[id]?.[slot],inferred=!key;
    if(!key){const d=sp.description||'';key=/기본 지속 효과/.test(d)&&!/사용 시|사용 효과/.test(d)?'passive':/체력을 회복|치유/.test(d)?'heal':/보호막/.test(d)?'shield':/돌진/.test(d)?'dash':/기절/.test(d)?'lineStun':/속박/.test(d)?'root':/둔화/.test(d)?'slowline':ch.range>300?'line':'target';}
    return {key,shape:C.profile(id).signature,range:sp.range.find(x=>x>0)||ch.range||650,damage:slot===3?2.4:1.65,...specs[key],inferred};
  };
  A.range=(id,slot)=>L.clamp(A.get(id,slot).range*.25,60,1600);
  A.hasProfile=id=>!!kits[id];
  A.canCast=(m,p,q,slot)=>!(p.champion==='Yasuo'&&slot===3)||q.ccLabel==='공중에 뜸'&&q.stun>m.t;
  const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),enemies=(m,p)=>m.all.filter(q=>!q.dead&&q.side!==p.side);
  function fx(m,p,q,kind,slot,k){m.effect(p,q,kind,0,slot);if(m.visuals)Object.assign(m.fx.at(-1),{shape:k.shape,radius:k.radius||70,duration:k.duration||.6});}
  function status(m,p,q,k,center){if(q.dead||q.unstoppableUntil>m.t)return;const dur=k.duration||1.2,until=m.t+dur;
    if(k.cc==='slow')q.slowUntil=until;
    else if(k.cc==='root')q.rootUntil=until;
    else if(k.cc==='silence')q.silenceUntil=until;
    else if(k.cc==='blind')q.blindUntil=until;
    else if(k.cc){q.stun=Math.max(q.stun||0,until);q.ccLabel=({airborne:'공중에 뜸',charm:'매혹',pull:'끌려감',knockback:'밀려남',fear:'공포',sleep:'수면',taunt:'도발',stasis:'경직'})[k.cc]||'기절';
      if(['pull','knockback','charm','fear'].includes(k.cc)){const at=center||p,d=dist(q,at)||1,sign=['pull','charm'].includes(k.cc)?-1:1,range=k.cc==='pull'?Math.max(0,d-58):60;q.forced={x:q.x+(q.x-at.x)/d*range*sign,y:q.y+(q.y-at.y)/d*range*sign,until:m.t+.45};}}
    if(k.cc==='root')q.ccLabel='속박';if(k.cc==='slow')q.ccLabel='둔화';
  }
  function damage(m,p,q,amount,F,slot,k,center){if(q.dead||q.realm?.until>m.t&&p.idx!==q.realm.target||p.realm?.until>m.t&&q.idx!==p.realm.target)return;const n=amount*(k.damage??1);if(n>0){m.hit(p,q,n*(k.execute?1+(1-q.hp/m.mhp(q))*1.4:1),F,'spell',slot);if(m.visuals&&m.fx.at(-1)?.target===q.idx)Object.assign(m.fx.at(-1),{radius:k.radius||24,shape:k.shape});}status(m,p,q,k,center);if(k.heal)p.hp=Math.min(m.mhp(p),p.hp+n*.3);}
  const launch=P.launchAttack;
  P.launchAttack=function(p,q,amount,F,kind='attack',slot=-1,splash=0){
    if(slot<0||!p.champion||q.idx==null)return launch.call(this,p,q,amount,F,kind,slot,splash);
    const k=A.get(p.champion,slot);if(k.type==='passive')return launch.call(this,p,q,amount,F,'attack');
    if(p.dead||p.silenceUntil>this.t)return;
    const ev={p,q,life:p.life,targetLife:q.life,k,slot,amount,F,x:q.x,y:q.y,start:this.t,at:this.t+(k.delay??(slot===3?.55:.3))};
    p.windupUntil=ev.at;(this.abilityEvents ||= []).push(ev);fx(this,p,q,'cast',slot,k);
  };
  function resolve(m,e){const {p,q,k,slot,amount,F}=e,allies=m.alive(p.side),weak=allies.filter(x=>dist(x,p)<200).sort((a,b)=>a.hp/m.mhp(a)-b.hp/m.mhp(b))[0]||p;
    if(k.type==='rewind'){const pos=p.timeHistory?.[0];if(pos)m.land(p,pos);p.hp=Math.min(m.mhp(p),p.hp+amount*3);for(const v of enemies(m,p))if(dist(v,p)<110)damage(m,p,v,amount,F,slot,k);fx(m,p,p,'heal',slot,k);return;}
    if(k.type==='realm'){if(q.dead)return;p.realm={target:q.idx,until:m.t+7};q.realm={target:p.idx,until:m.t+7};p.tgt=q;q.tgt=p;fx(m,p,q,'realm',slot,{...k,duration:7});return;}
    if(k.type==='reflect'||k.type==='unstoppable'||k.type==='undying'){p[k.type==='reflect'?'reflectUntil':k.type==='undying'?'undyingUntil':'unstoppableUntil']=m.t+(k.type==='reflect'?1:4);if(k.type==='unstoppable')p.stun=p.rootUntil=p.slowUntil=0;fx(m,p,p,'shield',slot,k);return;}
    if(k.type==='globalshield'){for(const x of allies){x.shield=(x.shield||0)+amount*2;x.shieldUntil=m.t+3;}const dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy)||1;for(const v of enemies(m,p))if((v.x-p.x)*dx+(v.y-p.y)*dy>=0&&Math.abs((v.x-p.x)*dy-(v.y-p.y)*dx)/d<65)damage(m,p,v,amount*.7,F,slot,k);fx(m,p,{x:p.x+dx/d*1600,y:p.y+dy/d*1600},'beam',slot,k);return;}
    if(['shield','heal','selfheal','healarea','healall','shieldall','resist','parry','revive','invulnerable','buff','windwall'].includes(k.type)){
      const targets=['healall','shieldall','invulnerable'].includes(k.type)?allies:k.type==='healarea'?allies.filter(x=>dist(x,p)<150):['shield','heal','revive'].includes(k.type)?[weak]:[p];
      for(const x of targets){if(k.type.includes('heal'))x.hp=Math.min(m.mhp(x),x.hp+amount*2.3);else if(k.type.includes('shield')){x.shield=(x.shield||0)+amount*2.5;x.shieldUntil=m.t+3;}else if(k.type==='buff')x.buffUntil=m.t+4;else if(k.type==='revive')x.reviveUntil=m.t+4;else if(k.type==='invulnerable'||k.type==='parry')x.invulnerableUntil=m.t+(k.type==='parry'?.75:2);else x.resistUntil=m.t+4;fx(m,p,x,k.type.includes('heal')?'heal':'shield',slot,k);}
      if(k.type==='windwall')(m.abilityZones ||= []).push({p,x:p.x,y:p.y,k,slot,amount:0,F,end:m.t+3,next:Infinity});return;
    }
    if(k.shield){p.shield=(p.shield||0)+amount*2;p.shieldUntil=m.t+3;}
    if(k.type==='dash'){const d=dist(p,e)||1,r=Math.min(A.range(p.champion,slot),Math.max(0,d-58));p.dash={x:p.x+(e.x-p.x)/d*r,y:p.y+(e.y-p.y)/d*r,until:m.t+Math.max(.15,r/450),event:e};fx(m,p,e,'dash',slot,k);return;}
    if(['missile','target'].includes(k.type)){
      if(q.dead||q.life!==e.targetLife)return;
      launch.call(m,p,q,amount,F,'spell',slot,0);const s=m.projectiles.at(-1);s.launch=m.t;s.start=m.t-.3;s.ability=k;s.shape=k.shape;s.homing=k.type==='target';s.maxTravel=A.range(p.champion,slot);s.speed=k.shape==='hook'?300:380;s.expires=m.t+s.maxTravel/s.speed+1;s.tx=e.x;s.ty=e.y;s.fixedAim=!s.homing;s.hits=[];return;
    }
    let center=k.type.startsWith('self')?p:k.type==='ballarea'?(p.ball||p):e;if(k.ball)p.ball={x:e.x,y:e.y};
    if(k.type.includes('zone')){(m.abilityZones ||= []).push({p,x:center.x,y:center.y,k,slot,amount,F,end:m.t+(k.duration||3),next:m.t});fx(m,p,center,'zone',slot,k);return;}
    for(const v of enemies(m,p)){let hit=false;if(k.type==='global')hit=true;else if(k.type==='beam'||k.type==='cone'){const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1,vx=v.x-p.x,vy=v.y-p.y,along=(vx*dx+vy*dy)/d,across=Math.abs(vx*dy-vy*dx)/d;hit=along>=0&&along<=A.range(p.champion,slot)&&across<=(k.type==='beam'?(k.width||22)+25:along*(k.width||.65)+25);}else hit=dist(v,center)<(k.radius||85);if(hit)damage(m,p,v,amount,F,slot,k,center);}
    if(['beam','cone'].includes(k.type)){const d=dist(p,e)||1,r=A.range(p.champion,slot);center={x:p.x+(e.x-p.x)/d*r,y:p.y+(e.y-p.y)/d*r};}
    fx(m,p,center,k.type==='beam'?'beam':k.type==='cone'?'cone':'area',slot,k);
  }
  P.abilityImpact=function(s,p,q){const k=s.ability;if(!k)return false;if(q.reflectUntil>this.t){this.hit(q,p,s.amount,s.F,'spell',s.slot);fx(this,q,p,'beam',s.slot,k);return true;}damage(this,p,q,s.amount,s.F,s.slot,k);if(k.radius)for(const other of enemies(this,p))if(other!==q&&dist(q,other)<k.radius)damage(this,p,other,s.amount*.6,s.F,s.slot,k,q);return true;};
  const update=P.updateProjectiles;
  P.updateProjectiles=function(dt){
    for(const p of this.all)if(p.champion==='Ekko'&&!p.dead){p.timeHistory ||= [];p.timeHistory.push({t:this.t,x:p.x,y:p.y});while(p.timeHistory.length&&p.timeHistory[0].t<this.t-4)p.timeHistory.shift();}
    const remaining=[];for(const e of this.abilityEvents||[]){if(e.p.dead||e.p.life!==e.life)continue;if(e.at>this.t)remaining.push(e);else resolve(this,e);}this.abilityEvents=remaining;
    for(const z of this.abilityZones||[]){if(z.end<=this.t)continue;if(z.k.type==='windwall'){this.projectiles=this.projectiles.filter(s=>s.side===z.p.side||s.melee||dist(s,z)>z.k.radius);continue;}if(this.t<z.next)continue;z.next=this.t+1;const center=z.k.type==='selfzone'?z.p:z;for(const q of enemies(this,z.p))if(dist(q,center)<(z.k.radius||80))damage(this,z.p,q,z.amount*.35,z.F,z.slot,{...z.k,duration:Math.min(1,z.k.duration||1)},center);fx(this,z.p,center,'zone',z.slot,z.k);}
    this.abilityZones=(this.abilityZones||[]).filter(z=>z.end>this.t);update.call(this,dt);
  };
  const move=P.move;
  P.move=function(dt){const positions=this.all.map(p=>({x:p.x,y:p.y}));move.call(this,dt);for(const p of this.all){if(p.dead)continue;const old=positions[p.idx];if(p.rootUntil>this.t){p.x=old.x;p.y=old.y;}else if(p.slowUntil>this.t){p.x=old.x+(p.x-old.x)*.55;p.y=old.y+(p.y-old.y)*.55;}const movement=p.forced||p.dash;if(!movement)continue;const dx=movement.x-p.x,dy=movement.y-p.y,d=Math.hypot(dx,dy),step=Math.min(d,(p.forced?480:450)*dt);if(d){p.x+=dx/d*step;p.y+=dy/d*step;}if(d<8||this.t>=movement.until){if(p.dash){const e=p.dash.event;for(const q of enemies(this,p))if(dist(p,q)<(e.k.radius||78))damage(this,p,q,e.amount,e.F,e.slot,e.k);fx(this,p,p,'area',e.slot,e.k);p.dash=null;}p.forced=null;}}};
  const hit=P.hit;P.hit=function(p,q,n,F,kind,slot){if(q.invulnerableUntil>this.t||q.realm?.until>this.t&&p?.idx!==q.realm.target||p?.realm?.until>this.t&&q.idx!==p.realm.target)return;if(q.resistUntil>this.t)n*=.6;if(p?.buffUntil>this.t)n*=1.2;if(p?.blindUntil>this.t&&kind==='attack')n*=.2;if(q.shieldUntil>this.t){const blocked=Math.min(q.shield||0,n);q.shield-=blocked;n-=blocked;}if(q.undyingUntil>this.t)n=Math.min(n,Math.max(0,q.hp-1)/1.6);if(q.reviveUntil>this.t&&n>=q.hp){q.reviveUntil=0;q.hp=this.mhp(q)*.3;fx(this,q,q,'heal',-1,{shape:'orb'});return;}return hit.call(this,p,q,n,F,kind,slot);};
})(typeof window!=='undefined'?window:globalThis);
