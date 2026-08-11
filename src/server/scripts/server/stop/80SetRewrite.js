import globalenv from "../../global/globalenv.js";
import config from "../../utils/config.js";

export default {
  reWrite: {
    type: "stopParallel",
    job: async () => {
      if(globalenv.rewrite) {
        globalenv.log.info(`配置文件需要重新写入`);
        await config.saveConfigAsync(globalenv.config);
      }
    },
    priority: 5,
  },
}