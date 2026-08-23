import { parentPort as __pp, workerData as __wd } from "worker_threads";
import __fs from "fs";
import path from "path";
import { createRequire } from 'module';

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
      const hasTopLevelReturn = /^\s*return\b/m.test(__source);

      if (hasTopLevelReturn) {
        // Transform ESM-style static imports/exports into dynamic imports and normal declarations
        // so the source can be executed inside an AsyncFunction (where top-level return is allowed).
        let transformed = __source;

        // Create a file URL for this module to use with a shimmed import.meta
        const __fileUrl = `file://${path.resolve(__wd.filePath)}`;

        // Replace import.meta occurrences with a shim variable before execution
        // We'll inject a __import_meta constant containing the file URL.
        transformed = transformed.replace(/import\.meta\b/g, '__import_meta');

        // create a require resolver rooted at the nearest package.json ancestor of the target file
        // This allows resolving dependencies installed inside a script's own package directory
        let __requireFromTarget;
        try {
          let dir = path.dirname(path.resolve(__wd.filePath));
          let pkgRoot = null;
          while (true) {
            const candidate = path.join(dir, 'package.json');
            if (__fs.existsSync(candidate)) { pkgRoot = dir; break; }
            const parent = path.dirname(dir);
            if (parent === dir) break;
            dir = parent;
          }
          if (pkgRoot) {
            __requireFromTarget = createRequire(path.join(pkgRoot, 'package.json'));
          } else {
            __requireFromTarget = createRequire(path.resolve(__wd.filePath));
          }
        } catch (e) {
          __requireFromTarget = createRequire(path.resolve(__wd.filePath));
        }

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

        // Insert the dynamic importer shim at the top of transformed code and rewrite `await import(` calls to use it
        transformed = __dynamicImportShim + transformed;
        // only rewrite dynamic imports whose first argument is a string literal; preserve imports that already use new URL(...) or expressions
        transformed = transformed.replace(new RegExp("\\bawait\\s+import\\s*\\(\\s*(['\"])", "g"), 'await __dynamicImport($1');

        // handle `import defaultExport, { named } from 'mod';` by capturing default and named imports
        transformed = transformed.replace(/^\s*import\s+([A-Za-z_$][\w$]*)\s*,\s*(\{[^}]+\})\s+from\s+['"]([^'"]+)['"];?/gm, (m, def, named, mod) => {
          return `const __m = await import('${mod}');\nconst ${def} = __m.default;\nconst ${named} = __m;`;
        });

        // handle `import defaultExport from 'mod';`
        transformed = transformed.replace(/^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"];?/gm, (m, def, mod) => {
          return `const ${def} = (await import('${mod}')).default;`;
        });

        // handle `import * as ns from 'mod';`
        transformed = transformed.replace(/^\s*import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s+['"]([^'"]+)['"];?/gm, (m, ns, mod) => {
          return `const ${ns} = await import('${mod}');`;
        });

        // handle `import {a, b as c} from 'mod';`
        transformed = transformed.replace(/^\s*import\s+(\{[^}]+\})\s+from\s+['"]([^'"]+)['"];?/gm, (m, named, mod) => {
          return `const ${named} = (await import('${mod}'));`;
        });

        // side-effect imports: `import 'mod';`
        transformed = transformed.replace(/^\s*import\s+['"]([^'"]+)['"];?/gm, (m, mod) => {
          return `await import('${mod}');`;
        });

        // export default -> return
        transformed = transformed.replace(/^\s*export\s+default\s+/gm, 'return ');

        // export named declarations: remove `export ` prefix
        transformed = transformed.replace(/^\s*export\s+(?=(function|class|const|let|var)\b)/gm, '');

        // remove export list statements like: export { a, b as c };
        transformed = transformed.replace(/^\s*export\s*\{[^}]*\};?/gm, '');

        // Prepend an import.meta shim so code that references import.meta.url still works
        transformed = `const __import_meta = { url: '${__fileUrl}' };\n` + transformed;

        const AsyncFunction = (async () => {}).constructor;
        const __exec = new AsyncFunction("params", "console", "__requireFromTarget", "__fileUrl", `\n        "use strict";\n        ${transformed}\n      `);

        const result = await __exec(params, console, __requireFromTarget, __fileUrl);
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