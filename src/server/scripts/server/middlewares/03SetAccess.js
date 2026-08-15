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
    let method = "debug";
    if (res.statusCode == 200) {
      method = "info";
    }

    logger[method](
      ` - ${chalk.gray(req.ip)} ${chalk.gray(req.method)} ${colorStatusCode(res.statusCode)} ${req.path}`,
    );
  });
  next();
};
