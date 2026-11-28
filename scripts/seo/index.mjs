import {readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {siteOrigin} from './config.mjs';
import {discoverPages,caseRegistry} from './discovery.mjs';
import {metadata} from './metadata.mjs';
import {structuredData} from './schema.mjs';
import {internalLinks} from './internal-links.mjs';
import {writeDiscovery} from './sitemap.mjs';
import {socialMetadata,writeSocialImage} from './social.mjs';
import {validatePages} from './validation.mjs';
import {publishReport} from './report.mjs';
export async function buildSeo({root,reportDir,origin}){
 origin=siteOrigin(origin);
 const data=JSON.parse(await readFile(join(root,'research/case-data.json'),'utf8'));
 const briefs=JSON.parse(await readFile(join(root,'research/case-briefs.json'),'utf8'));
 const registry=caseRegistry(data,briefs);
 const pages=await discoverPages(root);
 for(const page of pages){
  const record=registry.get(page.path);
  const {html:initial,title,description}=metadata(page,record,origin);
  let html=internalLinks(initial,page,record,registry,origin);
  html=structuredData(html,page,record,origin,title,description);
  page.html=socialMetadata(html,page,record,origin,title,description);
 }
 const report=await validatePages(root,pages,registry,origin);
 await publishReport(reportDir,report);
 for(const page of pages)await writeFile(join(root,page.file),page.html);
 await writeDiscovery(root,pages,origin);
 await writeSocialImage(root);
 return report;
}
