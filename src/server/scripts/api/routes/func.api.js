// func.api.mjs
import { parse } from "acorn";
import { DirSource } from "../../../global/source/Dir.source.mjs";
import sources from "../../../global/config/source.category.js";
import { runSuiteModule } from "../runModule.js";
import path from "path";
import fs from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** @type {DirSource} */
const dirSource = sources["/custom/func"].source;

const isValidSuiteName = (name) => /^[a-zA-Z0-9_-]+$/.test(name);
// npm包名校验：简单防护，禁止shell特殊字符
const safePkgNameRegex = /^[a-zA-Z0-9@\/._-]+$/;

/**
 * 写入套件内普通文件（仅main.js），带JS语法校验
 * @param {{suiteName:string, fileName:string, raw:string, res:any}} opts
 */
const writeSuiteInnerFile = async ({ suiteName, fileName, raw, res }) => {
    if (fileName !== "main.js") {
        return res.status(400).json({ ok: false, error: "仅允许操作 main.js" });
    }
    if (fileName.endsWith(".js")) {
        try {
            parse(raw, { ecmaVersion: "latest", sourceType: "module" });
        } catch (err) {
            return res.status(400).json({ ok: false, error: "代码语法错误:" + err.message });
        }
    }
    try {
        const suiteDir = dirSource._getSuiteAbsolutePath(suiteName);
        const fullPath = path.join(suiteDir, fileName);
        await fs.mkdir(suiteDir, { recursive: true });
        await fs.writeFile(fullPath, raw, "utf‑8");
        return res.status(200).json({ ok: true });
    } catch (err) {
        return res.status(500).json({ ok: false, error: err.message });
    }
};

/**
 * 读取套件main.js，不存在返回null
 * @param {string} suiteName
 * @returns {Promise<string|null>}
 */
const readSuiteMainJs = async (suiteName) => {
    try {
        const suiteDir = dirSource._getSuiteAbsolutePath(suiteName);
        const mainPath = path.join(suiteDir, "main.js");
        return await fs.readFile(mainPath, "utf‑8");
    } catch {
        return null;
    }
};

/**
 * 在套件目录执行 npm install，使用execFile防止shell注入
 * @param {string} suiteDir
 * @param {string[]} pkgs
 */
async function npmInstall(suiteDir, pkgs) {
    for (const pkg of pkgs) {
        if (!safePkgNameRegex.test(pkg)) {
            throw new Error(`非法包名:${pkg}`);
        }
    }
    await execFileAsync("npm", ["install", ...pkgs], { cwd: suiteDir });
}

/**
 * 在套件目录执行 npm uninstall
 * @param {string} suiteDir
 * @param {string[]} pkgs
 */
async function npmUninstall(suiteDir, pkgs) {
    for (const pkg of pkgs) {
        if (!safePkgNameRegex.test(pkg)) {
            throw new Error(`非法包名:${pkg}`);
        }
    }
    await execFileAsync("npm", ["uninstall", ...pkgs], { cwd: suiteDir });
}

/**
 * npm list --json
 * @param {string} suiteDir
 */
async function npmList(suiteDir) {
    const { stdout } = await execFileAsync("npm", ["list", "--json"], { cwd: suiteDir });
    return JSON.parse(stdout);
}

/**
 * @typedef CreateSuiteRoutesOptions
 * @property {string} apiPrefix
 * @property {DirSource} source
 */

export async function createModuleRoutes({ apiPrefix, source }) {
    const suiteRegex = new RegExp(`^${apiPrefix}/([a-zA-Z0-9_-]+)$`);
    const execRegex = new RegExp(`^${apiPrefix}/([a-zA-Z0-9_-]+)/exec$`);
    const npmInstallRegex = new RegExp(`^${apiPrefix}/([a-zA-Z0-9_-]+)/npm/install$`);
    const npmUninstallRegex = new RegExp(`^${apiPrefix}/([a-zA-Z0-9_-]+)/npm/uninstall$`);
    const npmListRegex = new RegExp(`^${apiPrefix}/([a-zA-Z0-9_-]+)/npm/list$`);

    return [
        // GET /api/func 获取全部合法套件列表
        {
            path: apiPrefix,
            method: "GET",
            handler: async (_req, res) => {
                try {
                    const suitesMeta = await source.listValidSuites();
                    const suites = suitesMeta.map(s => s.suiteId);
                    res.status(200).json({ ok: true, suites });
                } catch (err) {
                    res.status(500).json({ ok: false, error: err.message });
                }
            }
        },
        // GET /api/func/.reload 重新扫描磁盘套件目录
        {
            path: `${apiPrefix}/.reload`,
            method: "GET",
            handler: async (_req, res) => {
                try {
                    await source.reload();
                    const suitesMeta = await source.listValidSuites();
                    const suites = suitesMeta.map(s => s.suiteId);
                    res.status(200).json({ ok: true, suites });
                } catch (err) {
                    res.status(500).json({ ok: false, error: err.message });
                }
            }
        },
        // GET /api/func/:suiteName 获取套件详情
        {
            path: suiteRegex,
            method: "GET",
            handler: async (req, res) => {
                const suiteName = req.params[0];
                if (!isValidSuiteName(suiteName)) {
                    return res.status(400).json({ ok: false, error: "套件名称非法" });
                }
                if (!source.has(suiteName)) {
                    return res.status(404).json({ ok: false, error: "套件不存在" });
                }
                try {
                    const settings = await source.getSuiteSettings(suiteName);
                    const mainText = await readSuiteMainJs(suiteName);
                    res.status(200).json({
                        ok: true,
                        suiteName,
                        hasMainJs: mainText !== null,
                        settings
                    });
                } catch (err) {
                    res.status(500).json({ ok: false, error: err.message });
                }
            }
        },
        // POST /api/func 创建套件
        {
            path: apiPrefix,
            method: "POST",
            handler: async (req, res) => {
                const { suiteName, settingsRaw, mainJsRaw } = req.body;
                if (!suiteName || !isValidSuiteName(suiteName)) {
                    return res.status(400).json({ ok: false, error: "suiteName非法" });
                }
                if (source.has(suiteName)) {
                    return res.status(400).json({ ok: false, error: "套件已存在，请PUT更新" });
                }
                try {
                    await source.add(suiteName, { rawText: settingsRaw });
                    if (mainJsRaw !== undefined) {
                        return await writeSuiteInnerFile({ suiteName, fileName: "main.js", raw: mainJsRaw, res });
                    }
                    return res.status(200).json({ ok: true });
                } catch (err) {
                    return res.status(500).json({ ok: false, error: err.message });
                }
            }
        },
        // PUT /api/func/:suiteName 更新套件 settings.json / main.js
        {
            path: suiteRegex,
            method: "PUT",
            handler: async (req, res) => {
                const suiteName = req.params[0];
                const { fileName, raw } = req.body;
                if (!isValidSuiteName(suiteName)) {
                    return res.status(400).json({ ok: false, error: "套件名称非法" });
                }
                if (!source.has(suiteName)) {
                    return res.status(404).json({ ok: false, error: "套件不存在" });
                }
                try {
                    if (fileName === "settings.json") {
                        await source.add(suiteName, { rawText: raw });
                        return res.status(200).json({ ok: true });
                    } else if (fileName === "main.js") {
                        return await writeSuiteInnerFile({ suiteName, fileName: "main.js", raw, res });
                    } else {
                        return res.status(400).json({ ok: false, error: "仅允许更新 settings.json / main.js" });
                    }
                } catch (err) {
                    return res.status(500).json({ ok: false, error: err.message });
                }
            }
        },
        // POST /api/func/:suiteName/exec 执行套件
        {
            path: execRegex,
            method: "POST",
            handler: async (req, res) => {
                const suiteName = req.params[0];
                if (!isValidSuiteName(suiteName)) {
                    return res.status(400).json({ ok: false, error: "套件名称非法" });
                }
                try {
                    const execResult = await runSuiteModule(source, suiteName, req.body.params ?? {});
                    res.status(200).json({ ok: true, execResult });
                } catch (err) {
                    res.status(400).json({
                        ok: false,
                        error: err.message,
                        stack: err.stack
                    });
                }
            }
        },
        // DELETE /api/func/:suiteName 删除整个套件目录
        {
            path: suiteRegex,
            method: "DELETE",
            handler: async (req, res) => {
                const suiteName = req.params[0];
                if (!isValidSuiteName(suiteName)) {
                    return res.status(400).json({ ok: false, error: "套件名称非法" });
                }
                try {
                    await source.del(suiteName);
                    res.status(200).json({ ok: true });
                } catch (err) {
                    res.status(500).json({ ok: false, error: err.message });
                }
            }
        },

        // ========== NPM 新增接口 ==========
        // POST /api/func/:suiteName/npm/install   body { pkgs:["lodash","moment"] }
        {
            path: npmInstallRegex,
            method: "POST",
            handler: async (req, res) => {
                const suiteName = req.params[0];
                const { pkgs } = req.body;
                if (!isValidSuiteName(suiteName)) return res.status(400).json({ ok: false, error: "套件名称非法" });
                if (!source.has(suiteName)) return res.status(404).json({ ok: false, error: "套件不存在" });
                if (!Array.isArray(pkgs) || pkgs.length === 0) {
                    return res.status(400).json({ ok: false, error: "pkgs 需要非空数组" });
                }
                try {
                    const suiteDir = source._getSuiteAbsolutePath(suiteName);
                    await npmInstall(suiteDir, pkgs);
                    res.status(200).json({ ok: true });
                } catch (err) {
                    res.status(500).json({ ok: false, error: err.message });
                }
            }
        },
        // POST /api/func/:suiteName/npm/uninstall
        {
            path: npmUninstallRegex,
            method: "POST",
            handler: async (req, res) => {
                const suiteName = req.params[0];
                const { pkgs } = req.body;
                if (!isValidSuiteName(suiteName)) return res.status(400).json({ ok: false, error: "套件名称非法" });
                if (!source.has(suiteName)) return res.status(404).json({ ok: false, error: "套件不存在" });
                if (!Array.isArray(pkgs) || pkgs.length === 0) {
                    return res.status(400).json({ ok: false, error: "pkgs 需要非空数组" });
                }
                try {
                    const suiteDir = source._getSuiteAbsolutePath(suiteName);
                    await npmUninstall(suiteDir, pkgs);
                    res.status(200).json({ ok: true });
                } catch (err) {
                    res.status(500).json({ ok: false, error: err.message });
                }
            }
        },
        // GET /api/func/:suiteName/npm/list
        {
            path: npmListRegex,
            method: "GET",
            handler: async (req, res) => {
                const suiteName = req.params[0];
                if (!isValidSuiteName(suiteName)) return res.status(400).json({ ok: false, error: "套件名称非法" });
                if (!source.has(suiteName)) return res.status(404).json({ ok: false, error: "套件不存在" });
                try {
                    const suiteDir = source._getSuiteAbsolutePath(suiteName);
                    const deps = await npmList(suiteDir);
                    res.status(200).json({ ok: true, data: deps });
                } catch (err) {
                    res.status(500).json({ ok: false, error: err.message });
                }
            }
        }
    ];
}

export default async () => {
    return createModuleRoutes({
        apiPrefix: "/api/func",
        source: dirSource
    });
};