import config from "../../utils/config.js";
import path from "path";
import utils from "../../utils/utils.js";

export default {
  writeUptime: {
    type: "stop",
    job: async (ctx) => {
        ctx.log.info("退出");
        process.exit(0);
    },
    allowContext: true,
    priority: -1,
  },
};
