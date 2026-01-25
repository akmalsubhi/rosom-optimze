// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Certificates
    certificates: {
        add: (data) => ipcRenderer.invoke('db-add-certificate', data),
        update: (id, data, reason, editedBy) => ipcRenderer.invoke('db-update-certificate', { id, data, reason, editedBy }),
        getById: (id) => ipcRenderer.invoke('db-get-certificate', id),
        getAll: (options) => ipcRenderer.invoke('db-get-all-certificates', options),
        getHistory: (id) => ipcRenderer.invoke('db-get-certificate-history', id),
        delete: (id, deletedBy) => ipcRenderer.invoke('db-delete-certificate', { id, deletedBy }),
        search: (term) => ipcRenderer.invoke('db-search-certificates', term),
        getStats: (options) => ipcRenderer.invoke('db-get-stats', options),
        // ⭐ دوال جديدة للأداء
        getUniqueValues: (column, options) => ipcRenderer.invoke('db-get-unique-values', { column, options }),
        getCount: (options) => ipcRenderer.invoke('db-get-certificates-count', options)
    },

    // Print
    print: {
        printPage: () => ipcRenderer.invoke('print-page'),
        printSilent: () => ipcRenderer.invoke('print-silent'),
        exportPDF: (options) => ipcRenderer.invoke('export-pdf', options),
        getPrinters: () => ipcRenderer.invoke('get-printers')
    },

    // Files
    files: {
        saveDialog: (options) => ipcRenderer.invoke('save-dialog', options),
        saveFile: (filePath, data) => ipcRenderer.invoke('save-file', { filePath, data })
    },

    // Notes
    notes: {
        add: (note) => ipcRenderer.invoke('db-add-note', note),
        getAll: () => ipcRenderer.invoke('db-get-notes')
    },

    // Shortcuts listener
    onShortcut: (channel, callback) => {
        ipcRenderer.on(channel, callback);
    },
    nonPayment: {
        create: (certId, data) => ipcRenderer.invoke('non-payment:create', certId, data),
        get: (id) => ipcRenderer.invoke('non-payment:get', id),
        getByCertificate: (certId) => ipcRenderer.invoke('non-payment:get-by-certificate', certId),
        cancel: (certId) => ipcRenderer.invoke('non-payment:cancel', certId)  // ⭐ إضافة جديدة
    }
});
