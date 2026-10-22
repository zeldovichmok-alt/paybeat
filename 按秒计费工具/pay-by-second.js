
    (() => {
      if (new URLSearchParams(window.location.search).get('popup') === '1') document.body.classList.add('popup-mode');
      const STORAGE_KEY = 'second-pay-state-v3';
      const LEGACY_KEY = 'second-pay-state-v2';
      const WINDOWS = [[9 * 60, 12 * 60], [13 * 60 + 30, 18 * 60 + 30]];
      const $ = (id) => document.getElementById(id);
      const els = {
        monthlySalary: $('monthlySalary'), monthKey: $('monthKey'), currency: $('currency'), dialogCurrencyPrefix: $('dialogCurrencyPrefix'),
        monthlySummary: $('monthlySummary'), selectedMonthLabel: $('selectedMonthLabel'), scheduleSummary: $('scheduleSummary'), workdayCount: $('workdayCount'), perSecond: $('perSecond'),
        timer: $('timer'), earned: $('earned'), liveRegion: $('liveRegion'), statePill: $('statePill'), mainAction: $('mainAction'), finishAction: $('finishAction'), resetAction: $('resetAction'), historyList: $('historyList'), clearHistory: $('clearHistory'),
        monthlyDialog: $('monthlyDialog'), openSettings: $('openSettings'), popupAction: $('popupAction'), closeSettings: $('closeSettings'), cancelSettings: $('cancelSettings'), saveSettings: $('saveSettings'), dialogLockNote: $('dialogLockNote')
      };
      const defaultState = { status: 'idle', monthlySalary: '11200', monthKey: currentMonthKey(), currency: '¥', accumulatedMs: 0, startedAt: null, sessionDate: dateKey(), settledAmount: null, settledCurrency: null, history: [], automationVersion: 3, autoPaused: false, dayRecorded: false, pausedDate: null, finishedDate: null, notice: '' };
      let state = loadState();
      let ticker = null;

      function currentMonthKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
      function dateKey(now = Date.now()) { const d = new Date(now); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
      function parseMonth(key) { const match = /^(\d{4})-(\d{2})$/.exec(key || ''); if (!match) return null; const year = Number(match[1]); const month = Number(match[2]); return month >= 1 && month <= 12 ? {year, month} : null; }
      function monthBounds(key) { const info = parseMonth(key) || parseMonth(currentMonthKey()); return {start: new Date(info.year, info.month - 1, 1).getTime(), end: new Date(info.year, info.month, 1).getTime(), info}; }
      function isWeekday(date) { const day = date.getDay(); return day >= 1 && day <= 5; }
      function dayStartMs(now = Date.now()) { const d = new Date(now); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0, 0).getTime(); }
      function dayEndMs(now = Date.now()) { const d = new Date(now); return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 18, 30, 0, 0).getTime(); }
      function monthWorkdays(key) { const {start, info} = monthBounds(key); const cursor = new Date(start); let count = 0; while (cursor.getMonth() === info.month - 1 && cursor.getFullYear() === info.year) { if (isWeekday(cursor)) count++; cursor.setDate(cursor.getDate() + 1); } return count; }
      function scheduledMs(key) { return monthWorkdays(key) * 8 * 60 * 60 * 1000; }
      function billableMsBetween(from, to, key) {
        if (!from || !to || to <= from) return 0;
        const bounds = monthBounds(key); const start = Math.max(from, bounds.start); const end = Math.min(to, bounds.end); if (end <= start) return 0;
        const first = new Date(start); first.setHours(0, 0, 0, 0); let total = 0;
        for (const cursor = new Date(first); cursor.getTime() < end; cursor.setDate(cursor.getDate() + 1)) {
          if (!isWeekday(cursor)) continue;
          for (const [beginMinutes, endMinutes] of WINDOWS) {
            const windowStart = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), Math.floor(beginMinutes / 60), beginMinutes % 60).getTime();
            const windowEnd = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), Math.floor(endMinutes / 60), endMinutes % 60).getTime();
            total += Math.max(0, Math.min(end, windowEnd) - Math.max(start, windowStart));
          }
        }
        return total;
      }
      function loadState() {
        try {
          let saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
          if (!saved) {
            const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || 'null');
            saved = legacy ? {...legacy, monthlySalary: '11200'} : null;
          }
          if (!saved) return {...defaultState};
          const next = {...defaultState, ...saved, history: Array.isArray(saved.history) ? saved.history.slice(0, 31) : []};
          next.monthlySalary = '11200';
          next.automationVersion = 3;
          if (next.sessionDate !== dateKey()) { next.status = 'idle'; next.accumulatedMs = 0; next.startedAt = null; next.settledAmount = null; next.settledCurrency = null; next.sessionDate = dateKey(); next.autoPaused = false; next.dayRecorded = false; next.pausedDate = null; next.finishedDate = null; }
          return next;
        } catch { return {...defaultState}; }
      }
      function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
      function salaryValue() { const value = Number.parseFloat(state.monthlySalary); return Number.isFinite(value) && value >= 0 ? value : 0; }
      function ratePerSecond() { const total = scheduledMs(state.monthKey); return total > 0 ? salaryValue() / (total / 1000) : 0; }
      function elapsedMs() { return state.accumulatedMs + (state.status === 'running' && state.startedAt ? billableMsBetween(state.startedAt, Date.now(), state.monthKey) : 0); }
      function automaticStartPoint(now = Date.now()) { return now < dayStartMs(now) ? dayStartMs(now) : dayStartMs(now); }
      function formatTime(ms) { const total = Math.floor(ms / 1000); const h = Math.floor(total / 3600); const m = Math.floor((total % 3600) / 60); const s = total % 60; const pad = (n) => String(n).padStart(2, '0'); return `${pad(h)}<span>:</span>${pad(m)}<span>:</span>${pad(s)}`; }
      function formatPlainTime(ms) { const total = Math.floor(ms / 1000); const h = Math.floor(total / 3600); const m = Math.floor((total % 3600) / 60); const s = total % 60; const pad = (n) => String(n).padStart(2, '0'); return `${pad(h)}:${pad(m)}:${pad(s)}`; }
      function formatMoney(amount, decimals = 2) { return Number(amount || 0).toFixed(decimals); }
      function monthLabel(key) { const bounds = monthBounds(key); return new Intl.DateTimeFormat('zh-CN', {year: 'numeric', month: 'long'}).format(new Date(bounds.start)); }
      function appendHistory(elapsed, amount) {
        if (state.dayRecorded) return;
        if (elapsed > 0) state.history.unshift({amount, currency: state.currency, month: monthLabel(state.monthKey), duration: formatPlainTime(elapsed), date: state.sessionDate});
        state.dayRecorded = true;
      }
      function settleDay(message) {
        const elapsed = elapsedMs(); const amount = elapsed / 1000 * ratePerSecond();
        appendHistory(elapsed, amount);
        state.accumulatedMs = elapsed; state.startedAt = null; state.settledAmount = amount; state.settledCurrency = state.currency; state.status = 'done'; state.autoPaused = true; state.finishedDate = state.sessionDate; state.pausedDate = null; state.notice = message; saveState();
      }
      function rollToToday() {
        const today = dateKey();
        if (state.sessionDate === today) return;
        if (state.status === 'running' || state.status === 'paused') settleDay('上一工作日已结算。');
        state.sessionDate = today; state.monthKey = currentMonthKey(); state.status = 'idle'; state.accumulatedMs = 0; state.startedAt = null; state.settledAmount = null; state.settledCurrency = null; state.autoPaused = false; state.dayRecorded = false; state.pausedDate = null; state.finishedDate = null; state.notice = ''; saveState();
      }
      function autoStartIfNeeded() {
        rollToToday();
        const now = Date.now(); const bounds = monthBounds(state.monthKey); const today = new Date(now);
        if (state.status === 'done' || state.status === 'paused' || state.autoPaused || salaryValue() <= 0 || !isWeekday(today) || now < bounds.start || now >= bounds.end) return;
        if (state.status === 'idle') { state.startedAt = automaticStartPoint(now); state.status = 'running'; state.notice = ''; saveState(); }
      }
      function autoFinishIfNeeded() {
        if (state.status !== 'running' || !state.startedAt) return;
        if (isWeekday(new Date()) && Date.now() >= dayEndMs()) { settleDay('今天已自动结算，明天 09:00 继续。'); }
      }
      function scheduleStatus() {
        const now = Date.now(); const d = new Date(now);
        if (!isWeekday(d)) return '周末不计费，下一个工作日 09:00 自动开始。';
        if (now < dayStartMs(now)) return '等待 09:00 自动开始。';
        if (now < new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0).getTime()) return '上午计时中，12:00 自动进入午休。';
        if (now < new Date(d.getFullYear(), d.getMonth(), d.getDate(), 13, 30).getTime()) return '午休中，13:30 自动继续。';
        if (now < dayEndMs(now)) return '下午计时中，18:30 自动结束。';
        return '今天已自动结算，明天 09:00 继续。';
      }
      function render() {
        rollToToday(); autoStartIfNeeded(); autoFinishIfNeeded();
        const elapsed = elapsedMs(); const rate = ratePerSecond(); const symbol = state.settledCurrency || state.currency || '¥'; const earned = state.status === 'done' && Number.isFinite(state.settledAmount) ? state.settledAmount : elapsed / 1000 * rate;
        const workdays = monthWorkdays(state.monthKey); const salary = salaryValue(); const bounds = monthBounds(state.monthKey); const monthHasTime = bounds.start <= Date.now() && bounds.end > Date.now();
        els.timer.innerHTML = formatTime(elapsed); els.earned.innerHTML = `<span class="currency">${symbol}</span>${formatMoney(earned)}`; els.perSecond.innerHTML = `${symbol}${formatMoney(rate, 4)} <small>/ 秒</small>`; els.monthlySummary.textContent = `${symbol}${formatMoney(salary)}`; els.selectedMonthLabel.textContent = monthLabel(state.monthKey); els.scheduleSummary.textContent = `${workdays} 天 · 8h/天`; els.workdayCount.innerHTML = `${workdays} <small>天</small>`;
        els.statePill.textContent = state.status === 'running' ? (scheduleStatus().startsWith('午休') ? '午休中' : '自动计时中') : state.status === 'done' ? '今日已结算' : state.status === 'paused' ? '今日已暂停' : '等待自动计时'; els.statePill.className = `session-state ${state.status}`;
        els.mainAction.textContent = state.status === 'running' ? '暂停今天' : (state.status === 'paused' ? '继续今天' : (state.status === 'done' ? '今日已结算' : '开始今天'));
        els.mainAction.disabled = (state.status === 'idle' && (salary <= 0 || !monthHasTime || !isWeekday(new Date()))) || state.status === 'done'; els.finishAction.disabled = !['running', 'paused'].includes(state.status); els.resetAction.disabled = state.status === 'idle' && elapsed === 0; els.openSettings.disabled = state.status === 'running';
        els.liveRegion.textContent = state.status === 'running' ? scheduleStatus() : state.status === 'paused' ? state.notice || '今天已暂停，点击继续后恢复。' : state.status === 'done' ? `今日已结算，共计 ${formatPlainTime(elapsed)}，${symbol}${formatMoney(earned)}。` : salary <= 0 ? '打开设置，输入月薪后开始。' : scheduleStatus();
        renderHistory();
      }
      function renderHistory() { if (!state.history.length) { els.historyList.innerHTML = '<div class="history-empty">还没有结算记录。<br>每天结束后会自动记录当天金额。</div>'; return; } els.historyList.innerHTML = state.history.map(item => `<div class="history-item"><div class="history-main"><div class="history-amount">${item.currency}${formatMoney(item.amount)}</div><div class="history-date">${item.month || ''} · ${item.date}</div></div><div class="history-time">${item.duration}</div></div>`).join(''); }
      function start() { if (state.status === 'done') return; const now = Date.now(); const bounds = monthBounds(state.monthKey); if (bounds.start > now || bounds.end <= now || !isWeekday(new Date(now))) { render(); return; } state.startedAt = state.status === 'paused' ? now : automaticStartPoint(now); state.status = 'running'; state.autoPaused = false; state.pausedDate = null; state.notice = ''; saveState(); render(); }
      function pause() { if (state.status !== 'running') return; state.accumulatedMs = elapsedMs(); state.startedAt = null; state.status = 'paused'; state.autoPaused = true; state.pausedDate = state.sessionDate; state.notice = '今天已暂停，点击继续后恢复。'; saveState(); render(); }
      function finish() { if (!['running', 'paused'].includes(state.status)) return; settleDay('今天已结算，明天 09:00 自动开始。'); render(); }
      function reset() { if (elapsedMs() > 0 && !window.confirm('确定要重置今天的计费吗？今天未结算的时间不会保存。')) return; state.status = 'idle'; state.accumulatedMs = 0; state.startedAt = null; state.settledAmount = null; state.settledCurrency = null; state.autoPaused = false; state.dayRecorded = false; state.pausedDate = null; state.finishedDate = null; state.notice = ''; saveState(); render(); }
      function syncDialog() { const locked = state.status === 'running'; els.monthlySalary.value = state.monthlySalary; els.monthKey.value = state.monthKey; els.currency.value = state.currency; els.dialogCurrencyPrefix.textContent = state.currency; [els.monthlySalary, els.monthKey, els.currency, els.saveSettings].forEach((el) => { el.disabled = locked; }); els.dialogLockNote.hidden = !locked; }
      function showSettingsDialog() { syncDialog(); if (typeof els.monthlyDialog.showModal === 'function') els.monthlyDialog.showModal(); else els.monthlyDialog.setAttribute('open', ''); }
      function closeSettingsDialog() { if (typeof els.monthlyDialog.close === 'function') els.monthlyDialog.close(); else els.monthlyDialog.removeAttribute('open'); }
      els.openSettings.addEventListener('click', showSettingsDialog); els.closeSettings.addEventListener('click', closeSettingsDialog); els.cancelSettings.addEventListener('click', closeSettingsDialog); els.currency.addEventListener('change', () => { els.dialogCurrencyPrefix.textContent = els.currency.value; });
      els.saveSettings.addEventListener('click', () => { const salary = Number.parseFloat(els.monthlySalary.value); const key = els.monthKey.value; if (!Number.isFinite(salary) || salary <= 0) { window.alert('请输入大于 0 的月薪。'); return; } if (!parseMonth(key)) { window.alert('请选择有效的结算月份。'); return; } state.monthlySalary = String(salary); state.monthKey = key; state.currency = els.currency.value; state.status = 'idle'; state.accumulatedMs = 0; state.startedAt = null; state.settledAmount = null; state.settledCurrency = null; state.autoPaused = false; state.dayRecorded = false; state.notice = ''; saveState(); closeSettingsDialog(); render(); });
      els.popupAction.addEventListener('click', () => { const popup = window.open(`${window.location.href.split('?')[0]}?popup=1`, 'second-pay-popup', 'popup=yes,width=430,height=820,resizable=yes'); if (!popup) els.liveRegion.textContent = '弹窗被浏览器拦截，请允许此页面打开弹窗。'; });
      els.mainAction.addEventListener('click', () => state.status === 'running' ? pause() : start()); els.finishAction.addEventListener('click', finish); els.resetAction.addEventListener('click', reset); els.clearHistory.addEventListener('click', () => { if (!state.history.length || window.confirm('确定要清空全部结算记录吗？')) { state.history = []; saveState(); render(); } });
      document.addEventListener('visibilitychange', () => { saveState(); render(); }); window.addEventListener('beforeunload', saveState);
      render(); ticker = window.setInterval(render, 1000);
    })();
  
