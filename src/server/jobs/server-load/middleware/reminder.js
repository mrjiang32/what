import utils from "../../../utils/utils.js";
import chalk from "chalk";

const grayText = utils.grayText;

export default {
  reminder: {
    type: "expressMiddleWare",
    job: (req, res, next) => {
      const middleWareLog = req.$ctx.accesslog;
      middleWareLog.debug(
          grayText(
            `${chalk.gray(req.ip)} ${chalk.gray(req.method)} ${req.path}`,
          ),
      );
      next();
    },
    priority: 95,
  },
};
