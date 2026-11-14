// Read-only League WAD/PROP/TEX reader for the offline VFX importer.
// Format references: CommunityDragon/CDTB and LeagueToolkit/league-toolkit.
import fs from 'node:fs';
import zlib from 'node:zlib';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {createXXHash64}=require('../browser-test/node_modules/hash-wasm');
const decoder=require('../browser-test/node_modules/tex-decoder');
const {PNG}=require('../browser-test/node_modules/pngjs');
const hash=await createXXHash64();
export const pathHash=s=>hash.init().update(s.toLowerCase().replaceAll('\\','/')).digest('hex');
export const fnv=s=>{let n=0x811c9dc5;for(const c of s.toLowerCase())n=Math.imul(n^c.charCodeAt(0),0x01000193)>>>0;return n;};
export class Wad {
  constructor(path){this.path=path;this.fd=fs.openSync(path,'r');const header=this.read(0,272);if(header.toString('ascii',0,2)!=='RW'||header[2]!==3)throw Error('Expected WAD v3');this.version=[header[2],header[3]];const count=header.readUInt32LE(268),table=this.read(272,count*32);this.entries=new Map();for(let i=0;i<count;i++){const o=i*32,e={hash:table.readBigUInt64LE(o).toString(16).padStart(16,'0'),offset:table.readUInt32LE(o+8),compressed:table.readUInt32LE(o+12),size:table.readUInt32LE(o+16),type:table[o+20]&15,chunks:table[o+20]>>4,chunkIndex:table.readUInt16LE(o+22)+(header[3]>3?table[o+21]*65536:0)};this.entries.set(e.hash,e);}}
  read(offset,size){const b=Buffer.alloc(size);if(fs.readSync(this.fd,b,0,size,offset)!==size)throw Error('Truncated WAD');return b;}
  find(path){return this.entries.get(pathHash(path));}
  entry(e){const b=this.read(e.offset,e.compressed);let out;if(e.type===0)out=b;else if(e.type===1)out=zlib.gunzipSync(b);else if(e.type===3)out=zlib.zstdDecompressSync(b);else if(e.type===4){if(this.toc){let off=0;const chunks=[];for(let i=0;i<e.chunks;i++){const pos=(e.chunkIndex+i)*16,c=this.toc.readUInt32LE(pos),n=this.toc.readUInt32LE(pos+4),part=b.subarray(off,off+c);chunks.push(c===n?part:zlib.zstdDecompressSync(part));off+=c;}out=Buffer.concat(chunks);}else out=zlib.zstdDecompressSync(b);}else throw Error('Unsupported WAD entry '+e.type);if(out.length!==e.size)throw Error('WAD decompressed size mismatch');return out;}
  get(path){const e=this.find(path);return e?this.entry(e):null;}
  locateToc(){for(const e of this.entries.values()){if(![0,3].includes(e.type)||e.size%16||e.size<160||e.size>2000000)continue;const b=this.entry(e);let valid=true;for(let i=0;i<b.length;i+=16){const c=b.readUInt32LE(i),n=b.readUInt32LE(i+4);if(c<1||n<1||c>n||n>16777216){valid=false;break;}}if(valid){this.toc=b;return;}}}
  close(){fs.closeSync(this.fd);}
}
export function dictionary(file){const map=new Map();for(const line of fs.readFileSync(file,'utf8').split('\n')){const i=line.indexOf(' ');if(i>0)map.set(parseInt(line.slice(0,i),16),line.slice(i+1).trim());}return map;}
export function readBin(b,fields,types,entries){
  let pos=0;const take=n=>{const o=pos;pos+=n;if(pos>b.length)throw Error('PROP overrun');return o;},u8=()=>b.readUInt8(take(1)),u16=()=>b.readUInt16LE(take(2)),u32=()=>b.readUInt32LE(take(4)),f32=()=>b.readFloatLE(take(4)),str=()=>{const n=u16();return b.toString('utf8',take(n),pos);},name=(m,n)=>m?.get(n)||'0x'+n.toString(16).padStart(8,'0');
  function object(type,count){const o={__type:name(types,type)};for(let i=0;i<count;i++){const field=u32(),kind=u8();o[name(fields,field)]=value(kind,kind===17&&type===0xff9d3409);}return o;}
  function value(t,wide=false){switch(t){case 0:return [u16(),u16(),u16()];case 1:case 135:return !!u8();case 2:return b.readInt8(take(1));case 3:return u8();case 4:return b.readInt16LE(take(2));case 5:return u16();case 6:return b.readInt32LE(take(4));case 7:return u32();case 8:case 9:case 18:return '0x'+b.readBigUInt64LE(take(8)).toString(16);case 10:return f32();case 11:case 12:case 13:return Array.from({length:t-9},f32);case 14:return Array.from({length:16},f32);case 15:return Array.from({length:4},u8);case 16:return str();case 17:return wide?'0x'+b.readBigUInt64LE(take(8)).toString(16):name(entries,u32());case 132:return name(entries,u32());case 128:case 129:{const type=u8();u32();const count=u32();if(count>100000)throw Error('Bad PROP list');return Array.from({length:count},()=>value(type));}case 130:{const type=u32();if(!type)return null;u32();return object(type,u16());}case 131:{const type=u32();u32();return object(type,u16());}case 133:{const type=u8();return u8()?value(type):null;}case 134:{const key=u8(),type=u8();u32();const n=u32(),out={};for(let i=0;i<n;i++)out[value(key)]=value(type);return out;}default:throw Error('Unknown PROP type '+t+' at '+pos);}}
  let magic=b.toString('ascii',take(4),pos);if(magic==='PTCH'){take(8);magic=b.toString('ascii',take(4),pos);}if(magic!=='PROP')throw Error('Not a PROP');const version=u32(),links=[];if(version>=2){const n=u32();for(let i=0;i<n;i++)links.push(str());}const count=u32(),kinds=Array.from({length:count},u32),out={__linked:links};for(const kind of kinds){const size=u32(),end=pos+size,path=u32(),n=u16();out[name(entries,path)]=object(kind,n);if(pos!==end)throw Error('PROP entry size mismatch '+pos+' / '+end);}return out;
}
export function texturePNG(b){
  let width,height,format,data;
  if(b.toString('ascii',0,4)==='TEX\0'){width=b.readUInt16LE(4);height=b.readUInt16LE(6);format=({10:'BC1',11:'BC1',12:'BC3',13:'BC7',20:'raw'})[b[9]];if(!format)throw Error('Unsupported TEX format '+b[9]);const size=format==='raw'?width*height*4:Math.ceil(width/4)*Math.ceil(height/4)*(format==='BC1'?8:16);data=b.subarray(b.length-size);}
  else if(b.toString('ascii',0,4)==='DDS '){width=b.readUInt32LE(16);height=b.readUInt32LE(12);const fourcc=b.toString('ascii',84,88);format=({DXT1:'BC1',DXT3:'BC2',DXT5:'BC3',ATI1:'BC4',ATI2:'BC5'})[fourcc];let offset=128;if(fourcc==='DX10'){format=({71:'BC1',72:'BC1',74:'BC2',75:'BC2',77:'BC3',78:'BC3',80:'BC4',83:'BC5',95:'BC6H',98:'BC7',99:'BC7'})[b.readUInt32LE(128)];offset=148;}if(!format)throw Error('Unsupported DDS '+fourcc);data=b.subarray(offset);}
  else throw Error('Not a TEX/DDS image');
  if(width>4096||height>4096||!width||!height)throw Error('Invalid texture dimensions');let rgba;
  if(format==='raw'){rgba=Buffer.from(data);for(let i=0;i<rgba.length;i+=4)[rgba[i],rgba[i+2]]=[rgba[i+2],rgba[i]];}else{const fn=decoder['decode'+format];if(!fn)throw Error('Decoder missing '+format);rgba=Buffer.from(fn(data,width,height));}
  return {width,height,format,png:PNG.sync.write({width,height,data:rgba})};
}

export function readMesh(b){
  if(b.toString('ascii',0,8)!=='r3d2Mesh')throw Error('Not a static mesh');
  const major=b.readUInt16LE(8),minor=b.readUInt16LE(10),nv=b.readUInt32LE(140),nf=b.readUInt32LE(144),flags=b.readUInt32LE(148);
  if(![2,3].includes(major)||nv>20000||nf>40000)throw Error('Unsupported static mesh');
  let pos=176;const hasColors=major>=3&&minor>=2?b.readUInt32LE(pos):0;if(major>=3&&minor>=2)pos+=4;
  const f=()=>{const n=b.readFloatLE(pos);pos+=4;return n;};
  const vertices=Array.from({length:nv},()=>[f(),f(),f()]);
  const colors=hasColors?Array.from({length:nv},()=>{const rgba=[b[pos+2],b[pos+1],b[pos],b[pos+3]];pos+=4;return rgba;}):null;
  const center=[f(),f(),f()];
  const faces=Array.from({length:nf},()=>{const indices=[b.readUInt32LE(pos),b.readUInt32LE(pos+4),b.readUInt32LE(pos+8)];pos+=76;const uv=Array.from({length:6},f);if(indices.some(i=>i>=nv))throw Error('Bad mesh index');return {indices,uv:indices.map((_,i)=>[uv[i],uv[i+3]])};});
  if(flags&1)pos+=nf*9;
  if(pos!==b.length)throw Error('Static mesh size mismatch');
  return {vertices,colors,center,faces};
}
