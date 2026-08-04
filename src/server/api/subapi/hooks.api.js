import NativeImportLoader from "../../classes/modules/NativeImportLoader.js";
import { createModuleRoutes } from "../apiFactory.js";
import globalenv from "../../global/globalenv.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOKS_ROOT = path.resolve(__dirname, "../modules/hooks");

export default {
  generate: async () => {
    const loader = new NativeImportLoader(HOOKS_ROOT);
    loader.scanConfig.allowedExts = [".json"];

    const routes = await createModuleRoutes({
      apiPrefix: "/api/hook",
      dirPrefix: "",
      fileExt: ".json",
      loader,
      exec: async (relPath, body) => {
        globalenv.actionlog.info(`触发钩子 ${relPath}`);
        let res;
        try {
          res = await loader.loadAModule(relPath);
        } catch (err) {
          globalenv.actionlog.error(`钩子加载失败 ${relPath}`, err);
          return [];
        }
        const { actions } = res ?? {};

        if (!Array.isArray(actions)) {
          return [];
        }

        if (typeof body.params !== "object" || body.params === null) {
          body.params = {};
        }
        if (typeof body.selParams !== "object" || body.selParams === null) {
          body.selParams = {};
        }

        // 规范化模块名
        const getModuleName = (name) => {
          if (!name) return null;
          return name.endsWith('.js') ? name : `${name}.js`;
        };

        // selParams：key转换为带.js的模块id
        const selParams = {};
        Object.keys(body.selParams).forEach((k) => {
          const modKey = getModuleName(k);
          if (modKey) {
            selParams[modKey] = body.selParams[k];
          }
        });

        const promises = actions
          .map(raw => {
            const modId = getModuleName(raw.id);
            return {
              id: modId,
              param: raw.param ?? {}
            };
          })
          .filter(modified => modified.id && globalenv.actionLoader.hasModule(modified.id))
          .map(modified => {
            const baseParams = body.params;
            const selOverride = selParams[modified.id] ?? {};
            // 合并优先级：json文件param < body.params < selParams（按模块单独覆写）
            const merged = { ...modified.param, ...baseParams, ...selOverride };

            let safeParams;
            try {
              safeParams = structuredClone(merged);
            } catch (e) {
              globalenv.actionlog.error(`hook param clone failed for module ${modified.id}`, e);
              return Promise.reject(e);
            }
            return globalenv.actionLoader.runModule(modified.id, safeParams);
          });

        const settled = await Promise.allSettled(promises);
        const results = [];
        for (const item of settled) {
          if (item.status === 'fulfilled') {
            results.push({ ok: true, value: item.value });
          } else {
            const err = item.reason;
            const errInfo = {
              message: err?.message ?? String(err),
              stack: err?.stack
            };
            results.push({ ok: false, reason: errInfo });
            globalenv.actionlog.error(`钩子子脚本执行异常`, err);
          }
        }
        return results;
      },
      validateSyntax: false,
    });

    // Hook 专属扩展：保存时自动结构化 JSON
    // 找到 POST 路由，替换 handler
    const postRoute = routes.find((r) => r.path === "/api/hook" && r.method === "POST");
    if (postRoute) {
      const originHandler = postRoute.handler;
      postRoute.handler = async (req, res) => {
        const { name, bindedActionIds, description, friendlyName } = req.body;
        if (!name) {
          return res.status(400).json({ ok: false, error: "hook name is required" });
        }
        // 结构化写入
        req.body.code = { name, bindedActionIds, description, friendlyName };
        return originHandler(req, res);
      };
    }

    return routes;
  },
};