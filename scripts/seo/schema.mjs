import {SITE_NAME,safeJson,plain} from './config.mjs';
import {visibleSourceLinks} from './sources.mjs';
export function breadcrumbs(path,title,record,origin){
 const entries=[{name:'Home',url:origin+'/'}];
 if(record){const group=record.group==='federal'?'federal':'cases';entries.push({name:group==='federal'?'Federal cases':'County cases',url:origin+'/'+group+'/'});}
 if(path!=='/')entries.push({name:record?.row.name||title.replace(/\s*\|\s*Sonoma Case Ledger$/i,''),url:origin+path});
 return entries;
}
export function structuredData(html,page,record,origin,title,description){
 const url=origin+page.path;
 const organization={'@type':'Organization','@id':origin+'/#organization',name:SITE_NAME,url:origin+'/'};
 const re=/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
 // Only edit the site's single primary object. Preserve unrelated schema blocks.
 let found=false;
 html=html.replace(re,(whole,raw)=>{
  const obj=JSON.parse(raw);
  if(found||!['Article','WebSite','WebPage','CollectionPage'].includes(obj['@type']))return whole;
  found=true;
  const next={...obj,description,publisher:organization};
  if(record){
   next.headline=obj.headline||title.replace(/\s*\|\s*Sonoma Case Ledger$/i,'');
   next.mainEntityOfPage={'@type':'WebPage','@id':url};
   next.url=url;next.inLanguage='en-US';
   const citations=visibleSourceLinks(html,url);
   if(citations.length)next.citation=citations;
  }else{next.url=url;next.inLanguage='en-US';}
  return '<script type="application/ld+json">'+safeJson(next)+'</script>';
 });
 if(!found){
  const obj={'@context':'https://schema.org','@type':record?'Article':page.path==='/'?'WebSite':/^(\/cases\/|\/federal\/|\/records\/)$/.test(page.path)?'CollectionPage':'WebPage',name:title,description,url,inLanguage:'en-US',publisher:organization};
  if(record){obj.headline=title;obj.mainEntityOfPage={'@type':'WebPage','@id':url};const citations=visibleSourceLinks(html,url);if(citations.length)obj.citation=citations;}
  html=html.replace(/<\/head>/i,'<script type="application/ld+json">'+safeJson(obj)+'</script>\n</head>');
 }
 if(page.path!=='/'&&page.path!=='/museum/'){
  const items=breadcrumbs(page.path,title,record,origin);
  const obj={'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:items.map((x,i)=>({'@type':'ListItem',position:i+1,name:x.name,item:x.url}))};
  html=html.replace(/<\/head>/i,'<script type="application/ld+json" data-seo="breadcrumbs">'+safeJson(obj)+'</script>\n</head>');
 }
 return html;
}
