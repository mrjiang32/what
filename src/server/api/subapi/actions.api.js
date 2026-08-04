import VmScriptLoader from "../../classes/modules/VmScriptLoader.js";
import { createModuleRoutes } from "../apiFactory.js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ACTIONS_ROOT = path.resolve(__dirname, "../../modules/actions");

// 注入安全工具集合（按需增减）
const safeInject = {
  // utils: xxx
};

export default {
  generate: () => {
    const loader = new VmScriptLoader(ACTIONS_ROOT, safeInject);
    // 自定义扫描后缀
    loader.scanConfig.allowedExts = [".action.js"];

    return createModuleRoutes({
      apiPrefix: "/api/action",
      dirPrefix: "",
      fileExt: ".action.js",
      loader,
      validateSyntax: true,
    });
  },
};