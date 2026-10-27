const assert=require('node:assert/strict');
const path=require('node:path');
const fs=require('node:fs');
const {revealedText}=require('./privacy-helper.cjs');
const playwright=process.env.PAYBEAT_PLAYWRIGHT||'C:/Users/HHH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const {chromium}=require(playwright),{expect}=require(path.join(playwright,'test'));
const origin=process.env.PAYBEAT_TEST_URL||'http://localhost:8876';
const read=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('paybeat-local-state-v8:'+encodeURIComponent(location.pathname))));
const amount=async p=>Number((await revealedText(p,'#earned')).replace(/[^\d.-]/g,''));
const near=(a,b)=>assert.ok(Math.abs(a-b)<.011,`${a} != ${b}`);
let browser,passed=0;const errors=[];
async function fields(p,values){await p.evaluate(values=>{for(const [id,value]of Object.entries(values)){const el=document.getElementById(id);if(el.type==='checkbox')el.checked=value;else el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));}},values);}
async function setup(date='2026-10-22T14:00:00+08:00',values={},width=1440){
  const c=await browser.newContext({timezoneId:'Asia/Shanghai',viewport:{width,height:width===390?844:1000}});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.clock.install({time:new Date(date)});await p.clock.pauseAt(new Date(date));
  await p.goto(origin+'/index.html');await p.locator('#monthlyDialog').waitFor({state:'visible'});
  assert.equal(await p.locator('#settingsApplyChoice').isVisible(),false);
  await fields(p,{monthlySalary:514800,...values});await p.click('#saveSettings');return {c,p};
}
async function edit(p,values,mode='immediate'){
  await p.click('#openSettings');await fields(p,values);await p.check(`input[name="settingsApplyMode"][value="${mode}"]`);await p.click('#saveSettings');
}
async function reopen(c,p,date){
  await p.close();const next=await c.newPage();next.on('pageerror',e=>errors.push(e.message));next.on('dialog',d=>d.accept());
  await next.clock.setSystemTime(new Date(date));await next.goto(origin+'/index.html');return next;
}
async function test(name,run){const before=errors.length;await run();assert.equal(errors.length,before,errors.slice(before).join('\n'));console.log('PASS '+name);passed++;}
(async()=>{browser=await chromium.launch({channel:'msedge'});try{
  await test('closing and reopening throughout the day resumes real schedule without resetting',async()=>{
    let {c,p}=await setup('2026-10-22T09:00:00+08:00');near(await amount(p),0);
    for(const [time,money,timer]of [['11:00',3600,'01:00:00'],['13:00',7200,'02:00:00'],['15:00',12600,'03:30:00'],['19:00',23400,'06:30:00']]){
      p=await reopen(c,p,`2026-10-22T${time}:00+08:00`);near(await amount(p),money);assert.equal(await p.locator('#timer').innerText(),timer);
      await p.reload();near(await amount(p),money);
    }
    assert.equal((await read(p)).history.length,1);await c.close();
  });
  await test('immediate raises and lowers future salary while preserving elapsed time and earned segments',async()=>{
    let {c,p}=await setup();near(await amount(p),9000);
    await edit(p,{monthlySalary:1029600});assert.equal(await p.locator('#timer').innerText(),'02:30:00');near(await amount(p),9000);
    assert.equal((await read(p)).normalEarnedAmount,9000);assert.equal((await read(p)).accumulatedMs,9000000);
    await p.clock.fastForward(1000);near(await amount(p),9002);assert.equal(await p.locator('#timer').innerText(),'02:30:01');
    p=await reopen(c,p,'2026-10-22T15:00:00+08:00');near(await amount(p),16200);assert.equal(await p.locator('#timer').innerText(),'03:30:00');
    await edit(p,{monthlySalary:514800});near(await amount(p),16200);
    p=await reopen(c,p,'2026-10-22T19:00:00+08:00');near(await amount(p),27000);
    const h=(await read(p)).history[0];assert.equal(h.normalMs,23400000);near(h.normalAmount,27000);assert.equal(h.overtimeAmount,0);await c.close();
  });
  await test('next workday skips weekend, persists across reopen and can be replaced by immediate',async()=>{
    let {c,p}=await setup('2026-10-23T14:00:00+08:00');await edit(p,{monthlySalary:1029600},'next-workday');
    assert.equal((await read(p)).pendingSettings.effectiveDate,'2026-10-26');near(await amount(p),9000);
    p=await reopen(c,p,'2026-10-24T14:00:00+08:00');assert.equal((await read(p)).monthlySalary,'514800');near(await amount(p),0);
    p=await reopen(c,p,'2026-10-26T11:00:00+08:00');near(await amount(p),7200);assert.equal((await read(p)).pendingSettings,null);
    await edit(p,{monthlySalary:1544400},'next-workday');await edit(p,{monthlySalary:514800});assert.equal((await read(p)).pendingSettings,null);
    await p.clock.fastForward(1000);near(await amount(p),7201);await c.close();
  });
  await test('pause, paid rest and earlier compensation survive immediate edits',async()=>{
    const paused=await setup('2026-10-22T11:00:00+08:00');await paused.p.click('#mainAction');await edit(paused.p,{monthlySalary:1029600});
    assert.equal((await read(paused.p)).status,'paused');await paused.p.clock.fastForward(1800000);await paused.p.reload();near(await amount(paused.p),3600);
    await paused.p.click('#mainAction');await paused.p.clock.fastForward(1000);near(await amount(paused.p),3602);await paused.c.close();
    const {c,p}=await setup('2026-10-22T11:00:00+08:00');await p.click('#breakAction');await p.clock.fastForward(1800000);
    await edit(p,{monthlySalary:1029600});assert.equal((await read(p)).breakMode,'paid_slack');near(await amount(p),3600);
    await p.reload();await p.clock.fastForward(1800000);near(await amount(p),3600);await p.click('#breakAction');
    await p.clock.fastForward(6*3600000);const h=(await read(p)).history[0];near(h.amount,41400);assert.equal(h.breakMs,3600000);assert.equal(h.normalMs,19800000);await c.close();
    const completed=await setup('2026-10-22T11:00:00+08:00');await completed.p.click('#breakAction');await completed.p.clock.fastForward(1800000);await completed.p.click('#breakAction');
    await edit(completed.p,{monthlySalary:514800});await completed.p.clock.fastForward(6.5*3600000);near((await read(completed.p)).history[0].amount,23400);await completed.c.close();
  });
  await test('overtime already earned is not repriced; future rate and settled history remain accurate',async()=>{
    let {c,p}=await setup('2026-10-22T19:00:00+08:00',{overtimeEnabled:true,overtimeAutoStart:true});near(await amount(p),28800);
    await edit(p,{monthlySalary:1029600});near(await amount(p),28800);assert.equal(await p.locator('#timer').innerText(),'07:30:00');
    p=await reopen(c,p,'2026-10-22T20:00:00+08:00');near(await amount(p),39600);await p.click('#overtimeAction');
    const h=(await read(p)).history[0];near(h.normalAmount,23400);near(h.overtimeAmount,16200);assert.equal(h.overtimeMs,7200000);
    await edit(p,{monthlySalary:514800});near(await amount(p),39600);assert.deepEqual((await read(p)).history[0],h);
    await p.reload();near(await amount(p),39600);await c.close();
  });
  await test('edited work hours do not retroactively add overtime or reinterpret existing currency',async()=>{
    const {c,p}=await setup('2026-10-22T17:00:00+08:00',{overtimeEnabled:true,overtimeAutoStart:true});near(await amount(p),19800);
    await edit(p,{workEnd:'16:00'});near(await amount(p),19800);assert.equal((await read(p)).startedAt,+new Date('2026-10-22T17:00:00+08:00'));
    await p.clock.fastForward(1000);near(await amount(p),19800+514800/(22*4.5*3600)*1.5);
    await edit(p,{currency:'USD'});assert.equal(await p.locator('#monthlyDialog').isVisible(),true);assert.equal((await read(p)).currencyCode,'CNY');
    await p.check('input[name="settingsApplyMode"][value="next-workday"]');await p.click('#saveSettings');assert.equal((await read(p)).pendingSettings.settings.currencyCode,'USD');await c.close();
  });
  await test('choices are available before work and new users keep the first setup flow',async()=>{
    const {c,p}=await setup('2026-10-22T09:00:00+08:00');await p.click('#openSettings');await expect(p.locator('#settingsApplyChoice')).toBeVisible();
    await fields(p,{monthlySalary:1029600});await p.check('input[name="settingsApplyMode"][value="next-workday"]');await p.click('#saveSettings');
    await p.clock.fastForward(2*3600000);near(await amount(p),3600);assert.equal((await read(p)).monthlySalary,'514800');await c.close();
  });
  await test('phone and desktop choice layout is visible, keyboard accessible and has no overflow',async()=>{
    const output=path.resolve(__dirname,'../预览图/V2-设置修复');fs.mkdirSync(output,{recursive:true});
    for(const width of [390,1440]){
      const {c,p}=await setup(undefined,{},width);await p.click('#openSettings');await p.locator('#settingsApplyChoice').scrollIntoViewIfNeeded();
      const radio=p.locator('input[name="settingsApplyMode"][value="immediate"]');await radio.focus();await radio.press('Space');await expect(radio).toBeChecked();
      assert.equal(await p.evaluate(()=>{const d=document.querySelector('dialog');return d.scrollWidth>d.clientWidth+1;}),false);
      await p.screenshot({path:path.join(output,`settings-${width}.png`)});await c.close();
    }
  });
  console.log(`RESULT ${passed} salary settings/reopen suites passed; ${errors.length} browser errors`);
}finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1;});
