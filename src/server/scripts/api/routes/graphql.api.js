import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import { GraphQLScalarType, Kind } from 'graphql';
import global from "../../../global.js";
import sources from "../../../global/config/source.category.js";
import { runSuiteModule } from "../runModule/runModule.js";
import path from 'path';
import fs from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { parse } from 'acorn';
import schema from '../schema.js';
import jwt from 'jsonwebtoken';
import {
  verifyPassword,
  hashPassword,
  generateSalt,
} from '../../utils/passwd.js';
import config from '../../utils/config.js';

const execFileAsync = promisify(execFile);

// suite source
const dirSource = sources['/custom/func'].source;

// simple validators
const isValidSuiteName = (name) => /^[a-zA-Z0-9_-]+$/.test(name);
const safePkgNameRegex = /^[a-zA-Z0-9@\/._-]+$/;

// JSON scalar
const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  parseValue: (v) => v,
  serialize: (v) => v,
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
      case Kind.INT:
      case Kind.FLOAT:
        return ast.value;
      case Kind.OBJECT: {
        const value = Object.create(null);
        ast.fields.forEach((field) => {
          value[field.name.value] = parseLiteral(field.value);
        });
        return value;
      }
      case Kind.LIST:
        return ast.values.map(parseLiteral);
      default:
        return null;
    }
    function parseLiteral(node) {
      if (node.kind === Kind.STRING) return node.value;
      if (node.kind === Kind.BOOLEAN) return node.value;
      if (node.kind === Kind.INT || node.kind === Kind.FLOAT) return Number(node.value);
      if (node.kind === Kind.OBJECT) {
        const obj = Object.create(null);
        node.fields.forEach((f) => (obj[f.name.value] = parseLiteral(f.value)));
        return obj;
      }
      if (node.kind === Kind.LIST) return node.values.map(parseLiteral);
      return null;
    }
  }
});

// helper: read suite main js
const readSuiteMainJs = async (suiteName) => {
  try {
    const suiteDir = dirSource._getSuiteAbsolutePath(suiteName);
    const mainPath = path.join(suiteDir, 'main.js');
    return await fs.readFile(mainPath, 'utf-8');
  } catch {
    return null;
  }
};

// write suite inner file with JS syntax check
const writeSuiteInnerFile = async ({ suiteName, fileName, raw }) => {
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
async function npmInstall(suiteDir, pkgs) {
  for (const pkg of pkgs) {
    if (!safePkgNameRegex.test(pkg)) throw new Error(`非法包名:${pkg}`);
  }
  await execFileAsync('npm', ['install', ...pkgs], { cwd: suiteDir });
}
async function npmUninstall(suiteDir, pkgs) {
  for (const pkg of pkgs) {
    if (!safePkgNameRegex.test(pkg)) throw new Error(`非法包名:${pkg}`);
  }
  await execFileAsync('npm', ['uninstall', ...pkgs], { cwd: suiteDir });
}
async function npmList(suiteDir) {
  const { stdout } = await execFileAsync('npm', ['list', '--json'], { cwd: suiteDir });
  return JSON.parse(stdout);
}

// auth helpers (copied from existing auth.api)
function assertExists(value, message) { if (!value) throw new Error(message); }
function validatePassword(password, label = 'Password') {
  assertExists(password, `${label} not found`);
  if (password.length < 8) throw new Error(`${label} length must be at least 8`);
  if (password.includes(' ')) throw new Error(`${label} cannot contain space`);
}
function assertPasswordMatch(pwd1, pwd2, message = 'Passwords do not match') { if (pwd1 !== pwd2) throw new Error(message); }

function signAccessToken(user) {
  assertExists(user.username, 'User `username` property not found');
  assertExists(user.password, 'User `password` property not found');
  const userConfig = global.users[user.username];
  if (!userConfig) throw new Error('Password or username not match');
  const isValid = verifyPassword(user.password, userConfig.salt, userConfig.shadow);
  if (!isValid) throw new Error('Password or username not match');
  return jwt.sign({ id: user.username, role: userConfig.role ?? 'default' }, global.auth.secret, { expiresIn: '2h' });
}
function refreshAccessToken(username) {
  const userConfig = global.users[username];
  return jwt.sign({ id: username, role: userConfig?.role ?? 'default' }, global.auth.secret, { expiresIn: '2h' });
}

let sudoLock;

const typeDefs = `
  scalar JSON

  type Health {
    running: Boolean!
    uptime: Float!
    ok: Boolean!
  }

  type Suite {
    suiteName: String!
    hasMainJs: Boolean!
    settings: JSON
  }

  type AuthPayload {
    token: String!
    username: String!
  }

  type ExecResult { result: JSON }

  type Query {
    health: Health!
    listSuites: [String!]!
    getSuite(suiteName: String!): Suite
    npmList(suiteName: String!): JSON
    validate: JSON
  }

  type Mutation {
    login(username: String!, password: String!): AuthPayload
    logout: Boolean
    refresh: String
    changePassword(password: String!, newPassword: String!, confirmPassword: String!): Boolean
    newUser(username: String!, password: String!, confirmPassword: String!): Boolean

    createSuite(suiteName: String!, settingsRaw: String, mainJsRaw: String): Boolean
    updateSuiteFile(suiteName: String!, fileName: String!, raw: String!): Boolean
    execSuite(suiteName: String!, params: JSON): ExecResult
    deleteSuite(suiteName: String!): Boolean

    npmInstall(suiteName: String!, pkgs: [String!]!): Boolean
    npmUninstall(suiteName: String!, pkgs: [String!]!): Boolean

    requestSudo: Boolean
    validateSudo(token: String!): Boolean
  }
`;

const resolvers = {
  JSON: JSONScalar,
  Query: {
    health: () => ({ running: true, uptime: Date.now() - global.startTime, ok: true }),
    listSuites: async () => {
      const suitesMeta = await dirSource.listValidSuites();
      return suitesMeta.map((s) => s.suiteId);
    },
    getSuite: async (_parent, { suiteName }) => {
      if (!isValidSuiteName(suiteName)) throw new Error('套件名称非法');
      if (!dirSource.has(suiteName)) throw new Error('套件不存在');
      const settings = await dirSource.getSuiteSettings(suiteName);
      const mainText = await readSuiteMainJs(suiteName);
      return { suiteName, hasMainJs: mainText !== null, settings };
    },
    npmList: async (_p, { suiteName }) => {
      if (!isValidSuiteName(suiteName)) throw new Error('套件名称非法');
      if (!dirSource.has(suiteName)) throw new Error('套件不存在');
      const suiteDir = dirSource._getSuiteAbsolutePath(suiteName);
      return await npmList(suiteDir);
    },
    validate: (_p, _args, ctx) => {
      if (!ctx?.user) return null;
      return { username: ctx.user.id, role: ctx.user.role, exp: ctx.user.exp, iat: ctx.user.iat };
    }
  },
  Mutation: {
    login: async (_p, { username, password }) => {
      try {
        if (!global.users[username]) throw new Error('User does not exist.');
        // clear old tokens
        for (const [token, user] of global.auth.tokenMap.entries()) {
          if (user === username) global.auth.tokenMap.delete(token);
        }
        const token = signAccessToken({ username, password });
        global.auth.tokenMap.set(token, username);
        return { token, username };
      } catch (err) {
        throw new Error(err.message);
      }
    },
    logout: (_p, _args, ctx) => {
      try {
        const authHeader = ctx?.req?.headers?.authorization;
        if (!authHeader?.startsWith('Bearer ')) throw new Error('Invalid authorization header');
        const token = authHeader.split(' ')[1];
        const username = global.auth.tokenMap.get(token);
        if (!username) throw new Error('Token not found');
        global.auth.tokenMap.delete(token);
        return true;
      } catch (err) {
        throw new Error(err.message);
      }
    },
    refresh: (_p, _args, ctx) => {
      try {
        const authHeader = ctx?.req?.headers?.authorization;
        if (!authHeader?.startsWith('Bearer ')) throw new Error('Invalid authorization header');
        const token = authHeader.split(' ')[1];
        const username = global.auth.tokenMap.get(token);
        if (!username) throw new Error('Token not found');
        const newToken = refreshAccessToken(username);
        global.auth.tokenMap.delete(token);
        global.auth.tokenMap.set(newToken, username);
        return newToken;
      } catch (err) { throw new Error(err.message); }
    },
    changePassword: async (_p, { password, newPassword, confirmPassword }, ctx) => {
      try {
        const authHeader = ctx?.req?.headers?.authorization;
        if (!authHeader?.startsWith('Bearer ')) throw new Error('Invalid authorization header');
        const token = authHeader.split(' ')[1];
        const username = global.auth.tokenMap.get(token);
        assertExists(username, 'User not found');
        assertExists(password, 'Password not found');
        validatePassword(newPassword, 'New password');
        assertExists(confirmPassword, 'Confirm password not found');
        assertPasswordMatch(newPassword, confirmPassword, 'New password and confirm password not match');
        if (newPassword === password) throw new Error('New password cannot be the same as old password');
        const userConfig = global.users[username];
        const isOldValid = verifyPassword(password, userConfig.salt, userConfig.shadow);
        if (!isOldValid) throw new Error('Old password is incorrect');
        const newSalt = generateSalt();
        userConfig.salt = newSalt;
        userConfig.shadow = hashPassword(newPassword, newSalt);
        delete userConfig.defaultPasswd;
        await config.saveUsersAsync(global.users);
        return true;
      } catch (err) { throw new Error(err.message); }
    },
    newUser: async (_p, { username, password, confirmPassword }) => {
      try {
        assertExists(username, 'Username not found');
        validatePassword(password);
        assertExists(confirmPassword, 'Confirm password not found');
        assertPasswordMatch(password, confirmPassword, 'Password and confirm password not match');
        if (global.users[username]) throw new Error('Username already exists');
        const salt = generateSalt();
        const shadow = hashPassword(password, salt);
        global.users[username] = { salt, shadow, role: 'user' };
        await config.saveUsersAsync(global.users);
        return true;
      } catch (err) { throw new Error(err.message); }
    },

    createSuite: async (_p, { suiteName, settingsRaw, mainJsRaw }) => {
      if (!suiteName || !isValidSuiteName(suiteName)) throw new Error('suiteName非法');
      if (dirSource.has(suiteName)) throw new Error('套件已存在');
      await dirSource.add(suiteName, { rawText: settingsRaw });
      if (mainJsRaw !== undefined) await writeSuiteInnerFile({ suiteName, fileName: 'main.js', raw: mainJsRaw });
      return true;
    },
    updateSuiteFile: async (_p, { suiteName, fileName, raw }) => {
      if (!isValidSuiteName(suiteName)) throw new Error('套件名称非法');
      if (!dirSource.has(suiteName)) throw new Error('套件不存在');
      if (fileName === 'settings.json') {
        await dirSource.add(suiteName, { rawText: raw });
        return true;
      }
      if (fileName === 'main.js') {
        await writeSuiteInnerFile({ suiteName, fileName: 'main.js', raw });
        return true;
      }
      throw new Error('仅允许更新 settings.json / main.js');
    },
    execSuite: async (_p, { suiteName, params }) => {
      if (!isValidSuiteName(suiteName)) throw new Error('套件名称非法');
      const execResult = await runSuiteModule(dirSource, suiteName, params ?? {});
      return { result: execResult };
    },
    deleteSuite: async (_p, { suiteName }) => {
      if (!isValidSuiteName(suiteName)) throw new Error('套件名称非法');
      await dirSource.del(suiteName);
      return true;
    },
    npmInstall: async (_p, { suiteName, pkgs }) => {
      if (!isValidSuiteName(suiteName)) throw new Error('套件名称非法');
      if (!dirSource.has(suiteName)) throw new Error('套件不存在');
      if (!Array.isArray(pkgs) || pkgs.length === 0) throw new Error('pkgs 需要非空数组');
      const suiteDir = dirSource._getSuiteAbsolutePath(suiteName);
      await npmInstall(suiteDir, pkgs);
      return true;
    },
    npmUninstall: async (_p, { suiteName, pkgs }) => {
      if (!isValidSuiteName(suiteName)) throw new Error('套件名称非法');
      if (!dirSource.has(suiteName)) throw new Error('套件不存在');
      if (!Array.isArray(pkgs) || pkgs.length === 0) throw new Error('pkgs 需要非空数组');
      const suiteDir = dirSource._getSuiteAbsolutePath(suiteName);
      await npmUninstall(suiteDir, pkgs);
      return true;
    },
    requestSudo: (_p, _args, ctx) => {
      const user = ctx?.user;
      if (!user || user.role !== 'admin') throw new Error('无权限');
      if (!sudoLock) {
        sudoLock = generateSalt();
        console.log('sudo凭据 (60s有效)', sudoLock);
        setTimeout(() => (sudoLock = undefined), 60000);
        return true;
      }
      throw new Error('请求重复');
    },
    validateSudo: (_p, { token }) => {
      if (!sudoLock) throw new Error('Lock is empty.');
      if (token === sudoLock) return true;
      throw new Error('Token is Invalid.');
    }
  }
};

export default async () => {
  // 在服务器初始化阶段被 loader 调用
  try {
    const server = new ApolloServer({ typeDefs, resolvers });
    await server.start();
    // 挂载到 express
    global.server.app.use('/graphql', expressMiddleware(server, {
      context: async ({ req }) => ({ req, user: req.user })
    }));
    global.logger.getByContext('GraphQL').info('GraphQL endpoint mounted at /graphql');
  } catch (err) {
    console.error('Failed to start GraphQL server:', err);
    throw err;
  }

  // 返回空路由数组，防止 loader 做其他 REST 注册
  return [];
};
