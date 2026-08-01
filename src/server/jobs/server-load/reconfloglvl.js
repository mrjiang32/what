import logger from "../../utils/logger.js";

export default {
  banner: {
    type: "init",
    priority: 99,
    allowContext: true,
    job: async (ctx) => {
      logger.reConfigure(ctx.config.logLevel);
      ctx.log.info("LOGGER 重新调整日志等级为: " + ctx.config.logLevel);
    },
  },
};