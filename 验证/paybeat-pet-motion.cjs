const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PAYBEAT_PLAYWRIGHT || 'C:/Users/HHH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output=path.resolve(__dirname,'../预览图/V2-桌宠');
const errors=[];
(async()=>{
  const browser=await chromium.launch({channel:'msedge'});
  try{
    for(const skin of ['C','A','B']){
      const context=await browser.newContext({viewport:{width:280,height:180},deviceScaleFactor:2});
      const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
      const date=new Date('2026-10-26T11:00:00+08:00');
      await page.clock.install({time:date});await page.clock.pauseAt(date);
      await page.addInitScript(()=>{window.paybeatDesktop={onState:callback=>window.receivePetState=callback,action:()=>{},drag:()=>{}};});
      await page.goto(pathToFileURL(path.resolve(__dirname,'../桌面桌宠/pet.html')).href);
      let elapsed=0,sample=0;
      const state={skin,mode:'working',ready:true,billable:true,quiet:false,stale:false,resting:false,canToggleWork:true,
        journey:{epoch:'motion-check',sampleId:0,distance:0,speed:14,coinSpeed:.1,coinProgress:.1,targetKind:'small',reward:null}};
      const send=async()=>{state.journey.sampleId=++sample;await page.evaluate(state=>window.receivePetState(state),state);};
      const advance=async(ms)=>{await page.clock.runFor(ms);elapsed+=ms;state.journey.distance=elapsed*.014;await send();};
      await send();await page.locator('#motionSprite').evaluate(img=>img.decode());
      const frames=new Set();
      for(let i=0;i<15;i++){await advance(80);if(await page.locator('#hero').getAttribute('data-action')==='walk'){frames.add(await page.locator('#hero').getAttribute('data-frame'));if(i===5)await page.screenshot({path:path.join(output,'motion-'+skin+'-walk.png'),omitBackground:true});}}
      assert.equal(frames.size,6,skin+' displays the complete six-step walking sequence');
      // A real reward is already verified through the ledger in paybeat-desktop.cjs.
      // Here the renderer receives that boundary event and we inspect each visible stage.
      state.journey.coinProgress=.97;state.journey.coinSpeed=.2;await send();await page.clock.runFor(16);
      assert.equal(await page.locator('#hero').getAttribute('data-action'),'anticipate');
      await page.screenshot({path:path.join(output,'motion-'+skin+'-open.png'),omitBackground:true});
      state.journey.coinProgress=0;state.journey.reward={id:1,kind:'small'};await send();
      await page.clock.runFor(220);
      assert.equal(await page.locator('#hero').getAttribute('data-action'),'swallow');
      const pose=await page.locator('#hero').boundingBox();
      const coin=await page.locator('#nextReward').boundingBox();
      assert.ok(coin.width<18&&coin.width>0,'coin visibly shrinks into the mouth');
      assert.ok(coin.x+coin.width/2>pose.x&&coin.x+coin.width/2<pose.x+pose.width,'coin enters the character');
      await page.screenshot({path:path.join(output,'motion-'+skin+'-swallow.png'),omitBackground:true});
      await page.clock.runFor(120);
      assert.equal(await page.locator('#hero').getAttribute('data-action'),'puff');
      assert.equal(await page.locator('#nextReward').evaluate(el=>Number(getComputedStyle(el).opacity)),0);
      await page.screenshot({path:path.join(output,'motion-'+skin+'-puff.png'),omitBackground:true});
      await page.clock.runFor(400);
      assert.equal(await page.locator('#companion').getAttribute('data-coins'),'1','animation creates no extra rewards');
      assert.ok(await page.locator('#nextReward').evaluate(el=>Number(getComputedStyle(el).opacity))>.9,'next coin smoothly returns');
      // Rapid real reward notifications must finish the current mouthful and
      // coalesce into one highest-priority feedback, rather than restart forever.
      state.journey.reward={id:2,kind:'small'};await send();
      await page.clock.runFor(80);state.journey.reward={id:3,kind:'big'};await send();
      await page.clock.runFor(80);state.journey.reward={id:4,kind:'flag'};await send();
      await page.clock.runFor(80);state.journey.reward={id:5,kind:'small'};await send();
      await page.clock.runFor(100);
      assert.equal(await page.locator('#hero').getAttribute('data-action'),'puff','incoming rewards do not restart the current mouthful');
      await page.clock.runFor(400);
      assert.equal(await page.locator('#hero').getAttribute('data-action'),'celebrate');
      assert.ok((await page.locator('#companion').getAttribute('class')).includes('reward-flag'),'the queued flag outranks big and small coins');
      assert.equal(await page.locator('#companion').getAttribute('data-coins'),'5','coalescing changes animation only, not reward events');
      state.resting=true;state.mode='resting';state.billable=false;await send();await page.clock.runFor(100);
      const road=await page.locator('#landscape').getAttribute('style');
      const reward=await page.locator('#nextReward').getAttribute('style');
      await page.clock.runFor(1000);
      assert.equal(await page.locator('#landscape').getAttribute('style'),road);
      assert.equal(await page.locator('#nextReward').getAttribute('style'),reward);
      state.resting=false;state.mode='working';state.billable=true;state.quiet=true;await send();await page.clock.runFor(100);
      assert.equal(await page.locator('#hero').getAttribute('data-action'),'still');
      await page.emulateMedia({reducedMotion:'reduce'});state.quiet=false;await send();await page.clock.runFor(100);
      assert.equal(await page.locator('#hero').getAttribute('data-action'),'still');
      await page.emulateMedia({reducedMotion:'no-preference'});state.stale=true;await send();await page.clock.runFor(100);
      assert.equal(await page.locator('#hero').getAttribute('data-action'),'still');
      assert.equal(await page.locator('.toolbar,.hint').count(),0);
      console.log('PASS '+skin+' walk, swallowing, recovery, rapid reward priority, pause, quiet, reduced motion and stale state');
      await context.close();
    }
    assert.deepEqual(errors,[]);console.log('RESULT 3 motion suites passed; 0 browser errors');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
