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
   * @param {import("./File.source.mjs").FileSourceConfig} config
   */
  constructor(config) {
    super(config);
  }

  /**
   * @override
   * @async
   * @protected
   * @param {string} id
   * @returns {Promise<any>} 解析后的JSON对象
   */
  async _getOneFromSource(id) {
    const { text } = await super._getOneFromSource(id);
    return JSON.parse(text);
  }

  /**
   * @override
   * @async
   * @protected
   * @param {string} id
   * @param {any} data JS对象/数组，待序列化写入
   * @returns {Promise<void>}
   */
  async _updateToSource(id, data) {
    const text = JSON.stringify(data, null, 2);
    await super._updateToSource(id, text);
  }
}