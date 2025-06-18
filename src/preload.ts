import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
    runCommand: () => ipcRenderer.send("run-command"),
    exitApp: () => ipcRenderer.send("exit-app"),
});