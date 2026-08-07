import globalenv, { modifyContext } from "../../global/globalenv.js";
import crypto from "node:crypto";

export default {
  setSecret: {
    type: "init",
    job: () => {
      if(!globalenv.config.secret) {
        globalenv.config.secret = crypto.randomUUID();
        globalenv.rewrite = true;
      }
      globalenv.secret = globalenv.config.secret;
      globalenv.log.info(`SECRET set`);
      globalenv.log.debug(`SECRET: ${globalenv.secret}`);
    },
    priority: 5,
  },
};
