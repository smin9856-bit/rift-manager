(function(G){
  const L=G.LFM,C=L.champions,D=L.competition,W=L.world,V=L.draftUI={};
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  V.init=st=>{
    const teams=st.meBlue?[st.me,st.opp]:[st.opp,st.me],year=W.get().year;
    const rule=D.fearless(st.m,year,st.res.g.length),banCount=rule.banCount??(year>=2017?5:3);
    let order=(banCount===5?'b0 b1 b0 b1 b0 b1 p0 p1 p1 p0 p0 p1 b1 b0 b1 b0 p1 p0 p0 p1':'b0 b1 b0 b1 b0 b1 p0 p1 p1 p0 p0 p1 p1 p0 p0 p1').split(' ').map(x=>({type:x[0],side:+x[1]}));
    if(!banCount)order=order.filter(x=>x.type==='p');
    st.draft={teams,order,turn:0,picks:Array(10).fill(null),bans:[],banSides:[],rule,banCount,selected:null,role:0,query:'',complete:false,showAll:false,filterRole:null};V.ai(st);
  };
  V.context=(st,si,ban=false)=>({year:W.get().year,bans:st.draft.bans,taken:st.draft.picks.filter(Boolean),history:st.res.g,teamId:st.draft.teams[si].id,rule:ban&&st.draft.rule.mode==='soft'?{mode:'none'}:st.draft.rule});
  V.available=(st,id)=>{const d=st.draft,turn=d.order[d.turn];return !!turn&&D.allowed(id,V.context(st,turn.side,turn.type==='b'));};
  V.commit=(st,id,role)=>{
    const d=st.draft,turn=d.order[d.turn];if(!V.available(st,id))return false;
    if(turn.type==='b'){d.bans.push(id);d.banSides.push(turn.side);}else{if(d.picks[turn.side*5+role])return false;d.picks[turn.side*5+role]=id;}
    d.turn++;d.selected=null;d.complete=d.turn===d.order.length;if(d.complete){st.picks=d.picks.slice();st.bans=d.bans.slice();}
    return true;
  };
  V.ai=(st,all=false)=>{
    const d=st.draft,my=st.meBlue?0:1;
    while(!d.complete){const turn=d.order[d.turn];if(!all&&turn.side===my&&!st.spectate&&!(turn.type==='b'&&d.banCount===5&&d.turn>=12))break;
      const side=turn.type==='b'?1-turn.side:turn.side,lu=L.sim.lineup(d.teams[side]),tac=side===my?st.tac:st.oppTac;
      const roles=[0,1,2,3,4].filter(i=>turn.type==='b'||!d.picks[side*5+i]);
      const role=roles[d.turn%roles.length],context=V.context(st,turn.side,turn.type==='b');
      const id=D.choose(lu[role],role,tac.style,context,st.m.id+':'+st.res.g.length+':'+d.turn);
      if(!id)throw Error('선택 가능한 챔피언이 없습니다.');V.commit(st,id,role);
    }
    if(!d.complete){const side=d.order[d.turn].side;d.role=[0,1,2,3,4].find(i=>!d.picks[side*5+i])??0;}
  };
  // 이번 차례의 추천 목록: 밴은 상대 선수의 주력 챔피언, 픽은 내 선수가 잘 다루고 전술에 맞는 챔피언
  V.suggest=st=>{
    const d=st.draft,my=st.meBlue?0:1,turn=d.order[d.turn],year=W.get().year;if(!turn)return [];
    const score=(p,id,style)=>D.mastery(p,id)+D.fit(id,style)*10;
    if(turn.type==='b'){
      const olu=L.sim.lineup(d.teams[1-my]),out=[];
      olu.forEach((p,i)=>C.pool(i,year).filter(id=>V.available(st,id)).sort((x,y)=>score(p,y,st.oppTac.style)-score(p,x,st.oppTac.style)).slice(0,2).forEach(id=>out.push({id,note:p.n+'의 주력'})));
      return out;
    }
    const lu=L.sim.lineup(d.teams[my]),p=lu[d.role];
    return C.pool(d.role,year).filter(id=>V.available(st,id)).sort((x,y)=>score(p,y,st.tac.style)-score(p,x,st.tac.style)).slice(0,14).map(id=>({id,note:''}));
  };
  V.html=st=>{
    const d=st.draft,my=st.meBlue?0:1,turn=d.order[d.turn],role=d.role,lu=L.sim.lineup(d.teams[my]),tac=st.tac,year=W.get().year;
    const roster=si=>{const ps=d.picks.slice(si*5,si*5+5),summary=D.summary(ps,si===my?tac.style:st.oppTac.style);return `<section class="draft-roster"><h3>${esc(d.teams[si].name)}</h3><small>${si?'레드':'블루'} 진영, 조합 ${summary.label}</small>${L.sim.lineup(d.teams[si]).map((p,i)=>{const id=ps[i],ch=C.get(id);return `<div class="draft-slot ${!id&&role===i&&si===my&&turn&&turn.type==='p'?'active':''}">${id?`<img src="${C.icon(id)}" alt="${esc(ch.name)}">`:'<span class="empty-pick">?</span>'}<div><b>${esc(p.n)}</b><small>${L.ROLE_KO[i]}${id?' '+esc(ch.name):''}</small>${id?`<small>숙련 ${D.mastery(p,id)}, 전술 ${D.label(D.fit(id,si===my?tac.style:st.oppTac.style))}</small>`:''}</div></div>`;}).join('')}<h4>금지</h4><div class="ban-icons">${d.bans.filter((id,i)=>d.banSides[i]===si).map(id=>`<img src="${C.icon(id)}" title="${esc(C.get(id).name)}" alt="${esc(C.get(id).name)}">`).join('')||'<span class="dim">없음</span>'}</div></section>`;};
    const tile=(id,note,p)=>{const ch=C.get(id),allowed=V.available(st,id),fit=D.fit(id,tac.style),isBan=turn.type==='b';return `<button data-draft-pick="${id}" class="champion-tile" ${allowed?'':'disabled'} title="${esc(ch.name)}"><img src="${C.icon(id)}" alt=""><b>${esc(ch.name)}</b><small class="${!isBan&&fit>0?'good':!isBan&&fit<0?'bad':''}">${isBan?esc(note||''):`숙련 ${D.mastery(p,id)}, ${D.label(fit)}`}</small></button>`;};
    let body;
    if(d.complete) body=`<div class="draft-ready"><h2>출전 준비 완료</h2><p>챔피언 숙련도와 전술 궁합이 경기력에 반영됩니다.</p><button class="btn primary" data-mact="start">경기 시작</button><button class="btn" data-mact="instant">결과만 보기</button></div>`;
    else{
      const isBan=turn.type==='b',sug=V.suggest(st),myBans=d.bans.filter((x,i)=>d.banSides[i]===my).length;
      const pool=new Set(C.pool(d.filterRole==null?role:d.filterRole,year));
      const all=d.showAll?C.available(year).filter(ch=>(d.filterRole===-1||pool.has(ch.id))&&(!d.query||ch.name.includes(d.query)||ch.id.toLowerCase().includes(d.query.toLowerCase()))).sort((x,y)=>isBan?x.name.localeCompare(y.name,'ko'):D.mastery(lu[role],y.id)-D.mastery(lu[role],x.id)):[];
      body=`<div class="draft-step"><h3>${isBan?`밴 ${myBans+1}번째: 금지할 챔피언을 고르세요`:`${L.ROLE_KO[role]} ${esc(lu[role].n)}의 챔피언을 고르세요`}</h3><p class="dim sm">${isBan?'상대 선수들이 가장 잘 다루는 챔피언입니다. 누르면 바로 금지됩니다.'+(d.banCount===5?' 4·5번째 밴은 코치가 대신합니다.':''):'이 선수가 잘 다루고 지금 전술에 맞는 순서입니다. 누르면 바로 선택됩니다.'}</p></div>
        <div class="champion-grid compact">${sug.map(x=>tile(x.id,x.note,lu[role])).join('')}</div>
        <div class="draft-confirm"><button class="btn primary" data-draft-action="coach">코치 추천으로 이번 차례 넘기기</button><button class="btn" data-draft-action="auto">남은 밴픽 전부 맡기기</button><button class="btn" data-draft-action="all">${d.showAll?'전체 목록 닫기':'전체 챔피언에서 고르기'}</button></div>
        ${d.showAll?`<div class="draft-controls"><input id="draftSearch" data-draft="search" placeholder="챔피언 이름 검색" value="${esc(d.query)}" aria-label="챔피언 검색"><select data-draft="frole" aria-label="포지션 필터"><option value="-1" ${d.filterRole===-1?'selected':''}>모든 포지션</option>${[0,1,2,3,4].map(i=>`<option value="${i}" ${(d.filterRole==null?role:d.filterRole)===i&&d.filterRole!==-1?'selected':''}>${L.ROLE_KO[i]} 챔피언</option>`).join('')}</select>${!isBan?`<select data-draft="role" aria-label="픽 포지션">${[0,1,2,3,4].filter(i=>!d.picks[my*5+i]).map(i=>`<option value="${i}" ${role===i?'selected':''}>${L.ROLE_KO[i]} ${esc(lu[i].n)}에게 선택</option>`).join('')}</select>`:''}</div><div class="champion-grid">${all.map(ch=>tile(ch.id,'',lu[role])).join('')||'<p class="dim">조건에 맞는 챔피언이 없습니다.</p>'}</div>`:''}`;
    }
    return `<div class="draft draft-modern"><div class="mhead"><div><h2>${st.res.g.length+1}세트 밴픽</h2><span class="dim">${d.complete?'완료':`${d.turn+1} / ${d.order.length}`}${d.rule.label?', '+esc(d.rule.label):''}</span></div><div class="score">${esc(st.me.short)} ${st.res.s[st.ua?0:1]} : ${st.res.s[st.ua?1:0]} ${esc(st.opp.short)}</div></div><div class="draft-layout">${roster(0)}<section class="draft-center"><div class="draft-controls"><label>전술 <select data-draft="style">${L.STYLE_KEYS.map(k=>`<option value="${k}" ${tac.style===k?'selected':''}>${L.STYLES[k].ko}</option>`).join('')}</select></label><button class="btn sm" data-feature="codex">챔피언·전술 분류표</button></div>${body}</section>${roster(1)}</div></div>`;
  };
  // 코치가 이번 차례 하나만 대신 고른다
  V.coachTurn=st=>{
    const d=st.draft,my=st.meBlue?0:1,turn=d.order[d.turn];if(!turn||turn.side!==my)return;
    const side=turn.type==='b'?1-my:my,lu=L.sim.lineup(d.teams[side]),tac=side===my?st.tac:st.oppTac;
    const role=turn.type==='b'?d.turn%5:d.role,id=D.choose(lu[role],role,tac.style,V.context(st,turn.side,turn.type==='b'),st.m.id+':'+st.res.g.length+':'+d.turn);
    if(id)V.commit(st,id,role);
  };
  document.addEventListener('click',e=>{const st=L.view?.state();if(!st?.draft||st.phase!=='draft')return;
    const p=e.target.closest('[data-draft-pick]'),a=e.target.closest('[data-draft-action]');
    if(p&&!p.disabled){if(V.commit(st,p.dataset.draftPick,st.draft.role)){st.draft.showAll=false;st.draft.query='';st.draft.filterRole=null;V.ai(st);}L.view.render();}
    if(a){const k=a.dataset.draftAction;if(k==='auto')V.ai(st,true);else if(k==='coach'){V.coachTurn(st);V.ai(st);}else if(k==='all')st.draft.showAll=!st.draft.showAll;L.view.render();}
  });
  document.addEventListener('change',e=>{const st=L.view?.state(),k=e.target.dataset.draft;if(!st?.draft||!k)return;if(k==='style')st.tac.style=e.target.value;if(k==='role')st.draft.role=+e.target.value;if(k==='frole')st.draft.filterRole=+e.target.value;if(k==='search')st.draft.query=e.target.value;L.view.render();});
})(window);
