import { JSONScalar } from './10-scalars.js';
import * as H from './20-helpers.js';

export const resolvers = {
  JSON: JSONScalar,
  Query: {
    health: () => ({ running: true, uptime: Date.now() - global.startTime, ok: true }),
    listSuites: async () => {
      const suitesMeta = await H.dirSource.listValidSuites();
      return suitesMeta.map((s) => s.suiteId);
    },
    getSuite: async (_parent, { suiteName }) => {
      if (!H.isValidSuiteName(suiteName)) throw new Error('套件名称非法');
      if (!H.dirSource.has(suiteName)) throw new Error('套件不存在');
      const settings = await H.dirSource.getSuiteSettings(suiteName);
      const mainText = await H.readSuiteMainJs(suiteName);
      return { suiteName, hasMainJs: mainText !== null, settings };
    },
    npmList: async (_p, { suiteName }) => {
      if (!H.isValidSuiteName(suiteName)) throw new Error('套件名称非法');
      if (!H.dirSource.has(suiteName)) throw new Error('套件不存在');
      const suiteDir = H.dirSource._getSuiteAbsolutePath(suiteName);
      return await H.npmList(suiteDir);
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
        const token = H.signAccessToken({ username, password });
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
        const newToken = H.refreshAccessToken(username);
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
        H.assertExists(username, 'User not found');
        H.assertExists(password, 'Password not found');
        H.validatePassword(newPassword, 'New password');
        H.assertExists(confirmPassword, 'Confirm password not found');
        H.assertPasswordMatch(newPassword, confirmPassword, 'New password and confirm password not match');
        if (newPassword === password) throw new Error('New password cannot be the same as old password');
        const userConfig = global.users[username];
        const isOldValid = H.verifyPassword ? H.verifyPassword(password, userConfig.salt, userConfig.shadow) : false;
        if (!isOldValid) throw new Error('Old password is incorrect');
        const newSalt = H.generateSalt ? H.generateSalt() : null;
        userConfig.salt = newSalt;
        userConfig.shadow = H.hashPassword ? H.hashPassword(newPassword, newSalt) : null;
        delete userConfig.defaultPasswd;
        await H.config.saveUsersAsync(global.users);
        return true;
      } catch (err) { throw new Error(err.message); }
    },
    newUser: async (_p, { username, password, confirmPassword }) => {
      try {
        H.assertExists(username, 'Username not found');
        H.validatePassword(password);
        H.assertExists(confirmPassword, 'Confirm password not found');
        H.assertPasswordMatch(password, confirmPassword, 'Password and confirm password not match');
        if (global.users[username]) throw new Error('Username already exists');
        const salt = H.generateSalt ? H.generateSalt() : null;
        const shadow = H.hashPassword ? H.hashPassword(password, salt) : null;
        global.users[username] = { salt, shadow, role: 'user' };
        await H.config.saveUsersAsync(global.users);
        return true;
      } catch (err) { throw new Error(err.message); }
    },

    createSuite: async (_p, { suiteName, settingsRaw, mainJsRaw }) => {
      if (!suiteName || !H.isValidSuiteName(suiteName)) throw new Error('suiteName非法');
      if (H.dirSource.has(suiteName)) throw new Error('套件已存在');
      await H.dirSource.add(suiteName, { rawText: settingsRaw });
      if (mainJsRaw !== undefined) await H.writeSuiteInnerFile({ suiteName, fileName: 'main.js', raw: mainJsRaw });
      return true;
    },
    updateSuiteFile: async (_p, { suiteName, fileName, raw }) => {
      if (!H.isValidSuiteName(suiteName)) throw new Error('套件名称非法');
      if (!H.dirSource.has(suiteName)) throw new Error('套件不存在');
      if (fileName === 'settings.json') {
        await H.dirSource.add(suiteName, { rawText: raw });
        return true;
      }
      if (fileName === 'main.js') {
        await H.writeSuiteInnerFile({ suiteName, fileName: 'main.js', raw });
        return true;
      }
      throw new Error('仅允许更新 settings.json / main.js');
    },
    execSuite: async (_p, { suiteName, params }) => {
      if (!H.isValidSuiteName(suiteName)) throw new Error('套件名称非法');
      const execResult = await H.runSuiteModule(H.dirSource, suiteName, params ?? {});
      return { result: execResult };
    },
    deleteSuite: async (_p, { suiteName }) => {
      if (!H.isValidSuiteName(suiteName)) throw new Error('套件名称非法');
      await H.dirSource.del(suiteName);
      return true;
    },
    npmInstall: async (_p, { suiteName, pkgs }) => {
      if (!H.isValidSuiteName(suiteName)) throw new Error('套件名称非法');
      if (!H.dirSource.has(suiteName)) throw new Error('套件不存在');
      if (!Array.isArray(pkgs) || pkgs.length === 0) throw new Error('pkgs 需要非空数组');
      const suiteDir = H.dirSource._getSuiteAbsolutePath(suiteName);
      await H.npmInstall(suiteDir, pkgs);
      return true;
    },
    npmUninstall: async (_p, { suiteName, pkgs }) => {
      if (!H.isValidSuiteName(suiteName)) throw new Error('套件名称非法');
      if (!H.dirSource.has(suiteName)) throw new Error('套件不存在');
      if (!Array.isArray(pkgs) || pkgs.length === 0) throw new Error('pkgs 需要非空数组');
      const suiteDir = H.dirSource._getSuiteAbsolutePath(suiteName);
      await H.npmUninstall(suiteDir, pkgs);
      return true;
    },
    requestSudo: (_p, _args, ctx) => {
      const user = ctx?.user;
      if (!user || user.role !== 'admin') throw new Error('无权限');
      if (!global.sudoLock) {
        global.sudoLock = H.generateSalt();
        console.log('sudo凭据 (60s有效)', global.sudoLock);
        setTimeout(() => (global.sudoLock = undefined), 60000);
        return true;
      }
      throw new Error('请求重复');
    },
    validateSudo: (_p, { token }) => {
      if (!global.sudoLock) throw new Error('Lock is empty.');
      if (token === global.sudoLock) return true;
      throw new Error('Token is Invalid.');
    }
  }
};
