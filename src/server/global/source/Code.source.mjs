// Code.source.mjs
import { FileSource } from "./File.source.mjs";
import { SecureUse } from "./utilities/SecureObject.mjs";
import { pathToFileURL } from "url";
import fs from "fs/promises";
import vm from "vm";

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
 * runModule 源码文本缓存条目
 * @typedef SourceCacheItem
 * @property {string} source 脚本源码文本
 * @property {number} mtimeMs 缓存时磁盘修改时间ms
 */

/**
 * @typedef CodeSourceConfig
 * @property {import("./utilities/Configs/ScanFileConfig.mjs").ScanFileConfig} scanConfig 已通过 assertScanFileConfig 校验的扫描配置
 * @property {Record<string, any>} [injectTools] 给 runModule vm沙箱注入的工具对象
 */

/**
 * 沙箱日志守卫内部类型
 * @typedef LogGuard
 * @property {boolean} printing
 * @property {Array<{level:string,args:any[],meta?:{relPath?:string}}>} logQueue
 * @property {()=>void} drainQueue
 * @property {(level:string, args:any[], meta?:{relPath?:string})=>void} enqueue
 */

/**
 * CodeSource
 * 双模式合并数据源
 * 1. importModule(id)：原生ESM动态导入，mtime自动失效
 * 2. runModule(id, params)：vm沙箱执行；增加源码内存缓存，stat轻量校验变更，避免重复readFile
 */
export class CodeSource extends FileSource {
  /**
   * @type {CodeSourceConfig["injectTools"]}
   * @protected
   */
  injectTools;

  /** ESM模块导出缓存 */
  #moduleCache = new Map();
  /** runModule 源码文本缓存 */
  #sourceCache = new Map();

  /** @type {LogGuard|null} */
  #_logGuard = null;

  /**
   * @param {CodeSourceConfig} config
   */
  constructor(config) {
    // ✅ 把scanConfig透传给父类FileSource，父类直接接收ScanFileConfig扁平对象
    super(config.scanConfig);
    this.injectTools = config.injectTools ?? {};
  }

  /**
   * @override
   * @async
   * @protected
   * @param {string} id 文件相对路径ID
   * @returns {Promise<CodeSourceEntity>} 仅返回url，不读取文件内容
   */
  async _getOneFromSource(id) {
    const absPath = this._getAbsolutePath(id);
    const fileUrl = pathToFileURL(absPath);
    return { url: fileUrl };
  }

  /**
   * @private
   * @returns {LogGuard}
   */
  get #logGuard() {
    if (this.#_logGuard) return this.#_logGuard;
    const classThis = this;

    /** @type {LogGuard} */
    const guard = {
      printing: false,
      logQueue: [],
      drainQueue() {
        if (!classThis.logger) classThis.logger = console;
        if (this.printing || this.logQueue.length === 0) return;
        this.printing = true;
        const item = this.logQueue.shift();
        try {
          const prefix = item.meta?.relPath ? `[${item.meta.relPath}]` : '';
          if (prefix) {
            classThis.logger[item.level](prefix, ...item.args);
          } else {
            classThis.logger[item.level](...item.args);
          }
        } finally {
          this.printing = false;
          setImmediate(() => this.drainQueue());
        }
      },
      enqueue(level, args, meta) {
        const safeArgs = args.map((v) => {
          try {
            if (v === null || typeof v !== 'object') return v;
            return structuredClone(v);
          } catch {
            return '[unsafe object]';
          }
        });
        this.logQueue.push({ level, args: safeArgs, meta });
        this.drainQueue();
      }
    };
    this.#_logGuard = guard;
    return guard;
  }

  /**
   * 模式A：ESM动态导入，检测mtime自动绕开缓存
   * @param {string} id 文件相对路径id
   * @returns {Promise<any>} 模块导出对象
   */
  async importModule(id) {
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
   * 模式B：VM沙箱隔离运行脚本；带源码内存缓存，stat校验变更，减少readFile
   * @param {string} id 文件相对路径ID
   * @param {any} params 注入沙箱的入参
   * @returns {Promise<any>} $RETURN执行结果，做安全隔离
   */
  async runModule(id, params) {
    if (!this.ready) throw new Error("CodeSource尚未就绪，请先执行getReady()");
    if (!this.has(id)) throw new Error(`模块id不存在: ${id}`);

    const absPath = this._getAbsolutePath(id);
    const stat = await fs.stat(absPath);
    const realMtimeMs = stat.mtimeMs;

    let source;
    const sourceCached = this.#sourceCache.get(id);
    if (sourceCached && sourceCached.mtimeMs === realMtimeMs) {
      // mtime未变化，复用内存缓存源码，跳过readFile
      source = sourceCached.source;
    } else {
      // 文件改动或无缓存，读取源码并更新缓存
      source = await fs.readFile(absPath, "utf-8");
      this.#sourceCache.set(id, { source, mtimeMs: realMtimeMs });
    }

    const nativeConsole = { ...console };
    const logGuard = this.#logGuard;

    const localSandbox = {
      console: {
        log: (...args) => logGuard.enqueue("info", args, { relPath: id }),
        info: (...args) => logGuard.enqueue("info", args, { relPath: id }),
        debug: (...args) => logGuard.enqueue("debug", args, { relPath: id }),
        error: (...args) => logGuard.enqueue("error", args, { relPath: id }),
        warn: (...args) => logGuard.enqueue("warn", args, { relPath: id }),
        trace: nativeConsole.trace,
        dir: nativeConsole.dir,
        table: nativeConsole.table,
      },
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      ...this.injectTools,
      $RETURN: undefined
    };

    const ctx = vm.createContext({ params, ...localSandbox });
    vm.runInContext(source, ctx, { filename: absPath, displayErrors: true });
    return SecureUse(ctx, '$RETURN').value;
  }

  /**
   * 清除单个id全部缓存：ESM模块缓存 + runModule源码缓存
   * @param {string} id
   */
  invalidate(id) {
    this.#moduleCache.delete(id);
    this.#sourceCache.delete(id);
  }

  /**
   * 清空全部缓存
   */
  invalidateAll() {
    this.#moduleCache.clear();
    this.#sourceCache.clear();
  }
}