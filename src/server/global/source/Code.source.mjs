// Code.source.mjs
import { FileSource } from "./File.source.mjs";
import { SecureUse } from "./utilities/SecureObject.mjs";
import { pathToFileURL } from "url";
import fs from "fs/promises";
import vm from "vm";
import { fork } from "child_process";
import path from "path";

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
 * @property {Record<string, any>} [injectTools] 给沙箱注入的工具对象（仅不信任模式生效）
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
 * 子进程消息类型
 * @typedef ChildMessage
 * @property {type:"result"|"error"|"log"} type
 * @property {any} [payload]
 * @property {string} [level]
 */

/**
 * CodeSource
 * 双模式：
 * 1. importModule(id)：原生ESM动态导入，mtime自动失效
 * 2. runTrustedModule(id, params)：信任脚本，fork独立node子进程，脚本export default输出返回值
 * 3. runUntrustedModule(id, params)：不可信脚本，isolated-vm严格沙箱隔离
 */
export class CodeSource extends FileSource {
  /**
   * @type {CodeSourceConfig["injectTools"]}
   * @protected
   */
  injectTools;

  /** ESM模块导出缓存 */
  #moduleCache = new Map();
  /** run* 源码文本缓存 */
  #sourceCache = new Map();

  /** @type {LogGuard|null} */
  #_logGuard = null;

  /**
   * @param {CodeSourceConfig} config
   */
  constructor(config) {
    super(config);
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
    return { url: fileUrl, text: await super._getOneFromSource(id) };
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
          const prefix = item.meta?.relPath ? `[${item.meta.relPath}]` : "";
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
            if (v === null || typeof v !== "object") return v;
            return structuredClone(v);
          } catch {
            return "[unsafe object]";
          }
        });
        this.logQueue.push({ level, args: safeArgs, meta });
        this.drainQueue();
      },
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

  async runModule(id, params, trusted = true) {
    if (trusted) {
      return await this.runTrustedModule(id, params);
    }
    return await this.runUntrustedModule(id, params);
  }

  /**
   * 模式B-1：【信任脚本】fork独立Node子进程执行，脚本使用 export default 返回结果
   * 脚本示例：
   * export default async function(params){
   *   return {ok:true, data:123}
   * }
   * @param {string} id 文件相对路径ID
   * @param {any} params 入参，会序列化传给子进程
   * @returns {Promise<any>} 脚本export default执行返回值
   */
  async runTrustedModule(id, params) {
    if (!this.ready) throw new Error("CodeSource尚未就绪，请先执行getReady()");
    if (!this.has(id)) throw new Error(`模块id不存在: ${id}`);

    const absPath = this._getAbsolutePath(id);
    const stat = await fs.stat(absPath);
    const realMtimeMs = stat.mtimeMs;

    // 复用源码缓存（子进程会重新解析，缓存仅减少readFile IO）
    let source;
    const sourceCached = this.#sourceCache.get(id);
    if (!(sourceCached && sourceCached.mtimeMs === realMtimeMs)) {
      source = await fs.readFile(absPath, "utf-8");
      this.#sourceCache.set(id, { source, mtimeMs: realMtimeMs });
    }

    const logGuard = this.#logGuard;

    return new Promise((resolve, reject) => {
      const child = fork(path.resolve("./global/TrustedWorker.mjs"), [], {
        stdio: ["ignore", "pipe", "pipe", "ipc"]
      });

      // 【核心修复】收集子进程的 stderr 输出
      let stderrOutput = '';
      child.stderr.on('data', (chunk) => {
        stderrOutput += chunk.toString();
      });

      child.send({ absPath, params });

      child.on("message", (msg) => {
        if (msg.type === "result") {
          child.kill();
          resolve(msg.payload);
        } else if (msg.type === "error") {
          child.kill();
          reject(new Error(msg.payload?.message ?? "子进程脚本执行异常", { cause: msg.payload }));
        } else if (msg.type === "log") {
          logGuard.enqueue(msg.level, msg.payload, { relPath: id });
        }
      });

      child.on("close", (code) => {
        if (code !== 0) {
          // 【核心修复】将收集到的 stderr 拼接到错误信息中，方便排查
          const errMsg = stderrOutput 
            ? `子进程异常退出 code=${code}\n${stderrOutput}` 
            : `子进程异常退出 code=${code}`;
          reject(new Error(errMsg));
        }
      });

      child.on("error", (err) => {
        child.kill();
        reject(err);
      });
    });
  }

  /**
   * 模式B-2：【不信任脚本】isolated-vm沙箱执行
   * @param {string} id 文件相对路径ID
   * @param {any} params 入参
   * @returns {Promise<any>} 脚本执行返回值
   */
  async runUntrustedModule(id, params) {
    if (!this.ready) throw new Error("CodeSource尚未就绪，请先执行getReady()");
    if (!this.has(id)) throw new Error(`模块id不存在: ${id}`);

    // 运行时动态加载 isolated-vm，环境缺失时报明确错误
    let ivm;
    try {
      ivm = (await import("isolated-vm")).default;
    } catch (e) {
      throw new Error("runUntrustedModule 需要 isolated-vm 包，当前环境加载失败，请安装适配版本", { cause: e });
    }

    const absPath = this._getAbsolutePath(id);
    const stat = await fs.stat(absPath);
    const realMtimeMs = stat.mtimeMs;

    let source;
    const sourceCached = this.#sourceCache.get(id);
    if (sourceCached && sourceCached.mtimeMs === realMtimeMs) {
      source = sourceCached.source;
    } else {
      source = await fs.readFile(absPath, "utf-8");
      this.#sourceCache.set(id, { source, mtimeMs: realMtimeMs });
    }

    const logGuard = this.#logGuard;

    const isolate = new ivm.Isolate({ memoryLimit: 128 });
    const context = await isolate.createContext();
    const jail = context.global;

    // 挂载沙箱全局
    await jail.set("params", new ivm.ExternalCopy(params).copyInto());
    // 1. 定义宿主环境的日志处理函数
    const logHandler = new ivm.Reference((level, messageStr) => {
      logGuard.enqueue(level, [messageStr], { relPath: id });
    });

    // 2. 将处理函数注入沙箱
    await jail.set("__logHandler", logHandler);

    await context.eval(`
      // 提取统一的格式化逻辑，所有日志级别复用
      const formatArgs = (args) => {
        return args.map(arg => {
          try {
            return typeof arg === 'object' ? JSON.stringify(arg) : String(arg);
          } catch {
            return '[Unserializable]';
          }
        }).join(' ');
      };

      globalThis.console = {
        log: (...args) => globalThis.__logHandler.apply(undefined, ['info', formatArgs(args)]),
        info: (...args) => globalThis.__logHandler.apply(undefined, ['info', formatArgs(args)]),
        debug: (...args) => globalThis.__logHandler.apply(undefined, ['debug', formatArgs(args)]),
        warn: (...args) => globalThis.__logHandler.apply(undefined, ['warn', formatArgs(args)]),
        error: (...args) => globalThis.__logHandler.apply(undefined, ['error', formatArgs(args)]),
      };
    `);

    // 注入外部工具对象
    for(const [k, v] of Object.entries(this.injectTools ?? {})){
      await jail.set(k, new ivm.ExternalCopy(v).copyInto());
    }

    // 脚本约定：最后表达式 return $RESULT;
    const wrappedSource = `
      let $RESULT;
      ${source};
      $RESULT
    `;

    const script = await isolate.compileScript(wrappedSource, { filename: absPath });
    const ret = await script.run(context);

    isolate.dispose();
    return ret;
  }

  /**
   * 清除单个id全部缓存：ESM模块缓存 + run*源码缓存
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