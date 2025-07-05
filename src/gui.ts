import { app, BrowserWindow, ipcMain } from "electron";
import { main } from "./main";
import path from "path";
import { watchFile, promises as fsPromises } from "fs";

let win: BrowserWindow | null;

app.whenReady().then(() => {
    win = new BrowserWindow({
        width: 400,
        height: 385,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
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
    } catch (error) {
        console.error(error);
    }
});

ipcMain.on("exit-app", () => {
    win?.close();
});

const filePath = path.join(process.cwd(), "logs.txt");

watchFile(filePath, { interval: 500 }, async () => {
    try {
        const content = await fsPromises.readFile(filePath, "utf-8");
        win?.webContents.send("file-updated", content);
    } catch (err) {
        console.error("Failed to read file:", err);
    }
});