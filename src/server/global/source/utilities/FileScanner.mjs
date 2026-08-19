import path from "path";
import fs from "fs/promises";
import { makeSureExists } from "./exists.js";
import { assertScanFileConfig } from "./Configs/ScanFileConfig.mjs";

/**
 * @typedef ScanFileConfig
 * @property {string} dirPath 扫描根目录绝对路径
 * @property {string[]} exts 需要匹配的文件后缀 [".mjs",".js"]
 * @property {string[]} dirBlackList 目录黑名单
 * @property {number} maxDepth 最大递归扫描深度
 */


/**
 * 独立模块目录扫描器
 * 接收纯数据 ScanFileConfig，不再绑定 Rule/ScanFileRule
 * 只负责文件系统遍历，输出相对根目录的路径字符串，**不读取文件内容、不维护业务缓存**
 */
export class FileScanner {
  /** @type {ScanFileConfig} */
  config;

  /**
   * @param {ScanFileConfig} scanConfig 
   */
  constructor(scanConfig) {
    assertScanFileConfig(scanConfig);
    this.config = scanConfig;
  }

  /**
   * 拼接根目录与相对路径，得到磁盘绝对路径
   * @param {string} rootDir 扫描根目录绝对路径
   * @param {string} relPath 相对路径
   * @returns {string} 绝对路径
   */
  resolve(rootDir, relPath) {
    return path.join(rootDir, relPath);
  }

  /**
   * 内部递归扫描私有方法
   * @private
   * @param {{scanDir:string, rootScanDir:string, extSet:Set<string>, remainDepth:number}} opts
   * @returns {Promise<string[]>} 相对路径数组
   */
  async #scanInternal({ scanDir, rootScanDir, extSet, remainDepth }) {
    if (remainDepth <= 0) return [];

    let dirEntries;
    try {
      dirEntries = await fs.readdir(scanDir, { withFileTypes: true });
    } catch (scanErr) {
      throw new Error(`扫描目录[${scanDir}]发生异常: ${scanErr.message}`, { cause: scanErr });
    }

    // 筛选符合后缀的文件，输出相对根目录relPath
    const currentDirFiles = dirEntries
      .filter((entry) => {
        const ext = path.extname(entry.name);
        return entry.isFile() && extSet.has(ext) && !entry.name.startsWith(".");
      })
      .map((entry) => path.join(path.relative(rootScanDir, scanDir), entry.name));

    // 过滤子目录：跳过黑名单、隐藏目录
    const childDirs = dirEntries.filter((entry) => {
      if (!entry.isDirectory()) return false;
      return !entry.name.startsWith(".") && !this.config.dirBlackList.includes(entry.name);
    });

    const childPromises = childDirs.map((entry) => {
      const childFullPath = path.join(scanDir, entry.name);
      return this.#scanInternal({
        scanDir: childFullPath,
        rootScanDir,
        extSet,
        remainDepth: remainDepth - 1,
      });
    });

    const childResults = await Promise.all(childPromises);
    const allChild = childResults.flat();
    return [...currentDirFiles, ...allChild];
  }

  /**
   * 对外扫描入口
   * @returns {Promise<string[]>} 文件相对路径 id 列表
   */
  async scan() {
    const rootScanDir = this.config.dirPath;
    const exts = this.config.exts ?? [];
    const extSet = new Set(exts);

    if (!(await makeSureExists(rootScanDir))) {
      return [];
    }

    const relPaths = await this.#scanInternal({
      scanDir: rootScanDir,
      rootScanDir,
      extSet,
      remainDepth: this.config.maxDepth,
    });

    return relPaths;
  }
}