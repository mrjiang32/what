import api from "../../api/api.js";
import chalk from "chalk";
import utils from "../../utils/utils.js";
import globalenv from "../../global/globalenv.js";

export default {
  insertAPIRoutes: {
    type: "init",
    job: async () => {
      globalenv.log.info("API    开始导入API路由");
      (await api.generate()).forEach((route) => {
        globalenv.app[route.method.toLowerCase()](route.path, route.handler);
        globalenv.log.info("API  " + utils.grayText(route.method + "  " + route.path));
      });
    },
  },
};
