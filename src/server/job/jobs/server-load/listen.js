import chalk from "chalk";
import utils from "../../../utils/utils.js";

export default {
  banner: {
    type: "init",
    priority: 0,
    allowContext: true,
    job: async (ctx) => {
      ctx.server = await new Promise((resolve, reject) => {
        const httpServer = ctx.app.listen(
          ctx.config.server.port,
          () => {
            ctx.log.info(
              `LIS   服务器监听 ${chalk.blueBright(
                "http://" +
                  ctx.config.server.host +
                  ":" +
                  ctx.config.server.port,
              )}`,
            );
            ctx.log.info("LIS" + utils.grayText("使用ctrl+鼠标左键在浏览器中打开."));
            resolve(httpServer);
          },
        );
        httpServer.on("error", reject);
      });
    },
  },
};
