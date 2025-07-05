"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const main_1 = require("./main");
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
let win;
electron_1.app.whenReady().then(() => {
    win = new electron_1.BrowserWindow({
        width: 400,
        height: 385,
        webPreferences: {
            preload: path_1.default.join(__dirname, "preload.js"),
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
        console.error(error);
    }
});
electron_1.ipcMain.on("exit-app", () => {
    win?.close();
});
const filePath = path_1.default.join(process.cwd(), "logs.txt");
(0, fs_1.watchFile)(filePath, { interval: 500 }, async () => {
    try {
        const content = await fs_1.promises.readFile(filePath, "utf-8");
        win?.webContents.send("file-updated", content);
    }
    catch (err) {
        console.error("Failed to read file:", err);
    }
});
