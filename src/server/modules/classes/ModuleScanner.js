import path from "path";
import fs from "fs/promises";
import chalk from "chalk";
import { Logger } from "./Logger.js";
import { ScanFileRule } from "./ScanRule.js";

const modLogger = new Logger("ModuleScanner");

// 内置固定目录黑名单
const DIR_BLACK_LIST = Object.freeze(["node_modules", ".git", "dist", "build"]);
const MAX_DEPTH = 10;

/**
 * 独立模块目录扫描器
 * 配置完全来自 ScanFileRule，不再外部传入 scanConfig
 * 只负责文件系统遍历，输出相对路径字符串，不维护业务缓存
 */
export class ModuleScanner {
  /**
   * @param {ScanFileRule} scanFileRule 文件扫描规则实例
   */
  constructor(scanFileRule) {
    if (!(scanFileRule instanceof ScanFileRule)) {
      throw new Error("ModuleScanner 仅接受 ScanFileRule 实例");
    }
    this.rule = scanFileRule;
    this.log = modLogger.getByContext(this.rule.getDirPath());
  }

  /**
   * @param {string} rootDir
   * @param {string} relPath
   * @returns {string}
   */
  resolveFullPath(rootDir, relPath) {
    return path.join(rootDir, relPath);
  }

  /**
   * 内部递归扫描私有方法
   * @private
   * @param {{scanDir:string, rootScanDir:string, extSet:Set<string>, remainDepth:number}} opts
   */
  async #scanInternal({ scanDir, rootScanDir, extSet, remainDepth }) {
    if (remainDepth <= 0) return [];

    let dirEntries;
    try {
      dirEntries = await fs.readdir(scanDir, { withFileTypes: true });
    } catch (scanErr) {
      this.log.error(`目录 "${scanDir}" 扫描失败：${scanErr.message}`);
      throw new Error(`扫描目录发生异常: ${scanErr.message}`, { cause: scanErr });
    }

    // 筛选符合后缀的文件，输出相对根目录的relPath
    const currentDirFiles = dirEntries
      .filter((entry) => {
        const ext = path.extname(entry.name);
        return entry.isFile() && extSet.has(ext) && !entry.name.startsWith(".");
      })
      .map((entry) => path.join(path.relative(rootScanDir, scanDir), entry.name));

    if (this.log.isDebugEnabled()) {
      for (const rel of currentDirFiles) {
        this.log.debug(` - ${chalk.gray(rel)}`);
      }
    }

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
   * @returns {Promise<string[]>} relPath list
   */
  async scan() {
    const rootScanDir = this.rule.getDirPath();
    const exts = this.rule.rule.exts ?? [];
    const extSet = new Set(exts);

    this.log.debug(`开始扫描根目录: ${rootScanDir}`);

    const relPaths = await this.#scanInternal({
      scanDir: rootScanDir,
      rootScanDir,
      extSet,
      remainDepth: MAX_DEPTH,
    });

    this.log.debug(`扫描完成，共找到 ${relPaths.length} 个目标文件`);
    return relPaths;
  }
}