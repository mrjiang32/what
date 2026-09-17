import chalk from "chalk";
import global from "../../../global.js";
import TaskWebSocket from "../utils/ws/taskWebSocket.js";

export default async () => {
  let logger = global.logger.getByContext("Listen");
  global.server.httpServer = await new Promise((resolve, reject) => {
    const httpServer = global.server.app.listen(
      global.config.server.port,
      () => {
        logger.info(
          `服务器监听 ${chalk.blueBright(
            "http://" +
              global.config.server.host +
              ":" +
              global.config.server.port,
          )}`,
        );
        logger.info(chalk.gray(" - 使用ctrl+鼠标左键在浏览器中打开."));
        resolve(httpServer);
      },
    );
    // use the local httpServer instance returned by app.listen so ws gets a real server
    global.server.taskWsServer = new TaskWebSocket(httpServer);
    logger.info("已挂载ws服务器");
    httpServer.on("error", reject);
  });
};
