import chalk from "chalk";
import conf from "../../utils/config.js";
import utils from "../../utils/utils.js";

const grayText = utils.grayText;

export default {
  readConfig: {
    type: "init",
    job: async (ctx) => {
      let log = ctx.log;
      log.info("CONFIG 读取配置文件");
      // 读取配置文件
      // TODO: 添加命令行支持，从 --config [configPath] 读取（若有）
      log.info(
        "CONFIG " +
          grayText(`从"${chalk.blueBright(conf.configFilePath)}"读取配置文件`),
      );
      await conf.createFile();
      try {
        ctx.config = await conf.readConfigAsync();
        log.info("CONFIG " + grayText(`配置文件读取成功`));
      } catch (err) {
        log.error("CONFIG " + `读取配置文件出现错误: ${err}`);
        log.error("CONFIG " + `进入无头模式`);
        ctx.config = conf.defaultConfig;
      }
    },
    allowContext: true,
    priority: 100,
  },
};
