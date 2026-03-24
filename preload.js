const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
    openFile: () => ipcRenderer.invoke("open-file"),
    saveFile: (data) => ipcRenderer.invoke("save-file", data),
    onMenuFind: (cb) => ipcRenderer.on("menu-find", cb),
    onMenuReplace: (cb) => ipcRenderer.on("menu-replace", cb),
});