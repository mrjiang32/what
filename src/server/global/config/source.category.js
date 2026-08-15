import { FileSource } from "../source/File.source.mjs";
import { JSONSource } from "../source/JSON.source.mjs";
import { CodeSource } from "../source/Code.source.mjs";
import { Logger } from "../utils/Logger.mjs";
import { Rule } from "../source/utilities/Rules/Rule.mjs";
import { bus } from "../utils/SafeEventEmitter.js";
import global from "../../global.js";
import path from "path";
import chalk from "chalk";

export const formatTime = (ms, locale = "zh-cn") => {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (locale === "en-us") {
    if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
    if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
    if (minutes > 0) parts.push(`${minutes} min`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} sec`);
  } else if (locale === "zh-cn") {
    if (days > 0) parts.push(`${days} 天`);
    if (hours > 0) parts.push(`${hours} 小时`);
    if (minutes > 0) parts.push(`${minutes} 分钟`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} 秒`);
  }

  return parts.join(" ");
};

const defconfig = {
  dirPath: "./",
  exts: [".mjs", ".js", ".cjs", ".json"],
  logger: undefined,
  maxDepth: 10,
  dirBlackList: ["node_modules", ".git", "dist", "build"],
};

/**
 * @type {Logger}
 */
const logger = new Logger("source");

const getDir = (dir) => {
  return path.resolve(global.scan.workdir, dir);
};

const moduleJobSchema = Rule.function();
// timer 导出对象校验 schema: { interval: number, task: Function }
const timerJobSchema = Rule.object({
  interval: Rule.number(),
  task: Rule.function(),
});

const getModuleJob = async (file, source, schema = moduleJobSchema) => {
  const mod = (await source.importModule(file)).default;
  if (!schema.test(mod)) {
    throw new Error(`job ${file} not match schema`);
  }
  return mod;
};

const sources = {
  "server/init": {
    source: new CodeSource({
      ...defconfig,
      dirPath: getDir("./server/init"),
      exts: [".mjs", ".js", ".cjs"],
    }),
    calls: "sys:init",
    /**
     * @param {CodeSource} source
     */
    additional: async (source) => {
      const idArray = await source.toIdArray();
      for (const file of idArray) {
        const currentFile = file;
        bus.on("sys:init", async () => {
          await (
            await getModuleJob(currentFile, source)
          )();
        });
      }
    },
  },
  /**
   * server/timer
   * 文件导出: { interval: number, task: async ()=>void }
   * interval >0: setInterval 自动轮询； interval ===0 仅启动执行一次
   * sys:halt 自动清除全部定时器句柄
   */
  "server/timer": {
    source: new CodeSource({
      ...defconfig,
      dirPath: getDir("./server/timer"),
      exts: [".mjs", ".js", ".cjs"],
      logger: logger.getByContext("server/timer"),
    }),
    calls: "sys:timer",
    /**
     * @param {CodeSource} source
     */
    additional: async (source) => {
      const idArray = await source.toIdArray();
      const timerLogger = global.logger.getByContext("Timer");
      // 保存所有定时器id，halt时销毁
      /** @type {NodeJS.Timeout[]} */
      const timerHandles = [];

      // sys:init 时初始化所有timer任务
      bus.on("sys:init", async () => {
        for (const file of idArray) {
          try {
            const timerOpt = await getModuleJob(file, source, timerJobSchema);
            const { interval, task } = timerOpt;

            timerLogger.debug(
              chalk.grey(
                `加载timer任务 ${file}, interval=${formatTime(interval)}`,
              ),
            );

            // interval=0：仅执行一次
            if (interval === 0) {
              await task().catch((err) =>
                timerLogger.error(`[timer:${file}] task run once error`, err),
              );
              continue;
            }

            // >0 启动轮询定时器
            const handle = setInterval(async () => {
              try {
                await task();
              } catch (err) {
                timerLogger.error(`[timer:${file}] task error`, err);
              }
            }, interval);
            timerHandles.push(handle);
          } catch (err) {
            timerLogger.error(`加载timer文件失败 ${file}`, err);
          }
        }
      });

      // sys:halt 清理全部定时器，防止进程无法退出
      bus.on("sys:halt", async () => {
        timerLogger.debug(`清理 ${timerHandles.length} 个timer定时器`);
        for (const h of timerHandles) {
          clearInterval(h);
        }
        timerHandles.length = 0;
      });
    },
  },
  "server/halt": {
    source: new CodeSource({
      ...defconfig,
      dirPath: getDir("./server/halt"),
      exts: [".mjs", ".js", ".cjs"],
    }),
    calls: "sys:halt",
    /**
     * @param {CodeSource} source
     */
    additional: async (source) => {
      const idArray = (await source.toIdArray()).reverse();
      for (const file of idArray) {
        const currentFile = file;
        bus.on("sys:halt", async () => {
          await (
            await getModuleJob(currentFile, source)
          )();
        });
      }
    },
  },
  "/api": {
    source: new CodeSource({
      ...defconfig,
      dirPath: getDir("./api/routes"),
      exts: [".mjs", ".js", ".cjs"],
      logger: logger.getByContext("/api"),
    }),
    calls: "api",
    /**
     * @param {CodeSource} source
     */
    additional: async (source) => {
      const idArray = await source.toIdArray();
      const logger = global.logger.getByContext("LoadAPI");
      bus.on("api", async () => {
        logger.debug("加载路由列表：");
      });
      for (const file of idArray) {
        const currentFile = file;
        bus.on("api", async () => {
          const mod = await getModuleJob(currentFile, source);
          const apiItems = await mod();
          for (const route of apiItems) {
            global.server.app[route.method.toLowerCase()](
              route.path,
              route.handler,
            );
            logger.debug(
              chalk.grey(
                ` - ${route.method.toUpperCase().padEnd(6)} ${route.path}`,
              ),
            );
          }
        });
      }
    },
  },
  "/custom/hook": {
    source: new JSONSource({
      ...defconfig,
      dirPath: getDir("./custom/hook"),
      exts: [".json"],
      logger: logger.getByContext("/custom/hook"),
    }),
    calls: "custom:hook",
    /**
     * @param {JSONSource} source
     */
    additional: async (source) => {
      // await source.getReady();
    },
  },
  "/custom/func": {
    source: new CodeSource({
      ...defconfig,
      dirPath: getDir("./custom/func"),
      exts: [".mjs", ".js", ".cjs"],
      logger: logger.getByContext("/custom/func"),
    }),
    calls: "custom:func",
    /**
     * @param {CodeSource} source
     */
    additional: async (source) => {
      // await source.getReady();
    },
  },
  "/server/middlewares": {
    source: new CodeSource({
      ...defconfig,
      dirPath: getDir("./server/middlewares"),
      exts: [".mjs", ".js", ".cjs"],
      logger: logger.getByContext("/server/middlewares"),
    }),
    calls: "sys:middlewares",
    /**
     * @param {CodeSource} source
     */
    additional: async (source) => {
      const idArray = await source.toIdArray();
      const mwLogger = global.logger.getByContext("Middlewares");
      bus.on("sys:middlewares", async () => {
        mwLogger.debug("加载的中间件列表：");
      });
      for (const file of idArray) {
        const currentFile = file;
        bus.on("sys:middlewares", async () => {
          const mod = await getModuleJob(currentFile, source);
          global.server.app.use(mod);
          mwLogger.debug(
            chalk.grey(
              ` - 加载中间件: ${path.join(global.scan.workdir, "./server/middlewares", file)}`,
            ),
          );
        });
      }
    },
  },
};

export default sources;
