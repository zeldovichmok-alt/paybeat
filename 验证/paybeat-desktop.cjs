const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const playwrightPath = process.env.PAYBEAT_PLAYWRIGHT || 'C:/Users/HHH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
const { _electron } = require(playwrightPath);
const { expect } = require(path.join(playwrightPath, 'test'));
const { compareVersions } = require(path.resolve(__dirname, '..', '桌面桌宠', 'version.cjs'));
const executablePath = path.resolve(__dirname, '..', '本地桌宠', 'PayBeat.exe');
const output = path.resolve(__dirname, '..', '预览图', 'V2-桌宠');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'paybeat-desktop-test-'));
let app, tool, pet, passed = 0;
const errors = [];
async function launch(userData = profile) {
  const env = { ...process.env, PAYBEAT_TEST_PROFILE: userData }; delete env.ELECTRON_RUN_AS_NODE;
  app = await _electron.launch({ executablePath, env });
  await app.firstWindow();
  await expect.poll(() => app.windows().length).toBe(2);
  tool = app.windows().find(w => w.url().endsWith('/index.html'));
  pet = app.windows().find(w => w.url().endsWith('/pet.html'));
  for (const page of [tool, pet]) page.on('pageerror', error => errors.push(error.message));
  await tool.locator('#monthlyDialog').waitFor({ state: 'hidden' });
  await tool.locator('#mainAction').click();
  await tool.locator('#monthlyDialog').waitFor({ state: 'visible' });
  await expect.poll(() => app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('/pet.html'))?.isAlwaysOnTop())).toBe(true);
  // Capture the real native menu without leaving an OS popup over the test window.
  await app.evaluate(({Menu})=>{Menu.prototype.popup=function(){global.testPetMenu=this;};});
}
async function openMenu(keyboard=false){
  await app.evaluate(()=>{global.testPetMenu=null;});
  if(keyboard)await pet.locator('#hero').press('Shift+F10');
  else await pet.locator('.adventure').click({button:'right'});
  await expect.poll(()=>app.evaluate(()=>Boolean(global.testPetMenu))).toBe(true);
  return app.evaluate(()=>global.testPetMenu.items.map(item=>({label:item.label,enabled:item.enabled,checked:item.checked,children:item.submenu?.items.map(child=>({label:child.label,checked:child.checked}))})));
}
async function menuAction(label,child){
  await openMenu();
  await app.evaluate(({BrowserWindow},{label,child})=>{
    let item=global.testPetMenu.items.find(item=>item.label===label);
    if(child)item=item?.submenu?.items.find(item=>item.label===child);
    if(!item||!item.enabled)throw new Error('Unavailable menu item: '+label+' / '+child);
    item.click(undefined,BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('/pet.html')));
  },{label,child});
}
async function test(name, run) { const before = errors.length; await run(); assert.equal(errors.length, before, errors.slice(before).join('\n')); console.log('PASS ' + name); passed++; }
const coins = () => pet.locator('#companion').getAttribute('data-coins').then(value => Number(value || 0));
(async () => {
  fs.mkdirSync(output, { recursive: true });
  try {
    assert.ok(compareVersions('v2.2.0', 'v2.1.0') > 0);
    assert.ok(compareVersions('2.2.0', '2.2.0') === 0);
    assert.ok(compareVersions('2.1.9', '2.2.0') < 0);
    await launch();
    await test('native app starts fresh; pet is transparent, frameless and always on top', async () => {
      assert.equal(await app.evaluate(({app})=>app.getVersion()),'2.2.0');
      assert.equal(await tool.locator('#monthlySalary').inputValue(), '');
      const flags = await app.evaluate(({ BrowserWindow }) => { const window = BrowserWindow.getAllWindows().find(w => w.webContents.getURL().endsWith('/pet.html')); const preferences = window.webContents.getLastWebPreferences(); return { top: window.isAlwaysOnTop(), bounds: window.getBounds(), contextIsolation: preferences.contextIsolation, nodeIntegration: preferences.nodeIntegration }; });
      assert.equal(flags.top, true); assert.equal(flags.bounds.width, 280); assert.equal(flags.bounds.height, 180); assert.equal(flags.contextIsolation, true); assert.equal(flags.nodeIntegration, false);
      assert.equal(await pet.locator('.toolbar,.hint,#open,#work,#skin,#quiet,#hide').count(),0);
      const items=await openMenu();
      assert.ok(items.some(item=>item.label==='打开工资工具'));
      assert.ok(items.some(item=>item.label==='检查更新'));
      await app.evaluate(({dialog,shell})=>{
        global.updateDialog=null;global.updateLinks=[];
        dialog.showMessageBox=async(_window,options)=>{global.updateDialog=options;return {response:0};};
        shell.openExternal=async url=>global.updateLinks.push(url);
        const https=process.getBuiltinModule('node:https'),{EventEmitter}=process.getBuiltinModule('node:events');
        global.restoreUpdateGet=https.get;
        https.get=(_url,_options,callback)=>{
          const request=new EventEmitter();request.destroy=()=>{};
          process.nextTick(()=>{const response=new EventEmitter();response.statusCode=200;response.setEncoding=()=>{};callback(response);
            response.emit('data',JSON.stringify({tag_name:'v2.3.1',body:'测试更新说明',html_url:'https://example.com/untrusted'}));response.emit('end');});
          return request;
        };
      });
      await menuAction('检查更新');
      await expect.poll(()=>app.evaluate(()=>global.updateDialog?.title)).toBe('发现 PayBeat 新版本');
      await expect.poll(()=>app.evaluate(()=>global.updateLinks)).toEqual(['https://github.com/zeldovichmok-alt/paybeat/releases/tag/v2.3.1']);
      await app.evaluate(()=>{process.getBuiltinModule('node:https').get=global.restoreUpdateGet;});
      assert.equal(items.find(item=>item.label==='休息 · 带薪摸鱼').enabled,false);
      assert.equal(items.find(item=>item.label==='换装').children.find(item=>item.label.startsWith('C')).checked,true);
      assert.ok((await openMenu(true)).some(item=>item.label==='退出 PayBeat'));
      const before = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => w.webContents.getURL().endsWith('/pet.html')).getBounds());
      await pet.locator('.speech').dispatchEvent('pointerdown', {button:0,isPrimary:true,pointerId:1,screenX:500,screenY:500});
      await pet.locator('.speech').dispatchEvent('pointermove', {pointerId:1,screenX:400,screenY:450});
      await pet.locator('.speech').dispatchEvent('pointerup', {pointerId:1});
      await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => w.webContents.getURL().endsWith('/pet.html')).getBounds().x)).toBe(before.x-100);
      await pet.screenshot({ path: path.join(output, 'desktop-pet-fresh.png'), omitBackground: true });
    });
    await test('three skins, tap greeting, native drag and saved skin survive restart', async () => {
      assert.equal(await pet.locator('body').getAttribute('data-skin'),'C');
      await expect.poll(()=>pet.locator('#sprite').evaluate(el=>el.complete&&el.naturalWidth===1536)).toBe(true);
      await pet.locator('#hero').click();
      await expect(pet.locator('#companion')).toHaveAttribute('data-interaction','hello');
      const beforeDrag = await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('/pet.html')).getBounds());
      await pet.locator('#hero').dispatchEvent('pointerdown',{button:0,isPrimary:true,pointerId:5,screenX:500,screenY:500});
      await pet.locator('#hero').dispatchEvent('pointermove',{pointerId:5,screenX:460,screenY:480});
      await pet.locator('#hero').dispatchEvent('pointerup',{pointerId:5});
      await expect.poll(()=>app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().find(w=>w.webContents.getURL().endsWith('/pet.html')).getBounds().x)).toBe(beforeDrag.x-40);
      assert.equal(await pet.locator('#landscape .route-tile').count(),8);
      assert.ok(await pet.locator('#landscape .flower, #landscape .grass, #landscape .sign, #landscape .stone').count()>0);
      for(const id of ['A','B']){
        await menuAction('换装',id+' · '+(id==='A'?'薄荷旅人':'樱桃快跑'));
        await expect(pet.locator('body')).toHaveAttribute('data-skin',id);
        await expect.poll(()=>pet.locator('#sprite').evaluate(el=>el.complete&&el.naturalWidth===1536)).toBe(true);
        await expect.poll(()=>pet.locator('#motionSprite').evaluate(el=>el.complete&&el.naturalWidth===1774)).toBe(true);
        await pet.screenshot({path:path.join(output,'skin-'+id+'.png'),omitBackground:true});
      }
      await app.close(); await launch();
      await expect(pet.locator('body')).toHaveAttribute('data-skin','B');
      await menuAction('换装','C · 月白猫帽');await expect(pet.locator('body')).toHaveAttribute('data-skin','C');
      await pet.screenshot({path:path.join(output,'skin-C.png'),omitBackground:true});
      assert.equal(await tool.locator('#monthlySalary').inputValue(),'');
    });
    await test('real half-unit income produces rewards; pet receives no salary values', async () => {
      await tool.clock.install({ time: new Date('2026-10-22T11:00:00+08:00') });
      await tool.locator('#monthlySalary').fill('514800'); await tool.click('#saveSettings');
      await expect.poll(coins).toBeGreaterThanOrEqual(2);
      await pet.evaluate(() => { window.receivedState = null; window.paybeatDesktop.onState(value => window.receivedState = value); });
      await expect.poll(() => pet.evaluate(() => Boolean(window.receivedState))).toBe(true);
      const payload = await pet.evaluate(() => window.receivedState);
      assert.deepEqual(Object.keys(payload).sort(), ['billable', 'canToggleWork', 'day', 'elapsedMs', 'enabled', 'mode', 'quiet', 'ready', 'resting', 'stale','journey','skin'].sort());
      assert.equal('rewardUnits' in payload, false);
      assert.equal(payload.mode, 'working'); assert.equal(await tool.locator('#earned').getAttribute('aria-pressed'), 'false');
      await pet.screenshot({ path: path.join(output, 'desktop-pet-working.png'), omitBackground: true });
      const start = Number(await pet.locator('#companion').getAttribute('data-distance'));
      await pet.waitForTimeout(700);
      const middle = Number(await pet.locator('#companion').getAttribute('data-distance'));
      await pet.waitForTimeout(700);
      const end = Number(await pet.locator('#companion').getAttribute('data-distance'));
      assert.ok(start < middle && middle < end, 'road continuously moves forward');
    });
    await test('closing the tool keeps native pet and billing active; reopens immediately', async () => {
      await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => w.webContents.getURL().endsWith('/index.html')).close());
      const before = await coins();
      await expect.poll(coins, { timeout: 5000 }).toBeGreaterThan(before + 1);
      assert.equal(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => w.webContents.getURL().endsWith('/index.html')).isVisible()), false);
      await menuAction('打开工资工具');
      assert.equal(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => w.webContents.getURL().endsWith('/index.html')).isVisible()), true);
    });
    await test('right-click rest freezes income and coins; resume increases subsequent rate', async () => {
      await menuAction('休息 · 带薪摸鱼'); await expect.poll(() => pet.locator('body').getAttribute('data-mode')).toBe('resting');
      const before = await coins();
      const distance = await pet.locator('#companion').getAttribute('data-distance');
      const coinPosition = await pet.locator('#companion').getAttribute('data-coin-x');
      await pet.waitForTimeout(2200); assert.equal(await coins(), before);
      assert.equal(await pet.locator('#companion').getAttribute('data-distance'), distance, 'rest freezes forward movement');
      assert.equal(await pet.locator('#companion').getAttribute('data-coin-x'),coinPosition,'rest freezes coin position');
      await pet.screenshot({ path: path.join(output, 'desktop-pet-resting.png'), omitBackground: true });
      await menuAction('继续工作'); await expect.poll(() => pet.locator('body').getAttribute('data-mode')).toBe('working');
      await expect.poll(coins).toBeGreaterThan(before);
      assert.ok(await tool.evaluate(() => JSON.parse(localStorage.getItem(window.paybeatDesktop.storageKey)).normalRatePerSecond) > 1);
    });
    await test('quiet and hide controls work; tool can restore companion', async () => {
      await menuAction('安静模式'); await expect(pet.locator('body')).toHaveClass(/quiet/);
      assert.equal((await openMenu()).find(item=>item.label==='安静模式').checked,true);
      await expect(pet.locator('#hero')).toHaveAttribute('data-frame','0');
      await expect(pet.locator('#nextReward')).toBeHidden();
      const distance=await pet.locator('#companion').getAttribute('data-distance');
      await pet.waitForTimeout(1500);
      assert.equal(await pet.locator('#companion').getAttribute('data-distance'),distance,'quiet mode freezes scenery');
      await menuAction('隐藏桌宠');
      await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => w.webContents.getURL().endsWith('/pet.html')).isVisible())).toBe(false);
      await tool.locator('#petToggleGlobal').click();
      await expect.poll(() => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find(w => w.webContents.getURL().endsWith('/pet.html')).isVisible())).toBe(true);
    });
    await test('new desktop profile contains no prior salary, history or preferences', async () => {
      await app.close(); await launch(fs.mkdtempSync(path.join(os.tmpdir(), 'paybeat-desktop-clean-')));
      assert.equal(await tool.locator('#monthlySalary').inputValue(), ''); assert.equal(await tool.locator('#earned').getAttribute('aria-pressed'), 'false');
      await expect(pet.locator('body')).not.toHaveClass(/quiet/);
      await expect(pet.locator('body')).toHaveAttribute('data-skin','C');
    });
    await test('live ledger reaches 0.5, 20 and 100 units with distinct milestones', async () => {
      await pet.evaluate(() => { window.milestoneState = null; window.paybeatDesktop.onState(value => window.milestoneState = value); });
      const date=new Date('2026-10-22T10:00:00+08:00');
      await tool.clock.install({time:new Date(date.getTime()-1000)});await tool.clock.pauseAt(date);
      await tool.locator('#monthlySalary').fill('257400');await tool.click('#saveSettings');
      await tool.clock.runFor(250);
      await expect.poll(()=>pet.evaluate(()=>window.milestoneState?.journey?.coinProgress)).toBeCloseTo(.25,2);
      const far=Number(await pet.locator('#companion').getAttribute('data-coin-x'));
      await tool.clock.runFor(500);
      await expect.poll(()=>pet.evaluate(()=>window.milestoneState?.journey?.coinProgress)).toBeCloseTo(.75,2);
      const near=Number(await pet.locator('#companion').getAttribute('data-coin-x'));
      assert.ok(near<far,'coin moves toward the character as real income increases');
      await tool.clock.runFor(240);
      await tool.locator('#earned').dispatchEvent('pointerdown',{pointerId:1,isPrimary:true,button:0});
      await tool.locator('#earned').dispatchEvent('pointerup',{pointerId:1});
      assert.equal(await coins(),0,'no reward before 0.5 unit');
      await tool.clock.runFor(10);
      await expect.poll(()=>pet.locator('#companion').getAttribute('data-last-reward')).toBe('small');
      await tool.clock.runFor(180);
      await expect.poll(()=>pet.locator('#companion').getAttribute('data-coin-x').then(Number)).toBeLessThanOrEqual(107);
      await pet.screenshot({path:path.join(output,'milestone-0.5.png'),omitBackground:true});
      await tool.clock.runFor(820);
      // Move the ledger clock one second per IPC sample. A single large clock jump
      // deliberately behaves like sleep and suppresses historical reward playback.
      const advanceTo = async (from, to) => {
        for(let second=from+1;second<=to;second++) {
          await tool.clock.runFor(1000);
          await expect.poll(()=>pet.evaluate(()=>window.milestoneState?.journey?.distance)).toBe(second*14);
        }
      };
      await advanceTo(2,40);
      await expect.poll(()=>pet.locator('#companion').getAttribute('data-last-reward')).toBe('big');
      await pet.screenshot({path:path.join(output,'milestone-20.png'),omitBackground:true});
      await advanceTo(40,200);
      await expect.poll(()=>pet.locator('#companion').getAttribute('data-last-reward')).toBe('flag');
      await pet.screenshot({path:path.join(output,'milestone-100.png'),omitBackground:true});
      const count=await coins();await tool.locator('#earned').dispatchEvent('pointerdown',{pointerId:2,isPrimary:true,button:0});await tool.locator('#earned').dispatchEvent('pointerup',{pointerId:2});await pet.waitForTimeout(100);assert.equal(await coins(),count,'same amount does not repeat');
    });
    console.log(`RESULT ${passed} desktop suites passed; ${errors.length} browser errors; all salary fixtures stayed in temporary profiles`);
  } finally { if (app) await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
