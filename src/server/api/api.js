import path from "path";
import { fileURLToPath } from "url";
import NativeImportLoader from "../classes/modules/NativeImportLoader.js";
import globalenv from "../global/globalenv.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SUBAPI_ROOT = path.join(__dirname, "subapi");

// 根路由
const rootpage = {
  path: "/api",
  method: "GET",
  handler: (req, res) => {
    res.json({
      running: true,
      uptime: Date.now() - globalenv.startTime,
      ok: true,
    });
  },
};

export default {
  generate: async () => {
    // 用 Loader 扫描子API模块
    const subapiLoader = new NativeImportLoader(SUBAPI_ROOT);
    subapiLoader.scanConfig.allowedExts = [".js"];
    const subapiList = await subapiLoader.scanModules();

    // 批量加载
    const subapiModules = await Promise.all(
      subapiList.map((item) => subapiLoader.loadAModule(item.relPath))
    );

    // 生成路由
    const generatedRoutes = await Promise.all(
      subapiModules.map((mod) => mod.default.generate())
    );

    return [rootpage, ...generatedRoutes.flat()];
  },
};