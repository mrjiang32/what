import { parentPort as __pp, workerData as __wd } from "worker_threads";
import __fs from "fs";
import path from "path";
import { createRequire } from "module";

// [核心修改] 动态将目标脚本所在的 node_modules 注入到 NODE_PATH 中
const targetDir = path.dirname(path.resolve(__wd.filePath));
const targetNodeModules = path.join(targetDir, "node_modules");
if (__fs.existsSync(targetNodeModules)) {
  process.env.NODE_PATH = process.env.NODE_PATH
    ? `${process.env.NODE_PATH}:${targetNodeModules}`
    : targetNodeModules;

  // ✅ 使用 ESM 的方式引入 module 模块
  const moduleModule = await import("module");
  moduleModule.default.Module._initPaths();
}

const __originalConsole = { ...console };

const __safePostLog = (level, args) => {
  try {
    const safeArgs = args.map((arg) => {
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
      const hasTopLevelReturn = /^\s*return\b/m.test(__source);

      if (hasTopLevelReturn) {
        // Transform ESM-style static imports/exports into dynamic imports and normal declarations
        // so the source can be executed inside an AsyncFunction (where top-level return is allowed).
        let transformed = __source;

        // Create a file URL for this module to use with a shimmed import.meta
        const __fileUrl = `file://${path.resolve(__wd.filePath)}`;

        // Replace import.meta occurrences with a shim variable before execution
        // We'll inject a __import_meta constant containing the file URL.
        transformed = transformed.replace(/import\.meta\b/g, "__import_meta");

        // [核心修改] 创建一个以目标脚本所在目录为根的 require 函数
        // 这样它就能正确地从目标脚本旁边的 node_modules 中加载依赖了
        const __requireFromTarget = createRequire(path.resolve(__wd.filePath));

        // helper dynamic importer used inside transformed code: resolves bare specifiers via require from target,
        // and uses ESM dynamic import for relative/absolute specifiers. Returns a namespace-like object so
        // `.default` access works for CommonJS modules.
        const __dynamicImportShim = `const __dynamicImport = async (s) => {
  if (!/^([.\\/]|[A-Za-z]:\\\\)/.test(s)) {
    const m = __requireFromTarget(s);
    if (m && m.__esModule) return m;
    const ns = { default: m };
    if (m && typeof m === 'object') Object.assign(ns, m);
    return ns;
  }
  return await import(new URL(s, __fileUrl));
};\n`;

        // [核心修改] 定义一个判断是否为裸模块的辅助函数
        // 如果不是以 . / 或盘符开头，就认为是 npm 包（如 'cheerio', 'lodash'）
        const isBareModule = (mod) => !/^([.\\/]|[A-Za-z]:)/.test(mod);

        // handle `import defaultExport, { named } from 'mod';`
        transformed = transformed.replace(
          /^\s*import\s+([A-Za-z_$][\w$]*)\s*,\s*(\{[^}]+\})\s+from\s+['"]([^'"]+)['"];?/gm,
          (m, def, named, mod) => {
            if (isBareModule(mod)) {
              // 裸模块：使用 require，并手动解构
              return `const __m = __requireFromTarget('${mod}');\nconst ${def} = __m.default || __m;\nconst ${named} = __m;`;
            }
            // 相对/绝对路径：走 ESM
            return `const __m = await import('${mod}');\nconst ${def} = __m.default;\nconst ${named} = __m;`;
          },
        );

        // handle `import defaultExport from 'mod';`
        transformed = transformed.replace(
          /^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"];?/gm,
          (m, def, mod) => {
            if (isBareModule(mod)) {
              return `const ${def} = __requireFromTarget('${mod}');`;
            }
            return `const ${def} = (await import('${mod}')).default;`;
          },
        );

        // handle `import * as ns from 'mod';`
        transformed = transformed.replace(
          /^\s*import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"];?/gm,
          (m, ns, mod) => {
            if (isBareModule(mod)) {
              // 将 require 的结果包装成类似 ESM 的命名空间对象
              return `const ${ns} = (() => { const m = __requireFromTarget('${mod}'); const ns = { default: m }; if (m && typeof m === 'object') Object.assign(ns, m); return ns; })();`;
            }
            return `const ${ns} = await import('${mod}');`;
          },
        );

        // handle `import {a, b as c} from 'mod';`
        transformed = transformed.replace(
          /^\s*import\s+(\{[^}]+\})\s+from\s+['"]([^'"]+)['"];?/gm,
          (m, named, mod) => {
            if (isBareModule(mod)) {
              // 注意：这里直接解构 require 出来的对象
              return `const ${named} = __requireFromTarget('${mod}');`;
            }
            return `const ${named} = (await import('${mod}'));`;
          },
        );

        // side-effect imports: `import 'mod';`
        transformed = transformed.replace(
          /^\s*import\s+['"]([^'"]+)['"];?/gm,
          (m, mod) => {
            if (isBareModule(mod)) {
              return `__requireFromTarget('${mod}');`;
            }
            return `await import('${mod}');`;
          },
        );

        // side-effect imports: `import 'mod';`
        transformed = transformed.replace(
          /^\s*import\s+['"]([^'"]+)['"];?/gm,
          (m, mod) => {
            return `await import('${mod}');`;
          },
        );

        // export default -> return
        transformed = transformed.replace(
          /^\s*export\s+default\s+/gm,
          "return ",
        );

        // export named declarations: remove `export ` prefix
        transformed = transformed.replace(
          /^\s*export\s+(?=(function|class|const|let|var)\b)/gm,
          "",
        );

        // remove export list statements like: export { a, b as c };
        transformed = transformed.replace(/^\s*export\s*\{[^}]*\};?/gm, "");

        // Prepend an import.meta shim so code that references import.meta.url still works
        transformed =
          `const __import_meta = { url: '${__fileUrl}' };\n` + transformed;

        const AsyncFunction = (async () => {}).constructor;
        const __exec = new AsyncFunction(
          "params",
          "console",
          "__requireFromTarget",
          "__fileUrl",
          `\n        "use strict";\n        ${transformed}\n      `,
        );

        const result = await __exec(
          params,
          console,
          __requireFromTarget,
          __fileUrl,
        );
        __pp.postMessage({ type: "finish", returnVal: result });
      } else {
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
      }
    } else {
      const AsyncFunction = (async () => {}).constructor;

      // Inject params and redirected console into dynamic function
      const __exec = new AsyncFunction(
        "params",
        "console",
        `
        "use strict";
        ${__source}
      `,
      );

      const result = await __exec(params, console);
      __pp.postMessage({ type: "finish", returnVal: result });
    }
  } catch (err) {
    console.error("Worker execution failed:", err);
    __pp.postMessage({
      type: "error",
      error: { name: err.name, message: err.message, stack: err.stack },
    });
  }
})();
