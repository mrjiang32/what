import path from "path";
import { fileURLToPath } from "url";

import logger from "./logger.js";
import utils from "./utils.js";
import keyInfo from "../global/keyInfo.js";
import SafeEventEmitter, { bus } from "../classes/SafeEventEmitter.js";
import globalenv, { addContext, modifyContext } from "../global/globalenv.js";
import NativeImportLoader from "../classes/modules/NativeImportLoader.js";

let debug = false;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCANDIR = path.resolve(__dirname, "../jobs");
const jobLog = logger.newLogger("Job Control");
const grayText = utils.grayText;

addContext({
  rootScanDir: SCANDIR,
  grayText,
  log: jobLog,
  keyInfo,
  timerMap: new Map(),
});

const jobLoader = new NativeImportLoader(SCANDIR);
jobLoader.scanConfig.allowedExts = [".js", ".mjs", ".cjs"];

/**
 * 解析文件名数字前缀作为priority
 * @param {string} relPath
 * @returns {number}
 */
function parseFilePriority(relPath) {
  const basename = path.basename(relPath);
  const match = basename.match(/^(\d+)/);
  return match ? Number(match[1]) : 50;
}

function validateSingleJob(fileName, jobKey, jobItem, keyInfo, log) {
  if (!jobItem) {
    log.error(`文件："${fileName}" 内任务 "${jobKey}" 配置为空`);
    return false;
  }

  const jobType = jobItem.type;
  if (!jobType) {
    log.error(
      `文件："${fileName}" 内任务 "${jobKey}" 缺少必填字段 type（任务类型）`,
    );
    return false;
  }

  const typeRule = keyInfo[jobType];
  if (!typeRule) {
    log.error(
      `文件："${fileName}" 内任务 "${jobKey}" 使用了未注册的任务类型：${jobType}`,
    );
    return false;
  }

  const requiredFields = typeRule.requiredKeys;
  let validatePass = true;

  for (const [fieldName, expectType] of Object.entries(requiredFields)) {
    const fieldValue = jobItem[fieldName];
    if (fieldValue === undefined) {
      log.error(
        `文件："${fileName}" 任务 "${jobKey}" 缺失必填配置项 "${fieldName}"，要求数据类型：${expectType}`,
      );
      validatePass = false;
      continue;
    }
    if (typeof fieldValue !== expectType) {
      log.error(
        `文件："${fileName}" 任务 "${jobKey}" 配置项 "${fieldName}" 类型不匹配。期望类型：${expectType}，实际类型：${typeof fieldValue}`,
      );
      validatePass = false;
    }
  }

  // if (!validatePass) {
  //   if (!Array.isArray(globalenv.failedJobs)) {
  //     modifyContext("failedJobs", []);
  //   }
  //   globalenv.failedJobs.push(jobItem);
  // }

  return validatePass;
}

/**
 * 适配新版 Loader：直接使用 relPath，不再拆分 type/name
 */
async function importJobs(entries) {
  const jobs = {};
  Object.keys(keyInfo).forEach((key) => (jobs[key] = []));

  for (const entry of entries) {
    const relPath = entry.relPath;
    const filePriority = parseFilePriority(relPath);
    try {
      const module = await jobLoader.loadAModule(relPath);
      const eachJob = module.default ?? module;

      for (const [jobKey, jobItem] of Object.entries(eachJob)) {
        if (validateSingleJob(relPath, jobKey, jobItem, keyInfo, jobLog)) {
          jobItem.name = jobKey;
          // 仅这四类任务，由文件名注入priority
          if (keyInfo[jobItem.type].overridePriority === true) {
            // 规范：用户不要手动写priority，框架覆盖
            jobItem.priority = filePriority;
          }
          jobs[jobItem.type].push(jobItem);
        } else {
          jobLog.warn(`任务 "${jobKey}" 校验失败，已丢弃`);
          if (!Array.isArray(globalenv.failedJobs)) {
            modifyContext("failedJobs", []);
          }
          globalenv.failedJobs.push(jobKey);
        }
      }
    } catch (err) {
      jobLog.error(`导入任务文件 "${relPath}" 失败：`, err.message);
    }
  }
  return jobs;
}

async function processJobs(neededEnvironment) {
  const { keyInfo, jobs, timerMap } = neededEnvironment;
  Object.keys(keyInfo).forEach((key) => {
    const jobArray = jobs[key];
    if (jobArray.length === 0) {
      return;
    }

    const { comparePriority, processMethod } = keyInfo[key];
    if (comparePriority) {
      jobArray.sort(comparePriority);
    }

    jobArray.forEach((value) => {
      processMethod(value, timerMap);
    });
  });
  return jobs;
}

const getJobs = async () => {
  const entries = await jobLoader.updateAll();
  return await processJobs({
    jobs: await importJobs(entries),
    ...globalenv,
  });
};

if (debug) {
  console.log(await getJobs());
}

let initLock = false;
let stopLock = false;

export default {
  init: async () => getJobs(),

  emitInit: async function init() {
    if (initLock) return;
    initLock = true;
    modifyContext("mainLoader", jobLoader);
    await bus.emitSafe("system:init");
    await bus.emitSafeParallel("system:init.parallel");
  },

  emitStop: async function stop() {
    if (stopLock) return;
    if (!initLock) return;
    stopLock = true;
    await bus.emitSafeParallel("system:stop.parallel");
    await bus.emitSafe("system:stop");
  },

  modifyContext: (key, value) => {
    globalenv[key] = value;
  },

  neededEnvironment: globalenv,
  jobLoader,
};
