import createRule, { Rule } from "../Rules/Rule.mjs";
import { Logger } from "../../../utils/Logger.mjs";

/**
 * @typedef ScanFileConfig
 * @property {string} dirPath 扫描根目录绝对路径
 * @property {string[]} exts 需要匹配的文件后缀 [".mjs",".js"]
 * @property {string[]} dirBlackList 目录黑名单
 * @property {number} maxDepth 最大递归扫描深度
 * @property {Logger | undefined} logger 日志实例，可选注入
 */

// 构建 ScanFileConfig 的校验Schema
export const ScanFileConfigSchema = createRule()
  .child({
    dirPath: Rule.type("string").minLength(1),
    exts: Rule.type("array").items(Rule.type("string")),
    dirBlackList: Rule.type("array").items(Rule.type("string")),
    maxDepth: Rule.type("number").min(1),
    logger: Rule.instance(Logger).optional().nullable(),
    injectTools: Rule.type("object").optional().nullable(),
  });

/**
 * 校验配置对象，抛出异常（校验失败直接抛，适合初始化阶段）
 * @param {unknown} cfg
 * @returns {ScanFileConfig}
 */
export function assertScanFileConfig(cfg) {
  // -------- 调试输出，运行完删掉 --------
  // console.log("===DEBUG cfg===", JSON.stringify(cfg, null,2));

  const res = ScanFileConfigSchema.validate(cfg);
  if (!res.ok) {
    // 临时：逐个字段校验，定位哪个key挂了
    const fields = /** @type {const} */(["dirPath","exts","dirBlackList","maxDepth","logger"]);
    for(const f of fields){
      const subRule = ScanFileConfigSchema._rules[0].childRules[f];
      const v = /** @type {any} */(cfg)?.[f];
      const ok = subRule.test(v);
      // console.log(`field[${f}] ok=${ok} value=`,v);
    }

    const msg = res.failures.map(f => `[${f.path}] ruleId:${f.ruleId}`).join("; ");
    throw new Error(`ScanFileConfig 校验失败: ${msg}`);
  }
  return /** @type {ScanFileConfig} */ (cfg);
}