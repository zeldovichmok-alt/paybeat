const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, screen, powerMonitor } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { JourneyTracker } = require('./journey.js');
const PET_WIDTH = 280, PET_HEIGHT = 180;

const testProfile = process.env.PAYBEAT_TEST_PROFILE;
app.setPath('userData', testProfile || path.join(app.getPath('appData'), 'PayBeatDesktop'));
app.setName('PayBeat');
app.setAppUserModelId('local.paybeat.desktop');
if (!app.requestSingleInstanceLock()) app.quit();
else {
  let tool, pet, tray, quitting = false, quiet = false, skin = 'C', latest = null, lastSample = 0, savePositionTimer, drag = null;
  const journey = new JourneyTracker();
  const toolFile = path.join(__dirname, '..', 'index.html');
  const petFile = path.join(__dirname, 'pet.html');
  const prefsFile = path.join(app.getPath('userData'), 'pet-window.json');
  const from = (event, window) => window && !window.isDestroyed() && event.sender === window.webContents && event.senderFrame === window.webContents.mainFrame;
  const sendAction = action => { if (tool && !tool.isDestroyed()) tool.webContents.send('paybeat:tool-action', action); };
  const showTool = () => { tool.show(); if (tool.isMinimized()) tool.restore(); tool.focus(); };
  const transmit = () => { if (pet && !pet.isDestroyed() && latest) pet.webContents.send('paybeat:pet-state', { ...latest, skin, quiet, stale: Date.now() - lastSample > 3000 }); };
  const hidePet = () => { sendAction('hide-pet'); pet.hide(); };
  function setSkin(value) { if (!['A','B','C'].includes(value)) return; skin = value; transmit(); savePrefs(); if (tray) tray.setContextMenu(menu()); }
  function loadPrefs() { try { return JSON.parse(fs.readFileSync(prefsFile, 'utf8')); } catch { return {}; } }
  function constrain(position) {
    const area = screen.getDisplayMatching({ x: position.x, y: position.y, width: PET_WIDTH, height: PET_HEIGHT }).workArea;
    return { x: Math.round(Math.min(Math.max(position.x, area.x), area.x + area.width - PET_WIDTH)), y: Math.round(Math.min(Math.max(position.y, area.y), area.y + area.height - PET_HEIGHT)) };
  }
  function savePrefs() {
    if (!pet || pet.isDestroyed()) return;
    fs.mkdirSync(path.dirname(prefsFile), { recursive: true });
    const { x, y } = pet.getBounds();
    fs.writeFileSync(prefsFile, JSON.stringify({ x, y, quiet, skin }));
  }
  function menu() {
    return Menu.buildFromTemplate([
      { label: '打开工资工具', click: showTool },
      { label: '召回桌宠', click: () => { sendAction('show-pet'); pet.showInactive(); } },
      { label: latest?.resting ? '继续工作' : '休息 · 带薪摸鱼', enabled: Boolean(latest?.canToggleWork && Date.now() - lastSample <= 3000), click: () => sendAction('toggle-work') },
      { label: '换装', submenu: [['C','月白猫帽'],['A','薄荷旅人'],['B','樱桃快跑']].map(([id,name]) => ({label: id+' · '+name, type:'radio', checked:skin===id, click:()=>setSkin(id)})) },
      { label: '安静模式', type: 'checkbox', checked: quiet, click: item => { quiet = item.checked; transmit(); savePrefs(); } },
      { label: '隐藏桌宠', click: hidePet },
      { type: 'separator' },
      { label: '退出 PayBeat', click: () => app.quit() }
    ]);
  }
  function lockWindow(window, allowedFile) {
    const allowed = pathToFileURL(allowedFile).href;
    window.webContents.on('will-navigate', (event, url) => { if (url.split('?')[0] !== allowed) event.preventDefault(); });
    window.webContents.setWindowOpenHandler(() => { showTool(); return { action: 'deny' }; });
    window.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
    window.webContents.on('render-process-gone', () => { if (!quitting && window === tool) { latest = null; pet.webContents.send('paybeat:pet-state', { mode: 'idle', stale: true, ready: false }); } });
  }
  ipcMain.on('paybeat:state', (event, state) => {
    if (!from(event, tool) || !state || !['idle', 'working', 'overtime', 'resting', 'paused', 'done'].includes(state.mode)) return;
    if (!Number.isFinite(state.elapsedMs) || state.elapsedMs < 0 || !Number.isSafeInteger(state.rewardUnits) || state.rewardUnits < 0 || !['CNY','USD','EUR','GBP','JPY','HKD','SGD','AUD'].includes(state.currencyCode) || typeof state.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(state.day)) return;
    const progress = journey.update(state, Date.now());
    latest = { mode: state.mode, elapsedMs: state.elapsedMs, day: state.day, billable: state.billable === true, ready: state.ready === true,
      enabled: state.enabled !== false, canToggleWork: state.canToggleWork === true, resting: state.resting === true, journey: progress, skin };
    lastSample = Date.now();
    if (pet && !pet.isDestroyed()) { if (latest.enabled && !pet.isVisible()) pet.showInactive(); else if (!latest.enabled && pet.isVisible()) pet.hide(); }
    transmit();
  });
  ipcMain.on('paybeat:ready', event => { if (from(event, pet)) transmit(); });
  ipcMain.on('paybeat:drag', (event, data) => {
    if (!from(event, pet) || !data) return;
    if (data.phase === 'end') { drag = null; savePrefs(); return; }
    if (!Number.isFinite(data.x) || !Number.isFinite(data.y) || Math.abs(data.x) > 100000 || Math.abs(data.y) > 100000) return;
    if (data.phase === 'start') { const [x,y] = pet.getPosition(); drag = {x,y,pointerX:data.x,pointerY:data.y}; }
    else if (data.phase === 'move' && drag) {
      const next = constrain({x:drag.x + data.x - drag.pointerX, y:drag.y + data.y - drag.pointerY});
      pet.setPosition(next.x,next.y);
    }
  });
  ipcMain.on('paybeat:action', (event, action) => {
    if (!from(event, pet)) return;
    if (action === 'show-tool') showTool();
    else if (action === 'toggle-work' && latest?.canToggleWork) sendAction('toggle-work');
    else if (action === 'hide') hidePet();
    else if (action === 'menu') menu().popup({ window: pet });
    else if (action === 'quiet') { quiet = !quiet; transmit(); savePrefs(); }
    else if (action === 'cycle-skin') setSkin(skin === 'C' ? 'A' : skin === 'A' ? 'B' : 'C');
    else if (action === 'quit') app.quit();
  });
  app.on('second-instance', () => { if (tool) { showTool(); sendAction('show-pet'); } });
  app.on('before-quit', () => { quitting = true; savePrefs(); });
  app.whenReady().then(async () => {
    const prefs = loadPrefs(); quiet = prefs.quiet === true; skin = ['A','B','C'].includes(prefs.skin) ? prefs.skin : 'C';
    const area = screen.getPrimaryDisplay().workArea;
    const position = constrain({ x: Number.isFinite(prefs.x) ? prefs.x : area.x + area.width - PET_WIDTH - 40, y: Number.isFinite(prefs.y) ? prefs.y : area.y + area.height - PET_HEIGHT - 36 });
    const webPreferences = { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true, backgroundThrottling: false, spellcheck: false };
    tool = new BrowserWindow({ title: 'PayBeat · 工资工具', width: 1280, height: 900, minWidth: 390, minHeight: 700, show: false, autoHideMenuBar: true, backgroundColor: '#e9e8e3', webPreferences });
    pet = new BrowserWindow({ title: 'PayBeat · 桌面金币伙伴', ...position, width: PET_WIDTH, height: PET_HEIGHT, frame: false, transparent: true, backgroundColor: '#00000000', resizable: false, maximizable: false, minimizable: false, alwaysOnTop: true, skipTaskbar: true, hasShadow: false, show: false, webPreferences });
    lockWindow(tool, toolFile); lockWindow(pet, petFile);
    // This app is entirely local, including fonts and animations.
    tool.webContents.session.webRequest.onBeforeRequest((details, callback) => callback({ cancel: /^https?:/i.test(details.url) }));
    tool.on('close', event => { if (!quitting) { event.preventDefault(); tool.hide(); } });
    pet.on('close', event => { if (!quitting) { event.preventDefault(); hidePet(); } });
    pet.on('moved', () => { clearTimeout(savePositionTimer); savePositionTimer = setTimeout(savePrefs, 300); });
    pet.webContents.on('context-menu', () => menu().popup({ window: pet }));
    screen.on('display-removed', () => pet.setPosition(...Object.values(constrain(pet.getBounds()))));
    const rgba = Buffer.alloc(16 * 16 * 4);
    for (let y = 2; y < 14; y++) for (let x = 2; x < 14; x++) { const i = (y * 16 + x) * 4; rgba[i] = 40; rgba[i + 1] = 214; rgba[i + 2] = 255; rgba[i + 3] = 255; }
    tray = new Tray(nativeImage.createFromBuffer(rgba, { width: 16, height: 16 }));
    tray.setToolTip('PayBeat · 桌面金币伙伴'); tray.setContextMenu(menu()); tray.on('click', showTool); tray.on('right-click', () => tray.setContextMenu(menu()));
    powerMonitor.on('resume', () => { lastSample = 0; transmit(); });
    await tool.loadFile(toolFile); await pet.loadFile(petFile);
    tool.show(); if (latest?.enabled !== false) pet.showInactive();
    pet.setAlwaysOnTop(false); pet.setAlwaysOnTop(true,'screen-saver'); pet.moveTop();
    setInterval(transmit, 1000).unref();
  }).catch(error => { console.error(error); app.exit(1); });
}
