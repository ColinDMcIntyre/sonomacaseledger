#!/usr/bin/env node
/**
 * Browser-only smoke test. Runs in GitHub Actions after a real Cloudflare build
 * and captures real WebGL avatar poses; publishes no model binaries.
 */
import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const dir='avatar-preview';
await mkdir(dir,{recursive:true});
const lines=[];
const browser=await chromium.launch({
 channel:'chrome',headless:true,
 args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader',
 '--disable-features=BlockInsecurePrivateNetworkRequests']
});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768},deviceScaleFactor:1});
 page.on('console',message=>lines.push('console '+message.type()+' '+message.text()));
 page.on('pageerror',error=>lines.push('pageerror '+error.message));
 page.on('requestfailed',req=>lines.push('requestfail '+req.url()+' '+req.failure()?.errorText));
 await page.goto('http://127.0.0.1:8765/museum/',{waitUntil:'domcontentloaded',timeout:40000});
 await page.waitForFunction(()=>document.querySelector('#loading')?.classList.contains('done'),
  {timeout:100000});
 await page.waitForTimeout(1600);
 await page.screenshot({path:dir+'/visitor-idle.png'});
 await page.keyboard.down('KeyW');
 await page.waitForTimeout(1300);
 await page.screenshot({path:dir+'/visitor-walk.png'});
 await page.keyboard.up('KeyW');
 const retargetStarted=lines.some(line=>line.includes('Using retargeted CC0 locomotion:'));
 const errors=lines.filter(line=>/pageerror|Failed to|WebGLRenderer.*Error/.test(line));
 const result={retargetStarted,errors,status:await page.locator('#asset-status').textContent().catch(()=>null),
  screenshots:['visitor-idle.png','visitor-walk.png'],logs:lines};
 await writeFile(dir+'/results.json',JSON.stringify(result,null,2));
 console.log('BROWSER RESULTS',JSON.stringify({
  retargetStarted,errors,status:result.status,logTail:lines.slice(-22)
 },null,2));
 if(!retargetStarted)throw Error('Retargeted CC0 animation did not initialize in real Chrome');
 if(errors.length)throw Error('Browser console or asset errors detected');
}finally{await browser.close();}
