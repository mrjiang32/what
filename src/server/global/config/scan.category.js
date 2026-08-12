import { FileSource } from "../source/File.source.mjs";
import { JSONSource } from "../source/JSON.source.mjs";
import { CodeSource } from "../source/Code.source.mjs";
import { bus } from "../utils/SafeEventEmitter.js";
import path from "path";
import global from "../../global.js";
import { Rule } from "../source/utilities/Rules/Rule.mjs";
import { Logger } from "../utils/Logger.mjs";

// 删掉 injectTools！！它不在ScanFileConfig schema，strictChild会直接校验失败
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

const moduleAPISchema = Rule.type("object").child({
  generate: Rule.type("function"),
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
      logger: logger.getByContext("server/init"),
    }),
    calls: "sys:init",
    /**
     * @param {CodeSource} source
     */
    additional: async (source) => {
      const idArray = await source.toIdArray();
      console.log(idArray);
      for (const file of idArray) {
        const currentFile = file;
        bus.on("sys:init", async () => {
          await (await getModuleJob(currentFile, source))();
        });
      }
    },
  },
  "server/halt": {
    source: new CodeSource({
      ...defconfig,
      dirPath: getDir("./server/halt"),
      exts: [".mjs", ".js", ".cjs"],
      logger: logger.getByContext("server/halt"),
    }),
    calls: "sys:halt",
    /**
     * @param {CodeSource} source
     */
    additional: async (source) => {
      const idArray = await source.toIdArray();
      for (const file of idArray) {
        const currentFile = file;
        bus.on("sys:halt", async () => {
          const mod = await getModuleJob(currentFile, source);
          await mod.job();
        });
      }
    },
  },
  "/api": {
    source: new CodeSource({
      ...defconfig,
      dirPath: getDir("./api"),
      exts: [".mjs", ".js", ".cjs"],
      logger: logger.getByContext("/api"),
    }),
    calls: "api",
    /**
     * @param {CodeSource} source
     */
    additional: async (source) => {
      const idArray = await source.toIdArray();
      for (const file of idArray) {
        const currentFile = file;
        bus.on("api", async () => {
          const mod = await getModuleJob(currentFile, source, moduleAPISchema);
          const apiItems = await mod.generate();
          global.api.push(...apiItems);
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
    },
  },
};

export default sources;