"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const main_1 = require("./main");
let win;
electron_1.app.whenReady().then(() => {
    win = new electron_1.BrowserWindow({
        width: 400,
        height: 270,
        webPreferences: {
            preload: __dirname + "/preload.js",
            contextIsolation: true,
        },
    });
    win.loadFile("index.html");
    win.on("closed", () => {
        win = null;
    });
});
electron_1.ipcMain.on("run-command", async () => {
    try {
        await (0, main_1.main)();
    }
    catch (error) {
        console.log(error);
    }
});
electron_1.ipcMain.on("exit-app", () => {
    win?.close();
});
