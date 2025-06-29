"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safely = safely;
function safely(fn) {
    try {
        const result = fn();
        return result instanceof Promise
            ? result.then(res => res).catch(() => null)
            : result;
    }
    catch {
        return null;
    }
}
