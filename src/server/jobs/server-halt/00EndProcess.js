import config from "../../utils/config.js";
import path from "path";
import utils from "../../utils/utils.js";
import globalenv from "../../global/globalenv.js";

export default {
  writeUptime: {
    type: "stop",
    job: async () => {
        globalenv.log.info("退出");
        process.exit(0);
    },
    priority: -1,
  },
};
