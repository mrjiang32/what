import { FileSource } from "../source/File.source.mjs";
import { JSONSource } from "../source/JSON.source.mjs";
import { DirSource } from "../source/Dir.source.mjs";
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
  maxDepth: 1,
  dirBlackList: ["node_modules", ".git", "dist", "build", "noscan"],
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

      // 1. 按优先级分组
      const priorityMap = new Map();
      for (const file of idArray) {
        const match = file.match(/^(\d+)/);
        const priority = match ? match[1] : "99";
        if (!priorityMap.has(priority)) {
          priorityMap.set(priority, []);
        }
        priorityMap.get(priority).push(file);
      }

      const sortedPriorities = Array.from(priorityMap.keys()).sort();
      const registeredTasks = new Set();

      // 2. 构建按优先级排序的任务组
      const priorityGroups = [];
      for (const priority of sortedPriorities) {
        const filesInPriority = priorityMap.get(priority);

        // 去重并生成任务函数
        const tasks = filesInPriority
          .filter((file) => {
            if (registeredTasks.has(file)) return false;
            registeredTasks.add(file);
            return true;
          })
          .map((currentFile) => ({
            task: async () => {
              const job = await getModuleJob(currentFile, source);
              await job();
            },
            id: currentFile,
          }));

        if (tasks.length > 0) {
          priorityGroups.push(tasks);
        }
      }

      // 3. 仅注册一个 sys:init 监听器，绝不在此处 await
      bus.on("sys:init", async () => {
        // 当 sys:init 触发时，按优先级顺序执行
        for (const tasks of priorityGroups) {
          // 同一优先级内的任务并行执行
          const results = await Promise.allSettled(tasks.map((task) => task.task()));

          // 错误隔离：打印失败的任务，但不中断后续流程
          for (const [index, result] of results.entries()) {
            if (result.status === "rejected") {
              logger.error(
                `[sys:init] Parallel task ${tasks[index].id} failed:`,
                result.reason
              );
            }
          }
        }
      });
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
      logger: logger.getByContext("server/timer").mute(),
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
  "/custom/func": {
    source: new DirSource({
      dirPath: getDir("./custom/func"),
      dirBlackList: ["node_modules", ".git", ".vscode"],
      logger: logger.getByContext("/custom/func"),
    }),
  },
  "/server/middlewares": {
    source: new CodeSource({
      ...defconfig,
      dirPath: getDir("./server/middlewares"),
      exts: [".mjs", ".js", ".cjs"],
      logger: logger.getByContext("/server/middlewares").mute(),
    }),
    calls: "sys:middlewares",
    /**
     * @param {CodeSource} source
     */
    additional: async (source) => {
      const idArray = await source.toIdArray();
      const mwLogger = global.logger.getByContext("Middlewares");
      for (const file of idArray) {
        const currentFile = file;
        bus.on("sys:middlewares", async () => {
          const mod = await getModuleJob(currentFile, source);
          global.server.app.use(mod);
          mwLogger.debug(
            chalk.underline("设置中间件") +
              chalk.grey(
                `  ${path.join(global.scan.workdir, "./server/middlewares", file)}`,
              ),
          );
        });
      }
    },
  },
};

export default sources;
