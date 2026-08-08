import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import utils from "./utils.js"
import { generateSalt, hashPassword } from "./passwd.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.resolve(__dirname, "config.json");

const deepFreeze = utils.deepFreeze;
const deepMerge = utils.deepMerge;

const defaultSalt = generateSalt();

/**
 * 默认全局配置
 * @type {Readonly<{server:{port:number,host:string},createdDate:number,eula:boolean,logLevel:string}>}
 */
const DEFAULT_CONFIG = deepFreeze({
  server: {
    port: 3000,
    host: "127.0.0.1",
  },
  users: {
    "admin": {
      role: "admin",
      shadow: hashPassword(generateSalt(), defaultSalt),
      salt: defaultSalt
    }
  },
  createdDate: Date.now(),
  eula: false,
  logLevel: "info",
});

export default Object.freeze({
  /**
   * 异步读取配置（推荐使用）
   * @type {typeof rereadConfigAsync}
   */
  readConfigAsync: async () => {
    try {
      await fsPromises.access(CONFIG_PATH);
    } catch (err) {
      await utils.jsonSimpleW(CONFIG_PATH, DEFAULT_CONFIG);
    }
    // console.log(await utils.jsonSimpleR(CONFIG_PATH));
    // console.log(deepMerge(DEFAULT_CONFIG, await utils.jsonSimpleR(CONFIG_PATH)));
    return await deepMerge(DEFAULT_CONFIG, await utils.jsonSimpleR(CONFIG_PATH));
  },
  /**
   * 异步保存配置（推荐使用）
   * @type {typeof saveConfigAsync}
   */
  saveConfigAsync: async (data) => {
    await utils.jsonSimpleW(CONFIG_PATH, deepMerge(DEFAULT_CONFIG, data));
  },
  /**
   * 默认配置文件完整路径
   * @type {string}
   */
  createFile: async () => {
    try {
      await fsPromises.access(CONFIG_PATH, fs.constants.R_OK | fs.constants.W_OK);
    } catch (e) {
      await saveConfigAsync({});
    }
  },
  configFilePath: CONFIG_PATH,
  /**
   * 默认配置模板
   * @type {typeof DEFAULT_CONFIG}
   */
  defaultConfig: DEFAULT_CONFIG,
  /**
   * 配置文件所在目录
   * @type {string}
   */
  configDirPath: __dirname,
});
