import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.resolve(__dirname, "config.json");

/**
 * 深度冻结对象，防止配置被意外篡改
 * @param {object} obj 目标对象
 * @returns {object} 冻结后的对象
 */
function deepFreeze(obj) {
  const propNames = Reflect.ownKeys(obj);
  for (const name of propNames) {
    const value = obj[name];
    if (value && typeof value === "object") deepFreeze(value);
  }
  return Object.freeze(obj);
}

/**
 * 深度合并对象配置
 * 修复原生扩展运算符只能一级合并、嵌套对象丢失字段问题
 * @param {object} base 基础默认配置
 * @param {object} override 用户自定义配置
 * @returns {object} 合并后的全新配置对象
 */
function deepMerge(base, override) {
  const result = { ...base };
  for (const key in override) {
    const baseVal = result[key];
    const overVal = override[key];
    if (
      typeof baseVal === "object" &&
      baseVal !== null &&
      !Array.isArray(baseVal) &&
      typeof overVal === "object" &&
      overVal !== null &&
      !Array.isArray(overVal)
    ) {
      result[key] = deepMerge(baseVal, overVal);
    } else {
      result[key] = overVal;
    }
  }
  return result;
}

/**
 * 默认全局配置
 * @type {Readonly<{server:{port:number,host:string},createdDate:number,eula:boolean,logLevel:string}>}
 */
const DEFAULT_CONFIG = deepFreeze({
  server: {
    port: 3000,
    host: "127.0.0.1",
  },
  createdDate: Date.now(),
  eula: false,
  logLevel: "info",
});

/**
 * 同步读取原始配置文件文本并解析JSON
 * @param {string} [configpath=CONFIG_PATH] 配置文件绝对路径
 * @returns {object} 原始配置对象，文件不存在/损坏返回空对象{}
 */
function readConfigFileSync(configpath = CONFIG_PATH) {
  try {
    const raw = fs.readFileSync(configpath, "utf8");
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    if (err.code === "ENOENT") return {};
    if (err instanceof SyntaxError) return {};
    throw err;
  }
}

/**
 * 同步写入配置JSON文件
 * @param {object} cfg 待写入配置对象
 * @param {string} [configpath=CONFIG_PATH] 配置文件绝对路径
 */
function writeConfigFileSync(cfg, configpath = CONFIG_PATH) {
  const configDir = path.dirname(configpath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(configpath, JSON.stringify(cfg, null, 2), "utf8");
}

/**
 * 异步读取原始配置文件文本并解析JSON
 * @param {string} [configpath=CONFIG_PATH] 配置文件绝对路径
 * @returns {Promise<object>} 原始配置对象，文件不存在/损坏返回空对象{}
 */
async function readConfigFileAsync(configpath = CONFIG_PATH) {
  try {
    const raw = await fsPromises.readFile(configpath, "utf8");
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    if (err.code === "ENOENT") return {};
    if (err instanceof SyntaxError) return {};
    throw err;
  }
}

/**
 * 异步写入锁，防止并发写入造成文件覆盖错乱
 * @type {boolean}
 */
let writingLock = false;

/**
 * 异步写入配置JSON文件（自带并发锁）
 * @param {object} cfg 待写入配置对象
 * @param {string} [configpath=CONFIG_PATH] 配置文件绝对路径
 */
async function writeConfigFileAsync(cfg, configpath = CONFIG_PATH) {
  // 等待锁释放，排队写入
  while (writingLock) {
    await new Promise((r) => setTimeout(r, 10));
  }
  writingLock = true;
  try {
    const configDir = path.dirname(configpath);
    await fsPromises.mkdir(configDir, { recursive: true });
    await fsPromises.writeFile(
      configpath,
      JSON.stringify(cfg, null, 2),
      "utf8",
    );
  } finally {
    writingLock = false;
  }
}

/**
 * 异步读取合并后的完整配置
 * @param {string} [configpath=CONFIG_PATH] 配置文件路径
 * @returns {Promise<typeof DEFAULT_CONFIG>} 合并默认值后的完整配置
 */
async function readConfigAsync(configpath = CONFIG_PATH) {
  const userCfg = await readConfigFileAsync(configpath);
  return deepMerge(DEFAULT_CONFIG, userCfg);
}

/**
 * 异步保存配置，自动合并默认配置
 * @param {object} cfg 需要更新的配置片段
 * @param {string} [configpath=CONFIG_PATH] 配置文件路径
 * @returns {Promise<typeof DEFAULT_CONFIG>} 合并完成的完整配置
 */
async function saveConfigAsync(cfg, configpath = CONFIG_PATH) {
  const merged = deepMerge(DEFAULT_CONFIG, cfg);
  await writeConfigFileAsync(merged, configpath);
  return merged;
}

/**
 * 配置管理器
 * @namespace ConfigManager
 */
export default Object.freeze({
  /**
   * 异步读取配置（推荐使用）
   * @type {typeof readConfigAsync}
   */
  readConfigAsync,
  /**
   * 异步保存配置（推荐使用）
   * @type {typeof saveConfigAsync}
   */
  saveConfigAsync,
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
