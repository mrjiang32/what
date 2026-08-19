import fs from "fs/promises";
import path from "path";
import { Worker } from "worker_threads";

export default async function runTrusted(filePath, params, timeoutMs, perms) {
  if (perms !== "Trusted")
    throw new Error("Untrusted Script should not using runTrusted");
  return new Promise((resolve, reject) => {
    // 使用 Worker 替代 child_process，开销更小且支持直接传参
    const worker = new Worker(filePath, {
      workerData: params,
      execArgv: [],
    });

    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error(`[Trusted] 套件执行超时(${timeoutMs}ms)`));
    }, timeoutMs);

    worker.on("message", (result) => {
      clearTimeout(timer);
      resolve(result);
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
