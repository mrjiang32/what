import { bus } from "../classes/SafeEventEmitter.js";
import globalenv from "./globalenv.js";

export default {
  init: {
    name: "初始化任务",
    requiredKeys: {
      job: "function",
      priority: "number",
    },
    comparePriority: (jobA, jobB) => {
      if (jobA.priority > jobB.priority) return -1;
      if (jobA.priority < jobB.priority) return 1;
      return 0;
    },
    processMethod: (jobItem) => {
      bus.on("system:init", async () => {
        await jobItem.job();
      });
    },
  },
  initParallel: {
    name: "[并行] 初始化任务",
    requiredKeys: {
      job: "function",
      priority: "number",
    },
    comparePriority: (jobA, jobB) => {
      if (jobA.priority > jobB.priority) return -1;
      if (jobA.priority < jobB.priority) return 1;
      return 0;
    },
    processMethod: (jobItem) => {
      bus.on("system:init.parallel", async () => {
        await jobItem.job();
      });
    },
  },
  stop: {
    name: "停机任务",
    requiredKeys: {
      job: "function",
      priority: "number",
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
  },
  stopParallel: {
    name: "[并行] 停机任务",
    requiredKeys: {
      job: "function",
      priority: "number",
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
          globalenv.log.error("定时任务异常", e);
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
      priority: "number",
    },
    comparePriority: (jobA, jobB) => {
      if (jobA.priority > jobB.priority) return -1;
      if (jobA.priority < jobB.priority) return 1;
      return 0;
    },
    processMethod: (jobItem) => {
      if (jobItem.allowContext === true) {
        globalenv.app.use((...args) => {
          args.push(globalenv);
          return jobItem.job(...args);
        });
      } else {
        globalenv.app.use(jobItem.job);
      }
    },
  },
};
