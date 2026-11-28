export const SITE_NAME='Sonoma Case Ledger';
export const PRIMARY_ORIGIN='https://sonomacaseledger.org';
export const LEGACY_ORIGIN='https://colindmcintyre.github.io/sonomacaseledger/';
export const PUBLIC_SECTIONS=['cases','federal','records','corrections','museum','methodology'];
export function siteOrigin(value=PRIMARY_ORIGIN){
 const u=new URL(value);
 if(u.protocol!=='https:'||u.pathname!=='/'||u.search||u.hash||u.username||u.password)throw Error('SITE_ORIGIN must be an HTTPS origin');
 return u.origin;
}
export const escapeHtml=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export const decodeHtml=value=>String(value).replace(/&(?:amp|lt|gt|quot|apos|#39|#x27|nbsp);/gi,m=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&#39;':"'",'&#x27;':"'",'&nbsp;':' '})[m.toLowerCase()]??m);
export const plain=value=>decodeHtml(String(value).replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
export const pagePath=file=>'/'+file.replace(/index\.html$/,'');
export const safeJson=value=>JSON.stringify(value).replace(/</g,'\\u003c');
export function attr(tag,name){return tag.match(new RegExp('\\b'+name+'\\s*=\\s*(?:"([^"]*)"|\\x27([^\\x27]*)\\x27)','i'))?.slice(1).find(v=>v!==undefined);}
export function metaValue(html,key){const match=[...html.matchAll(/<meta\b[^>]*>/gi)].find(m=>attr(m[0],'name')===key||attr(m[0],'property')===key);return match?decodeHtml(attr(match[0],'content')??''):'';}
export function titleValue(html){return plain(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]??'');}
