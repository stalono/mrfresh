"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPuzzleCenter = findPuzzleCenter;
const jimp_1 = require("jimp");
async function findPuzzleCenter(captcahBuffer) {
    const fullCaptcha = await jimp_1.Jimp.read(captcahBuffer);
    const { width, height } = fullCaptcha.bitmap;
    const halfWidth = Math.floor(width / 2);
    const image = fullCaptcha.clone().crop({ x: halfWidth, y: 0, w: width - halfWidth, h: height });
    let totalX = 0, totalY = 0, pixelCount = 0;
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const color = (0, jimp_1.intToRGBA)(image.getPixelColor(x, y));
            if (color.r < 50 && color.g < 50 && color.b < 50) {
                totalX += x;
                totalY += y;
                pixelCount++;
            }
        }
    }
    if (pixelCount === 0) {
        throw Error();
    }
    const centerX = Math.round(totalX / pixelCount);
    const centerY = Math.round(totalY / pixelCount);
    return { x: centerX, y: centerY };
}
