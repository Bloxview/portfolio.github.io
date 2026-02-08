const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getConfig: () => ipcRenderer.invoke('get-config'),
    saveConfig: (config) => ipcRenderer.invoke('save-config', config),
    installModule: (name, code) => ipcRenderer.invoke('install-module', name, code),
    getFlashUpdates: () => ipcRenderer.invoke('get-flash-updates'),
    executeFlashUpdate: (fileName) => ipcRenderer.invoke('execute-flash-update', fileName),
    onFlashUpdate: (callback) => ipcRenderer.on('flash-update', (event, moduleName) => callback(moduleName))
});
