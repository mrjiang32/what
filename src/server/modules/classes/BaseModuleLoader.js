import { pathToFileURL } from "url";
import path from "path";
import fs from "fs/promises";
import chalk from "chalk";
import utils from "../utils/utils.js";
import logger from "../utils/logger.js";
import { ModuleScanner } from "./ModuleScanner.js";

/**
 * 模块加载器【抽象基类】
 * 扫描逻辑抽离至 ModuleScanner，本类专注索引、缓存、模块加载、文件读写
 */
export default class BaseModuleLoader {
  /**
   * @param {string} scanRoot 模块根目录
   * @param {object} injectTools 注入给沙箱的工具（VmLoader使用）
   */
  constructor(scanRoot, injectTools = {}) {
    this.SCANDIR = scanRoot;
    this.log = logger.newLogger("ModuleLoader");
    this.injectTools = injectTools;

    // 实例隔离状态
    this.moduleSet = new Set();
    this.moduleCache = new Map();

    // 扫描配置，可按需覆写
    this.scanConfig = {
      allowedExts: [".js", ".json"],
      maxDepth: 10,
      dirBlackList: ["node_modules", ".git", "dist", "build"],
    };

    // 组合扫描器实例
    this.scanner = new ModuleScanner(this.scanConfig);
  }

  /**
   * 【抽象方法，子类必须实现】单个文件加载逻辑
   * @param {string} spath 文件绝对路径
   * @returns {Promise<any>} module
   */
  async _loadFileImpl(spath) {
    throw new Error("子类必须实现 _loadFileImpl 方法");
  }

  /**
   * 根据相对路径生成绝对路径，并校验防越界（委托给 scanner）
   * @param {string} relPath 相对于 SCANDIR 的路径，例：hook/demo.js
   * @returns {string} 绝对路径
   */
  getModulePath(relPath) {
    return this.scanner.resolveFullPath(this.SCANDIR, relPath);
  }

  /**
   * 生成缓存索引键（直接使用相对路径）
   * @param {string} relPath
   * @returns {string}
   */
  getCacheKey(relPath) {
    return relPath;
  }

  /**
   * 对外扫描入口，兼容旧接口
   * @returns {Promise<Array<{relPath:string, key:string}>>}
   */
  async scanModules(scanDir = null) {
    const root = scanDir ?? this.SCANDIR;

    if (!(await utils.fileExists(root))) {
      await fs.mkdir(root, { recursive: false });
      return [];
    }

    const relPaths = await this.scanner.scan(root);
    const list = [];
    for (const relPath of relPaths) {
      const key = relPath;
      list.push({ relPath, key });
    }
    return list;
  }

  /**
   * 重建全部索引
   */
  async updateAll(scanDir = null) {
    const root = scanDir ?? this.SCANDIR;
    this.moduleSet.clear();
    this.moduleCache.clear();
    const entries = await this.scanModules(root);
    for (const item of entries) {
      this.updateIndex(item.relPath);
    }
    return entries;
  }

  /**
   * 注册模块索引
   * @param {string} relPath
   */
  updateIndex(relPath) {
    const key = this.getCacheKey(relPath);
    if (this.moduleSet.has(key)) {
      throw new Error(`重复的模块索引: ${key}`);
    }
    this.moduleSet.add(key);
  }

  /**
   * 删除运行时缓存
   * @param {string} relPath
   */
  updateCache(relPath) {
    const key = this.getCacheKey(relPath);
    this.moduleCache.delete(key);
  }

  /**
   * 判断模块是否存在
   * @param {string} relPath
   * @returns {boolean}
   */
  hasModule(relPath) {
    const key = this.getCacheKey(relPath);
    return this.moduleSet.has(key);
  }

  /**
   * 获取全部模块相对路径列表
   * @returns {Array<string>}
   */
  getModuleList() {
    return Array.from(this.moduleSet);
  }

  /**
   * 写入模块文件
   * @param {string} relPath 相对路径
   * @param {string} code 文件内容
   */
  async writeModule(relPath, code) {
    const spath = this.getModulePath(relPath);
    if (relPath.endsWith(".js")) {
      await utils.jsSimpleW(spath, code);
    } else if (relPath.endsWith(".json")) {
      await utils.jsonSimpleW(spath, code);
    }
    this.updateCache(relPath);
  }

  /**
   * 删除模块文件
   * @param {string} relPath
   */
  async removeModule(relPath) {
    const spath = this.getModulePath(relPath);
    await utils.deleteFile(spath);
    this.updateCache(relPath);
    this.moduleSet.delete(this.getCacheKey(relPath));
  }

  /**
   * 主干加载流程
   * @param {string} relPath 模块相对路径
   * @param {boolean} forceUpdate
   * @returns {Promise<any>}
   */
  async loadAModule(relPath, forceUpdate = true) {
    const key = this.getCacheKey(relPath);
    const spath = this.getModulePath(relPath);
    let module;

    if (this.moduleCache.has(key) && !forceUpdate) {
      return this.moduleCache.get(key);
    }

    try {
      if (relPath.endsWith(".json")) {
        module = await utils.jsonSimpleR(spath);
      } else if (relPath.endsWith(".js")) {
        module = await this._loadFileImpl(spath);
      } else {
        throw new Error(`不支持的文件格式 ${relPath}`);
      }
    } catch (err) {
      this.log.error(`加载模块失败[${spath}]：${err.message}`);
      throw new Error(`加载模块失败[${spath}]：${err.message}`);
    }

    this.moduleCache.set(key, module);
    return module;
  }

  /**
   * 动态导入模块文件
   * @param {string} filePath 文件系统绝对路径
   */
  async importModule(filePath) {
    return await import(pathToFileURL(filePath).href);
  }
}