import {readdir,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {PUBLIC_SECTIONS,pagePath,metaValue} from './config.mjs';
export async function discoverPages(root){
 const pages=['index.html'];
 // Only explicit public sections and their direct case profiles are eligible.
 // Never discover arbitrary research, PDF, asset, or private repository paths.
 for(const section of PUBLIC_SECTIONS){
  pages.push(section+'/index.html');
  if(section==='cases'||section==='federal'){
   for(const entry of await readdir(join(root,section),{withFileTypes:true})){
    if(entry.isDirectory()&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name))pages.push(section+'/'+entry.name+'/index.html');
   }
  }
 }
 return Promise.all(pages.sort().map(async file=>{
  const html=await readFile(join(root,file),'utf8');
  return {file,path:pagePath(file),html,indexable:!/\bnoindex\b/i.test(metaValue(html,'robots'))};
 }));
}
export function caseRegistry(data,briefs){
 const map=new Map();
 for(const group of ['county','federal','special']){
  const rows=group==='special'?Object.values(data.special):data[group];
  for(const row of rows){
   if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.slug))throw Error('Invalid case slug');
   const path='/'+(group==='federal'?'federal':'cases')+'/'+row.slug+'/';
   const brief=briefs[group]?.[row.slug];
   if(map.has(path)||!brief?.lead||row.outcome!==brief.lead)throw Error('Missing or inconsistent case brief: '+path);
   map.set(path,{row,brief,group});
  }
 }
 return map;
}
