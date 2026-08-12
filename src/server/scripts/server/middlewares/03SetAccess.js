import utils from "../../utils/utils.js";
import global from "../../../global.js";
import chalk from "chalk";

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
};

const logger = global.logger.getByContext("Access");

export default (req, res, next) => {
  res.on("finish", () => {
    logger.debug(
      ` - ${chalk.gray(req.ip)} ${chalk.gray(req.method)} ${req.path} ${colorStatusCode(res.statusCode)}`,
    );
  });
  next();
};
