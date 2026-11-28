import {attr,decodeHtml,escapeHtml} from './config.mjs';
import {sourceNavigation} from './sources.mjs';
export function anchorLinks(html,base){
 const links=[];
 for(const m of html.matchAll(/<a\b[^>]*>/gi)){
  const href=attr(m[0],'href');
  if(href===undefined)continue;
  try{links.push(new URL(decodeHtml(href),base));}catch{}
 }
 return links;
}
export function internalLinks(html,page,record,registry,origin){
 if(page.path==='/museum/')return html; // Do not modify the interactive viewport.
 const base=origin+page.path;
 const current=new Set(anchorLinks(html,base).filter(u=>u.origin===origin).map(u=>u.pathname));
 if(record){
  const group=record.group==='federal'?'federal':'cases';
  // Link the actual archive category in existing breadcrumbs, when not linked.
  if(!/class="breadcrumbs"[^>]*>[\s\S]*?href="[^"]*(?:cases|federal)\/"/i.test(html.split('</div>')[0]??'')){
   html=html.replace(/(<div\b[^>]*class="container breadcrumbs"[^>]*>)([\s\S]*?)(<\/div>)/i,(all,start,body,end)=>{
    if(body.includes('href="../../'+group+'/'))return all;
    return start+body.replace(/ \/ (Case files|County cases|Federal cases) \//, ' / <a href="/'+group+'/">$1</a> /')+end;
   });
  }
  const links=sourceNavigation(record,html);
  links.unshift('<a href="/'+group+'/">Browse '+(group==='federal'?'federal':'county')+' case files</a>');
  const section='<nav class="record-audit" aria-label="Archive and evidence navigation" data-seo="case-navigation"><h2>Explore the archive and supporting evidence</h2><ul>'+links.map(x=>'<li>'+x+'</li>').join('')+'</ul></nav>';
  return html.replace(/<\/article>/i,section+'</article>');
 }
 if(page.path==='/cases/'||page.path==='/federal/'){
  const group=page.path==='/cases/'?'cases':'federal';
  const missing=[...registry].filter(([path])=>path.startsWith('/'+group+'/')&&!current.has(path));
  if(missing.length){
   const list='<section class="container narrow prose" data-seo="additional-profiles"><h2>Additional case profiles</h2><ul>'+missing.map(([path,r])=>'<li><a href="'+escapeHtml(path)+'">'+escapeHtml(r.row.name)+'</a></li>').join('')+'</ul></section>';
   html=html.replace(/<\/main>/i,list+'</main>');
  }
 }
 if(page.path!=='/methodology/'&&!current.has('/methodology/')){
  // Inline link in the existing footer; no new scripts or styling needed.
  html=html.replace(/<\/footer>/i,'<div class="container shell"><p><a href="/methodology/">Editorial methodology and legal terminology</a></p></div></footer>');
 }
 return html;
}
