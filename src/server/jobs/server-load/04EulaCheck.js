import chalk from "chalk";
import conf from "../../utils/config.js";
import utils from "../../utils/utils.js";
import globalenv from "../../global/globalenv.js";

const grayText = utils.grayText;

export default {
  readConfig: {
    type: "init",
    job: async () => {
      let log = globalenv.log;
      if(!globalenv.config.eula) {
        log.error("EULA   未同意最终用户许可协议(EULA), 请在配置文件中设置 eula=true 来同意.");
        globalenv.shutdown("EULA=FALSE");
      } else {
        log.info("EULA   已同意最终用户许可协议(EULA).");
      }
    },
  },
};
