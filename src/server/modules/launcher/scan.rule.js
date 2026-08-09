import { bus } from "../classes/SafeEventEmitter.js";
import global from "../global.js";

export default {
  init: {
    name: "初始化任务",
    requiredKeys: {
      job: "function",
    },
    comparePriority: (jobA, jobB) => {
      // priority越小，越靠前执行（适配linux文件名序号：00最先）
      if (jobA.priority < jobB.priority) return -1;
      if (jobA.priority > jobB.priority) return 1;
      return (jobA._innerSeq ?? 0) - (jobB._innerSeq ?? 0);
    },
    processMethod: (jobItem) => {
      bus.on("system:init", async () => {
        await jobItem.job();
      });
    },
    overridePriority: true,
  },
  initParallel: {
    name: "[并行] 初始化任务",
    requiredKeys: {
      job: "function",
    },
    comparePriority: (jobA, jobB) => {
      // priority越小，越靠前执行（适配linux文件名序号：00最先）
      if (jobA.priority < jobB.priority) return -1;
      if (jobA.priority > jobB.priority) return 1;
      return (jobA._innerSeq ?? 0) - (jobB._innerSeq ?? 0);
    },
    processMethod: (jobItem) => {
      bus.on("system:init.parallel", async () => {
        await jobItem.job();
      });
    },
    overridePriority: true,
  },
  stop: {
    name: "停机任务",
    requiredKeys: {
      job: "function",
    },
    comparePriority: (jobA, jobB) => {
      if (jobA.priority > jobB.priority) return -1;
      if (jobA.priority < jobB.priority) return 1;
      return 0;
    },
    processMethod: (jobItem) => {
      bus.on("system:stop", async () => {
        await jobItem.job();
      });
    },
    overridePriority: true,
  },
  stopParallel: {
    name: "[并行] 停机任务",
    requiredKeys: {
      job: "function",
    },
    comparePriority: (jobA, jobB) => {
      if (jobA.priority > jobB.priority) return -1;
      if (jobA.priority < jobB.priority) return 1;
      return 0;
    },
    processMethod: (jobItem) => {
      bus.on("system:stop.parallel", async () => {
        await jobItem.job();
      });
    },
    overridePriority: true,
  },
  timer: {
    name: "定时任务",
    requiredKeys: {
      job: "function",
      interval: "number",
    },
    processMethod: (jobItem, timerMap) => {
      const { interval, job } = jobItem;
      timerMap.has(jobItem) && clearInterval(timerMap.get(jobItem));
      let isRunning = false;
      const run = async () => {
        if (isRunning) return;
        isRunning = true;
        try {
          await job();
        } catch (e) {
          global.log.error("定时任务异常", e);
        } finally {
          isRunning = false;
        }
      };
      const tid = setInterval(run, interval);
      timerMap.set(jobItem, tid);
    },
  },
  expressMiddleWare: {
    name: "Express 中间件",
    requiredKeys: {
      job: "function",
    },
    comparePriority: (jobA, jobB) => {
      if (jobA.priority < jobB.priority) return -1;
      if (jobA.priority > jobB.priority) return 1;
      return (jobA._innerSeq ?? 0) - (jobB._innerSeq ?? 0);
    },
    processMethod: (jobItem) => {
      if (jobItem.allowContext === true) {
        global.app.use((...args) => {
          args.push(global);
          return jobItem.job(...args);
        });
      } else {
        global.app.use(jobItem.job);
      }
    },
    overridePriority: true,
  },
};
