import {attr,decodeHtml} from './config.mjs';
export function visibleSourceLinks(html,url){
 const section=html.match(/<ol\b[^>]*class="source-list"[^>]*>([\s\S]*?)<\/ol>/i)?.[1]??'';
 const sources=new Set();
 for(const m of section.matchAll(/<a\b[^>]*>/gi)){
  const href=attr(m[0],'href');
  if(!href)continue;
  try{const u=new URL(decodeHtml(href),url);if(u.protocol==='https:'&&!u.username&&!u.password)sources.add(u.href);}catch{}
 }
 return [...sources];
}
export function sourceNavigation(record,html){
 const links=['<a href="#sources">Supporting sources and court records</a>','<a href="/methodology/">Research methodology and legal terminology</a>','<a href="/corrections/">Corrections and newer court orders</a>'];
 if(record.group!=='federal')links.splice(1,0,'<a href="/records/#'+record.row.slug+'">Court-record verification status</a>');
 if(!/id="sources"/i.test(html))throw Error('Missing visible evidence section: '+record.row.slug);
 return links;
}
