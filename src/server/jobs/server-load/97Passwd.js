import conf from "../../utils/config.js";
import globalenv from "../../global/globalenv.js";

export default {
  showPasswd: {
    type: "init",
    job: async () => {
      if (
        !globalenv.config.users["admin"].defaultPasswd
      ) {
        return;
      }
      let log = globalenv.log;
      console.log();
      log.info("-----------------------------------------");
      log.info("默认用户: admin");
      log.info("默认密码: " + globalenv.config.users["admin"].defaultPasswd);
      log.info("-----------------------------------------");
      console.log();
    },
  },
};
