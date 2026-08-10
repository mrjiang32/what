// `sources/file.source.d/scanner.mjs`
import path from "path";
import fs from "fs/promises";
import { ScanFileRule } from "../../definations/ScanRules/ScanFileRule.mjs";

// 内置固定目录黑名单
const DIR_BLACK_LIST = Object.freeze(["node_modules", ".git", "dist", "build"]);
const MAX_DEPTH = 10;

/**
 * 独立模块目录扫描器
 * 配置完全来自 ScanFileRule，不再外部传入 scanConfig
 * 只负责文件系统遍历，输出相对根目录的路径字符串，**不读取文件内容、不维护业务缓存**
 */
export class Scanner {
  /**
   * @param {ScanFileRule} scanRule 文件扫描规则实例
   */
  constructor(scanRule) {
    if (!(scanRule instanceof ScanFileRule)) {
      throw new Error("Scanner 仅接受 ScanFileRule 实例");
    }
    this.rule = scanRule;
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
      return !entry.name.startsWith(".") && !DIR_BLACK_LIST.includes(entry.name);
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
   * 对外扫描入口，从 ScanFileRule 读取目录、后缀配置
   * @returns {Promise<string[]>} 文件相对路径 id 列表
   */
  async scan() {
    const rootScanDir = this.rule.getDirPath();
    const exts = this.rule.rule.exts ?? [];
    const extSet = new Set(exts);

    const relPaths = await this.#scanInternal({
      scanDir: rootScanDir,
      rootScanDir,
      extSet,
      remainDepth: MAX_DEPTH,
    });

    return relPaths;
  }
}