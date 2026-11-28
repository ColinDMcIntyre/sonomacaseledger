import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
export async function publishReport(root,report){
 // Build reports remain outside dist: no public research or diagnostic leakage.
 await mkdir(root,{recursive:true});
 await writeFile(join(root,'seo-report.json'),JSON.stringify(report,null,2)+'\n');
 console.log('SEO build report:',JSON.stringify(report,null,2));
 if(report.errors.length)throw Error('SEO validation failed: '+report.errors.join('; '));
}
