import runTrusted from "./ways/trusted.js";
import runUntrusted from "./ways/untrusted.js";
import main from "../../../global/main.js";
import { DirSource } from "../../../global/source/Dir.source.mjs";

/**
 * @type {DirSource}
 */
const dirSource = main.sources["/custom/func"].source;

export async function runSuiteModule(suiteName, params) {
    dirSource._assertReady();
    if (!dirSource.has(suiteName)) {
        throw new Error(`套件[${suiteName}]不存在`);
    }

    const suiteAbs = dirSource._getSuiteAbsolutePath(suiteName);
    const mainJsPath = path.join(suiteAbs, "main.js");

    const settings = await dirSource.getSuiteSettings(suiteName);
    const timeoutMs = settings.timeout ?? 3000;

    let mainCode;
    try {
        mainCode = await fs.readFile(mainJsPath, "utf-8");
    } catch (e) {
        throw new Error(`套件[${suiteName}]缺少main.js: ${e.message}`);
    }

    // 根据 trusted 标志选择执行策略
    if (settings.trusted) {
        return runTrusted(mainJsPath, params, timeoutMs);
    } else {
        return runUntrusted(mainCode, params, timeoutMs, settings.perms || {});
    }
}