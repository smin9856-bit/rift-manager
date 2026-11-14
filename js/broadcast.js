// Canvas broadcast renderer. All particles are original Canvas animations;
// portrait/spell art comes from the local Riot Data Dragon bundle.
(function (G) {
  const L = G.LFM, C = L.champions, M = L.MAP, B = L.broadcast = {};
  const TAU = Math.PI * 2, colors = ['#53c8ff', '#ff687d'];
  const circle = (c,x,y,r,fill,stroke,width=1) => { c.beginPath(); c.arc(x,y,r,0,TAU); if(fill){c.fillStyle=fill;c.fill();} if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();} };
  function path(c, pts, width, color) { c.beginPath(); pts.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p)); c.lineWidth=width; c.strokeStyle=color;c.stroke(); }
  let terrain;
  function makeTerrain() {
    const cv = document.createElement('canvas'); cv.width=cv.height=1000; const c=cv.getContext('2d'), rng=L.rng(2819);
    c.fillStyle='#0c2425'; c.fillRect(0,0,1000,1000); c.lineCap='round'; c.lineJoin='round';
    const g=c.createRadialGradient(500,480,30,500,500,690);g.addColorStop(0,'#24483d');g.addColorStop(1,'#0a1b21');c.fillStyle=g;c.fillRect(0,0,1000,1000);
    // Terrain contours and forest islands; aligned to simulation coordinates.
    for(let j=0;j<85;j++){const x=rng()*1000,y=rng()*1000;circle(c,x,y,25+rng()*80,'#102c29');}
    const river=[[170,180],[275,280],[400,370],[500,500],[600,630],[725,720],[830,820]];
    path(c,river,91,'#0a232d');path(c,river,70,'#194851');path(c,river,43,'#225b64');path(c,river,2,'#447b78');
    for(const ln of M.LANES){path(c,ln.pts,66,'#122c29');path(c,ln.pts,49,'#445b4c');path(c,ln.pts,32,'#60705b');path(c,ln.pts,1,'#8a90704a');}
    for(let i=0;i<250;i++){
      const x=rng()*1000,y=rng()*1000;
      const lane=Math.min(x,y,1000-x,1000-y)<115||Math.abs(x+y-1000)<45;
      if(lane||Math.abs(x-y)<65||M.NODES.some(p=>Math.hypot(p.x-x,p.y-y)<35))continue;
      const r=4+rng()*10;circle(c,x+3,y+6,r,'#071c2040');circle(c,x,y,r,'#1b352f');circle(c,x-2,y-4,r*.68,'#244036');
    }
    for(const [x,y] of [[235,570],[300,450],[435,770],[550,700],[765,430],[700,550],[565,230],[450,300]]){circle(c,x,y,34,'#303e36','#526052',2);circle(c,x,y,27,'#162e29');}
    for(const b of M.BASE){circle(c,b.x,b.y,95,'#3d554b','#81928055',3);circle(c,b.x,b.y,72,null,'#96a78c44',2);circle(c,b.x,b.y,48,null,'#96a78c33',1);}
    for(let i=0;i<700;i++){const x=rng()*1000,y=rng()*1000;c.fillStyle=rng()>.5?'#b6c89e12':'#02171320';c.fillRect(x,y,1+rng()*3,1+rng()*3);}
    c.strokeStyle='#a7c2ad12';c.lineWidth=1;for(let i=0;i<=1000;i+=100){path(c,[[i,0],[i,1000]],1,'#a7c2ad08');path(c,[[0,i],[1000,i]],1,'#a7c2ad08');}
    // The visible rock islands are the exact collision geometry used by the engine.
    for(const w of M.WALLS){circle(c,w.x+4,w.y+7,w.r+4,'#07141d88');circle(c,w.x,w.y,w.r,'#34474a','#688080',2);circle(c,w.x-5,w.y-5,w.r*.7,'#41565a');path(c,[[w.x-w.r*.6,w.y+6],[w.x,w.y-13],[w.x+w.r*.5,w.y+2]],2,'#778e8566');}
    return cv;
  }
  B.resize = st => {
    const cv=st.cv,wrap=cv.parentElement,w=Math.max(240,wrap.clientWidth),h=Math.max(240,wrap.clientHeight),dpr=Math.min(2,G.devicePixelRatio||1);
    cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);cv.style.width=w+'px';cv.style.height=h+'px';st.scale=Math.min(cv.width,cv.height)/1000;st.stageW=cv.width/st.scale;st.stageH=cv.height/st.scale;
  };
  B.draw = (st,m,al,dt) => {
    const c=st.ctx,t=m.t,k=st.scale,now=Math.max(0,m.t-M.FIXED_DT+al*M.FIXED_DT),sw=st.stageW,sh=st.stageH;
    if(!terrain)terrain=makeTerrain();
    st.positions=m.all.filter(p=>!p.dead).map(p=>({idx:p.idx,x:p.px+(p.x-p.px)*al,y:p.py+(p.y-p.py)*al}));
    const fights=m.fights.filter(f=>f.members.some(p=>!p.dead&&p.side===0)&&f.members.some(p=>!p.dead&&p.side===1)).sort((a,b)=>b.members.length-a.members.length);
    let targets=st.camera==='follow'?[m.all[st.selected??2]]:st.camera==='combat'&&fights.length?fights[0].members.filter(p=>!p.dead):[];
    if(targets.length){st.lastCameraTargets=targets.map(p=>p.idx);st.lastCombatTime=m.t;}
    else if(st.camera==='combat'&&st.lastCameraTargets&&m.t-st.lastCombatTime<5)targets=st.lastCameraTargets.map(i=>m.all[i]).filter(p=>!p.dead);
    let tz=1,tx=500,ty=500;
    if(targets.length){const xs=targets.map(p=>p.x),ys=targets.map(p=>p.y);tx=(Math.min(...xs)+Math.max(...xs))/2;ty=(Math.min(...ys)+Math.max(...ys))/2;tz=st.camera==='follow'?2.3:Math.min(2.5,sw/(Math.max(...xs)-Math.min(...xs)+250),sh/(Math.max(...ys)-Math.min(...ys)+250));}
    const prev=st.cameraTransform||{zoom:1,cx:500,cy:500},blend=1-Math.exp(-dt*3);
    const hx=Math.min(500,sw/2/tz),hy=Math.min(500,sh/2/tz);
    const zoom=prev.zoom+(tz-prev.zoom)*blend,cx=prev.cx+(L.clamp(tx,hx,1000-hx)-prev.cx)*blend,cy=prev.cy+(L.clamp(ty,hy,1000-hy)-prev.cy)*blend;
    const focus=targets.length>0;st.cameraTransform={zoom,cx:tz===1?500:cx,cy:tz===1?500:cy};
    c.setTransform(k,0,0,k,0,0);c.fillStyle='#0b1921';c.fillRect(0,0,sw,sh);c.translate(sw/2,sh/2);c.scale(zoom,zoom);c.translate(-st.cameraTransform.cx,-st.cameraTransform.cy);c.drawImage(terrain,0,0);
    // Neutral camps and objective spawn timers.
    for(const s of m.sides)for(const cp of s.camps){circle(c,cp.x,cp.y,9,cp.ready<=t?'#a8b777':'#273d36','#d8d5a033');if(cp.ready<=t)circle(c,cp.x,cp.y,3,'#ecdc9d');}
    for(const o of [m.obj.dragon,t>=1200?m.obj.baron:m.obj.herald]){
      if(o.next>1e8)continue;
      const color=o.type==='dragon'?'#e8b56a':'#b997ec';circle(c,o.x,o.y,42,'#0c2028',color+'88',3);circle(c,o.x,o.y,35,null,color+'33',1);
      c.textAlign='center';c.textBaseline='middle';c.font='700 14px Malgun Gothic';c.fillStyle=o.alive?color:'#9aadae';
      c.fillText(o.type==='dragon'?(o.elder?'장로':'드래곤'):o.type==='baron'?'바론':'전령',o.x,o.y-5);
      c.font='11px monospace';c.fillText(o.alive?'LIVE':`${Math.floor(Math.max(0,o.next-t)/60)}:${String(Math.floor(Math.max(0,o.next-t)%60)).padStart(2,'0')}`,o.x,o.y+14);
      if(o.alive){c.beginPath();c.arc(o.x,o.y,42,-Math.PI/2,-Math.PI/2+TAU*Math.max(0,o.hp/o.max));c.strokeStyle=color;c.lineWidth=3;c.stroke();}
    }
    for(const s of m.sides)for(const x of [...s.st.flat(),s.nt,s.nx]){
      const col=colors[s.i],r=x.k==='nx'?20:x.k==='nt'?13:10;
      if(x.hp<=0){circle(c,x.x,x.y,7,'#273d38','#75827744',2);continue;}
      circle(c,x.x,x.y,r+7,'#081c2599',col+'38',1);
      c.save();c.translate(x.x,x.y);c.rotate(Math.PI/4);c.shadowBlur=x.k==='nx'?20:8;c.shadowColor=col;c.fillStyle=col;c.fillRect(-r*.65,-r*.65,r*1.3,r*1.3);c.shadowBlur=0;c.strokeStyle='#e1f7f7';c.lineWidth=1;c.strokeRect(-r*.65,-r*.65,r*1.3,r*1.3);c.restore();
      if(x.hp<x.max){c.fillStyle='#08151c';c.fillRect(x.x-17,x.y+r+9,34,4);c.fillStyle=col;c.fillRect(x.x-17,x.y+r+9,34*x.hp/x.max,4);}
    }
    for(let l=0;l<3&&t>65;l++)for(let si=0;si<2;si++){
      const dir=si?-1:1;
      for(let i=0;i<6;i++){const p=M.LANES[l].at(m.front[l]-dir*(.012+Math.floor(i/3)*.015));const off=(i%3-1)*7;circle(c,p.x+off,p.y+off,3.3,colors[si]);}
    }
    if(st.effects!==false)L.combatVfx.draw(c,m,now,al);
    for(const p of m.all.slice().sort((a,b)=>a.y-b.y)){
      if(p.dead)continue;
      const {x,y}=st.positions.find(q=>q.idx===p.idx),col=colors[p.side];
      if(p.recall||p.tp){circle(c,x,y,29,null,p.tp?'#cc9aff':'#77e5ff',2);c.beginPath();c.arc(x,y,33,now*4,now*4+4.5);c.stroke();}
      if(st.selected===p.idx){circle(c,x,y,31,null,'#f5e4ae',2);circle(c,x,y,35,null,'#f5e4ae55',1);}
      circle(c,x,y,21,'#07141b',col,2.5);
      const im=C.image(C.icon(p.champion));c.save();c.beginPath();c.arc(x,y,18,0,TAU);c.clip();
      if(im)c.drawImage(im,x-20,y-20,40,40);else{c.fillStyle='#294451';c.fillRect(x-22,y-22,44,44);c.fillStyle='#fff';c.textAlign='center';c.font='12px sans-serif';c.fillText(L.ROLE_KO[p.role],x,y+4);}c.restore();
      const hr=L.clamp(p.hp/m.mhp(p),0,1);c.fillStyle='#040d12';c.fillRect(x-24,y-35,48,7);c.fillStyle=hr>.25?col:'#ffbf65';c.fillRect(x-23,y-34,46*hr,5);
      circle(c,x+19,y+17,8,'#0b1a22','#8caaa8',1);c.font='bold 10px monospace';c.fillStyle='#fff';c.fillText(p.lvl,x+19,y+17);
    }
    // Place labels in free space, not on top of another champion or health bar.
    const blocked=st.positions.map(p=>({x:p.x-25,y:p.y-38,w:50,h:65}));st.labelBounds=[];
    const intersects=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
    c.font='600 10px Malgun Gothic';c.textAlign='center';c.textBaseline='middle';
    for(const p of m.all.filter(p=>!p.dead&&(zoom>1.5||p.idx===st.selected)).sort((a,b)=>(b.idx===st.selected)-(a.idx===st.selected))){
      const pos=st.positions.find(q=>q.idx===p.idx),w=c.measureText(p.p.n).width+10;
      const choices=[[0,36],[0,-49],[w/2+29,0],[-w/2-29,0],[0,53],[0,-66]];
      const box=choices.map(([dx,dy])=>({x:pos.x+dx-w/2,y:pos.y+dy-8,w,h:16})).find(b=>![...blocked,...st.labelBounds].some(a=>intersects(a,b)));
      if(!box)continue;st.labelBounds.push(box);const x=box.x+w/2,y=box.y+8;
      if(Math.abs(x-pos.x)>25){path(c,[[pos.x,pos.y],[x,y]],1,'#8aa3ad66');}
      c.fillStyle='#07141de6';c.fillRect(box.x,box.y,w,16);c.fillStyle=p.idx===st.selected?'#f5df9e':'#d1e0e6';c.fillText(p.p.n,x,y);
    }
    if(st.effects!==false)L.combatVfx.labels(c,m,now,st);
    c.setTransform(k,0,0,k,0,0);
    c.font='11px Malgun Gothic';c.textAlign='left';c.fillStyle='#a7c5ce';c.fillText(st.camera==='combat'?(focus?'교전 확대 · 자동 추적':'전장 전체 · 교전 대기'):st.camera==='follow'?'선수 추적':'전장 전체',20,sh-20);
    const cast=st.effects!==false&&m.fx.slice().reverse().find(e=>e.kind==='cast'&&e.slot===3&&now>=e.t&&now-e.t<1.8);
    if(cast){const ch=C.get(cast.champion),sp=ch?.spells[3],img=sp&&C.image('assets/spells/'+sp.icon);if(img){c.fillStyle='#091620e8';c.fillRect(20,20,285,58);c.strokeStyle=colors[cast.side];c.lineWidth=3;c.strokeRect(20,20,285,58);c.drawImage(img,28,28,42,42);c.font='bold 13px Malgun Gothic';c.fillStyle='#ffdea2';c.fillText(ch.name+' · R',82,41);c.font='12px Malgun Gothic';c.fillStyle='#e0ebef';c.fillText(sp.name,82,62);}}
    if(zoom>1.1){const x=sw-174,y=sh-174;c.drawImage(C.image('assets/maps/map11.png')||terrain,x,y,154,154);c.fillStyle='#07131c66';c.fillRect(x,y,154,154);c.strokeStyle='#b4c4bd';c.lineWidth=2;c.strokeRect(x,y,154,154);for(const p of m.all)if(!p.dead)circle(c,x+p.x*.154,y+p.y*.154,3,colors[p.side]);c.strokeStyle='#fff9';c.strokeRect(x+(st.cameraTransform.cx-sw/2/zoom)*.154,y+(st.cameraTransform.cy-sh/2/zoom)*.154,sw/zoom*.154,sh/zoom*.154);}
  };
})(window);
