"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    runCommand: () => electron_1.ipcRenderer.send("run-command"),
    exitApp: () => electron_1.ipcRenderer.send("exit-app"),
    onFileUpdated: (callback) => electron_1.ipcRenderer.on('file-updated', (_, data) => callback(data)),
});
