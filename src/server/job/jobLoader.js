import fs from "fs/promises";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

import logger from "../utils/logger.js";
import utils from "../utils/utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCANDIR = path.resolve(__dirname, "./jobs");

await logger.init();

const allowedKeys = {
  init: "初始化任务",
  stop: "停机任务",
  timer: "定时任务",
};

const allowedFileExts = [".js", ".mjs", ".cjs"];
const jobLog = logger.newLogger("Job Control");
const grayText = utils.grayText;

const neededEnvironment = {
  rootScanDir: SCANDIR,
  allowedExts: allowedFileExts,
  grayText,
  log: jobLog,
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
  if (typeof scanDir !== "string") throw new Error("scanDir 必须为字符串路径");
  if (!Array.isArray(allowedExts))
    throw new Error("allowedExts 必须为后缀数组");
  if (maxDepth <= 0) return [];

  if (scanDir === rootScanDir) {
    log.debug(`扫描 "${scanDir}" 以获取 Job`);
  }
  const extSet = new Set(allowedExts);
  let dirEntries;

  try {
    dirEntries = await fs.readdir(scanDir, { withFileTypes: true });
  } catch (scanErr) {
    log.error(`任务目录 "${scanDir}"扫描失败：`, scanErr.message);
    throw new Error(`扫描Job目录异常: ${scanErr.message}`);
  }

  // 1. 筛选当前目录合法文件
  const currentDirFiles = dirEntries
    .filter((entry) => {
      const ext = path.extname(entry.name);
      // 普通文件 + 后缀白名单 + 非隐藏文件
      return entry.isFile() && extSet.has(ext) && !entry.name.startsWith(".");
    })
    .map((entry) => path.join(path.relative(rootScanDir, scanDir), entry.name));

  // 打印当前目录扫描到的文件日志
  currentDirFiles.forEach((name) => log.debug(grayText(name)));

  // 2. 筛选合法子目录（过滤黑名单、隐藏文件夹）
  const childDirs = dirEntries.filter((entry) => {
    if (!entry.isDirectory()) return false;
    // 过滤隐藏目录、黑名单目录
    return !entry.name.startsWith(".") && !dirBlackList.includes(entry.name);
  });

  // 3. 递归扫描子目录，传递完整参数、递减深度限制
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

  // 等待所有子目录扫描完成，扁平化二维数组
  const childDirFilesList = await Promise.all(childScanPromises);
  const allChildFiles = childDirFilesList.flat();

  // 合并当前目录 + 子目录文件，并去重
  const allFiles = [...new Set([...currentDirFiles, ...allChildFiles])];

  return allFiles;
}

async function importJobs({ validFileNames, grayText, log, rootScanDir }) {
  let importedJobs = {};

  for (const value of validFileNames) {
    let eachJob = await import(pathToFileURL(path.join(rootScanDir, value)));
    eachJob = eachJob.default ?? eachJob;
    importJobs = { ...importJobs, ...eachJob };
  }
  return importJobs;
}

importJobs({
  validFileNames: await scanJobs(neededEnvironment),
  ...neededEnvironment,
}).then((value) => {
  console.log(Object.keys(value));
});
