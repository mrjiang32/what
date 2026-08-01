import chalk from "chalk";
import fs from "fs/promises";
import path from "path";

export default {
  formatTime: (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} day${days === 1 ? "" : "s"}`);
    if (hours > 0) parts.push(`${hours} hour${hours === 1 ? "" : "s"}`);
    if (minutes > 0) parts.push(`${minutes} min`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} sec`);

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
};
