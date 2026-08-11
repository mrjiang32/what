import createRule, { Rule } from "../Rules/Rule.mjs";

/**
 * @typedef ScanFileConfig
 * @property {string} dirPath 扫描根目录绝对路径
 * @property {string[]} exts 需要匹配的文件后缀 [".mjs",".js"]
 * @property {string[]} dirBlackList 目录黑名单
 * @property {number} maxDepth 最大递归扫描深度
 */

// 构建 ScanFileConfig 的校验Schema
export const ScanFileConfigSchema = createRule()
  .strictChild({
    dirPath: Rule.type("string").minLength(1),
    exts: Rule.type("array").items(Rule.type("string")),
    dirBlackList: Rule.type("array").items(Rule.type("string")),
    maxDepth: Rule.type("number").min(1)
  });

/**
 * 校验配置对象，抛出异常（校验失败直接抛，适合初始化阶段）
 * @param {unknown} cfg
 * @returns {ScanFileConfig}
 */
export function assertScanFileConfig(cfg) {
  const res = ScanFileConfigSchema.validate(cfg);
  if (!res.ok) {
    const msg = res.failures.map(f => `[${f.path}] ruleId:${f.ruleId}`).join("; ");
    throw new Error(`ScanFileConfig 校验失败: ${msg}`);
  }
  return /** @type {ScanFileConfig} */ (cfg);
}