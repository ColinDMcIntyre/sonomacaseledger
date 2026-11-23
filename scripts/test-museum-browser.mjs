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
 const page=await browser.newPage({viewport:{width:960,height:540},deviceScaleFactor:1});
 page.on('console',message=>lines.push('console '+message.type()+' '+message.text()));
 page.on('pageerror',error=>lines.push('pageerror '+error.message));
 page.on('requestfailed',req=>lines.push('requestfail '+req.url()+' '+req.failure()?.errorText));
 page.on('response',response=>{if(response.status()>=400)
  lines.push('http '+response.status()+' '+response.url());});
 await page.goto('http://127.0.0.1:8765/museum/',{waitUntil:'domcontentloaded',timeout:40000});
 let loadingError=null;
 try{
  await page.waitForFunction(()=>!document.querySelector('#loading'),
   null,{timeout:52000});
 }catch(error){loadingError=error.message;lines.push('LOADING ERROR: '+loadingError);}
 const preflightStatus=await page.locator('#asset-status').textContent({timeout:5000}).catch(()=>null);
 console.log('BROWSER PRE-FLIGHT',JSON.stringify({loadingError,preflightStatus,logTail:lines.slice(-20)}));
 if(loadingError){
  await writeFile(dir+'/results.json',JSON.stringify({loadingError,preflightStatus,logs:lines},null,2));
  throw Error('Museum did not finish loading before screenshot: '+loadingError);
 }
 await page.waitForTimeout(500);
 await page.screenshot({path:dir+'/visitor-idle.png',timeout:40000,animations:'disabled'});
 if(!loadingError){
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(1300);
  await page.screenshot({path:dir+'/visitor-walk.png',timeout:40000,animations:'disabled'});
  await page.keyboard.up('KeyW');
 }
 const visitorStatus=await page.locator('#asset-status').textContent().catch(()=>null);
 const retargetStarted=(visitorStatus||'').includes('photo-textured guide')||
   lines.some(line=>line.includes('Using retargeted CC0 walking: Walk_formal'));
 const errors=lines.filter(line=>
  /pageerror|requestfail|WebGLRenderer.*Error/.test(line)||
  (/http (?:4|5)\\d\\d/.test(line)&&!/favicon\\.ico/.test(line)));

 const result={retargetStarted,errors,loadingError,
  status:visitorStatus,
  loadingText:await page.locator('#loading p').textContent().catch(()=>null),
  loadingStillVisible:await page.locator('#loading').isVisible().catch(()=>null),
  screenshots:['visitor-idle.png','visitor-walk.png'],logs:lines};
 await writeFile(dir+'/results.json',JSON.stringify(result,null,2));
 console.log('BROWSER RESULTS',JSON.stringify({
  retargetStarted,errors,loadingError,
  status:result.status,loadingText:result.loadingText,
  loadingStillVisible:result.loadingStillVisible,logTail:lines.slice(-36)
 },null,2));
 if(loadingError)throw Error('Museum loading screen remained visible: '+loadingError);
 if(!retargetStarted)throw Error('Neither Ara native gait nor approved Jordan fallback initialized in Chrome');
 if(errors.length)throw Error('Browser console or asset errors detected');
}finally{await browser.close();}
