const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const playwright=process.env.PAYBEAT_PLAYWRIGHT||'C:/Users/HHH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const {_electron}=require(playwright),{expect}=require(path.join(playwright,'test'));
const root=path.resolve(__dirname,'..'),runtime=path.join(root,'本地桌宠');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'paybeat-upgrade-'));
const profile=path.join(scratch,'profile'),stableKey='paybeat-local-state-v8:desktop';
let app,tool,pet;
function makeInstall(name,legacy=false){
  const destination=path.join(scratch,name);
  function copyDirectory(from,to){fs.mkdirSync(to,{recursive:true});for(const entry of fs.readdirSync(from,{withFileTypes:true})){
    if(from===runtime&&entry.name==='resources')continue;
    const source=path.join(from,entry.name),target=path.join(to,entry.name);
    if(entry.isDirectory())copyDirectory(source,target);else fs.linkSync(source,target);
  }}
  copyDirectory(runtime,destination);
  const appRoot=path.join(destination,'resources','app');fs.cpSync(path.join(runtime,'resources','app'),appRoot,{recursive:true});
  if(legacy)for(const [source,target] of [['index.html','index.html'],['桌面桌宠/package.json','package.json'],['桌面桌宠/main.cjs','desktop/main.cjs'],['桌面桌宠/preload.cjs','desktop/preload.cjs']]){
    fs.writeFileSync(path.join(appRoot,target),execFileSync('git',['show','2128183:'+source],{cwd:root}));
  }
  return path.join(destination,'PayBeat.exe');
}
async function launch(executablePath,userData=profile){
  const env={...process.env,PAYBEAT_TEST_PROFILE:userData};delete env.ELECTRON_RUN_AS_NODE;
  app=await _electron.launch({executablePath,env});await app.firstWindow();
  await expect.poll(()=>app.windows().length).toBe(2);
  tool=app.windows().find(page=>page.url().endsWith('/index.html'));pet=app.windows().find(page=>page.url().endsWith('/pet.html'));
  // Keep every launch on the same test day, independent of the wall clock.
  await tool.clock.install({time:new Date('2026-10-27T11:00:00+08:00')});await tool.reload();
}
const read=()=>tool.evaluate(()=>JSON.parse(localStorage.getItem(window.paybeatDesktop.storageKey||'paybeat-local-state-v8:'+encodeURIComponent(location.pathname))));
function verifyMigrationSelection(){
  const prefix='paybeat-local-state-v8:',oldKey=prefix+encodeURIComponent('/C:/old/resources/app/index.html');
  const newerKey=prefix+encodeURIComponent('/C:/newer/resources/app/index.html');
  const base={profileComplete:true,status:'done',history:[{amount:12}],sessionDate:'2026-10-26',events:[]};
  const storage={
    [oldKey]:JSON.stringify(base),
    [newerKey]:JSON.stringify({...base,sessionDate:'2026-10-27',monthlySalary:'23456'}),
    [prefix+encodeURIComponent('/C:/browser/index.html')]:JSON.stringify({...base,sessionDate:'2099-01-01',monthlySalary:'99999'}),
    [prefix+encodeURIComponent('/C:/invalid/resources/app/index.html')]:'invalid'
  };
  Object.defineProperties(storage,{getItem:{value:key=>storage[key]??null},setItem:{value:(key,value)=>storage[key]=value}});
  const code=fs.readFileSync(path.join(root,'桌面桌宠','preload.cjs'),'utf8');
  const run=()=>vm.runInNewContext(code,{require:()=>({contextBridge:{exposeInMainWorld:()=>{}},ipcRenderer:{}}),localStorage:storage,window:{location:{pathname:'/C:/fresh/resources/app/index.html'}}});
  run();assert.equal(JSON.parse(storage[stableKey]).monthlySalary,'23456');assert.equal(storage[oldKey],JSON.stringify(base));
  storage[newerKey]=JSON.stringify({...base,sessionDate:'2099-01-01',monthlySalary:'99999'});run();assert.equal(JSON.parse(storage[stableKey]).monthlySalary,'23456');
  console.log('PASS migration accepts settled records, ignores browser/invalid keys and preserves an existing stable profile');
}
(async()=>{try{
  verifyMigrationSelection();
  const oldInstall=makeInstall('old-v2.1',true),newInstall=makeInstall('new-v2.2'),movedInstall=makeInstall('moved-v2.2');
  await launch(oldInstall);
  await tool.locator('#monthlySalary').fill('12345');await tool.click('#saveSettings');await tool.click('#mainAction');
  let before=await read();assert.equal(before.status,'paused');
  const history=[{date:'2026-10-26',month:'2026-10',currencyCode:'CNY',amount:56,duration:'01:00:00'}];
  await tool.evaluate(history=>{const key='paybeat-local-state-v8:'+encodeURIComponent(location.pathname),state=JSON.parse(localStorage.getItem(key));state.history=history;localStorage.setItem(key,JSON.stringify(state));},history);
  await tool.reload();before=await read();
  await app.evaluate(({Menu,BrowserWindow})=>{Menu.prototype.popup=function(){global.upgradeMenu=this;};});
  await pet.locator('.adventure').click({button:'right'});
  await expect.poll(()=>app.evaluate(()=>Boolean(global.upgradeMenu))).toBe(true);
  await app.evaluate(()=>{
    global.upgradeMenu.items.find(item=>item.label==='换装').submenu.items.find(item=>item.label.startsWith('B')).click();
    global.upgradeMenu.items.find(item=>item.label==='安静模式').click({checked:true});
  });
  const position=await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('/pet.html'));w.setPosition(100,150);return w.getPosition();});
  await app.close();app=null;
  await launch(newInstall);
  const after=await read();
  for(const key of ['monthlySalary','status','normalEarnedAmount','accumulatedMs','normalRatePerSecond','currencyCode','history','events'])assert.deepEqual(after[key],before[key],key+' survives upgrade');
  assert.equal(await tool.evaluate(()=>window.paybeatDesktop.storageKey),stableKey);
  await expect(pet.locator('body')).toHaveAttribute('data-skin','B');await expect(pet.locator('body')).toHaveClass(/quiet/);
  assert.deepEqual(await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('/pet.html')).getPosition()),position);
  await app.close();app=null;
  await launch(movedInstall);assert.equal((await read()).monthlySalary,'12345');assert.deepEqual((await read()).history,history);
  console.log('PASS real V2.1 to V2.2 across folders retains salary, accrued amount, pause, history, events, skin, quiet and position; a second move retains data');
  tool.on('dialog',dialog=>dialog.accept());await tool.click('#openSettings');await tool.click('#clearDeviceData');
  await expect(tool.locator('#monthlyDialog')).toBeVisible();assert.equal(await tool.locator('#monthlySalary').inputValue(),'');
  assert.equal(await tool.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('paybeat-local-state-v8:')).length),0);
  await tool.reload();await expect(tool.locator('#monthlyDialog')).toBeVisible();assert.equal(await tool.locator('#monthlySalary').inputValue(),'');
  await app.close();app=null;
  await launch(newInstall,path.join(scratch,'fresh-profile'));await expect(tool.locator('#monthlyDialog')).toBeVisible();
  assert.equal(await tool.locator('#monthlySalary').inputValue(),'');await expect(pet.locator('body')).toHaveAttribute('data-skin','C');await expect(pet.locator('body')).not.toHaveClass(/quiet/);
  console.log('PASS clear-data does not resurrect legacy salary; a new user starts empty with default preferences');
  console.log('RESULT 3 upgrade suites passed; all installations and profiles were temporary');
}finally{
  if(app)await app.close();
  // Only remove the exact temporary tree created by this test, never a profile or installation outside it.
  if(path.dirname(path.resolve(scratch))===path.resolve(os.tmpdir())&&path.basename(scratch).startsWith('paybeat-upgrade-'))fs.rmSync(scratch,{recursive:true,force:true,maxRetries:5,retryDelay:100});
}})().catch(error=>{console.error(error);process.exitCode=1;});
