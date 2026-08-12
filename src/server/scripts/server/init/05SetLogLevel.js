import global from "../../../global.js";

export default async () => {
  const logger = global.loggerMgr;
  logger.reConfigure(global.config.logLevel);
  global.logger
    .getByContext("SetLogLevel")
    .info("重新调整日志等级为: " + global.config.logLevel);
};
