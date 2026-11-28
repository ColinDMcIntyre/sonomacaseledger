import {SITE_NAME,escapeHtml,attr,metaValue,titleValue,plain} from './config.mjs';
export function setMeta(html,key,value,property='name'){
 const tag='<meta '+property+'="'+escapeHtml(key)+'" content="'+escapeHtml(value)+'">';
 let found=false;
 const result=html.replace(/<meta\b[^>]*>/gi,m=>{
  if(attr(m,'name')!==key&&attr(m,'property')!==key)return m;
  if(found)return '';
  found=true;return tag;
 });
 return found?result:result.replace(/<\/head>/i,tag+'\n</head>');
}
export function metadata(page,record,origin){
 let html=page.html;
 const title=titleValue(html)||((record?.row.name||plain(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]??''))+' | '+SITE_NAME);
 const description=record?.brief.lead||metaValue(html,'description');
 if(!description||!title)throw Error('Missing editorial metadata: '+page.path);
 if(record){
  // Require visible editorial text to match the source dataset before publishing.
  const visible=plain(html.match(/<p\b[^>]*class="reader-brief-lead"[^>]*>([\s\S]*?)<\/p>/i)?.[1]??'');
  if(visible!==plain(description))throw Error('Visible case summary differs from data: '+page.path);
 }
 if(!titleValue(html))html=html.replace(/<\/head>/i,'<title>'+escapeHtml(title)+'</title>\n</head>');
 html=setMeta(html,'description',description);
 if(!metaValue(html,'robots'))html=setMeta(html,'robots','index,follow');
 let found=false;
 const canonical='<link rel="canonical" href="'+escapeHtml(origin+page.path)+'">';
 html=html.replace(/<link\b[^>]*>/gi,m=>{
  if(attr(m,'rel')?.toLowerCase()!=='canonical')return m;
  if(found)return '';
  found=true;return canonical;
 });
 if(!found)html=html.replace(/<\/head>/i,canonical+'\n</head>');
 return {html,title,description};
}
