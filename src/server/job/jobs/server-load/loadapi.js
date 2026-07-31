import api from "../../../api/api.js";
import chalk from "chalk";
import utils from "../../../utils/utils.js";

export default {
  insertAPIRoutes: {
    type: "init",
    job: ({ app, log }) => {
      log.info("API   开始导入API路由");
      api.forEach((route) => {
        app[route.method.toLowerCase()](route.path, route.handler);
        log.info("API " + utils.grayText(route.method + "  " + route.path));
      });
    },
    allowContext: true,
    priority: 95,
  },
};
