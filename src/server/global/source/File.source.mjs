// sources/file.source.mjs
import path from "node:path";
import fs from "node:fs/promises";
import { BaseSource } from "./Base.source.mjs";
import { FileScanner } from "./utilities/FileScanner.mjs";
/** @typedef {import("./utilities/Configs/ScanFileConfig.mjs").ScanFileConfig} ScanFileConfig */

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
   * @param {ScanFileConfig} scanConfig 经过 assertScanFileConfig 校验完成的配置
   */
  constructor(scanConfig) {
    // BaseSource 的 from 存到 _source，这里直接把 scanConfig 丢进去，不再嵌套
    super(scanConfig);
    /**
     * @type {FileScanner}
     * @protected
     */
    this._scanner = new FileScanner(scanConfig);
  }

  /**
   * 获取文件绝对磁盘路径
   * @protected
   * @param {string} relPath 文件相对路径(id)
   * @returns {string}
   */
  _getAbsolutePath(relPath) {
    // this._source 就是 ScanFileConfig，不再有 .rule / .scanConfig
    const rootDir = this._source.dirPath;
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