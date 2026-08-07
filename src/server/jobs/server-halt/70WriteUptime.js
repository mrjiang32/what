import config from "../../utils/config.js";
import path from "path";
import utils from "../../utils/utils.js";
import globalenv from "../../global/globalenv.js";

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
    job: async () => {
      const uptimeData = await utils.jsonSimpleR(uptimeFilePath);
      const duration = Date.now() - startTime;
      // 兜底初始化
      if (typeof uptimeData.uptime !== "number") uptimeData.uptime = 0;
      uptimeData.uptime += duration;
      globalenv.log.info("服务器正常运行时间: " + utils.formatTime(uptimeData.uptime))
      await utils.jsonSimpleW(uptimeFilePath, uptimeData);
      globalenv.log.info("写入uptime");
    },
    priority: -1,
  },
};
