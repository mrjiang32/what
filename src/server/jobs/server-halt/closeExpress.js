import config from "../../utils/config.js";
import path from "path";
import utils from "../../utils/utils.js";

export default {
  writeUptime: {
    type: "stop",
    job: async (ctx) => {
      await ctx.abort.emitSafeParallel("close");
      await new Promise((res) => {
        if (!ctx.server?.close) {
          return res();
        }
        ctx.server.close(res);
      });
      ctx.log.info("已关闭Express服务");
    },
    allowContext: true,
    priority: 0,
  },
};
