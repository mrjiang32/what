import BaseModuleLoader from "./BaseModuleLoader.js";
import utils from "../utils/utils.js";
import vm from "vm";
import globalenv from "../../global/globalenv.js";

export default class VmScriptLoader extends BaseModuleLoader {
  // async _loadFileImpl(spath) {
  //   const source = await utils.jsSimpleR(spath);
  //   const sandbox = {
  //     $ACTION: null,
  //     $DISPOSE: null,
  //     console,
  //     setTimeout,
  //     clearTimeout,
  //     setInterval,
  //     clearInterval,
  //     ...this.injectTools,
  //   };
  //   const ctx = vm.createContext(sandbox);
  //   vm.runInContext(source, ctx, {
  //     filename: spath,
  //     displayErrors: true,
  //   });
  //   if (typeof sandbox.$ACTION !== "function") {
  //     throw new Error("Action脚本未定义 $ACTION");
  //   }
  //   return sandbox;
  // }

  async _loadFileImpl(spath) {
    const source = await utils.jsSimpleR(spath);
    return source;
  }

  async runModule(relPath, params) {
    if (!this._logGuard) {
      const actionLog = globalenv.actionlog;
      this._logGuard = {
        printing: false,
        logQueue: [],
        drainQueue() {
          if (this.printing || this.logQueue.length === 0) return;
          this.printing = true;
          const item = this.logQueue.shift();
          try {
            const prefix = item.meta?.relPath ? `[${item.meta.relPath}]` : '';
            if (prefix) {
              actionLog[item.level](prefix, ...item.args);
            } else {
              actionLog[item.level](...item.args);
            }
          } finally {
            this.printing = false;
            setImmediate(() => this.drainQueue());
          }
        },
        enqueue(level, args, meta) {
          // 安全拷贝，防御循环引用 / 恶意getter
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
    }

    const nativeConsole = { ...console };
    const spath = this.getModulePath(relPath);
    const source = await this._loadFileImpl(spath);

    const localSandbox = {
      console: {
        log: (...args) => this._logGuard.enqueue("info", args, { relPath }),
        info: (...args) => this._logGuard.enqueue("info", args, { relPath }),
        debug: (...args) => this._logGuard.enqueue("debug", args, { relPath }),
        error: (...args) => this._logGuard.enqueue("error", args, { relPath }),
        warn: (...args) => this._logGuard.enqueue("warn", args, { relPath }),
        trace: nativeConsole.trace,
        dir: nativeConsole.dir,
        table: nativeConsole.table,
      },
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      ...this.injectTools,
      $RETURN: undefined,
    };

    const ctx = vm.createContext({
      params,
      ...localSandbox
    });

    vm.runInContext(source, ctx, {
      filename: spath,
      displayErrors: true,
    });

    const desc = Object.getOwnPropertyDescriptor(ctx, '$RETURN');
    if (desc) {
      // 如果是 getter，直接拒绝，不调用get()
      if (typeof desc.get === 'function') {
        return { error: "return value is malicious getter, rejected" };
      }
      // 普通属性，拿到原始值
      const rawVal = desc.value;
      try {
        // structuredClone 会剥离所有访问器属性(getter/setter)，只拷贝纯数据
        return structuredClone(rawVal);
      } catch (err) {
        return "[unsafe return value, clone failed]";
      }
    }
    // 没有设置 $RETURN
    return undefined;
  }
}