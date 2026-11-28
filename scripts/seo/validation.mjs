import {stat} from 'node:fs/promises';
import {join} from 'node:path';
import {attr,metaValue,titleValue,decodeHtml} from './config.mjs';
import {anchorLinks} from './internal-links.mjs';
export async function validatePages(root,pages,registry,origin){
 const errors=[],warnings=[],titles=new Set(),descriptions=new Set(),byPath=new Map(pages.map(p=>[p.path,p]));
 let validCanonicals=0,structuredPages=0,sourceProfiles=0,internalLinks=0;
 const referenced=new Set(['/']);
 for(const path of registry.keys())if(!byPath.has(path))errors.push('Case data has no public page: '+path);
 for(const page of pages){
  const {html,path}=page, title=titleValue(html),description=metaValue(html,'description');
  if(!title||titles.has(title))errors.push('Missing or duplicate title: '+path);titles.add(title);
  if(!description||descriptions.has(description))errors.push('Missing or duplicate description: '+path);descriptions.add(description);
  const canonicals=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]).filter(m=>attr(m,'rel')==='canonical');
  if(canonicals.length!==1||attr(canonicals[0],'href')!==origin+path)errors.push('Invalid canonical: '+path);else validCanonicals++;
  if(metaValue(html,'og:url')!==origin+path)errors.push('Invalid social URL: '+path);
  if(!page.indexable)warnings.push('Excluded by noindex: '+path);
  const blocks=[...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  try{const objects=blocks.map(b=>JSON.parse(b[1]));if(objects.length)structuredPages++;else errors.push('Missing structured data: '+path);}catch{errors.push('Invalid JSON-LD: '+path);}
  if(registry.has(path)){
   if(!html.includes('id="sources"')||!html.includes('class="source-list"'))errors.push('Missing evidence markup: '+path);else sourceProfiles++;
  }
  for(const u of anchorLinks(html,origin+path)){
   if(u.origin!==origin)continue;
   internalLinks++;
   const target=u.pathname.endsWith('/index.html')?u.pathname.slice(0,-10):u.pathname;
   const route=byPath.has(target)?target:byPath.has(target+'/')?target+'/':null;
   if(route){referenced.add(route);const fragment=u.hash.slice(1);if(fragment&&!fragment.includes('=')&&!byPath.get(route).html.includes('id="'+decodeHtml(fragment)+'"'))warnings.push('Unresolved anchor: '+path+' → '+target+u.hash);continue;}
   // Check ordinary published files, not external links or interactive routes.
   try{await stat(join(root,decodeURIComponent(u.pathname)));}catch{warnings.push('Unresolved internal target: '+path+' → '+u.pathname);}
  }
 }
 for(const p of pages)if(!referenced.has(p.path))errors.push('No crawlable incoming internal link: '+p.path);
 for(const p of pages)if(/^\/(?:cases|federal)\/[^/]+\/$/.test(p.path)&&!registry.has(p.path))errors.push('Unregistered case profile: '+p.path);
 return {pages:pages.length,indexable:pages.filter(p=>p.indexable).length,validCanonicals,uniqueTitles:titles.size,uniqueDescriptions:descriptions.size,structuredPages,sourceProfiles,internalLinks,errors:[...new Set(errors)],warnings:[...new Set(warnings)]};
}
