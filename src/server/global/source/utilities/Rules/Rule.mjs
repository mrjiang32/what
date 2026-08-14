const types = Object.freeze({
  string: String,
  number: Number,
  boolean: Boolean,
  object: Object,
  array: Array,
  null: null,
  undefined: undefined,
  symbol: Symbol,
  function: Function,
});

export class Rule {
  constructor() {
    /**
     * @typedef {{
     *   id:string,
     *   conditioner:(v:any)=>boolean,
     *   [key:string]: any
     * }} RuleEntry
     * @type {RuleEntry[]}
     */
    this._rules = [];
  }

  /**
   * 原生typeof体系校验，接收字符串别名
   * @param {string} type
   */
  typeOf(type) {
    if (typeof type !== "string") {
      throw new Error(".typeOf() only accept string type alias");
    }
    if (!(type in types)) {
      throw new Error(`unknown type alias: ${type}`);
    }

    const target = types[type];
    if (target === null) {
      this._rules.push({
        id: "typeOfNull",
        conditioner: (value) => value === null
      });
    } else if (target === undefined) {
      this._rules.push({
        id: "typeOfUndefined",
        conditioner: (value) => value === undefined
      });
    } else if (type === "array") {
      this._rules.push({
        id: "typeOfArray",
        conditioner: (value) => Array.isArray(value)
      });
    } else if (type === "object") {
      this._rules.push({
        id: "typeOf",
        expect: type,
        conditioner: (value) => value !== null && typeof value === type
      });
    } else {
      this._rules.push({
        id: "typeOf",
        expect: type,
        conditioner: (value) => typeof value === type
      });
    }
    return this;
  }

  /**
   * instanceof 实例校验，只接收构造函数
   * @param {Function} ctor
   */
  instanceOf(ctor) {
    if (typeof ctor !== "function") {
      throw new Error(".instanceOf() only accept constructor function");
    }
    this._rules.push({
      id: "instanceOf",
      type: ctor,
      conditioner: (value) => value instanceof ctor
    });
    return this;
  }

  /**
   * 自定义匹配规则
   * @param {(v:any)=>boolean} conditioner
   */
  match(conditioner) {
    if (typeof conditioner !== "function") {
      throw new Error(".match() expect a function");
    }
    this._rules.push({
      id: "match",
      conditioner: (value) => {
        const ret = conditioner(value);
        return Boolean(ret);
      }
    });
    return this;
  }

  /**
   * 合并另外一个Rule实例的规则（展开，不嵌套Rule对象）
   * @param {Rule} rule
   */
  append(rule) {
    if (!(rule instanceof Rule)) {
      throw new Error(".append() only accept Rule instance");
    }
    this._rules.push(...rule._rules);
    return this;
  }

  /**
   * 嵌套子校验，宽松对象shape，允许额外字段
   * @param {Rule | Rule[] | Record<string, Rule>} childRules
   */
  child(childRules) {
    this._rules.push({
      id: "child",
      childRules,
      conditioner: (value) => {
        if (childRules instanceof Rule) {
          return childRules.test(value);
        }
        if (Array.isArray(childRules)) {
          return childRules.every(r => {
            if (!(r instanceof Rule)) return false;
            return r.test(value);
          });
        }
        if (typeof childRules === "object" && childRules !== null) {
          if (value === null || typeof value !== "object") {
            return false;
          }
          return Object.entries(childRules).every(([key, rule]) => {
            if (!(rule instanceof Rule)) return false;
            return rule.test(value[key]);
          });
        }
        return false;
      }
    });
    return this;
  }

  /**
   * 严格对象shape，禁止额外属性
   * @param {Record<string, Rule>} childRules
   */
  strictChild(childRules) {
    if (typeof childRules !== "object" || childRules === null || Array.isArray(childRules)) {
      throw new Error(".strictChild only accept plain object schema");
    }
    const expectKeys = Object.keys(childRules);
    this._rules.push({
      id: "strictChild",
      expectKeys,
      childRules,
      conditioner: (value) => {
        if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
        const actualKeys = Object.keys(value);
        if (actualKeys.some(k => !expectKeys.includes(k))) return false;
        return Object.entries(childRules).every(([key, rule]) => {
          if (!(rule instanceof Rule)) return false;
          return rule.test(value[key]);
        });
      }
    });
    return this;
  }

  /**
   * 数组每一项校验；前提需要 typeOf('array')
   * @param {Rule} itemRule
   */
  items(itemRule) {
    if (!(itemRule instanceof Rule)) {
      throw new Error(".items() accept Rule instance");
    }
    this._rules.push({
      id: "items",
      itemRule,
      conditioner: (value) => {
        if (!Array.isArray(value)) return false;
        return value.every(item => itemRule.test(item));
      }
    });
    return this;
  }

  /**
   * 或逻辑：注意！作为规则链其中一条，**不是顶层二选一**
   * 想要完整的 A | B，请使用 Rule.or([ruleA, ruleB]) 静态方法
   * @param {Rule[]} rules
   */
  or(rules) {
    if (!Array.isArray(rules) || rules.some(r => !(r instanceof Rule))) {
      throw new Error(".or() expects array of Rule instances");
    }
    this._rules.push({
      id: "or",
      rules,
      conditioner: (value) => rules.some(r => r.test(value))
    });
    return this;
  }

  /**
   * 枚举值校验
   * @param {any[]} allowedValues
   */
  enum(allowedValues) {
    if (!Array.isArray(allowedValues)) throw new Error(".enum accept array");
    this._rules.push({
      id: "enum",
      allowed: allowedValues,
      conditioner: (value) => allowedValues.includes(value)
    });
    return this;
  }

  /**
   * 数字最小值 >=
   * @param {number} minVal
   */
  min(minVal) {
    this._rules.push({
      id: "min",
      min: minVal,
      conditioner: v => typeof v === "number" && v >= minVal
    });
    return this;
  }

  /**
   * 数字最大值 <=
   * @param {number} maxVal
   */
  max(maxVal) {
    this._rules.push({
      id: "max",
      max: maxVal,
      conditioner: v => typeof v === "number" && v <= maxVal
    });
    return this;
  }

  /**
   * 字符串最小长度
   * @param {number} len
   */
  minLength(len) {
    this._rules.push({
      id: "minLength",
      len,
      conditioner: v => typeof v === "string" && v.length >= len
    });
    return this;
  }

  /**
   * 字符串最大长度
   * @param {number} len
   */
  maxLength(len) {
    this._rules.push({
      id: "maxLength",
      len,
      conditioner: v => typeof v === "string" && v.length <= len
    });
    return this;
  }

  /**
   * 正则匹配
   * @param {RegExp} re
   */
  regexp(re) {
    if (!(re instanceof RegExp)) throw new Error("regexp need RegExp instance");
    this._rules.push({
      id: "regexp",
      regex: re,
      conditioner: v => typeof v === "string" && re.test(v)
    });
    return this;
  }

  /**
   * 允许值为 undefined；等价于 原规则 | undefined
   * 会把当前整个规则包装一层or；调用后返回新clone实例，不修改原对象
   */
  optional() {
    // clone 当前规则，然后用静态or组合自身 + undefined
    return Rule.or([this.clone(), Rule.type("undefined")]);
  }

  /**
   * 允许值为 null；等价于 原规则 | null
   */
  nullable() {
    return Rule.or([this.clone(), Rule.type("null")]);
  }

  /**
   * 克隆当前规则实例，递归克隆内部子Rule，防止原对象被链式修改污染
   * @returns {Rule}
   */
  clone() {
    const inst = new Rule();
    inst._rules = this._rules.map(r => {
      /** @type {RuleEntry} */
      const copy = { ...r };

      // 递归克隆嵌套Rule实例
      if (copy.childRules instanceof Rule) {
        copy.childRules = copy.childRules.clone();
      }
      if (Array.isArray(copy.childRules)) {
        copy.childRules = copy.childRules.map(sub => sub instanceof Rule ? sub.clone() : sub);
      }
      if (copy.itemRule instanceof Rule) {
        copy.itemRule = copy.itemRule.clone();
      }
      if (Array.isArray(copy.rules)) {
        copy.rules = copy.rules.map(sub => sub.clone());
      }
      return copy;
    });
    return inst;
  }

  /**
   * 执行校验，捕获conditioner异常，异常直接视为校验失败
   * @param {*} value
   * @returns {boolean} true全部规则通过
   */
  test(value) {
    return this._rules.every(rule => {
      try {
        return rule.conditioner(value);
      } catch (e) {
        return false;
      }
    });
  }

  /**
   * 获取校验详情，返回ok和失败列表（基础版，嵌套内部不会自动展开子路径）
   * @param {*} value
   * @param {string} [path]
   * @returns {{ok: boolean, failures: Array<{path:string, ruleId:string}>}}
   */
  validate(value, path = "$") {
    const failures = [];
    for (const rule of this._rules) {
      let ok;
      try {
        ok = rule.conditioner(value);
      } catch (_err) {
        ok = false;
      }
      if (!ok) {
        failures.push({ path, ruleId: rule.id });
      }
    }
    return {
      ok: failures.length === 0,
      failures
    };
  }

  static type(typeStr) {
    return new Rule().typeOf(typeStr);
  }

  static instance(ctor) {
    return new Rule().instanceOf(ctor);
  }

  /**
   * 顶层或：完整的 A | B | C 联合类型
   * @param {Rule[]} rules
   */
  static or(rules) {
    if (!Array.isArray(rules) || rules.some(r => !(r instanceof Rule))) {
      throw new Error("Rule.or() expects array of Rule instances");
    }
    return new Rule().or(rules);
  }

  static object(child) {
    return Rule.type("object").child(child);
  }

  static function() {
    return Rule.type("function");
  }

  static number() {
    return Rule.type("number");
  }

  static string() {
    return Rule.type("string");
  }

  static boolean() {
    return Rule.type("boolean");
  }

  static array(type) {
    return Rule.type("array").items(Rule.type(type));
  }
}

export default () => {
  return new Rule();
};