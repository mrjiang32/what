// DirSource.mjs
import { BaseSource } from "./Base.source.mjs";
import { DirScanner } from "./utilities/DirScanner.mjs";
import path from "path";
import fs from "fs/promises";
import { Rule } from "./utilities/Rules/Rule.mjs";

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
    return path.join(this.#config.dirPath, suiteId);
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
    const rawText = await fs.readFile(settingsPath, "utf-8");
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
    await fs.writeFile(settingsPath, data.rawText, "utf-8");
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
    console.debug("[DirSource] 扫描器发现的suiteId列表:", suiteIds);
    const out = [];
  
    for (const suiteId of suiteIds) {
      console.debug("[DirSource] 正在处理套件:", suiteId);
      if (!SuiteIdSchema.test(suiteId)) {
        console.warn(`[DirSource] 跳过，suiteId不合法: ${suiteId}`);
        continue;
      }
      const suiteAbs = this.#suiteDir(suiteId);
      const settingsAbs = path.join(suiteAbs, "settings.json");
      const mainJsAbs = path.join(suiteAbs, "main.js");
  
      try {
        const stat = await fs.stat(settingsAbs);
        if (!stat.isFile()) {
          console.warn(`[DirSource] 不是有效文件: ${settingsAbs}`);
          continue;
        }
  
        const entity = await this.get(suiteId);
        const parsed = JSON.parse(entity.rawText);
        const schemaCheck = SuiteSettingsSchema.validate(parsed);
        if (!schemaCheck.ok) {
          console.warn(`[DirSource] 套件 ${suiteId} Schema校验失败`, schemaCheck.failures);
          continue;
        }
  
        let hasMainJs = false;
        try {
          await fs.stat(mainJsAbs);
          hasMainJs = true;
        } catch {
          hasMainJs = false;
        }
  
        out.push({
          suiteId,
          settingsAbs,
          mainJsAbs: hasMainJs ? mainJsAbs : undefined,
          hasMainJs
        });
        console.debug(`[DirSource] 有效套件已加入列表: ${suiteId}`);
      } catch (err) {
        console.warn(`[DirSource] 跳过套件 ${suiteId}，发生异常`, err.message);
        continue;
      }
    }
    console.debug("[DirSource] 最终有效套件数量:", out.length);
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