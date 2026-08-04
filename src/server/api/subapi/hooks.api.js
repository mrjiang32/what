import NativeImportLoader from "../../classes/modules/NativeImportLoader.js";
import { createModuleRoutes } from "../apiFactory.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOKS_ROOT = path.resolve(__dirname, "../../modules/hooks");

export default {
  generate: () => {
    const loader = new NativeImportLoader(HOOKS_ROOT);
    loader.scanConfig.allowedExts = [".json"];

    const routes = createModuleRoutes({
      apiPrefix: "/api/hook",
      dirPrefix: "",
      fileExt: ".json",
      loader,
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