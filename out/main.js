"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
const captcha_1 = require("./captcha");
const puppeteer_1 = __importDefault(require("puppeteer"));
const Config = __importStar(require("../json/config.json"));
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const node_fetch_1 = __importDefault(require("node-fetch"));
async function main() {
    console.log(1);
    const connectBrowser = async (browserWSEndpoint = Config.browserWSEndpoint) => {
        return await puppeteer_1.default.connect({
            browserWSEndpoint: browserWSEndpoint
        });
    };
    let browser;
    try {
        browser = await connectBrowser();
    }
    catch {
        (0, child_process_1.exec)("\"C:\\Users\\andri\\AppData\\Local\\Programs\\Opera GX\\opera.exe\" --remote-debugging-port=9222");
        await new Promise(resolve => setTimeout(resolve, 1000));
        const response = await (0, node_fetch_1.default)("http://127.0.0.1:9222/json/version");
        const data = await response.json();
        const config = JSON.parse(fs_1.default.readFileSync("./json/config.json", "utf-8"));
        config.browserWSEndpoint = data.webSocketDebuggerUrl;
        fs_1.default.writeFileSync("./json/config.json", JSON.stringify(config, null, 2), "utf-8");
        browser = await connectBrowser(data.webSocketDebuggerUrl);
    }
    console.log(2);
    const pages = await browser.pages();
    const page = pages[0];
    await page.setViewport({ width: 1920, height: 1080 });
    await page.bringToFront();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.goto('https://discadia.com/server/game-night-/');
    const likeButton = await page.waitForSelector('.inline-block.bg-indigo-600.text-white.group-hover\\:bg-white.group-hover\\:text-gray-700.rounded-xl.px-4.py-2.bg-opacity-95', { timeout: 10000 });
    await likeButton?.click();
    await solveCaptcha(page);
    await page.screenshot({ path: 'fullpage.png', fullPage: true });
    const userProfile = await page.waitForSelector('#user-menu', { timeout: 10000 });
    await userProfile?.click();
    const logoutButton = await page.waitForSelector('.flex.items-center.px-3.py-2.bg-red-500.hover\\:bg-red-600.transition-all', { timeout: 10000 });
    await logoutButton?.click();
    const confirmLogoutButton = await page.waitForSelector('#in-content > div > form > button', { timeout: 10000 });
    await confirmLogoutButton?.click();
    await browser.close();
}
async function solveCaptcha(page) {
    const captchaRootContainer = await page.waitForSelector('s-captcha', { timeout: 10000 });
    const checkbox = await captchaRootContainer?.evaluateHandle((captchaContainer) => {
        return new Promise((resolve) => {
            const checkExist = setInterval(() => {
                const checkboxElement = captchaContainer.shadowRoot?.querySelector('.checkbox');
                if (checkboxElement)
                    resolve(checkboxElement);
            }, 500);
            setTimeout(() => {
                clearInterval(checkExist);
                throw new Error("Timeout");
            }, 10000);
        });
    });
    await checkbox?.click();
    const captchaEncoded = await captchaRootContainer?.evaluate((captchaContainer) => {
        return new Promise((resolve) => {
            const checkExist = setInterval(() => {
                const captcha = captchaContainer.shadowRoot?.querySelector('img');
                if (captcha && captcha.complete && captcha.naturalWidth !== 0) {
                    clearInterval(checkExist);
                    const canvas = document.createElement('canvas');
                    canvas.width = captcha.naturalWidth;
                    canvas.height = captcha.naturalHeight;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(captcha, 0, 0);
                    const dataUrl = canvas.toDataURL();
                    resolve(dataUrl);
                }
            }, 500);
            setTimeout(() => {
                clearInterval(checkExist);
                throw new Error();
            }, 30000);
        });
    });
    if (!captchaEncoded)
        throw Error();
    const captchaBase64Data = captchaEncoded.replace(/^data:image\/\w+;base64,/, '');
    const captchaBuffer = Buffer.from(captchaBase64Data, 'base64');
    const puzzleCenterCoordinates = await (0, captcha_1.findPuzzleCenter)(captchaBuffer);
    if (!puzzleCenterCoordinates)
        throw Error();
    const slider = await captchaRootContainer?.evaluateHandle(captchaContainer => captchaContainer.shadowRoot?.querySelector('.slider-handle'));
    const sliderCenter = await slider?.evaluate(slider => {
        const sliderBoundaries = slider.getBoundingClientRect();
        return {
            x: sliderBoundaries.x + sliderBoundaries.width / 2,
            y: sliderBoundaries.y + sliderBoundaries.height / 2
        };
    });
    const captchaDivHandle = await captchaRootContainer?.evaluateHandle(captchaContainer => captchaContainer.shadowRoot?.querySelector('.layer.layer-1'));
    const captchaBoundingBox = await captchaDivHandle?.evaluate(div => {
        const rect = div.getBoundingClientRect();
        return {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
        };
    });
    if (!captchaBoundingBox)
        throw new Error();
    const puzzleScreenX = captchaBoundingBox.x + (puzzleCenterCoordinates.x / captchaBoundingBox.width) * captchaBoundingBox.width;
    const puzzleScreenY = captchaBoundingBox.y + (puzzleCenterCoordinates.y / captchaBoundingBox.height) * captchaBoundingBox.height;
    if (!sliderCenter)
        throw Error;
    await page.mouse.move(sliderCenter.x, sliderCenter.y);
    await page.mouse.down();
    await page.mouse.move(puzzleScreenX, puzzleScreenY, { steps: 10 });
    await new Promise(resolve => setTimeout(resolve, 100));
    await page.mouse.up();
    await new Promise(resolve => setTimeout(resolve, 1000));
    const voteButton = await page.waitForSelector('#vote-form > button', { timeout: 10000 });
    await voteButton?.click();
    await new Promise(resolve => setTimeout(resolve, 2000));
    let captchaStillExists;
    try {
        captchaStillExists = await page.$('#vote-form > button');
    }
    catch { }
    if (captchaStillExists)
        await solveCaptcha(page);
}
