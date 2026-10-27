const assert = require('node:assert/strict');

// Hold wall-clock pay time still while testing immediate press-to-reveal.
// Resume Date afterwards without reinstalling timers or rounding away errors.
async function revealedText(page, selector = '#earned') {
  const time = await page.evaluate(() => Date.now());
  await page.clock.setFixedTime(time);
  try {
    // Billing tests read through the public reveal control without moving focus.
    // Allow scrolling from the preceding click to finish before starting a hold.
    await page.waitForTimeout(50);
    await page.locator('#earned').dispatchEvent('pointerdown', {
      pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0
    });
    assert.equal(await page.locator('#earned').getAttribute('aria-pressed'), 'true');
    return await page.locator(selector).innerText();
  } finally {
    await page.locator('#earned').dispatchEvent('pointerup', { pointerId: 1 });
    await page.clock.setSystemTime(time);
  }
}
module.exports = { revealedText };
