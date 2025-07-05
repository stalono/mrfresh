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
const puppeteer_1 = __importStar(require("puppeteer"));
const Config = __importStar(require("../json/config.json"));
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const log_1 = require("./utils/log");
const util_1 = require("util");
process.on('uncaughtException', (err) => {
    (0, log_1.log)(`❌ Uncaught Exception: ${err.message}`);
    return;
});
process.on('unhandledRejection', (reason, promise) => {
    (0, log_1.log)(`❌ Unhandled Rejection at: ${promise}, reason: ${reason}`);
    return;
});
async function main() {
    await (0, log_1.logWhipeout)();
    const connectBrowser = async (browserWSEndpoint = Config.browserWSEndpoint) => {
        return await puppeteer_1.default.connect({
            browserWSEndpoint: browserWSEndpoint,
            defaultViewport: null,
        });
    };
    await (0, log_1.log)("🔄Connecting to a browser...");
    let browser;
    try {
        browser = await connectBrowser();
        await (0, log_1.log)("✅Connected to an existing browser instance.\n");
    }
    catch {
        await (0, log_1.log)("🔄No running browser found. Running a new browser instance...");
        const execAsync = (0, util_1.promisify)(child_process_1.exec);
        // execAsync("\"C:\\Users\\andri\\AppData\\Local\\Programs\\Opera GX\\opera.exe\" --remote-debugging-port=9222");
        // execAsync("\"C:\\Users\\andri\\AppData\\Local\\Programs\\Opera\\opera.exe\" --remote-debugging-port=9222");
        execAsync("\"C:\\Users\\dell\\AppData\\Local\\Programs\\Opera\\opera.exe\" --remote-debugging-port=9222");
        await new Promise(resolve => setTimeout(resolve, 2000));
        await (0, log_1.log)("🔄Connecting to the browser...");
        const response = await (0, node_fetch_1.default)("http://127.0.0.1:9222/json/version");
        const data = await response.json();
        const config = JSON.parse(fs_1.default.readFileSync("./json/config.json", "utf-8"));
        config.browserWSEndpoint = data.webSocketDebuggerUrl;
        fs_1.default.writeFileSync("./json/config.json", JSON.stringify(config, null, 2), "utf-8");
        browser = await connectBrowser(data.webSocketDebuggerUrl);
        await (0, log_1.log)("✅Browser has been connected successfully.\n");
    }
    const pages = await browser.pages();
    let page = pages[0];
    if (!page) {
        await (0, log_1.log)(`🔄Creating a new page...`);
        page = await browser.newPage();
    }
    await page.bringToFront();
    await (0, log_1.log)(`🔄Connecting to discadia...`);
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    await page.goto(Config.serverToVoteFor);
    await (0, log_1.log)(`✅Successfully connected to ${Config.serverToVoteFor}.\n`);
    const originalWait = page.waitForSelector.bind(page);
    page.waitForSelector = async (...args) => {
        try {
            return await originalWait(...args);
        }
        catch (err) {
            if (err instanceof puppeteer_1.TimeoutError) {
                await (0, log_1.log)(`❌ Couldn't find the element. (${args[0]})`);
            }
            throw Error;
        }
    };
    await (0, log_1.log)(`🔄Clicking the like button...`);
    const likeButton = await page.waitForSelector('.inline-block.bg-indigo-600.text-white.group-hover\\:bg-white.group-hover\\:text-gray-700.rounded-xl.px-4.py-2.bg-opacity-95', { timeout: 10000 });
    await likeButton?.click();
    await (0, log_1.log)(`🔄Clicking the discord login button...`);
    const discordLoginButton = await page.waitForSelector('#discord-login-button', { timeout: 10000 });
    await discordLoginButton?.click();
    await (0, log_1.log)(`✅Successfully reached discord login captcha.\n`);
    async function discordLoginCaptcha() {
        await (0, log_1.log)(`🔄Searching for the captcha placeholder...`);
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
            await (0, log_1.log)(`🔄Ticking the checkbox...`);
            await checkbox?.click();
        }
        await (0, log_1.log)(`🔄Extracting the captcha...`);
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
        await (0, log_1.log)(`🔄Searching for puzzle center...`);
        const puzzleCenterCoordinates = await (0, captcha_1.findPuzzleCenter)(captchaBuffer);
        if (!puzzleCenterCoordinates)
            throw Error();
        await (0, log_1.log)(`🔄Dragging a slider...`);
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
        const voteButton = await page.waitForSelector(".continue-button", { timeout: 10000 });
        const isDisabled = await page.$eval(".continue-button", (el) => el.disabled);
        if (!isDisabled) {
            await (0, log_1.log)(`✅Discord login captcha has been solved.\n`);
            await (0, log_1.log)(`🔄Navigating to discord.com...`);
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2' }),
                voteButton?.click()
            ]);
        }
        else {
            await (0, log_1.log)(`❗Discord login captcha hasn't been solved. Repeating.\n`);
            await discordLoginCaptcha();
        }
    }
    await discordLoginCaptcha();
    const viewport = page.viewport() ?? { width: 1920, height: 1080 };
    const centerX = Math.floor(viewport.width / 2);
    const centerY = Math.floor(viewport.height / 2);
    async function pressAuthButton() {
        for (let attempt = 0; attempt < 50; attempt++) {
            const buttonHandle = await page.$$('button');
            for (const btn of buttonHandle) {
                const text = await btn.evaluate(node => node.textContent?.trim().toLowerCase());
                if (text === 'authorize') {
                    await Promise.all([
                        page.waitForNavigation({ timeout: 60000, waitUntil: 'load' }),
                        btn.click()
                    ]);
                    return;
                }
            }
            await page.mouse.move(centerX, centerY);
            await page.mouse.wheel({ deltaY: 100 });
            await new Promise(resolve => setTimeout(resolve, 250));
        }
        await (0, log_1.log)(`🔄Clicking the auth button...`);
        await (0, log_1.log)(`🔄Returning back to discadia...`);
    }
    await pressAuthButton();
    await (0, log_1.log)(`✅Successfully logged into discord.\n`);
    await (0, log_1.log)(`🔄Navigating back to ${Config.serverToVoteFor}...`);
    await Promise.all([
        page.waitForNavigation({ timeout: 60000, waitUntil: 'load' }),
        await page.goto(Config.serverToVoteFor)
    ]);
    await (0, log_1.log)(`🔄Clicking the like button...`);
    const likeButton2 = await page.waitForSelector('.inline-block.bg-indigo-600.text-white.group-hover\\:bg-white.group-hover\\:text-gray-700.rounded-xl.px-4.py-2.bg-opacity-95', { timeout: 10000 });
    await likeButton2?.click();
    await (0, log_1.log)(`✅Successfully reached the voting captcha...`);
    async function voteLoginCaptcha() {
        await (0, log_1.log)(`🔄Searching for the captcha placeholder...`);
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
            await (0, log_1.log)(`🔄Ticking the checkbox...`);
            await checkbox?.click();
        }
        await (0, log_1.log)(`🔄Extracting the captcha...`);
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
        await (0, log_1.log)(`🔄Searching for puzzle center...`);
        const puzzleCenterCoordinates = await (0, captcha_1.findPuzzleCenter)(captchaBuffer);
        if (!puzzleCenterCoordinates)
            throw Error();
        await (0, log_1.log)(`🔄Dragging a slider...`);
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
        await new Promise(resolve => setTimeout(resolve, 100));
        await page.mouse.move(sliderCenter.x, sliderCenter.y);
        await page.mouse.down();
        await page.mouse.move(puzzleScreenX, puzzleScreenY, { steps: 10 });
        await new Promise(resolve => setTimeout(resolve, 200));
        await page.mouse.up();
        await new Promise(resolve => setTimeout(resolve, 1000));
        const captchaSolved = await page.$eval('s-captcha', el => el.hasAttribute('success'));
        if (captchaSolved) {
            await (0, log_1.log)(`✅Voting login captcha has been solved.\n`);
            await (0, log_1.log)(`🔄Clicking the vote button...`);
            const voteButton = await page.waitForSelector('.group.p-4.mt-4.rounded-xl.bg-indigo-500.hover\\:bg-white.font-medium.flex-grow.transform.active\\:scale-95', { timeout: 10000 });
            await voteButton?.click();
        }
        else {
            await (0, log_1.log)(`❗Voting login captcha has not been solved... Repeating.\n`);
            await voteLoginCaptcha();
        }
    }
    await voteLoginCaptcha();
    await (0, log_1.log)(`🔄Navigating to the logout page...`);
    await Promise.all([
        page.waitForNavigation({ timeout: 60000, waitUntil: 'load' }),
        await page.goto("https://discadia.com/accounts/logout/")
    ]);
    await (0, log_1.log)(`🔄Confirming the logout...`);
    const confirmLogoutButton = await page.waitForSelector('#in-content > div > form > button', { timeout: 10000 });
    await confirmLogoutButton?.click();
    await (0, log_1.log)(`✅Successfully logged out. End of the script.\n`);
}
