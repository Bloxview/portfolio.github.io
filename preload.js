const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  onFlashUpdate: (callback) => {
    ipcRenderer.on('flash-update', (event, moduleName) => callback(moduleName));
    // Return cleanup function
    return () => ipcRenderer.removeAllListeners('flash-update');
  },
  isDevelopment: process.env.NODE_ENV === 'development'
});
