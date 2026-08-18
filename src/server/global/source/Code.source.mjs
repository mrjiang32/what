// CodeSource.mjs
import { FileSource } from "./File.source.mjs";
import { pathToFileURL } from "url";
import fs from "fs/promises";
import { Rule } from "./utilities/Rules/Rule.mjs";

/**
 * CodeSourceEntity
 * @typedef CodeSourceEntity
 * @property {URL} url file:// 协议模块URL
 */

/**
 * ESM导入缓存条目
 * @typedef ModuleCacheItem
 * @property {any} mod 导入得到的模块对象
 * @property {number} mtimeMs 文件上次导入时磁盘mtimeMs
 */

/**
 * @typedef CodeSourceConfig
 * @property {import("./utilities/Configs/ScanFileConfig.mjs").ScanFileConfig} scanConfig
 */

// 文件ID校验：禁止 ../ 逃逸、禁止绝对路径，只允许相对资源id
const FileIdSchema = Rule.string().regexp(/^(?!\.\.\/)(?!\/).+/);

/**
 * CodeSource：**仅ESM动态导入**
 * scanConfig/baseDir 已在上层完成校验，本类不再校验配置
 */
export class CodeSource extends FileSource {
  /** ESM模块导出缓存 */
  #moduleCache = new Map();

  /**
   * @param {CodeSourceConfig} config
   */
  constructor(config) {
    super(config);
  }

  /**
   * @override
   * @async
   * @protected
   * @param {string} id 文件相对路径ID
   * @returns {Promise<CodeSourceEntity>}
   */
  async _getOneFromSource(id) {
    const vRes = FileIdSchema.validate(id);
    if (!vRes.ok) {
      const err = new Error(`CodeSource 非法文件id: ${id}`);
      err.failures = vRes.failures;
      throw err;
    }
    const absPath = this._getAbsolutePath(id);
    const fileUrl = pathToFileURL(absPath);
    return { url: fileUrl, text: await super._getOneFromSource(id) };
  }

  /**
   * 模式A：ESM动态导入，检测mtime自动绕开缓存
   * @param {string} id 文件相对路径id
   * @returns {Promise<any>} 模块导出对象
   */
  async importModule(id) {
    const vRes = FileIdSchema.validate(id);
    if (!vRes.ok) {
      const err = new Error(`CodeSource.importModule 非法id: ${id}`);
      err.failures = vRes.failures;
      throw err;
    }

    if (!this.ready) throw new Error("CodeSource尚未就绪，请先执行getReady()");
    if (!this.has(id)) throw new Error(`id不存在: ${id}`);

    const absPath = this._getAbsolutePath(id);
    const stat = await fs.stat(absPath);
    const realMtimeMs = stat.mtimeMs;

    const cached = this.#moduleCache.get(id);
    if (cached && cached.mtimeMs === realMtimeMs) {
      return cached.mod;
    }

    const fileUrl = pathToFileURL(absPath);
    const bustUrl = new URL(fileUrl.href);
    bustUrl.searchParams.set("t", String(realMtimeMs));
    const mod = await import(bustUrl.href);

    this.#moduleCache.set(id, { mod, mtimeMs: realMtimeMs });
    return mod;
  }

  /**
   * 清除单个id ESM导入缓存
   * @param {string} id
   */
  invalidate(id) {
    this.#moduleCache.delete(id);
  }

  /**
   * 清空全部ESM导入缓存
   */
  invalidateAll() {
    this.#moduleCache.clear();
  }
}