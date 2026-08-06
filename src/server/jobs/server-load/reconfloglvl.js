import logger from "../../utils/logger.js";
import globalenv from "../../global/globalenv.js";

export default {
  banner: {
    type: "init",
    priority: 99,
    job: async () => {
      logger.reConfigure(globalenv.config.logLevel);
      globalenv.log.info("LOGGER 重新调整日志等级为: " + globalenv.config.logLevel);
    },
  },
};