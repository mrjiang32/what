import chalk from "chalk";
import config from "../../utils/config.js";
import global from "../../../global.js";

export default async () => {
  let log = global.logger.getByContext("ReadConfig");
  log.info("读取配置文件");
  log.info(
      chalk.gray(
        ` - 从"${chalk.blueBright(global.args["config-file"] || config.configFilePath)}"读取配置文件`,
      )
  );
  log.info(
    chalk.gray(
      ` - 从"${chalk.blueBright(global.args["users-file"] || config.usersFilePath)}"读取用户配置文件`,
    )
  );
  await config.createFile();
  try {
    global.config = await config.readConfigAsync();
    global.users = await config.readUsersAsync();
    log.info("配置文件读取成功");
  } catch (err) {
    log.error(`读取配置文件出现错误: ${err}`);
    global.config = config.defaultConfig;
    global.users = config.defaultUsers;
    log.info("默认配置文件已加载");
  }
  if (global.args?.debug) {
    global.config.logLevel = "debug";
    global.debug = true;
  }
};
