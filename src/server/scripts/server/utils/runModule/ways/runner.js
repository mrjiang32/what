import { parentPort as __pp, workerData as __wd } from "worker_threads";
import __fs from "fs";

const __originalConsole = { ...console };

const __safePostLog = (level, args) => {
  try {
    const safeArgs = args.map(arg => {
      if (arg instanceof Error) {
        return { name: arg.name, message: arg.message, stack: arg.stack };
      }
      return arg;
    });
    __pp.postMessage({ type: "__LOG__", level, args: safeArgs });
  } catch (e) {
    __originalConsole.error("Failed to post log to main thread:", e);
  }
};

console.log = (...args) => __safePostLog("info", args);
console.error = (...args) => __safePostLog("error", args);
console.warn = (...args) => __safePostLog("warn", args);
console.info = (...args) => __safePostLog("info", args);
console.debug = (...args) => __safePostLog("debug", args);

const AsyncFunction = (async () => {}).constructor;

(async () => {
  try {
    const __source = await __fs.promises.readFile(__wd.filePath, "utf-8");
    const params = __wd.params;

    const AsyncFunction = (async () => {}).constructor;

    // ✅ 核心修复：将重定向后的 console 作为参数注入到动态代码中
    // 注意：这里传入了 "params" 和 "console" 两个形参
    const __exec = new AsyncFunction("params", "console", `
      "use strict";
      ${__source}
    `);

    // ✅ 执行时，将真实的 params 和重定向后的 console 传入
    const result = await __exec(params, console);
    
    __pp.postMessage({ type: "finish", returnVal: result });
  } catch (err) {
    console.error("Worker execution failed:", err);
    __pp.postMessage({ type: "error", error: { name: err.name, message: err.message, stack: err.stack } });
  }
})();