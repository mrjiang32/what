// src/server/tasks/runTrusted.js
import { Worker } from "worker_threads";
import global from "../../../../../global.js";
import path from "path";
import { fileURLToPath } from "url";
import TaskManager from "../manager/taskManager.js";

const workerPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "./runner.js",
);
const logger = global.logger.getByContext("Runner");

/**
 * 启动一个异步任务，返回 taskId
 * @returns {Promise<{ taskId: string, worker: Worker }>}
 */
export default async function runTrusted(filePath, params, timeoutMs, suiteName) {
  const taskId = crypto.randomUUID();
  const worker = new Worker(workerPath, {
    workerData: { filePath, params, taskId },
    execArgv: [],
  });

  // 将 worker 注册到 TaskManager
  TaskManager.create(taskId, worker, timeoutMs, filePath, params);

  // 监听 worker 消息
  worker.on("message", (msg) => {
    // 日志重定向：转发给 WebSocket 客户端
    if (msg?.type === "__LOG__") {
      const { level, args } = msg;
      if (typeof logger[level] === "function") {
        logger[level](args);
      }
      // 同时通过 TaskManager 推送给 WS 客户端
      TaskManager.log &&
        TaskManager.log(taskId, {
          type: 'log',
          level,
          args: msg.args,
        });
      return;
    }

    // 执行完成
    if (msg.type === "finish") {
      TaskManager.complete(taskId, msg.returnVal);
      return;
    }

    // 执行错误
    if (msg.type === "error") {
      TaskManager.error(taskId, new Error(msg.error.message));
      return;
    }
  });

  worker.on("error", (err) => {
    TaskManager.error(taskId, err);
  });

  worker.on("exit", (code) => {
    if (code !== 0) {
      TaskManager.error(taskId, new Error(`Worker 异常退出，退出码: ${code}`));
    }
  });

  return taskId;
}