// Read-only rendering of engine projectiles and confirmed impacts. One simulation clock.
(function(G){
  const L=G.LFM,C=L.champions,V=L.combatVfx={},TAU=Math.PI*2;
  const ring=(c,x,y,r,color,width)=>{c.beginPath();c.arc(x,y,r,0,TAU);c.strokeStyle=color;c.lineWidth=width;c.stroke();};
  const line=(c,x,y,tx,ty,color,width)=>{c.beginPath();c.moveTo(x,y);c.lineTo(tx,ty);c.strokeStyle=color;c.lineWidth=width;c.stroke();};
  V.draw=(c,m,time,al)=>{
    const shots=m.projectiles.filter(s=>time>=s.start).sort((a,b)=>(b.slot>=0)-(a.slot>=0)||b.start-a.start);
    let basic=0,skills=0;c.save();c.lineCap='round';c.lineJoin='round';
    // Persistent areas and telegraphs share the actual collision geometry.
    for(const z of m.abilityZones||[]){const k=z.k,p=k.type==='selfzone'?z.p:z,color=C.profile(z.p.champion).color,r=k.radius||80;c.globalAlpha=.65;c.fillStyle=color+'18';c.beginPath();c.arc(p.x,p.y,r,0,TAU);c.fill();ring(c,p.x,p.y,r,color,3);if(k.shape==='storm'||k.shape==='wind'){for(let i=0;i<4;i++){const a=time*3+i*TAU/4;c.beginPath();c.arc(p.x,p.y,r*.7,a,a+.75);c.strokeStyle=color;c.lineWidth=5;c.stroke();}}if(k.shape==='fire'||k.shape==='poison'){for(let i=0;i<7;i++){const a=i*2.4,rr=r*(.25+(i%3)*.2);ring(c,p.x+Math.cos(a)*rr,p.y+Math.sin(a)*rr,8+Math.sin(time*7+i)*3,color,3);}}}
    for(const e of m.abilityEvents||[]){if(time<e.start)continue;if(L.nativeVfx?.telegraph(c,e,time))continue;const k=e.k,color=C.profile(e.p.champion).color;c.globalAlpha=.4;const x=k.type.startsWith('self')?e.p.x:e.x,y=k.type.startsWith('self')?e.p.y:e.y;if(['area','zone','ballarea'].includes(k.type)){ring(c,x,y,k.radius||80,color,2);c.setLineDash([6,5]);ring(c,x,y,(k.radius||80)*L.clamp((time-e.start)/(e.at-e.start),0,1),color,2);c.setLineDash([]);}else if(['beam','missile','cone'].includes(k.type)){line(c,e.p.x,e.p.y,x,y,color,2);}}
    for(const s of shots){
      const spell=s.slot>=0;if(spell?skills++>=12:basic++>=8)continue;
      const src=m.all[s.source]||s.sourceObj,target=m.all[s.target]||s.targetObj;if(!src||!target)continue;
      const color=s.kind==='tower'?'#ff826c':C.profile(s.champion).color;
      const x=s.px+(s.x-s.px)*al,y=s.py+(s.y-s.py)*al,ult=s.slot===3;
      if(time<s.launch){
        const progress=L.clamp((time-s.start)/(s.launch-s.start),0,1);
        if(spell){c.globalAlpha=.7;ring(c,src.x,src.y,30+progress*9,color,2);c.setLineDash([6,7]);line(c,src.x,src.y,s.tx,s.ty,color+'77',1.2);c.setLineDash([]);
          if(ult){c.fillStyle=color+'12';c.beginPath();c.arc(s.tx,s.ty,85,0,TAU);c.fill();ring(c,s.tx,s.ty,85,color+'99',2);}}
        continue;
      }
      c.globalAlpha=1;
      if(s.melee)continue;
      if(spell&&L.nativeVfx?.projectile(c,s,x,y,time))continue;
      const dx=s.dx,dy=s.dy,tail=spell?(ult?90:56):25,r=spell?(ult?17:11):4;
      c.shadowBlur=spell?16:3;c.shadowColor=color;
      // A dark outline and bright core keep the projectile readable on both teams' terrain.
      line(c,x-dx*tail,y-dy*tail,x,y,'#06121ddd',spell?13:5);
      const gradient=c.createLinearGradient(x-dx*tail,y-dy*tail,x,y);gradient.addColorStop(0,color+'00');gradient.addColorStop(1,color);
      line(c,x-dx*tail,y-dy*tail,x,y,gradient,spell?(ult?10:7):2.5);
      c.save();c.translate(x,y);c.rotate(Math.atan2(dy,dx));c.fillStyle=color;c.strokeStyle='#fff9df';c.lineWidth=1.8;
      if(s.shape==='heart'){c.fillStyle='#ff87ba';c.beginPath();c.moveTo(13,0);c.bezierCurveTo(-3,-26,-24,-11,-9,0);c.bezierCurveTo(-24,11,-3,26,13,0);c.fill();c.stroke();}
      else if(['rocket','bolt','volley','hook','arrow'].includes(s.shape)||!spell){c.beginPath();c.moveTo(r+5,0);c.lineTo(-r,-r*.55);c.lineTo(-r*.6,0);c.lineTo(-r,r*.55);c.closePath();c.fill();c.stroke();
        if(spell&&s.shape==='volley')for(const v of [-1,1])line(c,-r*2,v*16,r*.3,v*20,color,3);
        if(spell&&s.shape==='hook'){c.beginPath();c.arc(0,0,r,-1,2.5);c.stroke();}
      }else if(s.shape==='beam'){line(c,-34,0,21,0,color,12);line(c,-31,0,22,0,'#fffde8',3);}
      else{c.beginPath();c.ellipse(0,0,r*1.3,r,0,0,TAU);c.fill();c.stroke();c.fillStyle='#fffce4';c.beginPath();c.arc(2,0,r*.38,0,TAU);c.fill();}
      c.restore();c.shadowBlur=0;
      if(spell&&s.shape==='hook'){c.setLineDash([5,5]);line(c,src.x,src.y,x,y,color+'aa',2.5);c.setLineDash([]);}
    }
    for(const e of m.fx.filter(e=>['beam','cone','area','dash','heal','shield'].includes(e.kind)&&time>=e.t&&time-e.t<.75).slice(-16)){
      if(e.kind==='beam'&&L.nativeVfx?.beam(c,e,time))continue;
      const age=(time-e.t)/.75,color=C.profile(e.champion).color;c.globalAlpha=1-age;
      if(e.kind==='beam'){line(c,e.x,e.y,e.tx,e.ty,'#06121d',34);line(c,e.x,e.y,e.tx,e.ty,color,25*(1-age)+5);line(c,e.x,e.y,e.tx,e.ty,'#fffde8',7*(1-age));}
      else if(e.kind==='cone'){const angle=Math.atan2(e.ty-e.y,e.tx-e.x),d=Math.hypot(e.tx-e.x,e.ty-e.y);c.fillStyle=color+'44';c.beginPath();c.moveTo(e.x,e.y);c.arc(e.x,e.y,Math.max(120,d),angle-.55,angle+.55);c.closePath();c.fill();for(let i=-2;i<=2;i++){const a=angle+i*.2;line(c,e.x,e.y,e.x+Math.cos(a)*d,e.y+Math.sin(a)*d,color,3);}}
      else if(e.kind==='dash'){line(c,e.x,e.y,e.tx,e.ty,color+'88',18*(1-age));}
      else if(e.kind==='heal'){c.strokeStyle='#89f6ad';c.lineWidth=5;line(c,e.tx-9,e.ty-36,e.tx+9,e.ty-36,'#89f6ad',5);line(c,e.tx,e.ty-45,e.tx,e.ty-27,'#89f6ad',5);ring(c,e.tx,e.ty,28+age*20,'#89f6ad',2);}
      else ring(c,e.tx,e.ty,e.kind==='shield'?33:(e.radius||75)*(.3+age*.7),color,e.kind==='shield'?5:4);
    }
    for(const p of m.all){if(p.dead)continue;c.globalAlpha=1;if(p.shieldUntil>time&&p.shield>0)ring(c,p.x,p.y,29,'#a9deff',3);if(p.invulnerableUntil>time)ring(c,p.x,p.y,33,'#ffeaa5',5);if(p.stun>time||p.rootUntil>time||p.slowUntil>time){const label=p.ccLabel||'기절';c.font='bold 11px Malgun Gothic';c.textAlign='center';c.lineWidth=4;c.strokeStyle='#08131e';c.strokeText(label,p.x,p.y-47);c.fillStyle=p.stun>time?'#ffd39f':'#b7e4ff';c.fillText(label,p.x,p.y-47);}}
    // Impacts only exist after the engine has confirmed collision / damage.
    const impacts=m.fx.filter(e=>e.kind.startsWith('impact-')&&time>=e.t&&time-e.t<.55);
    for(const e of impacts.slice(-24)){
      const age=(time-e.t)/.55,spell=e.slot>=0,ult=e.slot===3,color=e.kind==='impact-tower'?'#ff826c':C.profile(e.champion).color;
      if(e.kind==='impact-splash')continue;
      if(spell&&L.nativeVfx?.impact(c,e,time))continue;
      c.globalAlpha=(1-age)*(spell?.95:.55);const radius=(e.radius||(ult?90:spell?30:19))*(1-Math.pow(1-age,3));
      if(spell){c.fillStyle=color+'18';c.beginPath();c.arc(e.tx,e.ty,radius,0,TAU);c.fill();}
      ring(c,e.tx,e.ty,Math.max(4,radius),color,ult?5:spell?3:1.5);
      if(e.kind==='impact-melee'){c.beginPath();c.arc(e.tx,e.ty,30,age*2-.8,age*2+1.4);c.strokeStyle='#fff3cb';c.lineWidth=4;c.stroke();}
      if(spell){for(let i=0;i<4;i++){const a=i*TAU/4+.4;line(c,e.tx+Math.cos(a)*(radius+3),e.ty+Math.sin(a)*(radius+3),e.tx+Math.cos(a)*(radius+12),e.ty+Math.sin(a)*(radius+12),color,2);}}
    }
    c.restore();
  };
  V.labels=(c,m,time,st)=>{
    const groups=new Map();
    for(const e of m.fx){const age=time-e.t;if(!e.kind.startsWith('impact-')||!e.amount||age<0||age>.7)continue;
      const key=e.target+':'+Math.floor(e.t/.25),prev=groups.get(key);if(prev){prev.amount+=e.amount;prev.slot=Math.max(prev.slot,e.slot);}else groups.set(key,{...e});}
    const rows=[...groups.values()].filter(e=>e.slot>=0||e.target===st.selected).slice(-6),occupied=[];
    c.save();c.textAlign='center';c.textBaseline='middle';
    for(const e of rows){const age=time-e.t;let x=e.tx+46,y=e.ty-43-age*28;let tries=0;
      while(tries++<8&&(occupied.some(p=>Math.abs(p.x-x)<42&&Math.abs(p.y-y)<20)||(st.positions||[]).some(p=>Math.abs(p.x-x)<43&&y>p.y-47&&y<p.y+31)||(st.labelBounds||[]).some(b=>x+20>b.x&&x-20<b.x+b.w&&y+10>b.y&&y-10<b.y+b.h)))y-=23;
      if(tries>8)continue;occupied.push({x,y});
      c.globalAlpha=Math.min(1,(.7-age)*4);c.font=`700 ${e.slot===3?21:16}px Consolas,monospace`;c.lineWidth=4;c.strokeStyle='#06121d';c.strokeText(Math.round(e.amount),x,y);c.fillStyle=e.slot>=0?'#ffdfa2':'#e0f4ff';c.fillText(Math.round(e.amount),x,y);}
    c.restore();
  };
})(window);
