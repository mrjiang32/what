"use strict";

const { Service } = require("egg");
const fs = require("node:fs/promises");
const path = require("node:path");
const { Worker } = require("node:worker_threads");

class FunctionsService extends Service {
  async load() {
    const configPath = path.join(this.app.baseDir, "config", "functions.json");
    const registry = JSON.parse(await fs.readFile(configPath, "utf8"));
    if (registry.version !== 1 || !Array.isArray(registry.functions)) {
      throw new Error("functions.json 格式不受支持");
    }

    const functionRoot = path.join(this.app.baseDir, "app", "functions");
    const functions = new Map();
    for (const entry of registry.functions) {
      if (
        typeof entry.name !== "string" ||
        entry.name.trim() !== entry.name ||
        entry.name.length === 0 ||
        functions.has(entry.name) ||
        typeof entry.module !== "string" ||
        path.extname(entry.module) !== ".mjs"
      ) {
        throw new Error("functions.json 中存在无效或重复的函数登记");
      }

      const modulePath = path.resolve(functionRoot, entry.module);
      const relativePath = path.relative(functionRoot, modulePath);
      if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
        throw new Error(`函数 ${entry.name} 的模块路径超出 app/functions`);
      }
      await fs.access(modulePath);
      functions.set(entry.name, {
        name: entry.name,
        description: String(entry.description || ""),
        modulePath,
        exportName: entry.export || "default",
        timeoutMs: Number.isInteger(entry.timeoutMs)
          ? Math.min(Math.max(entry.timeoutMs, 100), 30000)
          : 5000,
        adminOnly: entry.adminOnly !== false,
      });
    }
    this.app.functionRegistry = functions;
  }

  list() {
    return [...this.app.functionRegistry.values()].map(({ name, description }) => ({ name, description }));
  }

  async run(name, params) {
    const definition = this.app.functionRegistry.get(name);
    if (!definition) throw new Error(`未登记函数：${name}`);
    if (definition.adminOnly && this.ctx.state.user?.role !== "admin") {
      throw new Error("无权限执行此函数");
    }

    const worker = new Worker(
      path.join(this.app.baseDir, "app", "worker", "function-worker.mjs"),
      {
        workerData: {
          modulePath: definition.modulePath,
          exportName: definition.exportName,
          params,
        },
        resourceLimits: { maxOldGenerationSizeMb: 64, stackSizeMb: 4 },
      },
    );

    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (callback, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        callback(value);
      };
      const timer = setTimeout(() => {
        void worker.terminate();
        finish(reject, new Error(`函数执行超时：${name}`));
      }, definition.timeoutMs);

      worker.once("message", message => {
        if (message.type === "result") finish(resolve, message.value);
        else finish(reject, new Error(message.error || "函数执行失败"));
      });
      worker.once("error", error => finish(reject, error));
      worker.once("exit", code => {
        if (code !== 0) finish(reject, new Error(`Worker 异常退出：${code}`));
      });
    });
  }
}

module.exports = FunctionsService;