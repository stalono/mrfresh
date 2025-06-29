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
    const connectBrowser = async (browserWSEndpoint = Config.browserWSEndpoint) => {
        return await puppeteer_1.default.connect({
            browserWSEndpoint: browserWSEndpoint,
            defaultViewport: null
        });
    };
    let browser;
    try {
        browser = await connectBrowser();
    }
    catch {
        (0, child_process_1.exec)("\"C:\\Users\\andri\\AppData\\Local\\Programs\\Opera GX\\opera.exe\" --remote-debugging-port=9222");
        await new Promise(resolve => setTimeout(resolve, 2000));
        const response = await (0, node_fetch_1.default)("http://127.0.0.1:9222/json/version");
        const data = await response.json();
        const config = JSON.parse(fs_1.default.readFileSync("./json/config.json", "utf-8"));
        config.browserWSEndpoint = data.webSocketDebuggerUrl;
        fs_1.default.writeFileSync("./json/config.json", JSON.stringify(config, null, 2), "utf-8");
        browser = await connectBrowser(data.webSocketDebuggerUrl);
    }
    const pages = await browser.pages();
    let page = pages[1];
    if (!page) {
        page = await browser.newPage();
    }
    await page.bringToFront();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.goto(Config.serverToVoteFor);
    const likeButton = await page.waitForSelector('.inline-block.bg-indigo-600.text-white.group-hover\\:bg-white.group-hover\\:text-gray-700.rounded-xl.px-4.py-2.bg-opacity-95', { timeout: 10000 });
    console.log(page.viewport);
    await likeButton?.click();
    const discordLoginButtonSelector = '#discord-login-button';
    const captchaRoonContainerSelector = 's-captcha';
    const winner = await Promise.race([
        page.waitForSelector(discordLoginButtonSelector, { timeout: 10000 }).then(() => 'discordLogin'),
        page.waitForSelector(captchaRoonContainerSelector, { timeout: 10000 }).then(() => 'solveCaptcha')
    ]);
    if (winner === 'discordLogin') {
        await logIntoDiscord(page);
    }
    else {
        await solveCaptcha(page, '#vote-form > button');
    }
    const userProfile = await page.waitForSelector('#user-menu', { timeout: 10000 });
    await userProfile?.click();
    const logoutButton = await page.waitForSelector('.flex.items-center.px-3.py-2.bg-red-500.hover\\:bg-red-600.transition-all', { timeout: 10000 });
    await logoutButton?.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
    const confirmLogoutButton = await page.waitForSelector('#in-content > div > form > button', { timeout: 10000 });
    await confirmLogoutButton?.click();
    // await browser.close();
}
async function logIntoDiscord(page) {
    const discordLoginButton = await page.waitForSelector('#discord-login-button', { timeout: 10000, visible: true });
    await discordLoginButton?.click();
    console.log(1);
    await solveCaptcha(page, ".continue-button");
    console.log(2);
    // const selector = '.content__49fc1.oauth2ModalContent__647f0.thin_d125d2.scrollerBase_d125d2';
    const viewport = page.viewport();
    if (!viewport) {
        await page.setViewport({ width: 1280, height: 720 });
    }
    if (!viewport)
        return;
    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;
    // Move and click at the center
    await page.mouse.move(centerX, centerY);
    await page.mouse.click(centerX, centerY);
    const authButton = await page.waitForSelector('#app-mount > div.appAsidePanelWrapper_a3002d > div.notAppAsidePanel_a3002d > div.app_a3002d > div > div > div > div > div.flex__7c0ba.horizontalReverse__7c0ba.justifyStart_abf706.alignStretch_abf706.noWrap_abf706.footer__49fc1.footer__647f0.footerSeparator__49fc1 > div > div > div > button', {
        timeout: 10000
    });
    await authButton?.click();
    await new Promise(resolve => setTimeout(resolve, 1000));
}
async function solveCaptcha(page, voteButtonSelector) {
    const captchaRootContainer = await page.waitForSelector('s-captcha', { timeout: 10000 });
    const captchaExists = await captchaRootContainer?.evaluate((captchaContainer) => {
        const captcha = captchaContainer.shadowRoot?.querySelector('img');
        return captcha?.src;
    });
    if (!captchaExists) {
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
    }
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
    const voteButton = await page.waitForSelector(voteButtonSelector, { timeout: 10000 });
    const isDisabled = await page.$eval(voteButtonSelector, (el) => el.disabled);
    if (voteButtonSelector === ".continue-button") {
        if (!isDisabled) {
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
                voteButton?.click()
            ]);
        }
        else {
            solveCaptcha(page, voteButtonSelector);
        }
    }
    else {
        await voteButton?.click();
        await new Promise(resolve => setTimeout(resolve, 2000));
        let captchaStillExists;
        try {
            captchaStillExists = await page.$(voteButtonSelector);
        }
        catch { }
        if (captchaStillExists)
            await solveCaptcha(page, voteButtonSelector);
    }
}
