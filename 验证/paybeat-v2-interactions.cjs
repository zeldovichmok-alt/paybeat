const assert = require('node:assert/strict');
const { chromium } = require(process.env.PAYBEAT_PLAYWRIGHT || 'C:/Users/HHH/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const origin = process.env.PAYBEAT_TEST_URL || 'http://localhost:8876';
let browser, passed = 0;
const errors = [];
async function setup({ mobile = false, reducedMotion = 'no-preference', time = '11:00:00', overtime = false, popup = false } = {}) {
  const context = await browser.newContext({ timezoneId: 'Asia/Shanghai', viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile, reducedMotion });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  page.on('pageerror', error => errors.push(error.message));
  const date = new Date('2026-10-22T' + time + '+08:00');
  await page.clock.install({ time: date });
  await page.clock.pauseAt(date);
  await page.goto(origin + '/index.html' + (popup ? '?popup=1' : ''));
  await page.locator('#monthlyDialog').waitFor({ state: 'hidden' });
  await page.locator('#mainAction').click();
  await page.locator('#monthlyDialog').waitFor({ state: 'visible' });
  await page.locator('#monthlySalary').fill('514800');
  if (overtime) {
    await page.locator('.advanced-settings>summary').click();
    await page.locator('#overtimeEnabled').check();
    await page.locator('#overtimeAutoStart').check();
  }
  await page.click('#saveSettings');
  return { context, page };
}
const pressed = (page, selector = '#earned') => page.locator(selector).getAttribute('aria-pressed');
const energy = page => page.locator('#petEnergyBar').evaluate(el => el.style.width);
const progress = page => page.locator('#petStage').evaluate(el => el.style.getPropertyValue('--route-offset'));
const ledger = page => page.evaluate(() => JSON.parse(localStorage.getItem('paybeat-local-state-v8:' + encodeURIComponent(location.pathname))));
async function aim(page, selector = '#earned') {
  const control = page.locator(selector);
  await control.scrollIntoViewIfNeeded();
  await page.waitForTimeout(80); // Let browser scroll events finish before a gesture.
  const box = await control.boundingBox();
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(point.x, point.y);
  return point;
}
async function hold(page, selector = '#earned') {
  await aim(page, selector);
  await page.mouse.down();
  assert.equal(await pressed(page, selector), 'true');
}
async function test(name, run) {
  const before = errors.length;
  await run();
  assert.equal(errors.length, before, errors.slice(before).join('\n'));
  passed++;
  console.log('PASS ' + name);
}
(async () => {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    await test('amounts default to masked; press reveals immediately; release hides', async () => {
      const { context, page } = await setup();
      for (const selector of ['#earned', '#monthlySummary', '#perSecond', '#earnPerSecond', '#todayBreakdown']) assert.match(await page.locator(selector).innerText(), /••••/);
      await aim(page); await page.mouse.down(); assert.equal(await pressed(page), 'true'); await page.mouse.up(); assert.equal(await pressed(page), 'false');
      await hold(page); assert.match(await page.locator('#earned').innerText(), /\d+\.\d{2}/); await page.mouse.up(); assert.equal(await pressed(page), 'false'); assert.match(await page.locator('#earned').innerText(), /••••/);
      const secondary = '.settings-summary [data-reveal]'; await hold(page, secondary); await page.mouse.up(); assert.equal(await pressed(page, secondary), 'false');
      await context.close();
    });
    await test('pointer movement, cancellation, scroll, blur and page lifecycle remask immediately', async () => {
      const { context, page } = await setup();
      await hold(page); await page.mouse.move(5, 5); assert.equal(await pressed(page), 'false'); await page.mouse.up();
      for (const type of ['pointercancel', 'scroll', 'blur', 'pagehide']) {
        await hold(page); await page.evaluate(type => window.dispatchEvent(new Event(type)), type); assert.equal(await pressed(page), 'false'); await page.mouse.up();
        await page.evaluate(() => { window.dispatchEvent(new Event('pageshow')); window.dispatchEvent(new Event('focus')); });
      }
      await hold(page); await page.reload(); assert.equal(await pressed(page), 'false'); await page.mouse.up();
      await context.close();
    });
    await test('Space and Enter support a real keyboard hold, release and Escape', async () => {
      const { context, page } = await setup();
      for (const key of ['Space', 'Enter']) {
        await aim(page); await page.locator('#earned').focus(); await page.waitForTimeout(80);
        await page.keyboard.down(key); assert.equal(await pressed(page), 'true');
        await page.keyboard.up(key); assert.equal(await pressed(page), 'false');
      }
      await page.keyboard.down('Space'); await page.clock.runFor(400); assert.equal(await pressed(page), 'true'); await page.keyboard.press('Escape'); assert.equal(await pressed(page), 'false'); await page.keyboard.up('Space');
      await context.close();
    });
    await test('real mobile touch hold, release, scroll gesture and cancel remain private', async () => {
      const { context, page } = await setup({ mobile: true });
      const session = await context.newCDPSession(page);
      const point = await aim(page);
      const start = () => session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...point, id: 0 }] });
      const end = () => session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await start(); assert.equal(await pressed(page), 'true'); await end(); assert.equal(await pressed(page), 'false');
      await start(); assert.equal(await pressed(page), 'true'); await end(); assert.equal(await pressed(page), 'false');
      await start(); await page.clock.runFor(400); await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); assert.equal(await pressed(page), 'false');
      await start(); await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...point, y: point.y - 40, id: 0 }] }); await page.clock.runFor(400); assert.equal(await pressed(page), 'false'); await end();
      assert.equal(await page.locator('#petPanel').isVisible(), false);
      await context.close();
    });
    await test('real income coins and forward route stop during breaks, pause and lunch', async () => {
      const { context, page } = await setup();
      assert.equal(await page.locator('#petPanel').isVisible(), true);
      await page.clock.runFor(1000); assert.notEqual(await energy(page), '0%'); assert.notEqual(await progress(page), '0%');
      await page.click('#breakAction'); const resting = await energy(page); await page.clock.runFor(11000); assert.equal(await energy(page), resting); assert.equal(await page.locator('#petPanel').getAttribute('data-state'), 'resting');
      await page.click('#breakAction'); await page.clock.runFor(2000); assert.notEqual(await energy(page), resting);
      await page.click('#mainAction'); const paused = await energy(page); await page.clock.runFor(11000); assert.equal(await energy(page), paused); assert.equal(await page.locator('#petPanel').getAttribute('data-state'), 'paused');
      await context.close();
      const lunch = await setup({ time: '12:00:00' }); const routeAtLunch=await progress(lunch.page); await lunch.page.clock.runFor(11000); assert.equal(await energy(lunch.page), '0%'); assert.equal(await progress(lunch.page), routeAtLunch); await lunch.context.close();
    });
    await test('overtime highlights; hidden pet preserves billing and preference after reload', async () => {
      const { context, page } = await setup({ time: '17:59:59', overtime: true });
      await page.clock.runFor(2000); assert.equal(await page.locator('#petPanel').getAttribute('data-state'), 'overtime');
      const before = await ledger(page); await page.click('#petToggle'); assert.equal(await page.locator('#petPanel').isVisible(), false); const after = await ledger(page);
      for (const key of ['normalEarnedAmount', 'normalRatePerSecond', 'startedAt', 'status', 'overtimeMode']) assert.equal(after[key], before[key]);
      await page.clock.runFor(11000); await page.reload(); assert.equal(await page.locator('#petPanel').isVisible(), false); assert.equal(await pressed(page), 'false');
      await page.click('#petToggleGlobal'); assert.equal(await page.locator('#petPanel').isVisible(), true); await hold(page); assert.ok(Number((await page.locator('#earned').innerText()).replace(/[^\d.]/g, '')) > 23400); await page.mouse.up();
      await context.close();
    });
    await test('background time is billed without a burst of historical coins on return', async () => {
      const { context, page } = await setup();
      await page.clock.runFor(3000); const before = await energy(page); await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await page.clock.fastForward(60000); assert.equal(await energy(page), before);
      await page.evaluate(() => window.dispatchEvent(new Event('focus'))); assert.equal(await energy(page), before); await page.clock.runFor(2000); assert.notEqual(await energy(page), before);
      await hold(page); assert.ok(Number((await page.locator('#earned').innerText()).replace(/[^\d.]/g, '')) >= 3665); await page.mouse.up(); await context.close();
    });
    await test('reduced motion, narrow viewport and popup degrade without changing income', async () => {
      const { context, page } = await setup({ reducedMotion: 'reduce' }); await page.clock.runFor(11000);
      assert.equal(await page.locator('#petCoin').evaluate(el => getComputedStyle(el).display), 'none'); assert.equal(await page.locator('#petSprite').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      for (const width of [780, 430, 390, 320]) { await page.setViewportSize({ width, height: 844 }); assert.equal(await page.locator('#petPanel').isVisible(), false); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); }
      await context.close();
      const popup = await setup({ popup: true }); assert.equal(await popup.page.locator('#petPanel').isVisible(), false); await popup.context.close();
    });
    console.log(`RESULT ${passed} V2 interaction suites passed; ${errors.length} browser errors`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
