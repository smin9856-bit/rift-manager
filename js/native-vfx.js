// Original client sprites/meshes + a bounded 2D interpreter of selected PROP emitters.
// Rendering only: no engine state writes, wall clock, or simulation RNG.
(function(G){
  'use strict';
  const L=G.LFM,D=G.LFM_PARTICLES,N=L.nativeVfx={},images=new Map(),tints=new Map(),meshes=new Map();
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),unit=.32,rad=Math.PI/180;
  const mix=(a,b,t)=>Array.isArray(a)?a.map((v,i)=>v+(b[i]-v)*t):a+(b-a)*t;
  function curve(times,values,t,otherwise){
    if(!times?.length||!values?.length)return otherwise;
    if(t<=times[0])return values[0];
    for(let i=1;i<times.length;i++)if(t<=times[i])return mix(values[i-1],values[i],(t-times[i-1])/Math.max(1e-8,times[i]-times[i-1]));
    return values.at(-1);
  }
  // Animated values are absolute curve values, not constantValue multiplied twice.
  N.sample=(v,t,fallback)=>curve(v?.dynamics?.times,v?.dynamics?.values,t,v?.constantValue??fallback);
  const sample=N.sample;
  const random=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
  function birth(v,t,fallback,seed){
    let n=sample(v,t,fallback);const ps=v?.dynamics?.probabilityTables;
    if(ps)n=Array.isArray(n)?n.map((x,i)=>x*curve(ps[i]?.keyTimes,ps[i]?.keyValues,random(seed+i),1)):n*curve(ps[0]?.keyTimes,ps[0]?.keyValues,random(seed),1);
    return n;
  }
  const makeCanvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
  function tint(img,color,key){
    const rgb=color.slice(0,3).map(v=>Math.round(clamp(v,0,1)*15)*17);
    if(rgb.every(v=>v===255))return img;
    const id=key+':'+rgb.join(',');if(tints.has(id))return tints.get(id);
    const canvas=makeCanvas(img.width,img.height),c=canvas.getContext('2d');
    c.drawImage(img,0,0);c.globalCompositeOperation='multiply';c.fillStyle=`rgb(${rgb.join(',')})`;c.fillRect(0,0,canvas.width,canvas.height);c.globalCompositeOperation='destination-in';c.drawImage(img,0,0);
    // An LRU-size bound prevents long matches accumulating color variants forever.
    if(tints.size>=96)tints.delete(tints.keys().next().value);tints.set(id,canvas);return canvas;
  }
  function triangle(c,img,p,uv,alpha){
    const [u0,u1,u2]=uv.map(v=>[v[0]*img.width,v[1]*img.height]),[p0,p1,p2]=p;
    const a=u1[0]-u0[0],b=u1[1]-u0[1],d=u2[0]-u0[0],e=u2[1]-u0[1],det=a*e-b*d;if(Math.abs(det)<.00001)return;
    const x1=p1[0]-p0[0],x2=p2[0]-p0[0],y1=p1[1]-p0[1],y2=p2[1]-p0[1];
    const A=(x1*e-x2*b)/det,B=(y1*e-y2*b)/det,C=(x2*a-x1*d)/det,E=(y2*a-y1*d)/det;
    c.save();c.beginPath();c.moveTo(...p0);c.lineTo(...p1);c.lineTo(...p2);c.closePath();c.clip();c.globalAlpha=alpha;
    c.transform(A,B,C,E,p0[0]-A*u0[0]-C*u0[1],p0[1]-B*u0[0]-E*u0[1]);c.drawImage(img,0,0);c.restore();
  }
  function meshSprite(e,img){
    const path=e.primitive.mMesh.mSimpleMeshName;if(meshes.has(path))return meshes.get(path);
    const m=D.meshes[path];if(!m)return null;
    // Orthographic, fixed camera bake of actual SCB topology and per-face UVs.
    const arrow=/Arrow.scb$/i.test(path),points=m.vertices.map(v=>arrow?[v[2],v[0],v[1]]:[v[0],-v[1],v[2]]);
    const lo=[0,1].map(i=>Math.min(...points.map(v=>v[i]))),hi=[0,1].map(i=>Math.max(...points.map(v=>v[i]))),size=hi.map((v,i)=>v-lo[i]);
    const canvas=makeCanvas(384,Math.max(32,Math.round(384*size[1]/size[0]))),c=canvas.getContext('2d');
    const projected=points.map(v=>[(v[0]-lo[0])/size[0]*canvas.width,(v[1]-lo[1])/size[1]*canvas.height]);
    for(const f of [...m.faces].sort((a,b)=>a.indices.reduce((n,i)=>n+points[i][2],0)-b.indices.reduce((n,i)=>n+points[i][2],0))){
      triangle(c,img,f.indices.map(i=>projected[i]),f.uv,m.colors?f.indices.reduce((n,i)=>n+m.colors[i][3]/255,0)/3:1);
    }
    const result={canvas,size,arrow};meshes.set(path,result);return result;
  }
  N.ready=D?Promise.all(Object.entries(D.textures).map(([path,t])=>new Promise(resolve=>{
    const im=new Image();images.set(path,im);im.onload=()=>resolve(true);im.onerror=()=>resolve(false);im.src=t.file;
  }))):Promise.resolve([]);
  N.supports=(champ,slot)=>!!D?.systems[champ+'QWER'[slot]];
  N.stats=()=>({loaded:[...images.values()].filter(i=>i.complete&&i.naturalWidth).length,total:images.size,tints:tints.size,meshes:meshes.size});
  // options: x/y, angle, age (seconds), speed, travel, beam length, sustained missile.
  N.draw=(c,key,o)=>{
    const system=D?.systems[key];if(!system||o.age<0)return false;
    // A known, loaded system owns its whole lifetime, including transparent frames.
    // Otherwise the procedural fallback would flash when native particles fade out.
    if(system.emitters.some(e=>!images.get(e.texture)?.naturalWidth))return false;
    let drawn=0,budget=72;
    c.save();c.translate(o.x,o.y);c.rotate(o.angle||0);c.shadowBlur=0;
    for(let ei=0;ei<system.emitters.length&&budget>0;ei++){
      const e=system.emitters[ei],img=images.get(e.texture);if(!img?.complete||!img.naturalWidth)continue;
      const kind=e.primitive?.__type||'Quad',delay=e.timeBeforeFirstEmission||0,elapsed=o.age-delay;if(elapsed<0)continue;
      const life=clamp(sample(e.particleLifetime,0,1),.03,50),rate=clamp(sample(e.rate,o.age,1),1,120);
      const single=e.isSingleParticle,attached=sample(e.bindWeight,0,0)>=.8;
      const sustain=o.sustain&&(single||attached),age=sustain?Math.min(elapsed,life*.65):elapsed;
      const continuous=!single&&!attached&&!kind.includes('Trail');
      const step=Math.max(1/rate,life/6),last=continuous?Math.floor(Math.min(elapsed,e.lifetime??elapsed)/step):0;
      const count=continuous?Math.min(6,last+1):single?Math.min(4,Math.round(rate)):1;
      for(let i=0;i<count&&budget>0;i++){
        const born=continuous?(last-i)*step:0,pa=continuous?elapsed-born:age;if(pa<0||pa>=life)continue;
        const t=clamp(pa/life,0,1),seed=ei*101+i*13+Math.floor(born*100),scale=birth(e.birthScale0,0,[50,50,50],seed),growth=sample(e.scale0,t,[1,1,1]);
        const bc=birth(e.birthColor,0,[1,1,1,1],seed),color=sample(e.Color,t,[1,1,1,1]).map((v,j)=>v*bc[j]);
        c.globalAlpha=clamp(color[3],0,1);if(c.globalAlpha<.005)continue;
        c.globalCompositeOperation=[3,4,5].includes(e.blendMode)?'lighter':'source-over';
        const texture=tint(img,color,e.texture),sx=Math.abs(scale[0]*growth[0]),sy=Math.abs((e.isUniformScale?scale[0]:scale[1])*growth[e.isUniformScale?0:1]);
        let w=clamp(sx*unit*2,1,220),h=clamp(sy*unit*2,1,220),x=0,y=0;
        if(kind.includes('Beam')){
          // League beam UV U runs across its width, V along its length.
          const width=clamp(sx*unit*.7,1,100),length=o.length||400;c.save();c.translate(length/2,0);c.rotate(Math.PI/2);c.drawImage(texture,-width/2,-length/2,width,length);c.restore();drawn++;budget--;continue;
        }
        if(kind.includes('Trail')){
          const length=Math.min(o.travel??100,(o.speed||300)*Math.min(life,.32),150),width=clamp(sx*unit,4,45);
          if(length>0)c.drawImage(texture,-length,-width/2,length,width);drawn++;budget--;continue;
        }
        if(continuous){
          const travel=Math.min(o.travel??0,(o.speed||0)*pa);x=-travel;
          const velocity=birth(e.birthVelocity,born,[0,0,0],seed),drag=sample(e.birthDrag,0,[0,0,0]);
          const move=(v,d)=>v*(d>0?(1-Math.exp(-d*pa))/d:pa)*unit;
          x+=clamp(move(velocity[2],drag[2]),-60,60);y+=clamp(move(velocity[0],drag[0]),-45,45)*(random(seed+7)*2-1);
          const spread=e.SpawnShape?.radius||12;y+=(random(seed+4)*2-1)*Math.min(25,spread*unit);
        }
        const div=(e.texDiv||[1,1]).map(v=>Math.max(1,Math.round(v))),frames=Math.max(1,Math.min(e.numFrames||div[0]*div[1],div[0]*div[1]));
        const frame=((e.startFrame||0)+Math.floor(pa*(e.frameRate||0))+(e.isRandomStartFrame?Math.floor(random(seed)*frames):0))%frames;
        if(kind.includes('Mesh')){
          const mesh=meshSprite(e,img);if(!mesh)continue;
          const ms=e.birthScale0?.constantValue||[1,1,1];w=clamp(mesh.size[0]*ms[mesh.arrow?2:0]*unit*growth[0],5,170);h=clamp(mesh.size[1]*ms[mesh.arrow?0:1]*unit*growth[1],5,100);
          const tex=tint(mesh.canvas,color,e.texture+':mesh');c.save();if(mesh.arrow)c.scale(-1,1);else c.rotate(-(o.angle||0));c.drawImage(tex,-w/2,-h/2,w,h);c.restore();
        }else{
          const r=sample(e.birthRotation0,0,[0,0,0]),rv=sample(e.birthRotationalVelocity0,0,[0,0,0]);
          c.save();c.translate(x,y);c.rotate((r[2]+rv[2]*pa)*rad);c.drawImage(texture,(frame%div[0])*img.width/div[0],Math.floor(frame/div[0])*img.height/div[1],img.width/div[0],img.height/div[1],-w/2,-h/2,w,h);c.restore();
        }
        drawn++;budget--;
      }
    }
    c.restore();return true;
  };
  N.projectile=(c,s,x,y,time)=>N.draw(c,s.champion+'QWER'[s.slot]+(s.champion==='Ahri'&&s.slot===0&&s.returning?'Return':''),{x,y,angle:Math.atan2(s.dy,s.dx),age:time-s.launch,speed:s.speed,travel:s.traveled,sustain:true});
  N.impact=(c,e,time)=>N.draw(c,e.champion+'QWER'[e.slot]+'Hit',{x:e.tx,y:e.ty,angle:0,age:time-e.t});
  N.beam=(c,e,time)=>e.champion==='Lux'&&e.slot===3&&N.draw(c,'LuxR',{x:e.x,y:e.y,angle:Math.atan2(e.ty-e.y,e.tx-e.x),age:time-e.t+1,length:Math.hypot(e.tx-e.x,e.ty-e.y)});
  N.telegraph=(c,e,time)=>{
    if(e.p.champion!=='Lux'||e.slot!==3||e.k.type!=='beam')return false;
    const angle=Math.atan2(e.y-e.p.y,e.x-e.p.x);return N.draw(c,'LuxR',{x:e.p.x,y:e.p.y,angle,age:clamp((time-e.start)/(e.at-e.start),0,.999),length:L.abilities.range('Lux',3)});
  };
})(window);
