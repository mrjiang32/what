import chalk from "chalk";
import config from "../../utils/config.js";
import global from "../../../global.js";

export default async () => {
  let log = global.logger.getByContext("ReadConfig");
  log.info(
      chalk.gray(
        ` - 从"${chalk.blueBright(global.args["config-file"] || config.configFilePath)}"读取配置文件`,
      )
  );
  await config.createFile();
  try {
    global.config = await config.readConfigAsync();
  } catch (err) {
    log.error("CONFIG " + `读取配置文件出现错误: ${err}`);
    global.config = config.defaultConfig;
  }
  if (global.args?.debug) {
    global.config.logLevel = "debug";
    global.debug = true;
  }
};
