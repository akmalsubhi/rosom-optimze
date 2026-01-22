// splash-preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('splashAPI', {
    ready: () => {
        ipcRenderer.send('splash-ready');
    },
    onProgress: (callback) => {
        ipcRenderer.on('splash-progress', (event, data) => callback(data));
    },
    onClose: (callback) => {
        ipcRenderer.on('splash-close', (event) => callback());
    }
});
