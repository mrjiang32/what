import express from "express";
import chalk from "chalk";
import logger from "./utils/logger.js";
import utils from "./utils/utils.js";
import initializer from "./initializer.js";

// 覆盖方法
const formatRuntime = utils.formatTime;
const grayText = utils.grayText;

async function main() {
  // What Logo，赋值并打印
  const logo = `I8,        8        ,8I  88                                 ad88888ba   
\`8b       d8b       d8'  88                         ,d     d8"     "8b  
 "8,     ,8"8,     ,8"   88                         88     ""      a8P  
  Y8     8P Y8     8P    88,dPPYba,   ,adPPYYba,  MM88MMM       ,a8P"   
  \`8b   d8' \`8b   d8'    88P'    "8a  ""     \`Y8    88         d8"      
   \`8a a8'   \`8a a8'     88       88  ,adPPPPP88    88         ""       
    \`8a8'     \`8a8'      88       88  88,    ,88    88,        aa       
     \`8'       \`8'       88       88  \`"8bbdP"Y8    "Y888      88       `;
  console.log(chalk.green(logo));

  // 初始化日志系统
  await logger.init();
  const log = logger.newLogger("Launcher");

  const shutdown = (signal) => {
    log.info(`${chalk.red(signal)}`);
    const shutdownFunction = async () => {
      await Promise.all(
        Object.keys(initializer.stop).map((k) => initializer.stop[k].job()),
      );
      process.exit(0);
    };
    if (initializer.server?.close) {
      initializer.server.close(shutdownFunction);
    } else {
      shutdownFunction();
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // 读取
  await Promise.all(
    Object.keys(initializer.beforeInit).map((k) => initializer.beforeInit[k]()),
  );

  // 处理注入
  const injection = structuredClone
    ? structuredClone(initializer.config.injection)
    : JSON.parse(JSON.stringify(initializer.config.injection));
  const processKeys = ["init", "stop", "timerJobs"];
  const processKeysExplain = {
    timerJobs: "定时任务",
    init: "初始化任务",
    stop: "停机任务",
  };

  processKeys.forEach((k) => {
    if (injection[k]) {
      Object.keys(injection[k]).map((key) => {
        if (typeof injection[k][key] === "object" && injection[k][key].job) {
          injection[k][key].injected = true;
          if (!injection[k][key].allowContext) {
            injection[k][key].job = new Function(
              `return (${injection[k][key].job})`,
            )();
          }
        } else {
          log.error(
            `配置文件中 "injection.${k}.${key}" ${injection[k][key].job ? "缺失job部分" : "不是一个对象"}`,
          );
          delete injection[k][key];
        }
      });
      initializer[k] = { ...initializer[k], ...injection[k] };
    }
    const taskArray = Object.keys(initializer[k]);
    log.info(
      `待完成 ${chalk.blueBright(processKeysExplain[k])} : 共 ${chalk.green(taskArray.length)} 项`,
    );
    taskArray.forEach((key) => {
      if (initializer[k][key].injected) {
        key += chalk.green(" (+)");
      }
      log.info(grayText(key));
    });
  });

  // const allTasks = Object.keys({
  //   ...initializer.beforeInit,
  //   ...initializer.init,
  // });

  // log.info(`初始化任务: 共 ${chalk.green(allTasks.length)} 项`);

  // allTasks.forEach((value) => {
  //   log.info(grayText(value));
  // });

  // const timerJobs = Object.keys(initializer.timerJobs);

  // log.info(`定时任务: 共 ${chalk.green(timerJobs.length)} 项`);

  // timerJobs.forEach((value) => {
  //   if (initializer.timerJobs[value].injected === true) {
  //     value += chalk.green(" (+)");
  //   }
  //   log.info(grayText(value));
  // });

  // try {
  // 等待所有初始化函数执行完成
  await Promise.all(
    Object.keys(initializer.init).map((k) => initializer.init[k].job()),
  );

  Object.keys(initializer.timerJobs).forEach((k) => {
    setInterval(
      initializer.timerJobs[k].allowContext
        ? initializer.timerJobs[k].job
        : new Function(`return (${initializer.timerJobs[k].job})`)(),
      initializer.timerJobs[k].interval,
    );
  });

  initializer.server = await new Promise((resolve, reject) => {
    const httpServer = initializer.app.listen(
      initializer.config.server.port,
      () => {
        log.info(
          `服务器IP: "${chalk.blueBright(
            "http://" +
              initializer.config.server.host +
              ":" +
              initializer.config.server.port,
          )}"`,
        );
        log.info(utils.grayText("使用ctrl+鼠标左键在浏览器中打开."));
        resolve(httpServer);
      },
    );
    httpServer.on("error", reject);
  });
  //   } catch (error) {
  //     log.error("初始化错误", error);
  //     shutdown("STARTUP_ERROR");
  //   }
}

main();
