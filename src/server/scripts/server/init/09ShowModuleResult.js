import utils from "../utils/utils.js";
import global from "../../../global.js";
import sourceMain from "../../../global/main.js";
import path from "path";
import chalk from "chalk";

const grayText = utils.grayText;

const getArray = async (type) =>  (await sourceMain.sources[type].source.toIdArray()).map(id => path.join(sourceMain.sources[type].source.source.dirPath, id))
  
export default async () => {
  const moduleList = [].concat(await getArray("server/init"), await getArray("server/halt"))
  const logger = global.logger.getByContext("Modules");
  logger.debug("加载的模块列表：");
  moduleList.forEach((module) => {
    logger.debug(chalk.gray(` - 加载内置模块：${module}`));
  });
};
