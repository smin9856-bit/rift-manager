// Reads a locally installed client. Never writes to the game installation.
// Optional dependencies: see tools/particles/README.md.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {Wad,dictionary,readBin,readMesh,texturePNG,pathHash} from './lib/lol-source.mjs';
const arg=process.argv.indexOf('--game');
const root=path.resolve(arg>=0?process.argv[arg+1]:'C:/Riot Games/League of Legends/Game');
const cache='tools/cache/particles',out='assets/particles';
fs.mkdirSync(cache,{recursive:true});fs.mkdirSync(out,{recursive:true});
for(const file of ['hashes.binfields.txt','hashes.bintypes.txt','hashes.binentries.txt']){
  if(fs.existsSync(`${cache}/${file}`))continue;
  const r=await fetch(`https://raw.githubusercontent.com/CommunityDragon/Data/master/hashes/lol/${file}`);
  if(!r.ok)throw Error(`Dictionary download: ${r.status}`);fs.writeFileSync(`${cache}/${file}`,Buffer.from(await r.arrayBuffer()));
}
const fields=dictionary(`${cache}/hashes.binfields.txt`),types=dictionary(`${cache}/hashes.bintypes.txt`),entries=dictionary(`${cache}/hashes.binentries.txt`);
// A deliberately small, reviewed set. Indices refer to original emitter order.
const selection={
  Ahri:{Q:['Ahri_Base_Q_mis',[1,2,3,4,5,11,12,15]],QReturn:['Ahri_Base_Q_mis_02',[2,4,5,10,16,17,18,19]],E:['Ahri_Base_E_mis',[1,2,4,6,9]],QHit:['Ahri_Base_Q_tar',[0,1,4]],EHit:['Ahri_Base_E_tar',[0,2,4,5]]},
  Ashe:{R:['Ashe_Base_R_mis',[0,3,5,7,13,14,17,18]],RHit:['Ashe_Base_R_tar',null]},
  Lux:{Q:['Lux_Base_Q_mis',[0,1,2,7,9,11]],QHit:['Lux_Base_Q_tar',null],R:['Lux_Base_R_mis_beam',[0,6,8,9,10,11,16,25,26]]}
};
const data={version:1,source:'installed League client',systems:{},textures:{},meshes:{}},manifest={version:1,archives:{},resources:[],systems:{}};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const archives=[];
function open(file){const w=new Wad(file);w.locateToc();archives.push(w);return w;}
try{
  for(const[id,systems]of Object.entries(selection)){
    const w=open(path.join(root,'DATA/FINAL/Champions',id+'.wad.client'));
    manifest.archives[id]={file:id+'.wad.client',wadVersion:w.version,size:fs.statSync(w.path).size};
    const bins=new Map(),seen=new Set();
    function visit(p){if(seen.has(p.toLowerCase()))return;seen.add(p.toLowerCase());const b=w.get(p);if(!b)return;const d=readBin(b,fields,types,entries);for(const[k,v]of Object.entries(d))if(v?.__type==='VfxSystemDefinitionData')bins.set(k,{v,bin:p,hash:sha(b)});for(const link of d.__linked)visit(link);}
    visit(`data/characters/${id.toLowerCase()}/skins/skin0.bin`);
    for(const[key,[name,indices]]of Object.entries(systems)){
      const source=[...bins.values()].find(({v})=>v.particleName===name);if(!source)throw Error('Missing system '+name);
      const all=source.v.complexEmitterDefinitionData||[];
      const emitters=all.filter((e,i)=>indices?indices.includes(i):e.texture&&!e.primitive?.__type?.includes('Mesh')).slice(0,16);
      const nameKey=id+key;data.systems[nameKey]={source:source.v.particlePath||name,emitters};
      manifest.systems[nameKey]={bin:source.bin,binSHA256:source.hash,particle:name,selected:emitters.map(e=>e.emitterName),omitted:all.filter(e=>!emitters.includes(e)).map(e=>e.emitterName)};
      for(const e of emitters){
        for(const[resource,kind]of [[e.texture,'texture'],[e.primitive?.mMesh?.mSimpleMeshName,'mesh']]){
          if(!resource)continue;const collection=kind==='texture'?data.textures:data.meshes;if(collection[resource])continue;
          let b=w.get(resource),archive=w;
          if(!b){for(const filename of ['Global.wad.client','DATA.wad.client']){let other=archives.find(a=>a.path===path.join(root,'DATA/FINAL',filename));if(!other)other=open(path.join(root,'DATA/FINAL',filename));b=other.get(resource);if(b){archive=other;break;}}}
          if(!b)throw Error('Missing resource '+resource);
          const record={path:resource,pathHash:pathHash(resource),archive:path.basename(archive.path),sourceSHA256:sha(b),bytes:b.length};
          if(kind==='texture'){const t=texturePNG(b),file=`${pathHash(resource)}.png`;fs.writeFileSync(`${out}/${file}`,t.png);collection[resource]={file:`${out}/${file}`,width:t.width,height:t.height};Object.assign(record,{output:`${out}/${file}`,outputSHA256:sha(t.png),width:t.width,height:t.height,format:t.format});}
          else collection[resource]=readMesh(b);
          manifest.resources.push(record);
        }
      }
    }
  }
  fs.writeFileSync('data/particles.js','// Original client VFX subset; see ASSETS.md and assets/particles/manifest.json.\nwindow.LFM_PARTICLES='+JSON.stringify(data)+';\n');
  fs.writeFileSync(`${out}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({systems:Object.keys(data.systems).length,textures:Object.keys(data.textures).length,meshes:Object.keys(data.meshes).length,emitters:Object.values(data.systems).reduce((n,s)=>n+s.emitters.length,0)}));
}finally{for(const w of archives)w.close();}
