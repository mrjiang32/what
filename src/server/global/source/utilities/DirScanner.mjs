// DirScanner.mjs
import path from "path";
import fs from "fs/promises";
import { assertScanDirConfig } from "./Configs/ScanDirConfig.mjs";

/**
 * @typedef DirScanConfig
 * @property {string} dirPath 扫描根目录绝对路径
 * @property {string[]} dirBlackList 目录黑名单
 */

/**
 * DirScanner：行为等价 ls，只扫描一层，**无递归**，仅输出直接子目录名称
 */
export class DirScanner {
  /** @type {DirScanConfig} */
  config;

  /**
   * @param {DirScanConfig} config
   */
  constructor(config) {
    assertScanDirConfig(config);
    this.config = config;
  }

  /**
   * @returns {Promise<string[]>} 返回根目录下直接子目录名（suiteId）
   */
  async scan() {
    const { dirPath, dirBlackList } = this.config;

    let entries;
    try {
      entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch (err) {
      throw new Error(`DirScanner 读取目录失败 [${dirPath}]：${err.message}`, { cause: err });
    }

    // 只保留目录；过滤隐藏目录、黑名单
    const dirNames = entries
      .filter(e => e.isDirectory() && !e.name.startsWith(".") && !dirBlackList.includes(e.name))
      .map(e => e.name);

    return dirNames;
  }
}