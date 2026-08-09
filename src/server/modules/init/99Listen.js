import chalk from "chalk";
import utils from "../../utils/utils.js";
import globalenv from "../../global/globalenv.js";

export default {
  banner: {
    type: "init",
    job: async () => {
      globalenv.server = await new Promise((resolve, reject) => {
        const httpServer = globalenv.app.listen(
          globalenv.config.server.port,
          () => {
            globalenv.log.info(
              `LISTEN 服务器监听 ${chalk.blueBright(
                "http://" +
                  globalenv.config.server.host +
                  ":" +
                  globalenv.config.server.port,
              )}`,
            );
            globalenv.log.info("LISTEN " + utils.grayText("使用ctrl+鼠标左键在浏览器中打开."));
            resolve(httpServer);
          },
        );
        httpServer.on("error", reject);
      });
    },
  },
};
