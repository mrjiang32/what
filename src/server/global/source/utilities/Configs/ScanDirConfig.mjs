import createRule, { Rule } from "../Rules/Rule.mjs";
import { Logger } from "../../../utils/Logger.mjs";

/**
 * @typedef ScanDirConfig
 * @property {string} dirPath 扫描根目录绝对路径
 * @property {string[]} dirBlackList 目录黑名单，目录名完全匹配过滤
 * @property {Logger | undefined | null} logger 日志实例，可选注入
 * @property {object | undefined | null} injectTools 外部注入工具对象，可选
 */

// ScanDirConfig 校验Schema，完全移除maxDepth、exts，纯ls风格目录扫描
export const ScanDirConfigSchema = createRule()
  .child({
    dirPath: Rule.type("string").minLength(1),
    dirBlackList: Rule.type("array").items(Rule.type("string")),
    logger: Rule.instance(Logger).optional().nullable(),
    injectTools: Rule.type("object").optional().nullable(),
  });

/**
 * 校验配置对象，校验失败直接抛出异常，适合初始化阶段使用
 * @param {unknown} cfg
 * @returns {ScanDirConfig}
 */
export function assertScanDirConfig(cfg) {
  const res = ScanDirConfigSchema.validate(cfg);
  if (!res.ok) {
    const msg = res.failures.map(f => `[${f.path}] ruleId:${f.ruleId}`).join("; ");
    throw new Error(`ScanDirConfig 校验失败: ${msg}`);
  }
  return /** @type {ScanDirConfig} */ (cfg);
}