import { Worker } from "worker_threads";
import global from "../../../../../global.js"
import path from "path";
import { fileURLToPath } from "url"

const workerPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "./runner.js");
const logger = global.logger.getByContext("runner");

export default async function runTrusted(filePath, params, timeoutMs, suiteName) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, {
      workerData: { filePath, params },
      execArgv: [],
    });

    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error(`[Trusted] 套件执行超时(${timeoutMs}ms)`));
    }, timeoutMs);
    worker.on("message", (msg) => {
      // logger.info(JSON.stringify(msg, null, 2));
      // 1. 日志重定向
      if (msg?.type === "__LOG__") {
        const { level, args } = msg;
        if (typeof logger[level] === "function") {
          logger[level](suiteName, ": ", ...args);
        }
        return;
      }

      // 2. 执行结果
      if (msg.type === "finish") {
        clearTimeout(timer);
        resolve(msg.returnVal);
        return;
      }

      // 3. 执行错误
      if (msg.type === "error") {
        clearTimeout(timer);
        const err = new Error(msg.error.message);
        err.stack = msg.error.stack;
        reject(err);
        return;
      }

      // 4. 兼容旧格式（直接传结果）
      clearTimeout(timer);
      resolve(msg);
    });

    worker.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    worker.on("exit", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`[Trusted] Worker 异常退出，退出码: ${code}`));
      }
    });
  });
}