#!/usr/bin/env node
/**
 * Cloudflare Pages build for Sonoma Case Ledger.
 * Creates a public-only dist directory and installs the openly licensed CC0
 * animated museum visitor at build time. No Renderpeople data is deployed.
 *
 * Cloudflare settings: Build command: node scripts/build-cloudflare.mjs
 *                      Output directory: dist
 */
import {cp, mkdir, readFile, writeFile, rm, stat} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const ROOT=resolve(fileURLToPath(new URL('..',import.meta.url)));
const OUT=join(ROOT,'dist');
const MODEL_NAME='realistic_guide_cc0.glb';
const MODEL_PATH=join(OUT,'museum','assets','characters',MODEL_NAME);
const MODEL_SOURCE='https://www.innerscene.com/tools/library/3d-parts/locomotion-collection-jordan-3d-person-animated-911f1584';
const MODEL_URL='https://www.innerscene.com/api/library/locomotion-collection-jordan-3d-person-animated-911f1584/download';
const TRUSTED=new Set(['www.innerscene.com','files.innerscene.com']);
const MAX_FILE=25*1024*1024; // Cloudflare Pages individual asset limit: 25 MiB
const FALLBACK_MODEL='./assets/characters/visitor.glb';

function inspectGlb(data){
  if(data.length<40||data.toString('ascii',0,4)!=='glTF'||data.readUInt32LE(4)!==2||
     data.readUInt32LE(8)!==data.length)throw Error('Invalid binary glTF 2.0 header');
  const jsonBytes=data.readUInt32LE(12);
  if(jsonBytes<80||jsonBytes>4_000_000||data.readUInt32LE(16)!==0x4E4F534A)
    throw Error('GLB JSON header invalid');
  const doc=JSON.parse(data.subarray(20,20+jsonBytes).toString('utf8').trim());
  const names=(doc.animations||[]).map(a=>String(a.name||''));
  if(!names.some(n=>/idle|standing|rest/i.test(n))||
     !names.some(n=>/walk|stride|locomotion/i.test(n)))
    throw Error('Model missing named idle and walk animations: '+names.join(', '));
  if(!(doc.skins||[]).some(s=>(s.joints||[]).length>10))
    throw Error('No usable skinned human rig');
  if(!(doc.meshes||[]).length||!(doc.materials||[]).length||!(doc.textures||[]).length)
    throw Error('No textured character mesh');
  const extensions=new Set(doc.extensionsRequired||[]);
  for(const e of ['KHR_draco_mesh_compression','EXT_meshopt_compression','KHR_texture_basisu']){
    if(extensions.has(e))throw Error('Additional decoder required: '+e);
  }
  return {names,skins:doc.skins.length,meshes:doc.meshes.length,
    textures:doc.textures.length,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};
}
async function download(url,redirects=0){
 if(redirects>4)throw Error('Too many model download redirects');
 const parsed=new URL(url);
 if(parsed.protocol!=='https:'||!TRUSTED.has(parsed.hostname))
   throw Error('Untrusted model hosting URL: '+parsed.hostname);
 const response=await fetch(url,{
  redirect:'manual',headers:{'User-Agent':'SonomaCaseLedger/1.0 (CC0 museum model build)'},
  signal:AbortSignal.timeout(150000)
 });
 if([301,302,303,307,308].includes(response.status)){
   const location=response.headers.get('location');
   if(!location)throw Error('Missing redirect URL');
   await response.body?.cancel();
   return download(new URL(location,url).href,redirects+1);
 }
 if(!response.ok)throw Error('HTTP '+response.status+' downloading CC0 model');
 const type=response.headers.get('content-type')||'';
 if(/text\/html/i.test(type))throw Error('Server returned HTML instead of 3D model');
 const length=Number(response.headers.get('content-length')||0);
 if(length>MAX_FILE)throw Error('Model exceeds Cloudflare Pages 25 MiB per-file limit');
 const chunks=[],reader=response.body.getReader();let size=0;
 while(true){
  const {done,value}=await reader.read();
  if(done)break;
  size+=value.byteLength;
  if(size>MAX_FILE){await reader.cancel();throw Error('GLB exceeded 25 MiB');}
  chunks.push(Buffer.from(value));
 }
 return Buffer.concat(chunks,size);
}
async function copyPublishedSite(){
 await rm(OUT,{recursive:true,force:true});
 await mkdir(OUT,{recursive:true});
 const publicEntries=[
   'index.html','robots.txt','sitemap.xml',
   'assets','cases','federal','records','corrections','museum','public-records'
 ];
 for(const name of publicEntries){
  await cp(join(ROOT,name),join(OUT,name),{recursive:true});
 }
 await mkdir(join(OUT,'research'),{recursive:true});
 for(const name of ['case-data.json','case-briefs.json']){
  await cp(join(ROOT,'research',name),join(OUT,'research',name));
 }
 // Deliberately omit private archives, repo metadata, importer code, and
 // unpublished court-data research: dist is the complete public release.
 const siteOrigin=process.env.SITE_ORIGIN?.replace(/\/$/,'');
 if(siteOrigin){
  const u=new URL(siteOrigin);
  if(u.protocol!=='https:'||u.pathname!=='/'||u.search||u.hash)throw Error('SITE_ORIGIN must be an HTTPS origin');
  const old='https://colindmcintyre.github.io/sonomacaseledger/';
  const newest=u.origin+'/';
  // Only rewrite absolute signals; relative links stay identical.
  for(const file of ['index.html','robots.txt','sitemap.xml']){
   const p=join(OUT,file);
   const s=await readFile(p,'utf8');
   await writeFile(p,s.split(old).join(newest));
  }
  // Case profile canonicals and social tags use GitHub Pages absolute URLs.
  async function rewrite(dir){
   const {readdir}=await import('node:fs/promises');
   for(const item of await readdir(dir,{withFileTypes:true})){
    const p=join(dir,item.name);
    if(item.isDirectory())await rewrite(p);
    else if(/\.html$/i.test(item.name)){
     const text=await readFile(p,'utf8');
     if(text.includes(old))await writeFile(p,text.split(old).join(newest));
    }
   }
  }
  for(const directory of ['cases','federal','records','corrections','museum'])
    await rewrite(join(OUT,directory));
  console.log('Rewrote canonical and sitemap URLs for',u.origin);
 }
}
async function prepareCharacter(){
 const characterPath=join(OUT,'museum','assets','manifest.json');
 const manifest=JSON.parse(await readFile(characterPath,'utf8'));
 const existing=join(ROOT,'museum','assets','characters',MODEL_NAME);
 let data=null,origin='Innerscene (CC0)';
 try{
  if((await stat(existing).catch(()=>null))?.size){
   data=await readFile(existing);origin='vetted repository CC0 asset';
  }else{
   // Retry a transient server failure, not licensing or validation errors.
   for(let attempt=0;attempt<2;attempt++){
    try{data=await download(MODEL_URL);break;}
    catch(error){if(attempt===1)throw error;console.warn('Retrying CC0 download:',error.message);}
   }
  }
  const report=inspectGlb(data);
  await mkdir(resolve(MODEL_PATH,'..'),{recursive:true});
  await writeFile(MODEL_PATH,data);
  manifest.character.highDetail={
   path:'./assets/characters/'+MODEL_NAME,
   source:MODEL_SOURCE,license:'CC0-1.0',
   status:'Validated seven-clip Jordan character (CC0); available on demand',
   mode:'Optional progressive enhancement; existing animated CC0 visitor remains fallback'
  };
  await writeFile(characterPath,JSON.stringify(manifest,null,2)+'\n');
  console.log('Installed public-domain museum guide:',{origin,...report});
  return true;
 }catch(error){
  await rm(MODEL_PATH,{force:true});
  delete manifest.character.highDetail;
  manifest.character.path=FALLBACK_MODEL;
  await writeFile(characterPath,JSON.stringify(manifest,null,2)+'\n');
  console.warn('CC0 high-detail model unavailable; existing animated visitor retained:',error.message);
  return false;
 }
}
await copyPublishedSite();
const enabled=await prepareCharacter();
console.log('Cloudflare Pages dist/ ready; high-detail character:',enabled?'installed':'fallback');
