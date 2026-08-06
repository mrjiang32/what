import chalk from "chalk";
import conf from "../../utils/config.js";
import utils from "../../utils/utils.js";
import globalenv from "../../global/globalenv.js";

const grayText = utils.grayText;

export default {
  jobResult: {
    type: "init",
    job: async () => {
      const loader = globalenv.mainLoader;
      const moduleList = loader.getModuleList();
      globalenv.log.debug("MODULE 加载的模块列表:");
      moduleList.forEach((module) => {
        globalenv.log.debug(grayText(module));
      });
    },
    priority: 95,
  },
};
