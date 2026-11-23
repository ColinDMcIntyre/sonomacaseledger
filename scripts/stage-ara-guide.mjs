#!/usr/bin/env node
/**
 * Stage an independently rigged, CC0 MakeHuman-derived museum character built
 * by the MIT Ara 3D Gen CLI. It carries its own native idle/walk animations;
 * no KinemIQ/Jordan bone retargeting or wrist fixes are applied.
 */
import {readdir,readFile,copyFile,mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
const MAX_BYTES=24*1024*1024;
const SRC=resolve(process.argv[2]||'.tmp/ara');
const DST=resolve('museum/assets/characters/ara_museum_guide.glb');
const REPORT=resolve('research/museum-guide-ara-report.json');
async function glbs(dir){
 const found=[];
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const p=join(dir,entry.name);
  if(entry.isDirectory())found.push(...await glbs(p));
  else if(entry.isFile()&&entry.name.endsWith('.glb'))found.push(p);
 }
 return found;
}
function parse(buffer){
 if(buffer.byteLength<100||buffer.toString('ascii',0,4)!=='glTF'||
    buffer.readUInt32LE(4)!==2||buffer.readUInt32LE(8)!==buffer.length)
  throw Error('Invalid glTF 2.0 binary header');
 const len=buffer.readUInt32LE(12);
 if(len<60||len>5_000_000||buffer.readUInt32LE(16)!==0x4e4f534a)
  throw Error('Invalid GLB JSON chunk');
 const d=JSON.parse(buffer.subarray(20,20+len).toString('utf8').trim());
 const names=(d.animations||[]).map(a=>a.name||'');
 if(!names.some(n=>/idle|standing|rest/i.test(n))||
    !names.some(n=>/walk|stride|locomotion/i.test(n)))
  throw Error('Character must contain native idle AND walk clips: '+names.join(', '));
 if(!(d.skins||[]).some(s=>s.joints?.length>=25))throw Error('Not a properly rigged human');
 if((d.meshes||[]).length<1||(d.materials||[]).length<2||
    (d.textures||[]).length<1)throw Error('Expected textured, dressed human mesh');
 const required=new Set(d.extensionsRequired||[]);
 for(const e of ['KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_texture_basisu'])
  if(required.has(e))throw Error('Unsupported compression requires extra decoder: '+e);
 const skinNames=(d.skins||[]).flatMap(s=>s.joints||[])
   .map(i=>d.nodes?.[i]?.name||'');
 const animChannels=(d.animations||[]).map((a,i)=>({
  name:names[i],channels:a.channels?.length||0,duration:'in metadata'
 }));
 if(animChannels.some(a=>a.channels<20))throw Error('An animation has too few bone channels');
 return {animations:names,bones:skinNames.length,meshes:d.meshes.length,
   textures:d.textures.length,materials:d.materials.length,
   animationChannels:animChannels,triangleCount:null};
}
const candidates=await glbs(SRC);
if(candidates.length!==1)throw Error('Expected exactly one generated GLB, got '+candidates.length);
const data=await readFile(candidates[0]);
if(data.length<1_000_000||data.length>MAX_BYTES)
 throw Error('Generated avatar size '+data.length+' is outside the 1-24 MiB Cloudflare Pages budget');
const metadata=parse(data);
await mkdir(resolve(DST,'..'),{recursive:true});
await copyFile(candidates[0],DST);
const report={
 generatedBy:'Ara 3D Gen 0.14.0 (MIT)',
 source:'https://github.com/olatunde85/3d-gen',
 baseModelLicense:'MakeHuman CC0-1.0',
 animationSource:'CMU Graphics Lab Motion Capture Database (commercial project use permitted; no standalone resale)',
 preset:'The Secret Agent',
 file:'museum/assets/characters/ara_museum_guide.glb',
 bytes:data.length,
 sha256:createHash('sha256').update(data).digest('hex'),
 ...metadata
};
await writeFile(REPORT,JSON.stringify(report,null,2)+'\n');
console.log('Verified native-rig phototextured museum guide',JSON.stringify(report,null,2));
