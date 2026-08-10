import { ScanRule } from "./ScanRule.Base.mjs";
import { SecureObject } from "../SecureObject.mjs";

/**
 * 增强typeOf，统一类型判断
 * @param {any} object
 * @returns {string} 'array'|'object'|'string'|'number'|'boolean'|'undefined'|'symbol'|'bigint'|'function'
 */
function typeOf(object) {
  if (Array.isArray(object)) return "array";
  return typeof object
}


export class ScanObjectRule extends ScanRule {
  /**
   * @param {object} rule
   * @param {string} [basePath] 基础根路径，默认global.dir.path
   */
  constructor(rule, basePath = global.dir.path) {
    super(rule);
    this.rule = rule;
    this.basePath = basePath;
  }

  /**
   * 校验必填字段以及类型
   * @param {string} jsonStr JSON字符串
   * @returns {boolean}
   */
  test(jsonStr) {
    // 转换SecureObject
    const object = new SecureObject(jsonStr);
    
    // 不是json ->> 转换失败了
    if (object.from !== "json") return false;
    
    const requiredOk = Object.keys(this.rule.required ?? {}).every((key) => {
      return (
        Object.prototype.hasOwnProperty.call(object.value, key) &&
        typeOf(object[key]) === this.rule.required[key]
      );
    });

    if (!requiredOk) return false;

    const optionalOk = Object.keys(this.rule.optional ?? {}).every((key) => {
      if (!Object.prototype.hasOwnProperty.call(object, key)) return true;
      return typeOf(object[key]) === this.rule.optional[key];
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
    
    return 0;
  }

  getDir() {
    return path.resolve(this.basePath, this.rule.dir);
  }
}
