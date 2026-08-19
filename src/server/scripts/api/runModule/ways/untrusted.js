// runUntrusted.js
import { Worker } from "worker_threads";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function runUntrusted(filePath, params, timeoutMs, perms) {
  if (perms === "Trusted")
    throw new Error("Trusted Script should not using runUntrusted");
  return runUntrustedEntry(
    await fs.readFile(filePath, "utf-8"),
    path.dirname(filePath),
    params,
    timeoutMs,
    perms,
  );
}

async function runUntrustedEntry(code, path, params, timeoutMs, perms) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.join(__dirname, "untrusted-worker.js"), {
      workerData: {
        code,
        params,
        perms,
        allowedRoot: path,
      },
      // 限制 Worker 自身的内存 (作为双重保险)
      resourceLimits: {
        maxOldGenerationSizeMb: 256,
        maxYoungGenerationSizeMb: 64,
      },
    });

    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error(`[Untrusted] 脚本执行超时(${timeoutMs}ms)`));
    }, timeoutMs);

    worker.on("message", (msg) => {
      if (msg.type === "result") {
        clearTimeout(timer);
        if (msg.success) resolve(msg.data);
        else reject(new Error(msg.error));
        worker.terminate(); // 执行完毕，销毁 Worker
      }
    });

    worker.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
      worker.terminate();
    });

    worker.on("exit", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`[Untrusted] Worker 意外退出，退出码: ${code}`));
      }
    });
  });
}
