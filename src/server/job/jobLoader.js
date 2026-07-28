import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

import logger from "../utils/logger.js";
import utils from "../utils/utils.js";
import keyInfo from "./keyInfo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCANDIR = path.resolve(__dirname, "./jobs");

await logger.init();

const allowedFileExts = [".js", ".mjs", ".cjs"];
const jobLog = logger.newLogger("Job Control");
const grayText = utils.grayText;

const neededEnvironment = {
  rootScanDir: SCANDIR,
  allowedExts: allowedFileExts,
  grayText,
  log: jobLog,
  keyInfo,
};

async function scanJobs({
  scanDir,
  rootScanDir,
  allowedExts,
  log,
  grayText,
  maxDepth = 10,
  dirBlackList = ["node_modules", ".git", "dist", "build"],
}) {
  if (!scanDir) {
    scanDir = rootScanDir;
  }
  // 基础入参类型校验
  if (typeof scanDir !== "string") throw new Error("扫描目录路径必须为字符串");
  if (!Array.isArray(allowedExts))
    throw new Error("允许的文件后缀必须为数组格式");
  if (maxDepth <= 0) return [];

  if (scanDir === rootScanDir) {
    log.debug(`正在扫描目录 "${scanDir}" 加载任务文件`);
  }
  const extSet = new Set(allowedExts);
  let dirEntries;

  try {
    dirEntries = await fs.readdir(scanDir, { withFileTypes: true });
  } catch (scanErr) {
    log.error(`任务目录 "${scanDir}" 扫描失败：`, scanErr.message);
    throw new Error(`扫描任务目录发生异常: ${scanErr.message}`);
  }

  // 1. 筛选当前目录合法文件
  const currentDirFiles = dirEntries
    .filter((entry) => {
      const ext = path.extname(entry.name);
      return entry.isFile() && extSet.has(ext) && !entry.name.startsWith(".");
    })
    .map((entry) => path.join(path.relative(rootScanDir, scanDir), entry.name));

  // 打印扫描到的文件
  currentDirFiles.forEach((name) => log.debug(grayText(`${name}`)));

  // 2. 筛选合法子目录
  const childDirs = dirEntries.filter((entry) => {
    if (!entry.isDirectory()) return false;
    return !entry.name.startsWith(".") && !dirBlackList.includes(entry.name);
  });

  // 3. 递归扫描子目录
  const childScanPromises = childDirs.map((entry) => {
    const childFullPath = path.join(scanDir, entry.name);
    return scanJobs({
      scanDir: childFullPath,
      allowedExts,
      log,
      grayText,
      maxDepth: maxDepth - 1,
      dirBlackList,
      rootScanDir,
    });
  });

  const childDirFilesList = await Promise.all(childScanPromises);
  const allChildFiles = childDirFilesList.flat();

  const allFiles = [...new Set([...currentDirFiles, ...allChildFiles])];

  return allFiles;
}

function validateSingleJob(fileName, jobKey, jobItem, keyInfo, log) {
  // 1. 任务配置为空
  if (!jobItem) {
    log.error(`文件："${fileName}" 内任务 "${jobKey}" 配置为空`);
    return false;
  }

  const jobType = jobItem.type;
  // 2. 缺少type任务类型字段
  if (!jobType) {
    log.error(
      `文件："${fileName}" 内任务 "${jobKey}" 缺少必填字段 type（任务类型）`,
    );
    return false;
  }

  const typeRule = keyInfo[jobType];
  // 3. 不存在该任务类型定义
  if (!typeRule) {
    log.error(
      `文件："${fileName}" 内任务 "${jobKey}" 使用了未注册的任务类型：${jobType}`,
    );
    return false;
  }

  const requiredFields = typeRule.requiredKeys;
  let validatePass = true;

  // 4. 遍历校验所有必填字段
  for (const [fieldName, expectType] of Object.entries(requiredFields)) {
    const fieldValue = jobItem[fieldName];
    // 字段缺失
    if (fieldValue === undefined) {
      log.error(
        `文件："${fileName}" 任务 "${jobKey}" 缺失必填配置项 "${fieldName}"，要求数据类型：${expectType}`,
      );
      validatePass = false;
      continue;
    }
    // 字段类型不匹配
    if (typeof fieldValue !== expectType) {
      log.error(
        `文件："${fileName}" 任务 "${jobKey}" 配置项 "${fieldName}" 类型不匹配。期望类型：${expectType}，实际类型：${typeof fieldValue}`,
      );
      validatePass = false;
    }
  }

  return validatePass;
}

async function importJobs({
  validFileNames,
  grayText,
  log,
  rootScanDir,
  keyInfo,
}) {
  const importedJobs = {};

  for (const fileName of validFileNames) {
    try {
      const filePath = path.join(rootScanDir, fileName);
      const fileUrl = pathToFileURL(filePath);
      let eachJobModule = await import(fileUrl);
      const eachJob = eachJobModule.default ?? eachJobModule;

      let validJobs = {};

      for (const [jobKey, jobItem] of Object.entries(eachJob)) {
        if (validateSingleJob(fileName, jobKey, jobItem, keyInfo, log)) {
          validJobs[jobKey] = jobItem;
        } else {
          log.warn(`任务 "${jobKey}" 校验失败，已丢弃`);
        }
      }

      // 只合并校验通过的任务，修复之前bug
      Object.assign(importedJobs, validJobs);
    } catch (err) {
      log.error(`导入任务文件 "${fileName}" 失败：`, err.message);
    }
  }

  return importedJobs;
}

export default {
  jobImport: async () => {
    return await importJobs({
      validFileNames: await scanJobs(neededEnvironment),
      ...neededEnvironment,
    });
  },
};
