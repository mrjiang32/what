// src/server/runModule/manager/taskManager.js
import { Worker } from "worker_threads";

class TaskManager {
  constructor() {
    this.tasks = new Map();
    // 每个 taskId 维护一个日志缓冲（最多保留最近 N 条）
    this.logBuffers = new Map();
    // 支持多个订阅者，避免回调被覆盖
    this.messageListeners = new Set();
    this.MAX_BUFFER_SIZE = 500;
  }

  // --- 订阅管理 ---

  addOnMessage(fn) {
    this.messageListeners.add(fn);
  }

  removeOnMessage(fn) {
    this.messageListeners.delete(fn);
  }

  // --- 内部广播 ---

  _broadcast(taskId, msg) {
    // 日志类消息写入缓冲
    if (msg.type === "log") {
      if (!this.logBuffers.has(taskId)) {
        this.logBuffers.set(taskId, []);
      }
      const buffer = this.logBuffers.get(taskId);
      buffer.push(msg);
      if (buffer.length > this.MAX_BUFFER_SIZE) {
        buffer.shift();
      }
    }

    // 广播给所有监听者
    for (const fn of this.messageListeners) {
      try {
        fn(taskId, msg);
      } catch (e) {
        // 忽略单个监听者的异常，不影响其他订阅者
      }
    }
  }

  /**
   *
   * @param {*} taskId
   * @param {Worker} worker
   * @param {*} timeoutMs
   * @param {*} filePath
   * @param {*} params
   */
  create(taskId, worker, timeoutMs, filePath, params) {
    const timer = setTimeout(() => {
      this.terminate(
        taskId,
        new Error(`[TaskManager] 任务超时(${timeoutMs}ms)`),
      );
    }, timeoutMs);

    this.tasks.set(taskId, { worker, timer, filePath, params });
  }

  _broadcastError(taskId, message) {
    this._broadcastMessage(taskId, { type: "error", error: { message } });
  }

  static setOnMessage(fn) {
    TaskManager._onMessage = fn;
  }

  list() {
    return Array.from(this.tasks.entries()).map(([id, t]) => ({
      taskId: id,
      filePath: t.filePath,
      runningSince: t.timer._idleStart ? new Date().toISOString() : null,
    }));
  }

  // --- 获取缓冲日志 ---

  getBufferedLogs(taskId) {
    return this.logBuffers.get(taskId) || [];
  }

  // --- 任务管理 ---

  set(taskId, task) {
    this.tasks.set(taskId, task);
  }

  get(taskId) {
    return this.tasks.get(taskId);
  }

  delete(taskId) {
    this.tasks.delete(taskId);
    this.logBuffers.delete(taskId);
  }

  list() {
    return Array.from(this.tasks.entries()).map(([id, task]) => ({
      taskId: id,
      ...task,
    }));
  }

  // --- 任务状态变更（广播） ---

  complete(taskId, result) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = "completed";
      task.result = result;
    }
    this._broadcast(taskId, { type: "completed", taskId, result });
    // 任务结束后清理缓冲
    this.logBuffers.delete(taskId);
  }

  error(taskId, error) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = "error";
      task.error = error.message;
    }
    this._broadcast(taskId, { type: "error", taskId, error: error.message });
    this.logBuffers.delete(taskId);
  }

  log(taskId, message) {
    this._broadcast(taskId, { type: "log", taskId, message });
  }

  async terminate(taskId, error) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = "terminated";
      if (task.worker) {
        task.worker
          .terminate()
          .then((n) => console.log(`Task exited with ${n}`))
          .catch((e) => console.error(e));
      }
    }
    this._broadcast(taskId, {
      type: "terminated",
      taskId,
      reason: error.message,
    });
    this.logBuffers.delete(taskId);
  }
}

// 单例导出
const taskManager = new TaskManager();
export default taskManager;
