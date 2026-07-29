import { bus } from "../class/SafeEventEmitter.js";

export default {
  init: {
    name: "初始化任务",
    requiredKeys: {
      allowContext: "boolean",
      job: "function",
      priority: "number",
    },
    comparePriority: (jobA, jobB) => {
      if (jobA.priority > jobB.priority) return -1;
      if (jobA.priority < jobB.priority) return 1;
      return 0;
    },
    processMethod: (jobItem, globalCtx) => {
      bus.on("system:init", async () => {
        const ctx = jobItem.allowContext ? globalCtx : null;
        await jobItem.job(ctx);
      });
    },
  },
  initParallel: {
    name: "[并行] 初始化任务",
    requiredKeys: {
      allowContext: "boolean",
      job: "function",
      priority: "number",
    },
    comparePriority: (jobA, jobB) => {
      if (jobA.priority > jobB.priority) return -1;
      if (jobA.priority < jobB.priority) return 1;
      return 0;
    },
    processMethod: (jobItem, globalCtx) => {
      bus.on("system:init.parallel", async () => {
        const ctx = jobItem.allowContext ? globalCtx : null;
        await jobItem.job(ctx);
      });
    },
  },
  stop: {
    name: "停机任务",
    requiredKeys: {
      allowContext: "boolean",
      job: "function",
      priority: "number",
    },
    comparePriority: (jobA, jobB) => {
      if (jobA.priority > jobB.priority) return -1;
      if (jobA.priority < jobB.priority) return 1;
      return 0;
    },
    processMethod: (jobItem, globalCtx) => {
      bus.on("system:stop", async () => {
        const ctx = jobItem.allowContext ? globalCtx : null;
        await jobItem.job(ctx);
      });
    },
  },
  stopParallel: {
    name: "[并行] 停机任务",
    requiredKeys: {
      allowContext: "boolean",
      job: "function",
      priority: "number",
    },
    comparePriority: (jobA, jobB) => {
      if (jobA.priority > jobB.priority) return -1;
      if (jobA.priority < jobB.priority) return 1;
      return 0;
    },
    processMethod: (jobItem, globalCtx) => {
      bus.on("system:stop.parallel", async () => {
        const ctx = jobItem.allowContext ? globalCtx : null;
        await jobItem.job(ctx);
      });
    },
  },
  timer: {
    name: "定时任务",
    requiredKeys: {
      allowContext: "boolean",
      job: "function",
      interval: "number",
    },
    processMethod: (jobItem, globalCtx, timerMap) => {
      const { interval, job, allowContext } = jobItem;
      timerMap.has(jobItem) && clearInterval(timerMap.get(jobItem));
      let isRunning = false;
      const run = async () => {
        if (isRunning) return;
        isRunning = true;
        try {
          await job(allowContext ? globalCtx : null);
        } catch (e) {
          globalCtx.log.error("定时任务异常", e);
        } finally {
          isRunning = false;
        }
      };
      const tid = setInterval(run, interval);
      timerMap.set(jobItem, tid);
    },
  },
};
