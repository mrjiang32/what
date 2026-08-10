import { ScanRule } from "./ScanRule.Base.mjs";
import path from "path";

/**
 * @typedef ScanFileRuleOption
 * @property {string} dir 扫描根目录（相对basePath）
 * @property {string[]} exts 后缀列表 [".json",".md"]
 * @property {RegExp} regExp 路径正则过滤
 * @property {(filename:string)=>void} [process] 扫描后回调处理函数
 * @property {(a:string,b:string)=>number} [compare] 排序比较函数
 */

/**
 * 【接口契约】扫描文件规则对外接口
 * @interface ScanFileRuleInterface
 * @property {Set<string>} exts 后缀集合
 * @method test(filename:string):boolean 校验文件名是否匹配规则
 * @method process(filename:string):void 执行自定义处理回调
 * @method compare(fileA:string,fileB:string):number 文件排序比较
 * @method getDir():string 获取解析后绝对扫描目录
 * @method getRelDir():string 获取原始配置相对目录
 */

/**
 * 文件扫描规则实现类，实现 {@link ScanFileRuleInterface}
 */
export class ScanFileRule extends ScanRule {
  /**
   * @param {ScanFileRuleOption} rule
   * @param {string} [basePath=global.dir.path] 基础解析根路径
   */
  constructor(rule, basePath = global.dir.path) {
    super(rule);
    /**
     * @type {ScanFileRuleOption}
     */
    this.rule = rule;
    /**
     * 路径解析基准根目录
     * @type {string}
     */
    this.basePath = basePath;
    /**
     * 文件后缀集合
     * @type {Set<string>}
     */
    this.exts = new Set(rule.exts ?? []);
  }

  /**
   * 测试文件名/相对路径是否满足后缀 + 正则过滤条件
   * @implements {ScanFileRuleInterface#test}
   * @param {string} filename 文件名或者文件相对路径
   * @returns {boolean} 是否命中规则
   */
  test(filename) {
    if (typeof filename !== "string" || !filename) return false;
    const ext = path.extname(filename);
    return this.exts.has(ext) && this.rule.regExp.test(filename);
  }

  /**
   * 执行自定义处理回调
   * @implements {ScanFileRuleInterface#process}
   * @param {string} filename
   * @returns {void}
   */
  process(filename) {
    if (typeof this.rule.process === "function") {
      this.rule.process(filename);
    }
  }

  /**
   * 文件排序比较函数
   * @implements {ScanFileRuleInterface#compare}
   * @param {string} fileA
   * @param {string} fileB
   * @returns {number} compare结果，用于Array.sort
   */
  compare(fileA, fileB) {
    if (typeof this.rule.compare === "function") {
      return this.rule.compare(fileA, fileB);
    }
    return fileA.localeCompare(fileB);
  }

  /**
   * 获取扫描目录【绝对路径】
   * @implements {ScanFileRuleInterface#getDir}
   * @returns {string}
   */
  getDir() {
    return path.resolve(this.basePath, this.rule.dir);
  }

  /**
   * 获取配置原始相对目录
   * @implements {ScanFileRuleInterface#getRelDir}
   * @returns {string}
   */
  getRelDir() {
    return this.rule.dir;
  }

  /**
   * 兼容老代码 Scanner 调用别名 getDirPath()
   * @returns {string}
   */
  getDirPath() {
    return this.getDir();
  }
}