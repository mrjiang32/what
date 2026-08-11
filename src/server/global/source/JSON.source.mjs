// JSONSource.mjs
import { FileSource } from "./File.source.mjs";

/**
 * JSONSource
 * 继承 FileSource，将文件作为JSON对象读写
 * get(id) 返回解析后的js对象
 * add / update 传入js对象，内部序列化为格式化JSON文本写入磁盘
 */
export class JSONSource extends FileSource {
  /**
   * @typedef {import("./File.source.mjs").FileSourceConfig} FileSourceConfig
   * @typedef {Object} JSONSourceConfig
   * @property {number} [jsonIndent=2] JSON格式化缩进空格数
   */

  /**
   * @param {FileSourceConfig & JSONSourceConfig} config
   */
  constructor(config) {
    super(config);
    /** @type {number} JSON输出缩进 */
    this.jsonIndent = config.jsonIndent ?? 2;
  }

  /**
   * @override
   * @async
   * @protected
   * @param {string} id
   * @returns {Promise<any>} 解析后的JSON对象
   * @throws {SyntaxError|Error} 文件读取失败或JSON格式非法
   */
  async _getOneFromSource(id) {
    const res = await super._getOneFromSource(id);
    const text = res.text?.trim();

    // 空文件保护
    if (!text) {
      return Object.create(null);
    }

    try {
      return JSON.parse(text);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      throw new SyntaxError(`[JSONSource] id=${id} JSON解析失败: ${error.message}`);
    }
  }

  /**
   * @override
   * @async
   * @protected
   * @param {string} id
   * @param {unknown} data JS对象/数组，待序列化写入
   * @returns {Promise<void>}
   * @throws {TypeError} 存在循环引用、无法序列化时抛出
   */
  async _updateToSource(id, data) {
    let text;
    try {
      text = JSON.stringify(data, null, this.jsonIndent);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      throw new TypeError(`[JSONSource] id=${id} JSON序列化失败: ${error.message}`);
    }
    await super._updateToSource(id, text);
  }
}