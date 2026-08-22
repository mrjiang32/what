import global from '../../../../global.js';
import sources from '../../../../global/config/source.category.js';
import { runSuiteModule } from '../../utils/runModule/runModule.js';
import path from 'path';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { parse } from 'acorn';
import schema from '../../utils/schema.js';
import config from '../../utils/config.js';

const execFileAsync = promisify(execFile);

// suite source
export const dirSource = sources['/custom/func'].source;

// simple validators
export const isValidSuiteName = (name) => /^[a-zA-Z0-9_-]+$/.test(name);
export const safePkgNameRegex = /^[a-zA-Z0-9@\/._-]+$/;

// helper: read suite main js
export const readSuiteMainJs = async (suiteName) => {
  try {
    const suiteDir = dirSource._getSuiteAbsolutePath(suiteName);
    const mainPath = path.join(suiteDir, 'main.js');
    return await fs.readFile(mainPath, 'utf-8');
  } catch {
    return null;
  }
};

// write suite inner file with JS syntax check
export const writeSuiteInnerFile = async ({ suiteName, fileName, raw }) => {
  if (!schema.validSuiteInnerName.test(fileName)) {
    throw new Error('无权限');
  }
  // syntax check
  parse(raw, { ecmaVersion: 'latest', sourceType: 'module' });
  const suiteDir = dirSource._getSuiteAbsolutePath(suiteName);
  const fullPath = path.join(suiteDir, fileName);
  await fs.mkdir(suiteDir, { recursive: true });
  await fs.writeFile(fullPath, raw, 'utf-8');
  return true;
};

// npm helpers
export async function npmInstall(suiteDir, pkgs) {
  for (const pkg of pkgs) {
    if (!safePkgNameRegex.test(pkg)) throw new Error(`非法包名:${pkg}`);
  }
  await execFileAsync('npm', ['install', ...pkgs], { cwd: suiteDir });
}
export async function npmUninstall(suiteDir, pkgs) {
  for (const pkg of pkgs) {
    if (!safePkgNameRegex.test(pkg)) throw new Error(`非法包名:${pkg}`);
  }
  await execFileAsync('npm', ['uninstall', ...pkgs], { cwd: suiteDir });
}
export async function npmList(suiteDir) {
  const { stdout } = await execFileAsync('npm', ['list', '--json'], { cwd: suiteDir });
  return JSON.parse(stdout);
}

// // auth helpers


export { runSuiteModule };
