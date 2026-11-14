// Read-only rendering of engine projectiles and confirmed impacts. One simulation clock.
(function(G){
  const L=G.LFM,C=L.champions,V=L.combatVfx={},TAU=Math.PI*2;
  const ring=(c,x,y,r,color,width)=>{c.beginPath();c.arc(x,y,r,0,TAU);c.strokeStyle=color;c.lineWidth=width;c.stroke();};
  const line=(c,x,y,tx,ty,color,width)=>{c.beginPath();c.moveTo(x,y);c.lineTo(tx,ty);c.strokeStyle=color;c.lineWidth=width;c.stroke();};
  V.draw=(c,m,time,al)=>{
    const shots=m.projectiles.filter(s=>time>=s.start).sort((a,b)=>(b.slot>=0)-(a.slot>=0)||b.start-a.start);
    let basic=0,skills=0;c.save();c.lineCap='round';c.lineJoin='round';
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
      const dx=s.dx,dy=s.dy,tail=spell?(ult?90:56):25,r=spell?(ult?17:11):4;
      c.shadowBlur=spell?16:3;c.shadowColor=color;
      // A dark outline and bright core keep the projectile readable on both teams' terrain.
      line(c,x-dx*tail,y-dy*tail,x,y,'#06121ddd',spell?13:5);
      const gradient=c.createLinearGradient(x-dx*tail,y-dy*tail,x,y);gradient.addColorStop(0,color+'00');gradient.addColorStop(1,color);
      line(c,x-dx*tail,y-dy*tail,x,y,gradient,spell?(ult?10:7):2.5);
      c.save();c.translate(x,y);c.rotate(Math.atan2(dy,dx));c.fillStyle=color;c.strokeStyle='#fff9df';c.lineWidth=1.8;
      if(['rocket','bolt','volley','hook'].includes(s.shape)||!spell){c.beginPath();c.moveTo(r+5,0);c.lineTo(-r,-r*.55);c.lineTo(-r*.6,0);c.lineTo(-r,r*.55);c.closePath();c.fill();c.stroke();
        if(spell&&s.shape==='volley')for(const v of [-1,1])line(c,-r*2,v*16,r*.3,v*20,color,3);
        if(spell&&s.shape==='hook'){c.beginPath();c.arc(0,0,r,-1,2.5);c.stroke();}
      }else if(s.shape==='beam'){line(c,-34,0,21,0,color,12);line(c,-31,0,22,0,'#fffde8',3);}
      else{c.beginPath();c.ellipse(0,0,r*1.3,r,0,0,TAU);c.fill();c.stroke();c.fillStyle='#fffce4';c.beginPath();c.arc(2,0,r*.38,0,TAU);c.fill();}
      c.restore();c.shadowBlur=0;
    }
    // Impacts only exist after the engine has confirmed collision / damage.
    const impacts=m.fx.filter(e=>e.kind.startsWith('impact-')&&time>=e.t&&time-e.t<.55);
    for(const e of impacts.slice(-24)){
      const age=(time-e.t)/.55,spell=e.slot>=0,ult=e.slot===3,color=e.kind==='impact-tower'?'#ff826c':C.profile(e.champion).color;
      if(e.kind==='impact-splash')continue;
      c.globalAlpha=(1-age)*(spell?.95:.55);const radius=(ult?110:spell?75:19)*(1-Math.pow(1-age,3));
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
