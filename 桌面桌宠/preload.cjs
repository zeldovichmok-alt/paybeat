const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('paybeatDesktop', Object.freeze({
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
