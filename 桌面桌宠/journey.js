// Shared milestone logic. It only receives half-unit reward counts, never salary rates.
(function (root) {
  'use strict';
  const SPEED = 14;
  const HALF_UNITS_PER_BIG = 40;
  const HALF_UNITS_PER_FLAG = 200;
  function rewardKind(previous, current) {
    if (Math.floor(current / HALF_UNITS_PER_FLAG) > Math.floor(previous / HALF_UNITS_PER_FLAG)) return 'flag';
    if (Math.floor(current / HALF_UNITS_PER_BIG) > Math.floor(previous / HALF_UNITS_PER_BIG)) return 'big';
    if (current > previous) return 'small';
    return null;
  }
  class JourneyTracker {
    constructor() { this.previous = null; this.sequence = 0; this.epoch = 0; this.sampleId = 0; }
    update(sample, now) {
      const units = sample.rewardUnits, elapsed = Number(sample.elapsedMs), fraction = Number(sample.rewardProgress);
      if (!Number.isInteger(units) || units < 0 || !Number.isFinite(elapsed) || elapsed < 0) return null;
      const key = sample.day + '|' + sample.currencyCode;
      const before = this.previous;
      const reset = !before || before.key !== key || units < before.units || elapsed < before.elapsed;
      if (reset) this.epoch++;
      const active = sample.ready === true && sample.billable === true && !sample.stale;
      const continuous = !reset && now >= before.at && now - before.at <= 3000 && elapsed - before.elapsed <= 2500;
      const kind = continuous && before.active ? rewardKind(before.units, units) : null;
      const safeFraction = Number.isFinite(fraction) ? Math.min(0.999, Math.max(0, fraction)) : 0;
      const delta = before ? units + safeFraction - before.units - before.fraction : 0;
      const coinSpeed = continuous && before.active && active && elapsed > before.elapsed ? Math.max(0, delta / ((elapsed - before.elapsed) / 1000)) : 0;
      this.previous = { key, units, fraction:safeFraction, elapsed, active, at: now };
      return { sampleId: ++this.sampleId, epoch: this.epoch, distance: elapsed / 1000 * SPEED, speed: SPEED, active, coinSpeed,
        coinProgress: safeFraction, targetKind: (units + 1) % HALF_UNITS_PER_FLAG === 0 ? 'flag' : (units + 1) % HALF_UNITS_PER_BIG === 0 ? 'big' : 'small',
        reward: kind ? { id: ++this.sequence, kind } : null };
    }
  }
  const exported = { JourneyTracker, SPEED };
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
  else root.PayBeatJourney = exported;
})(typeof globalThis === 'undefined' ? this : globalThis);
