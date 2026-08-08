import utils from "../../utils/utils.js";
import chalk from "chalk";
import globalenv from "../../global/globalenv.js";

const grayText = utils.grayText;

const colorStatusCode = (code) => {
  if (code >= 200 && code < 300) {
    return chalk.green(code);
  } else if (code >= 400 && code < 500) {
    return chalk.red(code);
  } else if (code >= 400 && code < 500) {
    return chalk.yellowBright(code);
  } else {
    return code;
  }
}

export default {
  reminder: {
    type: "expressMiddleWare",
    job: (req, res, next) => {
      const middleWareLog = globalenv.accesslog;
      res.on("finish", () => {
        middleWareLog.debug(
          grayText(
            `${chalk.gray(req.ip)} ${chalk.gray(req.method)} ${req.path} ${colorStatusCode(res.statusCode)}`,
          ),
        );
      });
      next();
    },
  },
};
