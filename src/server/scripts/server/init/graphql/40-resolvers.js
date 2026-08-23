import { JSONScalar } from "./10-scalars.js";
import * as H from "./20-helpers.js";
import global from "../../../../global.js";

export const resolvers = {
  JSON: JSONScalar,
  Query: {
    health: () => ({
      running: true,
      uptime: Date.now() - global.startTime,
      ok: true,
    }),
    listSuites: async () => {
      const suitesMeta = await H.dirSource.listValidSuites();
      return suitesMeta.map((s) => s.suiteId);
    },
    getSuite: async (_parent, { suiteName }) => {
      if (!H.isValidSuiteName(suiteName)) throw new Error("套件名称非法");
      if (!H.dirSource.has(suiteName)) throw new Error("套件不存在");
      const settings = await H.dirSource.getSuiteSettings(suiteName);
      const mainText = await H.readSuiteMainJs(suiteName);
      return { suiteName, hasMainJs: mainText !== null, settings };
    },
    npmList: async (_p, { suiteName }) => {
      if (!H.isValidSuiteName(suiteName)) throw new Error("套件名称非法");
      if (!H.dirSource.has(suiteName)) throw new Error("套件不存在");
      const suiteDir = H.dirSource._getSuiteAbsolutePath(suiteName);
      return await H.npmList(suiteDir);
    },
  },
  Mutation: {
    createSuite: async (_p, { suiteName, settingsRaw, mainJsRaw }) => {
      if (!suiteName || !H.isValidSuiteName(suiteName))
        throw new Error("suiteName非法");
      if (H.dirSource.has(suiteName)) throw new Error("套件已存在");
      await H.dirSource.add(suiteName, { rawText: settingsRaw });
      if (mainJsRaw !== undefined)
        await H.writeSuiteInnerFile({
          suiteName,
          fileName: "main.js",
          raw: mainJsRaw,
        });
      return true;
    },
    updateSuiteFile: async (_p, { suiteName, fileName, raw }) => {
      if (!H.isValidSuiteName(suiteName)) throw new Error("套件名称非法");
      if (!H.dirSource.has(suiteName)) throw new Error("套件不存在");
      if (fileName === "settings.json") {
        await H.dirSource.add(suiteName, { rawText: raw });
        return true;
      }
      if (fileName === "main.js") {
        await H.writeSuiteInnerFile({ suiteName, fileName: "main.js", raw });
        return true;
      }
      throw new Error("仅允许更新 settings.json / main.js");
    },
    execSuite: async (_p, { suiteName, params }) => {
      if (!H.isValidSuiteName(suiteName)) throw new Error("套件名称非法");

      try {
        const execResult = await H.runSuiteModule(
          H.dirSource,
          suiteName,
          params ?? {},
        );
        return { result: execResult, error: null };
      } catch (err) {
        setTimeout(() => global.logger.error(err), 50);
        return { result: null, error: `${err.name} ${err.message} ${err.stack}` };
      }
    },
    deleteSuite: async (_p, { suiteName }) => {
      if (!H.isValidSuiteName(suiteName)) throw new Error("套件名称非法");
      await H.dirSource.del(suiteName);
      return true;
    },
    npmInstall: async (_p, { suiteName, pkgs }) => {
      if (!H.isValidSuiteName(suiteName)) throw new Error("套件名称非法");
      if (!H.dirSource.has(suiteName)) throw new Error("套件不存在");
      if (!Array.isArray(pkgs) || pkgs.length === 0)
        throw new Error("pkgs 需要非空数组");
      const suiteDir = H.dirSource._getSuiteAbsolutePath(suiteName);
      await H.npmInstall(suiteDir, pkgs);
      return true;
    },
    npmUninstall: async (_p, { suiteName, pkgs }) => {
      if (!H.isValidSuiteName(suiteName)) throw new Error("套件名称非法");
      if (!H.dirSource.has(suiteName)) throw new Error("套件不存在");
      if (!Array.isArray(pkgs) || pkgs.length === 0)
        throw new Error("pkgs 需要非空数组");
      const suiteDir = H.dirSource._getSuiteAbsolutePath(suiteName);
      await H.npmUninstall(suiteDir, pkgs);
      return true;
    },
    requestSudo: () => {
      if (!global.sudoLock) {
        global.sudoLock = H.generateSalt();
        console.log("sudo凭据 (60s有效)", global.sudoLock);
        setTimeout(() => (global.sudoLock = undefined), 60000);
        return true;
      }
      throw new Error("请求重复");
    },
    validateSudo: (_p, { token }) => {
      if (!global.sudoLock) throw new Error("Lock is empty.");
      if (token === global.sudoLock) return true;
      throw new Error("Token is Invalid.");
    },
  },
};
