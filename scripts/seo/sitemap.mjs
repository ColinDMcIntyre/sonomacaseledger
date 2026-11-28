import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {escapeHtml} from './config.mjs';
export async function writeDiscovery(root,pages,origin){
 const urls=pages.filter(p=>p.indexable).map(p=>origin+p.path).sort();
 if(new Set(urls).size!==urls.length)throw Error('Duplicate sitemap URL');
 const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(u=>'  <url><loc>'+escapeHtml(u)+'</loc></url>').join('\n')+'\n</urlset>\n';
 await writeFile(join(root,'sitemap.xml'),xml);
 await writeFile(join(root,'robots.txt'),'User-agent: *\nAllow: /\n\nSitemap: '+origin+'/sitemap.xml\n');
 return urls;
}
