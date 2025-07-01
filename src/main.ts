import { findPuzzleCenter } from './captcha';
import puppeteer, {  ElementHandle, Page } from 'puppeteer'
import * as Config from '../json/config.json'
import { exec } from 'child_process'
import fs from 'fs'
import fetch from 'node-fetch'

export async function main() {
    const connectBrowser = async (browserWSEndpoint: string = Config.browserWSEndpoint) => {
        return await puppeteer.connect({
            browserWSEndpoint: browserWSEndpoint,
            defaultViewport: null,
        })
    }
    let browser;
    try {
        browser = await connectBrowser();
    } catch {
        // exec("\"C:\\Users\\andri\\AppData\\Local\\Programs\\Opera GX\\opera.exe\" --remote-debugging-port=9222");
        // exec("\"C:\\Users\\andri\\AppData\\Local\\Programs\\Opera\\opera.exe\" --remote-debugging-port=9222");
        exec("\"C:\\Users\\dell\\AppData\\Local\\Programs\\Opera\\opera.exe\" --remote-debugging-port=9222");
        await new Promise(resolve => setTimeout(resolve, 2000));
        const response = await fetch("http://127.0.0.1:9222/json/version");
        const data = await response.json() as { webSocketDebuggerUrl: string };

        const config = JSON.parse(fs.readFileSync("./json/config.json", "utf-8"));
        config.browserWSEndpoint = data.webSocketDebuggerUrl
        fs.writeFileSync("./json/config.json", JSON.stringify(config, null, 2), "utf-8");
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
    await likeButton?.click();

    const discordLoginButton = await page.waitForSelector('#discord-login-button', { timeout: 10000 })
    await discordLoginButton?.click();

    async function discordLoginCaptcha() {
        const captchaRootContainer = await page.waitForSelector('s-captcha', 
            { timeout: 10000 }
        );

        const captchaExists = await captchaRootContainer?.evaluate((captchaContainer) => {
            const captcha =  captchaContainer.shadowRoot?.querySelector('img');
            return captcha?.src
        });

        if (!captchaExists) {
            const checkbox = await captchaRootContainer?.evaluateHandle((captchaContainer):  Promise<Element>  => {
                return new Promise((resolve) => {
                    const checkExist = setInterval(() => {
                        const checkboxElement = captchaContainer.shadowRoot?.querySelector('.checkbox') as Element
                        if (checkboxElement) resolve(checkboxElement);
                    }, 500);
                    setTimeout(() => {
                        clearInterval(checkExist);
                        throw new Error("Timeout");
                    }, 10000);
                })
            });
            await checkbox?.click();
        }

        const captchaEncoded = await captchaRootContainer?.evaluate((captchaContainer): Promise<string | null> => {
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
        if (!captchaEncoded) throw Error();

        const captchaBase64Data = captchaEncoded.replace(/^data:image\/\w+;base64,/, '');
        const captchaBuffer = Buffer.from(captchaBase64Data, 'base64');

        const puzzleCenterCoordinates = await findPuzzleCenter(captchaBuffer);

        if (!puzzleCenterCoordinates) throw Error();

        const slider = await captchaRootContainer?.evaluateHandle(captchaContainer => captchaContainer.shadowRoot?.querySelector('.slider-handle') as Element);
        const sliderCenter = await slider?.evaluate(slider => {
            const sliderBoundaries = slider.getBoundingClientRect();
            return {
                x: sliderBoundaries.x + sliderBoundaries.width / 2,
                y: sliderBoundaries.y + sliderBoundaries.height / 2
            };
        });

        const captchaDivHandle = await captchaRootContainer?.evaluateHandle(captchaContainer => captchaContainer.shadowRoot?.querySelector('.layer.layer-1') as Element
        );

        const captchaBoundingBox = await captchaDivHandle?.evaluate(div => {
            const rect = div.getBoundingClientRect();
            return {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            };
        });
        if (!captchaBoundingBox) throw new Error();

        const puzzleScreenX = captchaBoundingBox.x + (puzzleCenterCoordinates.x / captchaBoundingBox.width) * captchaBoundingBox.width;
        const puzzleScreenY = captchaBoundingBox.y + (puzzleCenterCoordinates.y / captchaBoundingBox.height) * captchaBoundingBox.height;

        if (!sliderCenter) throw Error;
        await page.mouse.move(sliderCenter.x, sliderCenter.y);
        await page.mouse.down();

        await page.mouse.move(puzzleScreenX, puzzleScreenY, { steps: 10 });
        await new Promise(resolve => setTimeout(resolve, 100));
        await page.mouse.up();

        await new Promise(resolve => setTimeout(resolve, 1000));
        const voteButton = await page.waitForSelector(".continue-button", 
            { timeout: 10000 }
        );
        const isDisabled = await page.$eval(".continue-button", (el) => (el as HTMLButtonElement).disabled);

        if (!isDisabled) {
            await Promise.all([
                page.waitForNavigation({ waitUntil: 'networkidle2' }),
                voteButton?.click()
            ]);
        } else {
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
                        page.waitForNavigation({ timeout: 5000, waitUntil: 'load' }),
                        btn.click()
                    ]);
                    return;
                }
            }

            await page.mouse.move(centerX, centerY);
            await page.mouse.wheel({ deltaY: 100 });
            await new Promise(resolve => setTimeout(resolve, 250));
        }
    }
    await pressAuthButton();
    
    await Promise.all([
        page.waitForNavigation({ timeout: 5000, waitUntil: 'load' }),
        await page.goto(Config.serverToVoteFor)
    ]);

    const likeButton2 = await page.waitForSelector('.inline-block.bg-indigo-600.text-white.group-hover\\:bg-white.group-hover\\:text-gray-700.rounded-xl.px-4.py-2.bg-opacity-95', { timeout: 10000 });
    await likeButton2?.click();
    async function voteLoginCaptcha() {
        const captchaRootContainer = await page.waitForSelector('s-captcha', 
            { timeout: 10000 }
        );

        const captchaExists = await captchaRootContainer?.evaluate((captchaContainer) => {
            const captcha =  captchaContainer.shadowRoot?.querySelector('img');
            return captcha?.src
        });

        if (!captchaExists) {
            const checkbox = await captchaRootContainer?.evaluateHandle((captchaContainer):  Promise<Element>  => {
                return new Promise((resolve) => {
                    const checkExist = setInterval(() => {
                        const checkboxElement = captchaContainer.shadowRoot?.querySelector('.checkbox') as Element
                        if (checkboxElement) resolve(checkboxElement);
                    }, 500);
                    setTimeout(() => {
                        clearInterval(checkExist);
                        throw new Error("Timeout");
                    }, 10000);
                })
            });
            await checkbox?.click();
        }

        const captchaEncoded = await captchaRootContainer?.evaluate((captchaContainer): Promise<string | null> => {
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
        if (!captchaEncoded) throw Error();

        const captchaBase64Data = captchaEncoded.replace(/^data:image\/\w+;base64,/, '');
        const captchaBuffer = Buffer.from(captchaBase64Data, 'base64');

        const puzzleCenterCoordinates = await findPuzzleCenter(captchaBuffer);

        if (!puzzleCenterCoordinates) throw Error();

        const slider = await captchaRootContainer?.evaluateHandle(captchaContainer => captchaContainer.shadowRoot?.querySelector('.slider-handle') as Element);
        const sliderCenter = await slider?.evaluate(slider => {
            const sliderBoundaries = slider.getBoundingClientRect();
            return {
                x: sliderBoundaries.x + sliderBoundaries.width / 2,
                y: sliderBoundaries.y + sliderBoundaries.height / 2
            };
        });

        const captchaDivHandle = await captchaRootContainer?.evaluateHandle(captchaContainer => captchaContainer.shadowRoot?.querySelector('.layer.layer-1') as Element
        );

        const captchaBoundingBox = await captchaDivHandle?.evaluate(div => {
            const rect = div.getBoundingClientRect();
            return {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
            };
        });
        if (!captchaBoundingBox) throw new Error();

        const puzzleScreenX = captchaBoundingBox.x + (puzzleCenterCoordinates.x / captchaBoundingBox.width) * captchaBoundingBox.width;
        const puzzleScreenY = captchaBoundingBox.y + (puzzleCenterCoordinates.y / captchaBoundingBox.height) * captchaBoundingBox.height;

        if (!sliderCenter) throw Error;
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.mouse.move(sliderCenter.x, sliderCenter.y);
        await page.mouse.down();

        await page.mouse.move(puzzleScreenX, puzzleScreenY, { steps: 10 });
        await new Promise(resolve => setTimeout(resolve, 100));
        await page.mouse.up();

        await new Promise(resolve => setTimeout(resolve, 1000));
        const voteButton = await page.waitForSelector("#vote-form > button", 
            { timeout: 10000 }
        );
        await voteButton?.click()
        await new Promise(resolve => setTimeout(resolve, 200));
        
        let voteButtonExists;
        try {
            voteButtonExists = await page.$("#vote-form > button");
        } catch { 
            return;
        }

        if (voteButtonExists) await voteLoginCaptcha();
    }
    await voteLoginCaptcha();

    await Promise.all([
        page.waitForNavigation({ timeout: 5000, waitUntil: 'load' }),
        await page.goto("https://discadia.com/accounts/logout/")
    ]);

    const confirmLogoutButton = await page.waitForSelector('#in-content > div > form > button', 
        { timeout: 10000 }
    )
    await confirmLogoutButton?.click()
}
