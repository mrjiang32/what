import { pathToFileURL, fileURLToPath } from "url";
import path from "path";
import jobs from "../../../utils/jobs.js";
import utils from "../../../utils/utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SCANDIR = path.join(__dirname, "modules");

export default {
  scanModules: async () => {
    return await jobs.internalMethods.scanJobs({
      rootScanDir: SCANDIR,
    });
  },
  createModule: async ({name, type, code}) => {
    const path = path.join(SCANDIR, type, name + ".js");
    await utils.jsSimpleW(path, code);
  },
};
