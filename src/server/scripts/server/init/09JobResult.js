import utils from "../../utils/utils.js";
import global from "../../../global.js";
import sourceMain from "../../../global/main.js";
import path from "path";

const grayText = utils.grayText;

const getArray = async (type) =>  (await sourceMain.sources[type].source.toIdArray()).map(id => path.join(sourceMain.sources[type].source.source.dirPath, id))
  
export default async () => {
  const moduleList = [].concat(await getArray("server/init"), await getArray("server/halt"))
  const logger = global.logger.getByContext("JobResult");
  logger.debug("Loaded Modules:");
  moduleList.forEach((module) => {
    logger.debug(grayText(module));
  });
};
