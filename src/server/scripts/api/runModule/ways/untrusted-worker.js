// sandboxWorker.js
import { parentPort, workerData } from "worker_threads";
import ivm from "isolated-vm";
import fsFacade from "../injections/fs.js";
import netFacade from "../injections/network.js";

const { code, params, perms, allowedRoot } = workerData;

// 1. 动态合并所有可用的 Facade
const localPerms = { ...fsFacade, ...netFacade };

/**
 * 安全的深拷贝合并：解决 Object.assign 覆盖子对象的问题
 * 将 { fs: { readFile } } 和 { fs: { writeFile } } 完美合并
 */
function deepMerge(target, source) {
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      if (!target[key]) target[key] = {};
      deepMerge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// 2. 根据 perms 构建当前会话允许使用的 API 映射表
const activeApis = {};
if (perms && typeof perms === "object") {
  for (const [k, v] of Object.entries(perms)) {
    if (v === true && localPerms[k]) {
      // 使用深合并，防止 fs[read] 和 fs[write] 互相覆盖
      deepMerge(activeApis, localPerms[k]);
    }
  }
}

// 3. 监听沙箱的 API 调用请求
parentPort.on("message", async (msg) => {
  if (msg.type !== "api-call") return;

  const { id, namespace, method, args } = msg;

  try {
    // 双重校验：防止沙箱伪造请求
    const handler = activeApis[namespace]?.[method];
    if (!handler) {
      throw new Error(
        `[SecurityError] API not permitted or found: ${namespace}.${method}`,
      );
    }

    const result = await handler(...args);
    parentPort.postMessage({ id, success: true, result });
  } catch (err) {
    parentPort.postMessage({ id, success: false, error: err.message });
  }
});

async function bootIsolate() {
  const isolate = new ivm.Isolate({ memoryLimit: 128 });
  const context = isolate.createContextSync();
  const jail = context.global;

  jail.setSync("global", jail.derefInto());
  jail.setSync("params", new ivm.ExternalCopy(params).copyInto());

  // 4. 动态注入到 globalThis
  for (const [namespace, methods] of Object.entries(activeApis)) {
    const globalProxy = {};

    for (const [methodName] of Object.entries(methods)) {
      // 使用 ivm.Reference 将函数绑定到主 Worker 线程
      globalProxy[methodName] = new ivm.Reference((...args) => {
        return new Promise((resolve, reject) => {
          const id = Math.random().toString(36).slice(2);

          const handler = (msg) => {
            if (msg.id === id) {
              parentPort.off("message", handler);
              if (msg.success) resolve(msg.result);
              else reject(new Error(msg.error));
            }
          };

          parentPort.on("message", handler);
          parentPort.postMessage({
            type: "api-call",
            id,
            namespace,
            method: methodName,
            args,
          });
        });
      });
    }

    // 直接注入到 globalThis，例如 globalThis.fs = { readFile, writeFile }
    jail.setSync(namespace, new ivm.ExternalCopy(globalProxy).copyInto());
  }

  // 5. 编译并执行代码
  const script = isolate.compileScriptSync(`(async function(){ ${code} })()`);
  const promiseRef = await script.run(context);
  const result = await promiseRef.get();

  context.release();
  isolate.dispose();
  return result;
}

bootIsolate()
  .then((res) =>
    parentPort.postMessage({ type: "result", success: true, data: res }),
  )
  .catch((err) =>
    parentPort.postMessage({
      type: "result",
      success: false,
      error: err.message,
    }),
  );
