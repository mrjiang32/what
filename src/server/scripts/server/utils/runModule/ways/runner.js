import { parentPort as __pp, workerData as __wd } from "worker_threads";
import __fs from "fs";
import path from "path";

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

    // Detect if the source uses ESM top-level import/export
    const isESM = /^\s*(import|export)\b/m.test(__source);

    if (isESM) {
      // Load the target file through Node's ESM loader so top-level imports/exports are supported
      const moduleUrl = `file://${path.resolve(__wd.filePath)}`;
      const mod = await import(moduleUrl);
      let result;
      if (typeof mod === "function") {
        result = await mod(params, console);
      } else if (typeof mod.default === "function") {
        result = await mod.default(params, console);
      } else if (typeof mod.run === "function") {
        result = await mod.run(params, console);
      } else if (typeof mod.execute === "function") {
        result = await mod.execute(params, console);
      } else {
        // no callable export — return the module namespace
        result = mod;
      }

      __pp.postMessage({ type: "finish", returnVal: result });
    } else {
      const AsyncFunction = (async () => {}).constructor;

      // Inject params and redirected console into dynamic function
      const __exec = new AsyncFunction("params", "console", `
        "use strict";
        ${__source}
      `);

      const result = await __exec(params, console);
      __pp.postMessage({ type: "finish", returnVal: result });
    }
  } catch (err) {
    console.error("Worker execution failed:", err);
    __pp.postMessage({ type: "error", error: { name: err.name, message: err.message, stack: err.stack } });
  }
})();