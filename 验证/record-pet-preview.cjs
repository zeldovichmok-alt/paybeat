const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PAYBEAT_PLAYWRIGHT||'C:/Users/HHH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output=path.resolve(__dirname,'../预览图/V2-桌宠/桌宠动作预览-V2.2-演示.webm');
(async()=>{
  const browser=await chromium.launch({channel:'msedge'}),temp=fs.mkdtempSync(path.join(os.tmpdir(),'paybeat-preview-'));
  try{
    const context=await browser.newContext({viewport:{width:280,height:180},deviceScaleFactor:2,recordVideo:{dir:temp,size:{width:560,height:360}}});
    const page=await context.newPage();
    await page.addInitScript(()=>{window.paybeatDesktop={onState:callback=>window.receivePetState=callback,action:()=>{},drag:()=>{}};});
    await page.goto(pathToFileURL(path.resolve(__dirname,'../桌面桌宠/pet.html')).href);
    await page.evaluate(async()=>{
      let sample=0,rewardId=0;
      // Demonstration progress only. This renderer has no wage ledger or profile.
      for(const skin of ['C','A','B']){
        const started=performance.now();let previousBucket=0;
        await new Promise(resolve=>{
          const timer=setInterval(()=>{
            const elapsed=performance.now()-started,bucket=Math.floor(elapsed/2000);
            window.receivePetState({skin,mode:'working',ready:true,billable:true,quiet:false,stale:false,resting:false,
              journey:{epoch:skin,sampleId:++sample,distance:elapsed*.014,speed:14,coinSpeed:.5,coinProgress:elapsed%2000/2000,targetKind:'small',reward:bucket>previousBucket?{id:++rewardId,kind:'small'}:null}});
            previousBucket=bucket;
            if(elapsed>=5000){clearInterval(timer);resolve();}
          },50);
        });
      }
    });
    const video=page.video();await context.close();await video.saveAs(output);
    console.log('Recorded V2.2 C/A/B motion preview with simulated progress: '+output);
  }finally{
    await browser.close();
    if(path.dirname(path.resolve(temp))===path.resolve(os.tmpdir())&&path.basename(temp).startsWith('paybeat-preview-'))fs.rmSync(temp,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
