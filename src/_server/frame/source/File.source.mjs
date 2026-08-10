// sources/file.source.mjs
import path from "node:path";
import fs from "node:fs/promises";
import { BaseSource } from "./Base.source.mjs";
import { Scanner } from "./File.source.d/File.scanner.mjs";
import { ScanFileRule } from "./definations/ScanRules/ScanFileRule.mjs";

/**
 * 文件数据源实现
 * 基于Scanner扫描目录；ID为文件相对路径；底层只读写原始文本，解析交给上层业务
 *
 * 数据实体契约：{ text: string }
 * - get(id) 返回 { text: string }
 * - add(id, {text: string}) 写入磁盘文件
 */
export class FileSource extends BaseSource {
  /**
   * @typedef {Object} FileSourceConfig
   * @property {ScanFileRule} rule
   */

  /**
   * @param {FileSourceConfig} from
   */
  constructor(from) {
    super(from);
    if (!(from.rule instanceof ScanFileRule)) {
      throw new Error("FileSource from.rule 必须为 ScanFileRule 实例");
    }
    /**
     * @type {Scanner}
     * @protected
     */
    this._scanner = new Scanner(from.rule);
  }

  /**
   * 获取文件绝对磁盘路径
   * @protected
   * @param {string} relPath 文件相对路径(id)
   * @returns {string}
   */
  _getAbsolutePath(relPath) {
    const rootDir = this._source.rule.getDirPath();
    return path.resolve(rootDir, relPath);
  }

  /**
   * @override
   * @async
   * @protected
   * @returns {Promise<Array<string>>} 返回全部文件相对路径作为id列表
   */
  async _updateFromSource() {
    const idList = await this._scanner.scan();
    return idList;
  }

  /**
   * @override
   * @async
   * @protected
   * @param {string} id 文件相对路径
   * @returns {Promise<{text:string}>} 返回原始文本对象，上层自行解析
   */
  async _getOneFromSource(id) {
    const absPath = this._getAbsolutePath(id);
    const buf = await fs.readFile(absPath, "utf-8");
    // 只输出原始文本，不做JSON.parse等业务解析，留给下一层处理
    return { text: buf };
  }

  /**
   * @override
   * @async
   * @protected
   * @param {string} id 文件相对路径
   * @param {{text:string}} data
   * @returns {Promise<void>}
   */
  async _updateToSource(id, data) {
    const absPath = this._getAbsolutePath(id);
    // 自动确保父目录存在
    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, data.text, "utf-8");
  }

  /**
   * @override
   * @async
   * @protected
   * @param {string} id 文件相对路径
   * @returns {Promise<void>}
   */
  async _deleteFromSource(id) {
    const absPath = this._getAbsolutePath(id);
    await fs.unlink(absPath);
  }
}