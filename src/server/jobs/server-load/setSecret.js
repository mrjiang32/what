import globalenv, { modifyContext } from "../../global/globalenv.js";
import crypto from "node:crypto";

export default {
  setSecret: {
    type: "init",
    job: () => {
      const secret = crypto.randomUUID();
      modifyContext("secret", secret);
      globalenv.log.info(`SECRET generated`);
      globalenv.log.debug(`SECRET: ${secret}`);
    },
    priority: 5,
  },
};
