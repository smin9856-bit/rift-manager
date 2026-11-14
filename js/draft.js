(function(G){
  const L=G.LFM,C=L.champions,D=L.competition,W=L.world,V=L.draftUI={};
  const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  V.init=st=>{
    const teams=st.meBlue?[st.me,st.opp]:[st.opp,st.me],year=W.get().year;
    const rule=D.fearless(st.m,year,st.res.g.length),banCount=rule.banCount??(year>=2017?5:3);
    let order=(banCount===5?'b0 b1 b0 b1 b0 b1 p0 p1 p1 p0 p0 p1 b1 b0 b1 b0 p1 p0 p0 p1':'b0 b1 b0 b1 b0 b1 p0 p1 p1 p0 p0 p1 p1 p0 p0 p1').split(' ').map(x=>({type:x[0],side:+x[1]}));
    if(!banCount)order=order.filter(x=>x.type==='p');
    st.draft={teams,order,turn:0,picks:Array(10).fill(null),bans:[],banSides:[],rule,banCount,selected:null,role:0,query:'',complete:false};V.ai(st);
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
    while(!d.complete){const turn=d.order[d.turn];if(!all&&turn.side===my&&!st.spectate)break;
      const side=turn.type==='b'?1-turn.side:turn.side,lu=L.sim.lineup(d.teams[side]),tac=side===my?st.tac:st.oppTac;
      const roles=[0,1,2,3,4].filter(i=>turn.type==='b'||!d.picks[side*5+i]);
      const role=roles[d.turn%roles.length],context=V.context(st,turn.side,turn.type==='b');
      const id=D.choose(lu[role],role,tac.style,context,st.m.id+':'+st.res.g.length+':'+d.turn);
      if(!id)throw Error('선택 가능한 챔피언이 없습니다.');V.commit(st,id,role);
    }
    if(!d.complete){const side=d.order[d.turn].side;d.role=[0,1,2,3,4].find(i=>!d.picks[side*5+i])??0;}
  };
  V.html=st=>{
    const d=st.draft,my=st.meBlue?0:1,turn=d.order[d.turn],role=d.role,lu=L.sim.lineup(d.teams[my]),tac=st.tac,year=W.get().year;
    const roster=si=>{const ps=d.picks.slice(si*5,si*5+5),summary=D.summary(ps,si===my?tac.style:st.oppTac.style);return `<section class="draft-roster"><h3>${esc(d.teams[si].name)}</h3><small>${si?'RED':'BLUE'} · 조합 ${summary.label} (${summary.factor===1?'±0':summary.factor>1?'+8':'−8'}%)</small>${L.sim.lineup(d.teams[si]).map((p,i)=>{const id=ps[i],ch=C.get(id);return `<div class="draft-slot ${!id&&role===i&&si===my?'active':''}">${id?`<img src="${C.icon(id)}" alt="${esc(ch.name)}">`:'<span class="empty-pick">?</span>'}<div><b>${esc(p.n)}</b><small>${L.ROLE_KO[i]} · ${id?esc(ch.name):'선택 대기'}</small>${id?`<small>숙련 ${D.mastery(p,id)} · ${D.label(D.fit(id,si===my?tac.style:st.oppTac.style))}</small>`:''}</div></div>`;}).join('')}<h4>금지 챔피언</h4><div class="ban-icons">${d.bans.filter((id,i)=>d.banSides[i]===si).map(id=>`<img src="${C.icon(id)}" title="${esc(C.get(id).name)}" alt="${esc(C.get(id).name)}">`).join('')||'<span class="dim">아직 없음</span>'}</div></section>`;};
    const cards=C.available(year).filter(ch=>!d.query||ch.name.includes(d.query)||ch.id.toLowerCase().includes(d.query.toLowerCase())).sort((a,b)=>(C.pool(role,year).includes(b.id)?1:0)-(C.pool(role,year).includes(a.id)?1:0)||a.name.localeCompare(b.name,'ko'));
    return `<div class="draft draft-modern"><div class="mhead"><div><h2>${st.res.g.length+1}세트 · 밴픽</h2><span class="dim">${year} 시즌 · ${d.complete?'드래프트 완료':`${d.turn+1} / ${d.order.length} · ${turn.type==='b'?'챔피언 밴':'챔피언 픽'}`}</span></div><div class="score">${esc(st.me.short)} ${st.res.s[st.ua?0:1]} : ${st.res.s[st.ua?1:0]} ${esc(st.opp.short)}</div></div><p class="draft-rule">${esc(d.rule.label)}<br><small>이전 연도까지 출시된 챔피언 + 이번 시즌 출시 챔피언 · 팀별 ${d.banCount}밴</small></p><div class="draft-layout">${roster(0)}<section class="draft-center"><div class="draft-controls"><label>전술 <select data-draft="style">${L.STYLE_KEYS.map(k=>`<option value="${k}" ${tac.style===k?'selected':''}>${L.STYLES[k].ko}</option>`).join('')}</select></label><button class="btn sm" data-feature="codex">챔피언·전술 분류표</button></div>${d.complete?`<div class="draft-ready"><h2>출전 준비 완료</h2><p>챔피언 숙련도, 포지션 적합도와 전술 시너지가 경기력에 반영됩니다.</p><button class="btn primary" data-mact="start">경기 시작</button><button class="btn" data-mact="instant">결과만 보기</button></div>`:`<div class="draft-controls"><input id="draftSearch" data-draft="search" placeholder="챔피언 검색" value="${esc(d.query)}" aria-label="챔피언 검색">${turn.type==='p'?`<select data-draft="role" aria-label="픽 포지션">${[0,1,2,3,4].filter(i=>!d.picks[my*5+i]).map(i=>`<option value="${i}" ${role===i?'selected':''}>${L.ROLE_KO[i]} · ${esc(lu[i].n)}</option>`).join('')}</select>`:'<b class="bad">상대 핵심 챔피언을 금지하세요</b>'}</div><div class="champion-grid">${cards.map(ch=>{const allowed=V.available(st,ch.id),fit=D.fit(ch.id,tac.style);return `<button data-draft-pick="${ch.id}" class="champion-tile ${d.selected===ch.id?'selected':''}" ${allowed?'':'disabled'} title="${esc(ch.name)} · ${D.label(fit)} · 숙련 ${D.mastery(lu[role],ch.id)}"><img src="${C.icon(ch.id)}" alt=""><b>${esc(ch.name)}</b><small class="${fit>0?'good':fit<0?'bad':''}">${D.label(fit)} · ${D.mastery(lu[role],ch.id)}</small></button>`;}).join('')}</div><div class="draft-confirm"><button class="btn primary" data-draft-action="lock" ${d.selected?'':'disabled'}>${d.selected?esc(C.get(d.selected).name)+' ':''}${turn.type==='b'?'밴 확정':'픽 확정'}</button><button class="btn" data-draft-action="auto">남은 밴픽 코치에게 맡기기</button></div>`}</section>${roster(1)}</div></div>`;
  };
  document.addEventListener('click',e=>{const st=L.view?.state();if(!st?.draft||st.phase!=='draft')return;
    const p=e.target.closest('[data-draft-pick]'),a=e.target.closest('[data-draft-action]');
    if(p){st.draft.selected=p.dataset.draftPick;L.view.render();}
    if(a){if(a.dataset.draftAction==='auto')V.ai(st,true);else if(st.draft.selected){V.commit(st,st.draft.selected,st.draft.role);V.ai(st);}L.view.render();}
  });
  document.addEventListener('change',e=>{const st=L.view?.state(),k=e.target.dataset.draft;if(!st?.draft||!k)return;if(k==='style')st.tac.style=e.target.value;if(k==='role')st.draft.role=+e.target.value;if(k==='search')st.draft.query=e.target.value;L.view.render();});
})(window);
