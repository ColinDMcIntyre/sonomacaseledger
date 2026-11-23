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
const count=buf.readUInt16LE(e+10),entries=[],samples=new Map();
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
  if(/KinemIQ_Mannequin\.glb|Idle_relaxed\.glb|Walk_formal\.glb|Walk_forwards\.glb/i.test(name))
   samples.set(name,gltf);
  entries.push({name,bytes:data.length,clips:(gltf.animations||[]).map(a=>a.name),
   bones:jointNames.length,exampleBones:jointNames.slice(0,12)});
 }
 pos+=46+nameLen+ex+co;
}
console.log(JSON.stringify({zipBytes:buf.length,glbCount:entries.length,entries},null,2));
if(entries.length<15)throw Error('Expected >=15 CC0 GLB clips');

const target=process.env.JORDAN_GLB||'dist/museum/assets/characters/realistic_guide_cc0.glb';
const {readFileSync}=await import('node:fs');
const model=readFileSync(target);
const mlen=model.readUInt32LE(12);
const jordan=JSON.parse(model.subarray(20,20+mlen).toString('utf8').trim());
const jnodes=new Map((jordan.nodes||[]).map(x=>[x.name,x]));
const q=(node)=>node?.rotation||[0,0,0,1];
const delta=(a,b)=>2*Math.acos(Math.max(-1,Math.min(1,Math.abs(
 a.reduce((sum,x,i)=>sum+x*b[i],0)
))))*180/Math.PI;
console.log('SKELETON COMPATIBILITY');
for(const [name,gltf] of samples){
 const names=(gltf.nodes||[]).map(n=>n.name).filter(Boolean);
 const matched=names.filter(n=>jnodes.has(n));
 const interested=['pelvis','spine_01','upperarm_l','lowerarm_l','hand_l','thigh_l','upperarm_r','lowerarm_r','hand_r','thigh_r'];
 const comparison=interested.map(n=>{
  const src=(gltf.nodes||[]).find(x=>x.name===n),dst=jnodes.get(n);
  return {joint:n,present:!!src,deltaDeg:src&&dst?Math.round(delta(q(src),q(dst))):null,
    srcQ:src?q(src):null,dstQ:dst?q(dst):null};
 });
 const clip=gltf.animations?.[0];
 const channelNames=(clip?.channels||[]).map(c=>({
  name:gltf.nodes?.[c.target?.node]?.name,path:c.target?.path
 }));
 const rotations=channelNames.filter(x=>x.path==='rotation');
 const matchingRotations=rotations.filter(x=>jnodes.has(x.name));
 console.log(JSON.stringify({asset:name,nodes:names.length,matchedNames:matched.length,
  rotationTracks:rotations.length,matchedRotationTracks:matchingRotations.length,
  comparisons:comparison},null,2));
}

