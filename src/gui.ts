import { app, BrowserWindow, ipcMain } from "electron";
import { main } from "./main";

let win: BrowserWindow | null;

app.whenReady().then(() => {
    win = new BrowserWindow({
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

ipcMain.on("run-command", async () => {
    try {
        await main();
    } catch(error) {
        console.log(error)
    }
});

ipcMain.on("exit-app", () => {
    win?.close();
})