export default {
  init: {
    name: "初始化任务",
    requiredKeys: {
      allowContext: "boolean",
      job: "function",
      priority: "number",
    },
  },
  stop: {
    name: "停机任务",
    requiredKeys: {
      allowContext: "boolean",
      job: "function",
      priority: "number",
    },
  },
  timer: {
    name: "定时任务",
    requiredKeys: {
      allowContext: "boolean",
      job: "function",
      interval: "number",
    },
  },
};