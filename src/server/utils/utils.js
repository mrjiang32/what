import chalk from "chalk";
import fs from "fs/promises";
import path from "path";

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

export default {
  deepFreeze,
  deepMerge,
  formatTime: (ms, locale = "zh-cn") => {
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
  },
  grayText: (text) => chalk.gray(`\t- ${text}`),
  /**
   * 简易读取独立JSON文件（不合并主默认配置）
   * @param {string} filePath
   * @returns {Promise<object>}
   */
  jsonSimpleR: async function readSimpleJson(filePath) {
    try {
      const buf = await fs.readFile(filePath, "utf8");
      return JSON.parse(buf);
    } catch (err) {
      // 文件不存在 / 损坏 返回空对象
      return {};
    }
  },

  /**
   * 简易写入独立JSON文件
   * @param {string} filePath
   * @param {object} data
   */
  jsonSimpleW: async function writeSimpleJson(filePath, data) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
  },

  jsSimpleW: async function writeSimpleJs(filePath, data) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data, "utf8");
  },

  jsSimpleR: async function readSimpleJs(filePath) {
    const buf = await fs.readFile(filePath, "utf8");
    return buf;
  },

  deleteFile: async function deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
  },
};
