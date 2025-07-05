"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
exports.logWhipeout = logWhipeout;
const promises_1 = require("fs/promises");
async function log(text) {
    await (0, promises_1.appendFile)(`${process.cwd()}/logs.txt`, `${text}\n`, { encoding: 'utf-8' });
}
async function logWhipeout() {
    await (0, promises_1.writeFile)(`${process.cwd()}/logs.txt`, '', { encoding: 'utf-8' });
}
