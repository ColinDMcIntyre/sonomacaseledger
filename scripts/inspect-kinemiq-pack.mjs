#!/usr/bin/env node
/**
 * Inspects the CC0 KinemIQ 35-motion GLB zip from Hugging Face.
 * No binaries are committed or published by this diagnostic.
 */
import {inflateRawSync} from 'node:zlib';
const URL='https://huggingface.co/datasets/Kinemiq/free-game-animations/resolve/main/KinemIQ_Free_Animations_CC0_GLB.zip';
const response=await fetch(URL,{signal:AbortSignal.timeout(45000)});
if(!response.ok)throw Error('Animation pack download HTTP '+response.status);
const buf=Buffer.from(await response.arrayBuffer());
if(buf.length<5000||buf.length>15_000_000)throw Error('Unexpected pack size '+buf.length);
let e=-1;
for(let p=buf.length-22;p>=Math.max(0,buf.length-65000);p--){
 if(buf.readUInt32LE(p)===0x06054b50){e=p;break;}
}
if(e<0)throw Error('Invalid ZIP archive');
let pos=buf.readUInt32LE(e+16);
const count=buf.readUInt16LE(e+10),entries=[];
function get(central){
 const compression=buf.readUInt16LE(central+10);
 const length=buf.readUInt32LE(central+20),uncompressed=buf.readUInt32LE(central+24);
 const local=buf.readUInt32LE(central+42);
 if(buf.readUInt32LE(local)!==0x04034b50)throw Error('Broken ZIP local entry');
 const start=local+30+buf.readUInt16LE(local+26)+buf.readUInt16LE(local+28);
 const payload=buf.subarray(start,start+length);
 const data=compression===8?inflateRawSync(payload):compression===0?payload:null;
 if(!data||data.length!==uncompressed||data.length>12_000_000)throw Error('Unsupported zip payload');
 return data;
}
for(let k=0;k<count;k++){
 if(buf.readUInt32LE(pos)!==0x02014b50)throw Error('Invalid ZIP directory');
 const nameLen=buf.readUInt16LE(pos+28),ex=buf.readUInt16LE(pos+30),co=buf.readUInt16LE(pos+32);
 const name=buf.subarray(pos+46,pos+46+nameLen).toString();
 if(/\.glb$/i.test(name)){
  const data=get(pos);
  if(data.toString('ascii',0,4)!=='glTF')throw Error('Invalid GLB in '+name);
  const jslen=data.readUInt32LE(12);
  const gltf=JSON.parse(data.subarray(20,20+jslen).toString('utf8').trim());
  const jointNames=(gltf.skins||[]).flatMap(s=>(s.joints||[]).map(i=>gltf.nodes?.[i]?.name)).filter(Boolean);
  entries.push({name,bytes:data.length,clips:(gltf.animations||[]).map(a=>a.name),
   bones:jointNames.length,exampleBones:jointNames.slice(0,12)});
 }
 pos+=46+nameLen+ex+co;
}
console.log(JSON.stringify({zipBytes:buf.length,glbCount:entries.length,entries},null,2));
if(entries.length<15)throw Error('Expected >=15 CC0 GLB clips');
