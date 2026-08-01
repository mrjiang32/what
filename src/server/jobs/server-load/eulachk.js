import chalk from "chalk";
import conf from "../../utils/config.js";
import utils from "../../utils/utils.js";

const grayText = utils.grayText;

export default {
  readConfig: {
    type: "init",
    job: async (ctx) => {
      let log = ctx.log;
      if(!ctx.config.eula) {
        log.error("EULA   未同意最终用户许可协议(EULA), 请在配置文件中设置 eula=true 来同意.");
        ctx.shutdown("EULA=FALSE");
      } else {
        log.info("EULA   已同意最终用户许可协议(EULA).");
      }
    },
    allowContext: true,
    priority: 99.5,
  },
};
