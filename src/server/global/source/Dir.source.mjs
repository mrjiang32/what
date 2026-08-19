// DirSource.mjs
import { BaseSource } from "./Base.source.mjs";
import { DirScanner } from "./utilities/DirScanner.mjs";
import path from "path";
import fs from "fs/promises";
import { Rule } from "./utilities/Rules/Rule.mjs";

/**
 * @typedef DirSourceConfig
 * @property {DirScanConfig} scanConfig
 * @property {import("../utils/Logger.mjs").Logger} [logger]
 */

// ID校验，与FileSource/CodeSource统一，防御路径逃逸
const SuiteIdSchema = Rule.string().regexp(/^(?!\.\.\/)(?!\/).+/);

// settings.json schema
const SuiteSettingsSchema = Rule.object({
  imports: Rule.array("string").optional(),
  mode: Rule.or([Rule.type("string").enum(["allSettled", "race", "all"])]).optional(),
  timeout: Rule.number().min(1).optional(),
  trusted: Rule.boolean().optional(),
  mainHash: Rule.string().optional(),
  moduleHash: Rule.object({}).optional()
});

/**
 * @typedef SuiteMeta
 * @property {string} suiteId
 * @property {string} settingsAbs
 * @property {string} [mainJsAbs]
 * @property {boolean} hasMainJs
 */

export class DirSource extends BaseSource {
  /** @type {DirSourceConfig} */
  #config;
  /** @type {DirScanner} */
  #scanner;

  constructor(config) {
    super(config);
    this.#config = config;
    this.#scanner = new DirScanner(config);
  }

  /**
   * suiteId → 套件目录绝对路径
   * @param {string} suiteId
   * @returns {string}
   */
  #suiteDir(suiteId) {
    const res = SuiteIdSchema.validate(suiteId);
    if (!res.ok) {
      const err = new Error(`DirSource 非法suiteId: ${suiteId}`);
      err.failures = res.failures;
      throw err;
    }
    return path.join(this.#config.scanConfig.dirPath, suiteId);
  }

  /**
   * @override BaseSource
   * @protected
   */
  async _updateFromSource() {
    return await this.#scanner.scan();
  }

  /**
   * @override BaseSource
   * 懒加载读取套件下 settings.json
   * @protected
   * @param {string} id suiteId
   * @returns {Promise<{rawText:string}>}
   */
  async _getOneFromSource(id) {
    const settingsPath = path.join(this.#suiteDir(id), "settings.json");
    const rawText = await fs.readFile(settingsPath, "utf‑8");
    return { rawText };
  }

  /**
   * @override BaseSource
   * @protected
   * @param {string} id
   * @param {{rawText:string}} data
   */
  async _updateToSource(id, data) {
    const dir = this.#suiteDir(id);
    await fs.mkdir(dir, { recursive: true });
    const settingsPath = path.join(dir, "settings.json");
    await fs.writeFile(settingsPath, data.rawText, "utf‑8");
  }

  /**
   * @override BaseSource
   * @protected
   */
  async _deleteFromSource(id) {
    const dir = this.#suiteDir(id);
    await fs.rm(dir, { recursive: true, force: true });
  }

  /**
   * 获取全部合法套件，坏套件静默过滤
   * @returns {Promise<SuiteMeta[]>}
   */
  async listValidSuites() {
    this._assertReady();
    const suiteIds = await this.toIdArray();
    const out = [];

    for (const suiteId of suiteIds) {
      if (!SuiteIdSchema.test(suiteId)) continue;
      const suiteAbs = this.#suiteDir(suiteId);
      const settingsAbs = path.join(suiteAbs, "settings.json");
      const mainJsAbs = path.join(suiteAbs, "main.js");

      try {
        const stat = await fs.stat(settingsAbs);
        if (!stat.isFile()) continue;

        const entity = await this.get(suiteId);
        const parsed = JSON.parse(entity.rawText);
        const schemaCheck = SuiteSettingsSchema.validate(parsed);
        if (!schemaCheck.ok) continue;

        let hasMainJs = false;
        try {
          await fs.stat(mainJsAbs);
          hasMainJs = true;
        } catch { /* no‑op */ }

        out.push({
          suiteId,
          settingsAbs,
          mainJsAbs: hasMainJs ? mainJsAbs : undefined,
          hasMainJs
        });
      } catch {
        // stat / read / parse 异常直接丢弃该套件
        continue;
      }
    }
    return out;
  }

  /**
   * 获取单个套件配置，校验失败抛出异常
   * @param {string} suiteId
   * @returns {Promise<object>}
   */
  async getSuiteSettings(suiteId) {
    this._assertReady();
    if (!this.has(suiteId)) throw new Error(`套件 ${suiteId} 不存在`);

    const entity = await this.get(suiteId);
    let parsed;
    try {
      parsed = JSON.parse(entity.rawText);
    } catch (e) {
      throw new Error(`套件 ${suiteId} settings.json JSON解析失败`, { cause: e });
    }

    const check = SuiteSettingsSchema.validate(parsed);
    if (!check.ok) {
      const err = new Error(`套件 ${suiteId} settings.json schema校验失败`);
      err.failures = check.failures;
      throw err;
    }
    return parsed;
  }

  _getSuiteAbsolutePath(id) {
    return path.join(this._source.dirPath, id);
  }

  async reloadAndList() {
    await this.reload();
    return this.listValidSuites();
  }
}