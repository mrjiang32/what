import { FileSource } from "../source/File.source.mjs";
import { JSONSource } from "../source/JSON.source.mjs";
import { CodeSource } from "../source/Code.source.mjs";
import { Logger } from "../utils/Logger.mjs";
import { Rule } from "../source/utilities/Rules/Rule.mjs";
import { bus } from "../utils/SafeEventEmitter.js";
import global from "../../global.js";
import path from "path";
import chalk from "chalk";

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
const logger = global.scan.logger;

const getDir = (dir) => {
  return path.resolve(global.scan.workdir, dir);
};

const moduleJobSchema = Rule.type("function");

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
      // logger: logger.getByContext("server/init"),
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
  "server/halt": {
    source: new CodeSource({
      ...defconfig,
      dirPath: getDir("./server/halt"),
      exts: [".mjs", ".js", ".cjs"],
      // logger: logger.getByContext("server/halt"),
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
            logger.info(
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
    additional: async (source) => {},
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
    additional: async (source) => {},
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
      for (const file of idArray) {
        const currentFile = file;
        bus.on("sys:middlewares", async () => {
          const mod = await getModuleJob(currentFile, source);
          // Assuming the exported job returns a valid Express/Connect middleware function
          global.server.app.use(mod);
          mwLogger.info(
            chalk.grey(
              ` - Middleware loaded from ${path.basename(currentFile)}`,
            ),
          );
        });
      }
    },
  },
};

export default sources;
