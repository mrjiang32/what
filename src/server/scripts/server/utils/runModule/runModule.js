import path from 'path';
import runTrusted from "./ways/trusted.js";
import main from "../../../../global/main.js";
import { DirSource } from "../../../../global/source/Dir.source.mjs";
import { exists } from "../../../../global/source/utilities/exists.js";

/**
 * @type {DirSource}
 */
const defaultDirSource = main.sources["/custom/func"].source;

/**
 * Run suite module - compatibility wrapper.
 * Supports two signatures:
 *  - runSuiteModule(suiteName, params)
 *  - runSuiteModule(dirSource, suiteName, params)
 */
export async function runSuiteModule(a, b, c) {
  let dirSource = defaultDirSource;
  let suiteName;
  let params;
  if (typeof a === 'string') {
    suiteName = a;
    params = b;
  } else {
    // assume dirSource passed
    dirSource = a;
    suiteName = b;
    params = c;
  }

  dirSource._assertReady();
  if (!dirSource.has(suiteName)) {
    throw new Error(`套件[${suiteName}]不存在`);
  }

  const suiteAbs = dirSource._getSuiteAbsolutePath(suiteName);
  const mainJsPath = path.join(suiteAbs, 'main.js');

  const settings = await dirSource.getSuiteSettings(suiteName);
  const timeoutMs = settings.timeout ?? 3000;

  if (!(await exists(mainJsPath))) {
    throw new Error(`[${mainJsPath}]不存在`);
  }

  return runTrusted(mainJsPath, params, timeoutMs, suiteName);
}
