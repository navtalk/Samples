// utils/assert.js

const PREFIX = '[NavTalk]';

export function assert(condition, message) {
    if (!condition) {
        throw new Error(`${PREFIX} ${message || 'Assertion failed'}`);
    }
}

// 快捷方法：断言非空
export function assertExists(value, message) {
    assert(value != null, `${message}`);
}

// 快捷方法：断言字符串非空
export function assertNonEmptyStr(str, message) {
    assert(
        typeof str === 'string' && str.trim() !== '',
        `${message}`
    );
}

// 快捷方法：断言是函数
export function assertFunction(fn, message) {
    assert(typeof fn === 'function', `${message}`);
}