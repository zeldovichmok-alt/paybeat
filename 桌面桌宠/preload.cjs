const { contextBridge, ipcRenderer } = require('electron');
// The browser keeps page-specific storage. The desktop app must survive moving
// its installation folder while staying inside this Windows user's app profile.
const desktopStorageKey = 'paybeat-local-state-v8:desktop';
if (/\/resources\/app\/index\.html$/i.test(window.location.pathname)) {
  try {
    if (localStorage.getItem(desktopStorageKey) === null) {
      const prefix = 'paybeat-local-state-v8:';
      const currentKey = prefix + encodeURIComponent(window.location.pathname);
      const candidates = [];
      for (const key of Object.keys(localStorage)) {
        try {
          if (!key.startsWith(prefix) || !/\/resources\/app\/index\.html$/i.test(decodeURIComponent(key.slice(prefix.length)))) continue;
          const raw = localStorage.getItem(key), state = JSON.parse(raw);
          if (!state?.profileComplete || !['idle','running','paused','done'].includes(state.status) || !Array.isArray(state.history)) continue;
          const times = [Date.parse(state.sessionDate), Number(state.startedAt), Number(state.breakStartedAt), ...(state.events || []).map(event => Date.parse(event.occurredAt))];
          candidates.push({ key, raw, at: Math.max(0, ...times.filter(Number.isFinite)) });
        } catch {}
      }
      candidates.sort((a,b) => b.at-a.at || Number(b.key===currentKey)-Number(a.key===currentKey) || a.key.localeCompare(b.key));
      if (candidates.length) localStorage.setItem(desktopStorageKey, candidates[0].raw);
    }
  } catch {} // Storage failures use the tool's existing save-error handling.
}
contextBridge.exposeInMainWorld('paybeatDesktop', Object.freeze({
  storageKey: desktopStorageKey,
  publish: state => ipcRenderer.send('paybeat:state', state),
  action: action => ipcRenderer.send('paybeat:action', action),
  drag: (phase, x, y) => ipcRenderer.send('paybeat:drag', {phase, x, y}),
  onAction: callback => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on('paybeat:tool-action', listener);
    return () => ipcRenderer.removeListener('paybeat:tool-action', listener);
  },
  onState: callback => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('paybeat:pet-state', listener);
    ipcRenderer.send('paybeat:ready');
    return () => ipcRenderer.removeListener('paybeat:pet-state', listener);
  }
}));
