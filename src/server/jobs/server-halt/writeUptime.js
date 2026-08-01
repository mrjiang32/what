import config from "../../utils/config.js";
import path from "path";
import utils from "../../utils/utils.js";

/**
 * 运行时长持久化文件路径
 */
const uptimeFilePath = path.join(config.configDirPath, "uptime.json");
/**
 * 进程启动时间戳
 */
const startTime = Date.now();

export default {
  writeUptime: {
    type: "stopParallel",
    name: "持久化累计运行时长",
    job: async (ctx) => {
      const uptimeData = await utils.jsonSimpleR(uptimeFilePath);
      const duration = Date.now() - startTime;
      // 兜底初始化
      if (typeof uptimeData.uptime !== "number") uptimeData.uptime = 0;
      uptimeData.uptime += duration;
      await utils.jsonSimpleW(uptimeFilePath, uptimeData);
    },
    allowContext: true,
    priority: -1,
  },
};
