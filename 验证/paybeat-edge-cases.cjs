const assert=require('node:assert/strict');
const {revealedText}=require('./privacy-helper.cjs');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require(process.env.PAYBEAT_PLAYWRIGHT||'C:/Users/HHH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin=process.env.PAYBEAT_TEST_URL||'http://localhost:8876';
const read=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('paybeat-local-state-v8:'+encodeURIComponent(location.pathname))));
const amount=async p=>Number((await revealedText(p,'#earned')).replace(/[^\d.-]/g,''));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
let browser,passed=0;const errors=[];
async function fields(p,values){await p.evaluate(values=>{for(const [id,v] of Object.entries(values)){const el=document.getElementById(id);if(el.type==='checkbox')el.checked=v;else el.value=String(v);el.dispatchEvent(new Event('input',{bubbles:true}));}},values);}
async function setup(date='2026-10-22T11:00:00+08:00',values={},width=1440,route='/index.html') {
  const c=await browser.newContext({timezoneId:'Asia/Shanghai',viewport:{width,height:width===390?844:1000}});const p=await c.newPage();p.setDefaultTimeout(5000);
  p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());
  await p.clock.install({time:new Date(date)});await p.clock.pauseAt(new Date(date));await p.goto(origin+route);await p.locator('#monthlyDialog').waitFor({state:'visible'});
  await fields(p,{monthlySalary:514800,autoStart:true,...values});await p.click('#saveSettings');assert.equal(await p.locator('#monthlyDialog').isVisible(),false);return {c,p};
}
async function seed(p,patch){await p.evaluate(patch=>{const key='paybeat-local-state-v8:'+encodeURIComponent(location.pathname);localStorage.setItem(key,JSON.stringify({...JSON.parse(localStorage.getItem(key)),...patch}));},patch);await p.reload();}
async function test(name,fn){const before=errors.length;await fn();assert.equal(errors.length,before,errors.slice(before).join('\n'));passed++;console.log('PASS '+name);}
(async()=>{browser=await chromium.launch({channel:'msedge',headless:true});try{
  await test('before/after work first entry, lunch idle rate and paid lunch',async()=>{
    for(const [time,money,timer] of [['09:00',0,'00:00:00'],['14:00',9000,'02:30:00'],['19:00',23400,'06:30:00']]){const {c,p}=await setup('2026-10-22T'+time+':00+08:00');assert.equal(await amount(p),money);assert.equal(await p.locator('#timer').innerText(),timer);await c.close();}
    const {c,p}=await setup('2026-10-22T12:00:00+08:00');await p.clock.fastForward(3600000);assert.equal(await amount(p),7200);assert.match(await revealedText(p,'#earnPerSecond'),/0.0000$/);await c.close();
    const paid=await setup('2026-10-22T12:00:00+08:00',{lunchPaid:true});const before=await amount(paid.p);await paid.p.clock.fastForward(60000);assert.ok(await amount(paid.p)>before);await paid.c.close();
  });
  await test('paid break over lunch, reload and repeated break preserve daily target',async()=>{
    const {c,p}=await setup('2026-10-22T11:30:00+08:00');await p.click('#breakAction');await p.clock.fastForward(2*3600000);await p.reload();assert.equal(await amount(p),5400);
    await p.selectOption('#breakChoice','work');near((await read(p)).normalRatePerSecond,18000/16200);
    await p.clock.fastForward(1800000);const before=await amount(p);await p.selectOption('#breakChoice','paid_slack');await p.click('#breakAction');await p.clock.fastForward(1800000);await p.click('#mainAction');assert.equal(await amount(p),before);
    await p.reload();await p.clock.fastForward(3.5*3600000);near((await read(p)).history[0].amount,23400);await c.close();
  });
  await test('all break options, switching during break and shared quota',async()=>{
    const {c,p}=await setup(undefined,{breakQuota:1,breakName:'喝水',breakPaid:true});
    for(const kind of ['short','toilet','personal','custom']){await p.selectOption('#breakChoice',kind);await p.click('#breakAction');const before=await amount(p);await p.clock.fastForward(120000);assert.equal(await amount(p),before);await p.click('#breakAction');assert.equal((await read(p)).breakMode,null);}
    assert.match(await p.locator('#todayBreakdown').innerText(),/已超出额度/);await p.selectOption('#breakChoice','paid_slack');await p.click('#breakAction');await p.clock.fastForward(60000);await p.selectOption('#breakChoice','toilet');assert.equal((await read(p)).breakMode,'toilet');await p.selectOption('#breakChoice','work');assert.equal((await read(p)).status,'running');await c.close();
  });
  await test('unpaid break loss is not recovered by later paid break',async()=>{
    const {c,p}=await setup();await p.selectOption('#breakChoice','toilet');await p.click('#breakAction');await p.clock.fastForward(600000);await p.selectOption('#breakChoice','work');near((await read(p)).normalRatePerSecond,1);
    await p.selectOption('#breakChoice','paid_slack');await p.click('#breakAction');await p.clock.fastForward(1200000);await p.selectOption('#breakChoice','work');assert.equal(await amount(p),3600);await p.clock.fastForward(6.5*3600000);near((await read(p)).history[0].amount,22800);await c.close();
  });
  await test('paid break through closing settles once; next day starts fresh',async()=>{
    const {c,p}=await setup('2026-10-22T17:00:00+08:00');await p.click('#breakAction');await p.clock.fastForward(3599000);assert.equal(await amount(p),19800);await p.clock.fastForward(1000);near((await read(p)).history[0].amount,23400);assert.equal((await read(p)).normalSettlementAdjustment,3600);
    await p.reload();assert.equal((await read(p)).history.length,1);await p.clock.fastForward(17*3600000);assert.equal((await read(p)).sessionDate,'2026-10-23');assert.equal((await read(p)).normalSettlementAdjustment,0);assert.equal(await amount(p),3600);await c.close();
  });
  await test('pause and reset resume from now; manual start setting',async()=>{
    const {c,p}=await setup();await p.click('#mainAction');await p.clock.fastForward(600000);await p.click('#mainAction');await p.clock.fastForward(1000);assert.equal(await amount(p),3601);await p.click('#resetAction');assert.equal(await amount(p),0);await p.click('#mainAction');await p.clock.fastForward(1000);assert.equal(await amount(p),1);await c.close();
    const manual=await setup(undefined,{autoStart:false});assert.equal(await amount(manual.p),0);await manual.c.close();
  });
  await test('auto overtime uses base wage after paid break; split ledger',async()=>{
    const {c,p}=await setup(undefined,{overtimeEnabled:true,overtimeAutoStart:true});await p.click('#breakAction');await p.clock.fastForward(1800000);await p.click('#breakAction');await p.clock.fastForward(6.5*3600000);assert.equal((await read(p)).overtimeMode,true);assert.match(await revealedText(p,'#earnPerSecond'),/1.5000$/);await p.clock.fastForward(3600000);await p.click('#overtimeAction');const h=(await read(p)).history[0];near(h.normalAmount,23400);near(h.overtimeAmount,5400);near(h.amount,28800);await c.close();
  });
  await test('rest day overtime midnight cap and special date multiplier',async()=>{
    const {c,p}=await setup('2026-10-24T22:00:00+08:00',{overtimeEnabled:true});await p.click('#overtimeAction');await p.clock.fastForward(3600000);await p.click('#mainAction');await p.clock.fastForward(600000);await p.click('#mainAction');await p.clock.fastForward(50*60000+1000);const s=await read(p);assert.equal(s.history[0].normalMs,0);assert.equal(s.history[0].overtimeMs,6600000);assert.equal(s.history[0].amount,13200);assert.equal(s.sessionDate,'2026-10-25');await c.close();
    const special=await setup('2026-10-22T17:00:00+08:00',{overtimeEnabled:true,specialDates:'2026-10-22, 2026-10-24'});await special.p.clock.fastForward(3600000);await special.p.click('#overtimeAction');await special.p.clock.fastForward(3600000);await special.p.click('#overtimeAction');const h=(await read(special.p)).history[0];assert.equal(h.normalAmount,23400);assert.equal(h.overtimeAmount,10800);await special.c.close();
  });
  await test('next workday rules preserve old money and currency',async()=>{
    const {c,p}=await setup();await p.click('#openSettings');await fields(p,{monthlySalary:1029600,currency:'USD'});await p.click('#saveSettings');assert.equal((await read(p)).currencyCode,'CNY');await p.clock.fastForward(24*3600000);const s=await read(p);assert.equal(s.currencyCode,'USD');assert.equal(s.history[0].currencyCode,'CNY');assert.equal(s.history[0].amount,23400);assert.equal(await amount(p),7200);await c.close();
  });
  await test('Shanghai preset overrides fixed fields and computes deductions only when enabled',async()=>{
    const {c,p}=await setup(undefined,{monthlySalary:10000});await p.click('#resetAction');await p.click('#openSettings');await fields(p,{'pension-mode':'fixed','pension-employeeFixed':888});await p.locator('.advanced-settings>summary').click();await p.selectOption('#deductionPreset','shanghai-2026');assert.equal(await p.locator('#pension-mode').inputValue(),'rate');assert.equal(await p.locator('#medical-employerRate').inputValue(),'9');assert.equal(await p.locator('#deductionsEnabled').isChecked(),false);await fields(p,{deductionsEnabled:true});await p.click('#saveSettings');const text=await revealedText(p,'#deductionSummary');assert.match(text,/扣款后 CNY ¥8250.00/);assert.match(text,/雇主成本 CNY ¥13270.00/);await c.close();
  });
  await test('item caps, fixed amounts and missing base validation',async()=>{
    const {c,p}=await setup(undefined,{monthlySalary:10000});await p.click('#resetAction');await p.click('#openSettings');await fields(p,{deductionsEnabled:true,deductionsDetailed:true,'pension-enabled':true,'pension-baseMode':'custom','pension-baseValue':'','pension-employeeRate':8,'pension-employerRate':16});await p.click('#saveSettings');assert.equal(await p.locator('#monthlyDialog').isVisible(),true);await fields(p,{'pension-baseMode':'capped_salary','pension-minBase':5000,'pension-maxBase':8000,'housing-enabled':true,'housing-mode':'fixed','housing-employeeFixed':500,'housing-employerFixed':700});await p.click('#saveSettings');const text=await revealedText(p,'#deductionSummary');assert.match(text,/个人社保 CNY ¥640.00/);assert.match(text,/雇主社保 CNY ¥1280.00/);assert.match(text,/扣款后 CNY ¥8860.00/);await c.close();
  });
  await test('all currencies and JPY integer formatting',async()=>{
    for(const code of ['CNY','USD','EUR','GBP','JPY','HKD','SGD','AUD']){const {c,p}=await setup('2026-10-22T10:00:00+08:00',{currency:code});await p.clock.fastForward(1000);const text=await revealedText(p,'#earned');assert.match(await revealedText(p,'#perSecond'),new RegExp(code));if(code==='JPY')assert.equal(text.includes('.'),false);else assert.match(text,/1\.00$/);await c.close();}
  });
  await test('same-path migration preserves accrued amount, rules and history',async()=>{
    const {c,p}=await setup();await seed(p,{automationVersion:10,normalEarnedAmount:null,normalRatePerSecond:null,accumulatedMs:1800000,startedAt:+new Date('2026-10-22T10:30:00+08:00'),breakQuota:null,shortBreakQuota:'5',breakName:null,personalBreakName:'喝水',breakPaid:null,shortBreakPaid:true,history:[{date:'2026-10-21',amount:88,currencyCode:'USD',duration:'00:01:00'}]});assert.equal(await amount(p),3600);assert.equal((await read(p)).breakQuota,'5');assert.equal((await read(p)).breakPaid,true);await p.reload();assert.equal(await amount(p),3600);assert.equal((await read(p)).history[0].amount,88);await c.close();
  });
  await test('legacy active paid break migrates once, then freezes income',async()=>{
    const {c,p}=await setup();await seed(p,{automationVersion:10,normalEarnedAmount:null,normalRatePerSecond:null,accumulatedMs:1800000,startedAt:+new Date('2026-10-22T10:30:00+08:00'),breakMode:'short',breakPaid:null,shortBreakPaid:true,breakStartedAt:+new Date('2026-10-22T10:45:00+08:00')});assert.equal(await amount(p),3600);await p.clock.fastForward(1800000);await p.reload();assert.equal(await amount(p),3600);await p.selectOption('#breakChoice','work');await p.clock.fastForward(6.5*3600000);near((await read(p)).history[0].amount,23400);await c.close();
  });
  await test('fresh browser, clear device data and foreign currency preset guard',async()=>{
    const {c,p}=await setup();await p.click('#openSettings');await p.click('#clearDeviceData');await p.locator('#monthlyDialog').waitFor({state:'visible'});assert.equal(await p.locator('#monthlySalary').inputValue(),'');await fields(p,{currency:'USD'});await p.locator('.advanced-settings>summary').click();await p.selectOption('#deductionPreset','shanghai-2026');assert.equal(await p.locator('#deductionPreset').inputValue(),'none');assert.equal(await p.locator('#pension-minBase').inputValue(),'');await c.close();
    const other=await browser.newContext();const page=await other.newPage();await page.goto(origin+'/index.html');await page.locator('#monthlyDialog').waitFor({state:'visible'});assert.equal(await page.locator('#monthlySalary').inputValue(),'');await other.close();
  });
  await test('mobile/desktop screenshots and setting dialog overflow',async()=>{
    const output=path.join(__dirname,'..','预览图','V2');fs.mkdirSync(output,{recursive:true});
    for(const route of ['/index.html','/pay-by-second.html'])for(const width of [390,1440]){const {c,p}=await setup(undefined,{monthlySalary:10000},width,route);assert.equal(await p.evaluate(()=>innerWidth),width);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.screenshot({path:path.join(output,path.basename(route,'.html')+'-'+width+'.png'),fullPage:true});await p.click('#openSettings');await p.locator('.advanced-settings>summary').click();assert.equal(await p.evaluate(()=>{const d=document.querySelector('dialog');return d.scrollWidth>d.clientWidth+1;}),false);await c.close();}
  });
  console.log(`RESULT ${passed} edge suites passed; ${errors.length} browser errors`);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
