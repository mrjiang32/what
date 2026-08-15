// hook.api.js
import { createModuleRoutes } from "../RESTful.js";
import { exec as execFunc } from "./func.api.js"; // 优雅地复用执行逻辑
import sources from "../../../global/config/source.category.js";

export default async () => {
  // 直接从全局配置中获取已初始化的 Source 实例
  const hookSource = sources["/custom/hook"].source;
  const funcSource = sources["/custom/func"].source;

  const routes = await createModuleRoutes({
    apiPrefix: "/api/hook",
    source: hookSource,
    exec: async (relPath, body) => {
      global.actionlog.info(`触发钩子 ${relPath}`);
      
      let res;
      try {
        // JSONSource.get() 直接返回解析后的 JS 对象
        res = await hookSource.get(relPath);
      } catch (err) {
        global.actionlog.error(`钩子加载失败 ${relPath}`, err);
        return [];
      }
      
      const { actions } = res ?? {};
      if (!Array.isArray(actions)) return [];

      // 规范化请求体参数
      const baseParams = (body?.params && typeof body.params === "object") ? body.params : {};
      const rawSelParams = (body?.selParams && typeof body.selParams === "object") ? body.selParams : {};

      // 规范化模块名
      const getModuleName = (name) => {
        if (!name) return null;
        return name.endsWith('.js') ? name : `${name}.js`;
      };

      // selParams：key转换为带.js的模块id
      const selParams = {};
      Object.keys(rawSelParams).forEach((k) => {
        const modKey = getModuleName(k);
        if (modKey) selParams[modKey] = rawSelParams[k] ?? {};
      });

      const promises = actions
        .map(raw => ({
          id: getModuleName(raw.id),
          param: raw.param ?? {}
        }))
        // 使用 funcSource.has() 校验目标 action 是否存在于 func 数据源中
        .filter(modified => modified.id && funcSource.has(modified.id))
        .map(modified => {
          const selOverride = selParams[modified.id] ?? {};
          // 合并优先级：json文件param < body.params < selParams（按模块单独覆写）
          const merged = { ...modified.param, ...baseParams, ...selOverride };
          
          // 委托给 func.api.js 的 exec 函数处理执行（内部包含安全克隆）
          return execFunc(modified.id, { params: merged });
        });

      const settled = await Promise.allSettled(promises);
      return settled.map(item => {
        if (item.status === 'fulfilled') {
          return { ok: true, value: item.value };
        }
        const err = item.reason;
        global.actionlog.error(`钩子子脚本执行异常`, err);
        return { 
          ok: false, 
          reason: { message: err?.message ?? String(err), stack: err?.stack } 
        };
      });
    },
    ext: "json"
  });

  // Hook 专属扩展：保存时自动结构化 JSON
  const postRoute = routes.find((r) => r.path === "/api/hook" && r.method === "POST");
  if (postRoute) {
    const originHandler = postRoute.handler;
    postRoute.handler = async (req, res) => {
      const { id, bindedActionIds, description, friendlyName } = req.body;
      if (!id) {
        return res.status(400).json({ ok: false, error: "hook id is required" });
      }
      // JSONSource 会自动处理 JSON.stringify 和格式化缩进
      req.body.raw = { name: id, bindedActionIds, description, friendlyName };
      return originHandler(req, res);
    };
  }

  return routes;
};