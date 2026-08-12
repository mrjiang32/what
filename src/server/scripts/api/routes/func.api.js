// func.api.js
import { createModuleRoutes } from "../RESTful.js";
import sources from "../../../global/config/source.category.js";

// 直接从全局配置中获取已初始化的 Func Source 实例
const source = sources["/custom/func"].source;

/**
 * 安全执行指定的 Func 模块
 * @param {string} relPath - 模块相对路径
 * @param {object} body - 请求体（包含 params）
 */
export const exec = async (relPath, body) => {
  if (!source.has(relPath)) {
    throw new Error(`${relPath} Function not found.`);
  }
  // 假设 source 本身提供了 runModule 方法（如 VmScriptLoader 等）
  return await source.runModule(relPath, body.params);
};

export default async () => {
  return createModuleRoutes({
    apiPrefix: "/api/func",
    source,
    exec,
  });
};