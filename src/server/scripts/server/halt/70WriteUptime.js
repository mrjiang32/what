import config from "../utils/config.js";
import path from "path";
import utils from "../utils/utils.js";
import global from "../../../global.js";

const uptimeFilePath = path.join(config.configDirPath, "uptime.json");

export default async () => {
  const uptimeData = await utils.jsonSimpleR(uptimeFilePath);
  const duration = Date.now() - global.startTime;
  if (typeof uptimeData.uptime !== "number") uptimeData.uptime = 0;
  uptimeData.uptime += duration;
  global.logger
    .getByContext("Uptime")
    .info("服务器正常运行时间: " + utils.formatTime(uptimeData.uptime));
  await utils.jsonSimpleW(uptimeFilePath, uptimeData);
};
