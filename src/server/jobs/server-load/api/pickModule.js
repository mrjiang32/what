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

const scanModules = async (scandir = SCANDIR, eachCb) => {
  return await jobs.internalMethods.scanJobs({
    rootScanDir: scandir,
    grayText: eachCb,
    allowedExts: [".js", ".json"],
  });
};

const updateIndex = ({ name }) => {
  if (!moduleSet.has(name)) {
    moduleSet.add(name);
  } else {
    throw new Error("重复的API模块索引 " + name);
  }
};

const updateCache = ({ name, type }) => {
  moduleCacheSet.delete(type + "\\" + name);
};

const updateAll = async ({ scanDir = SCANDIR }) => {
  await scanModules(scanDir, (name) => {
    return updateIndex({ name });
  });
};

export default {
  scanModules,
  writeModule: async ({ name, type, code }) => {
    const spath = path.join(SCANDIR, type, name);
    if(name.endsWith(".js")){
      await utils.jsSimpleW(spath, code);
    }
    if(name.endsWith(".json")){
      await utils.jsonSimpleW(spath, code);
    }
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
    let module = undefined;
    if (name.endsWith(".js")) {
      module = await import(pathToFileURL(spath).href);
    } else if (name.endsWith(".json")) {
      module = await utils.jsonSimpleR(spath);
    }
    moduleCacheSet.set(name + "\\" + type, module);
    return module;
  },
  loadAModuleGeneric: async (path) => {
    return await import(pathToFileURL(path).href);
  },
  updateAll,
  updateIndex,
  moduleSet,
  apiDir: __dirname,
};
