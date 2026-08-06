import config from "../../utils/config.js";
import path from "path";
import utils from "../../utils/utils.js";
import globalenv from "../../global/globalenv.js";

export default {
  writeUptime: {
    type: "stop",
    job: async () => {
      await globalenv.abort.emitSafeParallel("close");
      await new Promise((res) => {
        if (!globalenv.server?.close) {
          return res();
        }
        globalenv.server.close(res);
      });
      globalenv.log.info("已关闭Express服务");
    },
    allowContext: true,
    priority: 0,
  },
};
