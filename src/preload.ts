import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
    runCommand: () => ipcRenderer.send("run-command"),
    exitApp: () => ipcRenderer.send("exit-app"),
    onFileUpdated: (callback: any) => ipcRenderer.on('file-updated', (_, data) => callback(data)),
});