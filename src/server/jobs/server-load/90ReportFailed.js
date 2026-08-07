import globalenv from "../../global/globalenv.js";

export default {
  reportFailed: {
    type: "init",
    job: () => {
      if (Array.isArray(globalenv.failedJobs))
        if (globalenv.failedJobs.length > 0) {
          globalenv.log.error("配置失败的任务：");
          globalenv.failedJobs.forEach((jobKey) => {
            globalenv.log.error(` - ${jobKey}`);
          });
        }
    },
  },
};
