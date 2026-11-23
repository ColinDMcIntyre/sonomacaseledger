#!/usr/bin/env node
/**
 * Print animation and skeleton metadata from the downloaded CC0 GLB.
 * Never uploads or commits character source data, only textual diagnostics.
 */
import {readFileSync} from 'node:fs';
const file=process.argv[2]||'dist/museum/assets/characters/realistic_guide_cc0.glb';
const buf=readFileSync(file);
if(buf.toString('ascii',0,4)!=='glTF')throw Error('Not a GLB');
const length=buf.readUInt32LE(12);
const gltf=JSON.parse(buf.subarray(20,20+length).toString('utf8').trim());
const nodes=gltf.nodes||[];
const skins=gltf.skins||[];
console.log('MODEL',file,'bytes',buf.length,'nodes',nodes.length,'skins',skins.length);
console.log('RIG BONES');
for(const skin of skins){
 const joints=skin.joints||[];
 for(const index of joints){
  const n=nodes[index],name=n?.name||'';
  if(/hand|wrist|forearm|lowerarm|elbow|thigh|leg|foot|shoulder|arm|finger|index|middle/i.test(name)){
   const parentIndex=nodes.findIndex(node=>node.children?.includes(index));
   console.log(JSON.stringify({i:index,name,parent:parentIndex<0?null:nodes[parentIndex].name,
     t:n.translation||[0,0,0],r:n.rotation||[0,0,0,1]}));
  }
 }
}
console.log('ANIMATIONS');
for(const anim of gltf.animations||[]){
 const targets=(anim.channels||[]).map(c=>{
  const t=c.target||{};return [nodes[t.node]?.name||'unknown',t.path];
 });
 const wrists=targets.filter(([n])=>/hand|wrist/i.test(n));
 console.log(JSON.stringify({name:anim.name,channels:targets.length,wristTracks:wrists.slice(0,14)}));
}
