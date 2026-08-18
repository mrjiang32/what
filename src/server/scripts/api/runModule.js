// runModule.js
import fs from "fs/promises";
import path from "path";
import vm from "vm";

/**
 * @typedef SuiteSettings
 * @property {string[]} [imports]
 * @property {"allSettled"|"race"|"all"} [mode]
 * @property {number} [timeout]
 */

/**
 * 运行套件 main.js
 * @param {import("../../global/source/Dir.source.mjs").DirSource} dirSource
 * @param {string} suiteName
 * @param {Record<string,any>} params
 * @returns {Promise<any>}
 */
export async function runSuiteModule(dirSource, suiteName, params) {
    // 1. 校验数据源就绪
    dirSource._assertReady();
    if (!dirSource.has(suiteName)) {
        throw new Error(`套件[${suiteName}]不存在`);
    }

    // 2. 获取套件目录 & 路径
    const suiteAbs = dirSource._getSuiteAbsolutePath(suiteName);
    const mainJsPath = path.join(suiteAbs, "main.js");

    // 3. 读取配置
    /** @type {SuiteSettings} */
    const settings = await dirSource.getSuiteSettings(suiteName);

    // 4. 检查main.js是否存在
    let mainCode;
    try {
        mainCode = await fs.readFile(mainJsPath, "utf‑8");
    } catch (e) {
        throw new Error(`套件[${suiteName}]缺少main.js: ${e.message}`);
    }

    // 超时兜底，默认3000ms
    const timeoutMs = settings.timeout ?? 3000;

    // 构造沙箱上下文
    const ctx = vm.createContext({
        params,
        console,
        setTimeout,
        clearTimeout,
        Buffer,
    });

    // 包装成async函数
    const wrapped = `(async function main(){${mainCode}\n})()`;

    const promise = vm.runInContext(wrapped, ctx, {
        filename: mainJsPath,
        timeout: timeoutMs,
        displayErrors: true
    });

    let result;
    try {
        result = await promise;
    } catch (err) {
        if (err.code === "ERR_SCRIPT_EXECUTION_TIMEOUT") {
            throw new Error(`套件执行超时(${timeoutMs}ms)`);
        }
        throw err;
    }

    return result;
}