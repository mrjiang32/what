import { pathToFileURL, fileURLToPath } from "url";
import path from "path";
import jobs from "../../../utils/jobs.js";
import utils from "../../../utils/utils.js";
// import logger from "../../../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCANDIR = path.join(__dirname, "modules");

const moduleSet = new Set();
const moduleCacheSet = new Set();

const scanModules = async (eachCb = undefined) => {
  console.log("API模块扫描中...");
  return await jobs.internalMethods.scanJobs({
    rootScanDir: SCANDIR,
    grayText: updateIndex,
    // log: logger.newLogger("1"),
    // grayText: (e) => e,
  });
};

const updateIndex = (name) => {
  console.log("API模块索引更新: " + name);
  if (!moduleSet.has(name)) {
    moduleSet.add(name);
  } else {
    throw new Error("重复的API模块索引 " + name);
  }
};

const updateCache = (name, type) => {
  moduleCacheSet.delete(name + "\\" + type);
};

const updateAll = async () => {
  await scanModules(updateIndex);
};

export default {
  scanModules,
  createModule: async ({ name, type, code }) => {
    const spath = path.join(SCANDIR, type, name);
    await utils.jsSimpleW(spath, code);
  },
  removeModule: async ({ name, type }) => {
    const scanDirpath = path.join(SCANDIR, type, name);
    await utils.deleteFile(spath);
  },
  loadAModule: async ({ name, type }) => {
    if (moduleCacheSet.has(name + "\\" + type)) {
      return moduleCacheSet.get(name + "\\" + type);
    }
    const spath = path.join(SCANDIR, type, name);
    const module = await import(pathToFileURL(spath).href);
    moduleCacheSet.set(name + "\\" + type, module);
    return module;
  },
  updateAll,
  updateIndex,
  moduleSet,
};
