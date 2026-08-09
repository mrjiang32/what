import path from "path";
import global from "../global.js";

/**
 * 增强typeOf，统一类型判断
 * @param {any} object
 * @returns {string} 'array'|'object'|'string'|'number'|'boolean'|'undefined'
 */
function typeOf(object) {
  if (Array.isArray(object)) return "array";
  return typeof object;
}

/**
 * ScanRule 抽象基类
 * 接口约定：
 * test(input): boolean  是否匹配这条规则
 * process(input): void  匹配后执行处理逻辑
 * compare(a,b): number  用于排序返回 -1 /0 /1
 * getDir(): string      返回规则对应的目标目录绝对路径
 */
export class ScanRule {
  constructor(rule) {
    this.rule = rule;
  }

  test(object) {
    throw new Error("子类必须实现 test() 方法");
  }

  process(object) {
    throw new Error("子类必须实现 process() 方法");
  }

  compare(objectA, objectB) {
    throw new Error("子类必须实现 compare() 方法");
  }

  getDir() {
    throw new Error("子类必须实现 getDir() 方法");
  }
}

/**
 * ScanObjectRule
 * 适用：读取JSON解析后的JS对象
 * rule: { required:Record<string,string>, optional?:Record<string,string>, process?:fn, compare?:fn, dir:string }
 */
export class ScanObjectRule extends ScanRule {
  /**
   * @param {object} rule
   * @param {string} [basePath] 基础根路径，默认global.dir.path
   */
  constructor(rule, basePath = global.dir.path) {
    super(rule);
    this.basePath = basePath;
  }

  /**
   * 校验必填字段以及类型
   * @param {object} object 解析后的json对象
   * @returns {boolean}
   */
  test(object) {
    // 必须是普通对象，不能数组
    if (typeOf(object) !== "object" || object === null) return false;

    // 校验 required 字段：存在+类型匹配
    const requiredOk = Object.keys(this.rule.required ?? {}).every((key) => {
      return Object.prototype.hasOwnProperty.call(object, key)
        && typeOf(object[key]) === this.rule.required[key];
    });
    if (!requiredOk) return false;

    // 可选字段：存在则校验类型，不存在放过
    const optional = this.rule.optional ?? {};
    const optionalOk = Object.keys(optional).every((key) => {
      if (!Object.prototype.hasOwnProperty.call(object, key)) return true;
      return typeOf(object[key]) === optional[key];
    });
    return optionalOk;
  }

  process(object) {
    if (typeof this.rule.process === "function") {
      this.rule.process(object);
    }
  }

  compare(objectA, objectB) {
    if (typeof this.rule.compare === "function") {
      return this.rule.compare(objectA, objectB);
    }
    // 默认不排序，返回0
    return 0;
  }

  getDir() {
    return path.resolve(this.basePath, this.rule.dir);
  }
}

/**
 * ScanFileRule
 * 适用：文件名字符串（相对路径）
 * rule: { dir:string, exts:string[], process?:fn, compare?:fn }
 */
export class ScanFileRule extends ScanRule {
  /**
   * @param {object} rule
   * @param {string} [basePath]
   */
  constructor(rule, basePath = global.dir.path) {
    super(rule);
    this.basePath = basePath;
  }

  /**
   * 测试文件名是否满足后缀过滤
   * @param {string} filename 文件名/相对路径
   * @returns {boolean}
   */
  test(filename) {
    if (typeOf(filename) !== "string" || !filename) return false;
    const ext = path.extname(filename);
    const exts = this.rule.exts ?? [];
    return exts.includes(ext);
  }

  process(filename) {
    if (typeof this.rule.process === "function") {
      this.rule.process(filename);
    }
  }

  compare(fileA, fileB) {
    if (typeof this.rule.compare === "function") {
      return this.rule.compare(fileA, fileB);
    }
    return fileA.localeCompare(fileB);
  }

  getDirPath() {
    return path.resolve(this.basePath, this.rule.dir);
  }

  getRelDirPath() {
    return this.rule.dir;
  }
}
