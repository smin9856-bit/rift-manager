import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
const context={window:{LFM:{}}};vm.createContext(context);
vm.runInContext(fs.readFileSync('data/particles.js','utf8'),context);
const data=context.window.LFM_PARTICLES,manifest=JSON.parse(fs.readFileSync('assets/particles/manifest.json'));
assert.equal(Object.keys(data.textures).length,37);assert.equal(Object.keys(data.meshes).length,2);
assert.deepEqual(Object.keys(data.systems).sort(),['AhriE','AhriEHit','AhriQ','AhriQHit','AhriQReturn','AsheR','AsheRHit','LuxQ','LuxQHit','LuxR']);
for(const[path,t]of Object.entries(data.textures)){
  const b=fs.readFileSync(t.file),source=manifest.resources.find(r=>r.path===path);
  assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(b.readUInt32BE(16),t.width);assert.equal(b.readUInt32BE(20),t.height);
  assert.equal(crypto.createHash('sha256').update(b).digest('hex'),source.outputSHA256);
  assert.match(source.sourceSHA256,/^[a-f0-9]{64}$/);assert(source.bytes>0);
}
for(const m of Object.values(data.meshes))for(const f of m.faces){assert.equal(f.indices.length,3);assert.equal(f.uv.length,3);assert(f.indices.every(i=>i>=0&&i<m.vertices.length));assert(f.uv.flat().every(Number.isFinite));}
for(const[key,s]of Object.entries(data.systems)){
  assert(s.source.includes('/Skins/Skin0/'));assert.equal(manifest.systems[key].selected.length,s.emitters.length);
  for(const e of s.emitters){assert(data.textures[e.texture]);const mesh=e.primitive?.mMesh?.mSimpleMeshName;if(mesh)assert(data.meshes[mesh]);}
}
const noImageContext={window:{LFM:{}},Image:class{set src(v){this.onload?.();}}};vm.createContext(noImageContext);noImageContext.window.LFM_PARTICLES=data;
vm.runInContext(fs.readFileSync('js/native-vfx.js','utf8'),noImageContext);const N=noImageContext.window.LFM.nativeVfx;
assert.equal(N.sample({constantValue:9,dynamics:{times:[0,1],values:[2,6]}},.5,0),4);
assert.equal(N.sample({constantValue:9},.5,0),9);assert.equal(N.sample(null,.5,3),3);
assert.equal(JSON.stringify(N.sample({dynamics:{times:[0,1],values:[[0,1],[1,0]]}},.5,null)),'[0.5,0.5]');
assert(N.supports('Ahri',0));assert(N.supports('Ahri',2));assert(N.supports('Ashe',3));assert(N.supports('Lux',3));assert(!N.supports('Ashe',0));
console.log('PASS: 37 PNG checksums, 2 meshes, 10 source systems, interpolation and five-skill coverage.');
