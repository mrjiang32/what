import global from '../../../../global.js';
import sources from '../../../../global/config/source.category.js';
import { runSuiteModule } from '../../utils/runModule/runModule.js';
import path from 'path';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { parse } from 'acorn';
import schema from '../../utils/schema.js';
import jwt from 'jsonwebtoken';
import {
  verifyPassword,
  hashPassword,
  generateSalt,
} from '../../utils/passwd.js';
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

// auth helpers
export function assertExists(value, message) { if (!value) throw new Error(message); }
export function validatePassword(password, label = 'Password') {
  assertExists(password, `${label} not found`);
  if (password.length < 8) throw new Error(`${label} length must be at least 8`);
  if (password.includes(' ')) throw new Error(`${label} cannot contain space`);
}
export function assertPasswordMatch(pwd1, pwd2, message = 'Passwords do not match') { if (pwd1 !== pwd2) throw new Error(message); }

export function signAccessToken(user) {
  assertExists(user.username, 'User `username` property not found');
  assertExists(user.password, 'User `password` property not found');
  const userConfig = global.users[user.username];
  if (!userConfig) throw new Error('Password or username not match');
  const isValid = verifyPassword(user.password, userConfig.salt, userConfig.shadow);
  if (!isValid) throw new Error('Password or username not match');
  return jwt.sign({ id: user.username, role: userConfig.role ?? 'default' }, global.auth.secret, { expiresIn: '2h' });
}
export function refreshAccessToken(username) {
  const userConfig = global.users[username];
  return jwt.sign({ id: username, role: userConfig?.role ?? 'default' }, global.auth.secret, { expiresIn: '2h' });
}

export { runSuiteModule };
