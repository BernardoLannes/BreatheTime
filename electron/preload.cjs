const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getState: () => ipcRenderer.invoke('window:get-state'),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('window:toggle-always-on-top'),
  setCompactMode: (compact) => ipcRenderer.invoke('window:set-compact-mode', compact),
  ensureCompactHeight: (minHeight) =>
    ipcRenderer.invoke('window:ensure-compact-height', minHeight),
  setOpacity: (opacity) => ipcRenderer.invoke('window:set-opacity', opacity),
  updateShortcuts: (shortcuts) => ipcRenderer.invoke('window:update-shortcuts', shortcuts),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  close: () => ipcRenderer.invoke('window:close'),
  onShortcutTogglePlay: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('shortcut:toggle-play', listener);
    return () => ipcRenderer.removeListener('shortcut:toggle-play', listener);
  },
  onShortcutCompactChanged: (callback) => {
    const listener = (_event, isCompact) => callback(isCompact);
    ipcRenderer.on('shortcut:compact-changed', listener);
    return () => ipcRenderer.removeListener('shortcut:compact-changed', listener);
  },
});
