const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getDados:          ()       => ipcRenderer.invoke('get-dados'),
    addTransacao:      (item)   => ipcRenderer.invoke('add-transacao', item),
    updateTransacao:   (item)   => ipcRenderer.invoke('update-transacao', item),
    deleteItem:        (id, tb) => ipcRenderer.invoke('delete-item', { id, tabela: tb }),
    saveNota:          (id, tx) => ipcRenderer.invoke('save-nota', { id, text: tx }),
    saveConfig:        (k, v)   => ipcRenderer.invoke('save-config', { chave: k, valor: v }),
    addRecorrente:          (item) => ipcRenderer.invoke('add-recorrente', item),
    updateRecorrente:       (item) => ipcRenderer.invoke('update-recorrente', item),
    reordenarRecorrentes:   (ids)  => ipcRenderer.invoke('reordenar-recorrentes', ids),
    importarJson:      (data)   => ipcRenderer.invoke('importar-json', data),
    exportarExcel:     (rows)   => ipcRenderer.invoke('exportar-excel', rows),
    exportarJson:      ()       => ipcRenderer.invoke('exportar-json'),
    addMeta:           (item)   => ipcRenderer.invoke('add-meta', item),
    updateMeta:        (item)   => ipcRenderer.invoke('update-meta', item),
    saveCategoriasCustom: (cats) => ipcRenderer.invoke('save-categorias-custom', cats),
    savePin:    (pin) => ipcRenderer.invoke('save-pin', pin),
    verifyPin:  (pin) => ipcRenderer.invoke('verify-pin', pin),
    checkPinSet: ()   => ipcRenderer.invoke('check-pin-set'),
});
