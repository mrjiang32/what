// src/server/tasks/TaskManager.js
class TaskManager {
  constructor() {
    // Map<taskId, { worker, resolve, reject, timer, filePath, params, timeoutMs }>
    this.tasks = new Map();
  }

  create(taskId, worker, timeoutMs, filePath, params) {
    const timer = setTimeout(() => {
      this.terminate(taskId, new Error(`[TaskManager] 任务超时(${timeoutMs}ms)`));
    }, timeoutMs);

    this.tasks.set(taskId, { worker, timer, filePath, params });
  }

  get(taskId) {
    return this.tasks.get(taskId) || null;
  }

  async terminate(taskId, reason) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    try {
      task.worker.terminate();
    } catch (e) {
      // worker 可能已经退出
    }
    clearTimeout(task.timer);
    this.tasks.delete(taskId);

    if (reason) {
      // 如果有对应的 WebSocket 连接，推送错误消息
      this._broadcastError(taskId, reason.message);
    }
  }

  complete(taskId, result) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    clearTimeout(task.timer);
    this.tasks.delete(taskId);
    this._broadcastMessage(taskId, { type: 'finish', returnVal: result });
  }

  error(taskId, error) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    clearTimeout(task.timer);
    this.tasks.delete(taskId);
    this._broadcastMessage(taskId, {
      type: 'error',
      error: { message: error.message, stack: error.stack }
    });
  }

  // 预留：向特定 taskId 的 WebSocket 连接推送消息
  _broadcastMessage(taskId, msg) {
    // 由 WebSocket handler 注册回调来接收
    if (TaskManager._onMessage) {
      TaskManager._onMessage(taskId, msg);
    }
  }

  _broadcastError(taskId, message) {
    this._broadcastMessage(taskId, { type: 'error', error: { message } });
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
}

export default new TaskManager();