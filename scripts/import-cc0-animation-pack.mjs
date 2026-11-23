/**
 * Build-only importer: 35 CC0 KinemIQ/Quaternius motion clips.
 * Downloads a ~2.2MB pack and unpacks ONLY animation-only .glb entries into
 * dist/. Never publishes the mannequin or any proprietary Renderpeople data.
 */
import {inflateRawSync} from 'node:zlib';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const SOURCE='https://huggingface.co/datasets/Kinemiq/free-game-animations';
const ZIP=SOURCE+'/resolve/main/KinemIQ_Free_Animations_CC0_GLB.zip';
const MAX_ZIP=12_000_000,MAX_GLBS=55,MAX_CLIP=600_000;
const approved=/^GLB\/([A-Za-z0-9_-]+)\.glb$/;

function glbDoc(blob){
 if(blob.length<64||blob.toString('ascii',0,4)!=='glTF'||
  blob.readUInt32LE(4)!==2||blob.readUInt32LE(8)!==blob.length)
  throw Error('Invalid glTF binary');
 const len=blob.readUInt32LE(12);
 if(len<30||len>2_000_000||blob.readUInt32LE(16)!==0x4e4f534a)
  throw Error('Invalid glTF JSON chunk');
 return JSON.parse(blob.subarray(20,20+len).toString('utf8').trim());
}
function unpack(data){
 let e=-1;
 for(let p=data.length-22;p>=Math.max(0,data.length-65000);p--){
  if(data.readUInt32LE(p)===0x06054b50){e=p;break;}
 }
 if(e<0)throw Error('CC0 motion pack has no ZIP central directory');
 const count=data.readUInt16LE(e+10);let offset=data.readUInt32LE(e+16);
 if(count>MAX_GLBS+20)throw Error('Unexpectedly large archive file count');
 const entries=[];
 for(let k=0;k<count;k++){
  if(data.readUInt32LE(offset)!==0x02014b50)throw Error('Invalid ZIP central record');
  const comp=data.readUInt16LE(offset+10),size=data.readUInt32LE(offset+20);
  const uncompressed=data.readUInt32LE(offset+24),nameLen=data.readUInt16LE(offset+28);
  const extra=data.readUInt16LE(offset+30),comment=data.readUInt16LE(offset+32);
  const local=data.readUInt32LE(offset+42);
  const name=data.subarray(offset+46,offset+46+nameLen).toString('utf8');
  offset+=46+nameLen+extra+comment;
  const match=approved.exec(name);
  if(!match)continue; // never copy mannequin/source/unknown path
  if(size>MAX_CLIP||uncompressed>MAX_CLIP)throw Error('Motion clip too large');
  if(data.readUInt32LE(local)!==0x04034b50)throw Error('Invalid ZIP local record');
  const start=local+30+data.readUInt16LE(local+26)+data.readUInt16LE(local+28);
  const zipped=data.subarray(start,start+size);
  const body=comp===8?inflateRawSync(zipped):comp===0?zipped:null;
  if(!body||body.length!==uncompressed)throw Error('Unsupported ZIP compression');
  const doc=glbDoc(body);
  const clip=doc.animations?.[0];
  if(!clip?.name||!clip.channels?.length)throw Error('Missing named motion in '+name);
  const rotations=clip.channels.filter(ch=>ch.target?.path==='rotation'&&
   /^(hand|upperarm|lowerarm|thigh|spine|pelvis)/.test(doc.nodes?.[ch.target.node]?.name||''));
  if(rotations.length<8)throw Error('Motion rig does not match expected humanoid names '+name);
  entries.push({name:match[1],file:match[1]+'.glb',body,rotationChannels:rotations.length});
 }
 return entries;
}
export async function installCc0Animations(output,manifest,modelInstalled){
 if(!modelInstalled)return false;
 try{
  const response=await fetch(ZIP,{signal:AbortSignal.timeout(70000)});
  if(!response.ok)throw Error('CC0 animation pack HTTP '+response.status);
  const len=Number(response.headers.get('content-length')||0);
  if(len>MAX_ZIP)throw Error('CC0 animation archive too large');
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length>MAX_ZIP)throw Error('CC0 animation archive exceeds allowed size');
  const entries=unpack(bytes);
  const names=entries.map(e=>e.name);
  if(entries.length<30||!names.includes('Idle_relaxed')||!names.includes('Walk_formal'))
   throw Error('CC0 animation library missing required idle/walk clips');
  const dir=join(output,'museum/assets/animations/kinemiq');
  await mkdir(dir,{recursive:true});
  for(const e of entries)await writeFile(join(dir,e.file),e.body);
  manifest.character.animationLibrary={
   license:'CC0-1.0',source:SOURCE,
   path:'./assets/animations/kinemiq/',
   totalClips:entries.length,
   preferredIdle:'Idle_relaxed',
   preferredWalk:'Walk_formal',
   clips:names
  };
  console.log('Installed',entries.length,'CC0 humanoid animation GLBs with',entries.reduce((a,e)=>a+e.body.length,0),'total bytes');
  return true;
 }catch(error){
  delete manifest.character.animationLibrary;
  console.warn('New CC0 motion pack not ready; retaining original idle/walk:',error.message);
  return false;
 }
}
