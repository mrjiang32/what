import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import utils from "./utils.js";
import { generateSalt, hashPassword } from "./passwd.js";
import global from "../../global.js";

const CONFIG_DIR = path.join(global.scan.dir, "config");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");
const USERS_PATH = path.join(CONFIG_DIR, "users.json");

const deepFreeze = utils.deepFreeze;
const deepMerge = utils.deepMerge;

// 服务配置模板，已经移除 users
const DEFAULT_CONFIG = deepFreeze({
  server: {
    port: 3000,
    host: "127.0.0.1",
  },
  createdDate: Date.now(),
  eula: true,
  logLevel: "info",
  secret: crypto.randomUUID(),
});

// 用户默认模板：仅首次生成users.json使用
function createDefaultUserObject() {
  const defaultSalt = generateSalt();
  const defaultPassword = generateSalt();
  return {
    admin: {
      role: "admin",
      shadow: hashPassword(defaultPassword, defaultSalt),
      salt: defaultSalt,
      defaultPasswd: defaultPassword, // 明文默认密码，仅首次写入文件；加载到内存后会delete
    },
  };
}

export default Object.freeze({
  /**
   * 异步读取服务配置 config.json
   */
  readConfigAsync: async () => {
    // 确保配置目录存在
    await fsPromises.mkdir(CONFIG_DIR, { recursive: true });
    try {
      await fsPromises.access(CONFIG_PATH);
    } catch (err) {
      await utils.jsonSimpleW(CONFIG_PATH, DEFAULT_CONFIG);
    }
    const raw = await utils.jsonSimpleR(CONFIG_PATH);
    return deepMerge(DEFAULT_CONFIG, raw);
  },

  /**
   * 异步读取用户配置 users.json
   */
  readUsersAsync: async () => {
    await fsPromises.mkdir(CONFIG_DIR, { recursive: true });
    try {
      await fsPromises.access(USERS_PATH);
    } catch (err) {
      // 文件不存在，生成默认管理员用户
      const defaultUsers = createDefaultUserObject();
      await utils.jsonSimpleW(USERS_PATH, defaultUsers);
    }
    const userData = await utils.jsonSimpleR(USERS_PATH);

    return userData;
  },

  /**
   * 保存服务配置 config.json
   * @param {object} data
   */
  saveConfigAsync: async (data) => {
    await fsPromises.mkdir(CONFIG_DIR, { recursive: true });
    const merged = deepMerge(DEFAULT_CONFIG, data);
    await utils.jsonSimpleW(CONFIG_PATH, merged);
  },

  /**
   * 保存用户配置 users.json
   * @param {object} usersObject
   */
  saveUsersAsync: async (usersObject) => {
    await fsPromises.mkdir(CONFIG_DIR, { recursive: true });
    await utils.jsonSimpleW(USERS_PATH, usersObject);
  },

  /**
   * 创建配置目录+两个配置文件（初始化）
   */
  createFile: async () => {
    await fsPromises.mkdir(CONFIG_DIR, { recursive: true });
    // config.json
    try {
      await fsPromises.access(
        CONFIG_PATH,
        fs.constants.R_OK | fs.constants.W_OK,
      );
    } catch (e) {
      await utils.jsonSimpleW(CONFIG_PATH, DEFAULT_CONFIG);
    }
    // users.json
    try {
      await fsPromises.access(
        USERS_PATH,
        fs.constants.R_OK | fs.constants.W_OK,
      );
    } catch (e) {
      const defaultUsers = createDefaultUserObject();
      await utils.jsonSimpleW(USERS_PATH, defaultUsers);
    }
  },

  configFilePath: CONFIG_PATH,
  usersFilePath: USERS_PATH,
  defaultConfig: DEFAULT_CONFIG,
  configDirPath: CONFIG_DIR,
});
