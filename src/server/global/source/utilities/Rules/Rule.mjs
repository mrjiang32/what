import chalk from "chalk";

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

const PASS = chalk.green("PASS")
const ERROR = chalk.red("ERROR");

export class Rule {
  constructor(name = "Rule") {
    /**
     * @typedef {{
     *   id:string,
     *   conditioner:(v:any)=>boolean,
     *   [key:string]: any
     * }} RuleEntry
     * @type {RuleEntry[]}
     */
    this.name = name;
    this._rules = [];
  }

  named(name) {
    this.name = name;
    return this;
  }

  equal(value_p) {
    this._rules.push({
      id: "equal",
      expect: value_p,
      conditioner: (value) => value === value_p,
    });

    return this;
  }

  static equal(value_p) {
    return new Rule().equal(value_p);
  }

  /**
   * @param {Rule} rule
   */
  reverse(rule) {
    this._rules.push({
      id: "reverse-rule",
      expect: rule,
      conditioner: (value) => !rule.test(value),
    });

    return this;
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
        conditioner: (value) => value === null,
      });
    } else if (target === undefined) {
      this._rules.push({
        id: "typeOfUndefined",
        conditioner: (value) => value === undefined,
      });
    } else if (type === "array") {
      this._rules.push({
        id: "typeOfArray",
        conditioner: (value) => Array.isArray(value),
      });
    } else if (type === "object") {
      this._rules.push({
        id: "typeOf",
        expect: type,
        conditioner: (value) => value !== null && typeof value === type,
      });
    } else {
      this._rules.push({
        id: "typeOf",
        expect: type,
        conditioner: (value) => typeof value === type,
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
      expect: ctor?.name || String(ctor),
      type: ctor,
      conditioner: (value) => value instanceof ctor,
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
      expect: "custom predicate",
      conditioner: (value) => {
        const ret = conditioner(value);
        return Boolean(ret);
      },
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
          return childRules.every((r) => {
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
      },
    });
    return this;
  }

  /**
   * 严格对象shape，禁止额外属性
   * @param {Record<string, Rule>} childRules
   */
  strictChild(childRules) {
    if (
      typeof childRules !== "object" ||
      childRules === null ||
      Array.isArray(childRules)
    ) {
      throw new Error(".strictChild only accept plain object schema");
    }
    const expectKeys = Object.keys(childRules);
    this._rules.push({
      id: "strictChild",
      expectKeys,
      childRules,
      conditioner: (value) => {
        if (value === null || typeof value !== "object" || Array.isArray(value))
          return false;
        const actualKeys = Object.keys(value);
        if (actualKeys.some((k) => !expectKeys.includes(k))) return false;
        return Object.entries(childRules).every(([key, rule]) => {
          if (!(rule instanceof Rule)) return false;
          return rule.test(value[key]);
        });
      },
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
      expect: "array items",
      itemRule,
      conditioner: (value) => {
        if (!Array.isArray(value)) return false;
        return value.every((item) => itemRule.test(item));
      },
    });
    return this;
  }

  /**
   * 或逻辑：注意！作为规则链其中一条，**不是顶层二选一**
   * 想要完整的 A | B，请使用 Rule.or([ruleA, ruleB]) 静态方法
   * @param {Rule[]} rules
   */
  or(rules) {
    if (!Array.isArray(rules) || rules.some((r) => !(r instanceof Rule))) {
      throw new Error(".or() expects array of Rule instances");
    }
    this._rules.push({
      id: "or",
      expect: "one of alternatives",
      rules,
      conditioner: (value) => rules.some((r) => r.test(value)),
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
      expect: allowedValues,
      allowed: allowedValues,
      conditioner: (value) => allowedValues.includes(value),
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
      expect: minVal,
      min: minVal,
      conditioner: (v) => typeof v === "number" && v >= minVal,
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
      expect: maxVal,
      max: maxVal,
      conditioner: (v) => typeof v === "number" && v <= maxVal,
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
      expect: len,
      len,
      conditioner: (v) => typeof v === "string" && v.length >= len,
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
      expect: len,
      len,
      conditioner: (v) => typeof v === "string" && v.length <= len,
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
      expect: re,
      regex: re,
      conditioner: (v) => typeof v === "string" && re.test(v),
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
    inst._rules = this._rules.map((r) => {
      /** @type {RuleEntry} */
      const copy = { ...r };

      // 递归克隆嵌套Rule实例
      if (copy.childRules instanceof Rule) {
        copy.childRules = copy.childRules.clone();
      }
      if (Array.isArray(copy.childRules)) {
        copy.childRules = copy.childRules.map((sub) =>
          sub instanceof Rule ? sub.clone() : sub,
        );
      }
      if (copy.itemRule instanceof Rule) {
        copy.itemRule = copy.itemRule.clone();
      }
      if (Array.isArray(copy.rules)) {
        copy.rules = copy.rules.map((sub) => sub.clone());
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
    return this._rules.every((rule) => {
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
      failures,
    };
  }

  length(len) {
    this._rules.push({
      id: "length",
      expect: len,
      conditioner: (value) => value?.length === len,
    });
    return this;
  }

  /**
   * 校验字符串是否为合法的 hash 格式
   * @param {string} [hashtype='md5'] - 支持的哈希类型: 'md5', 'sha1', 'sha256', 'sha512'
   */
  hashlike(hashtype = "md5") {
    // 1. Map hash types to their standard hex string lengths
    const hashLengths = {
      md5: 32,
      sha1: 40,
      sha256: 64,
      sha512: 128,
    };

    const length = hashLengths[hashtype.toLowerCase()];
    if (!length) {
      throw new Error(
        `Unsupported hash type: ${hashtype}. Supported: ${Object.keys(hashLengths).join(", ")}`,
      );
    }

    // 2. Dynamically generate the regex based on the length
    const regex = new RegExp(`^[a-f0-9]{${length}}$`);

    this._rules.push({
      id: "hashlike",
      expect: hashtype, // Useful for error messages
      regex,
      conditioner: (v) => typeof v === "string" && regex.test(v),
    });

    return this;
  }

  static #deepFreeze(obj) {
    // Handle null, primitives, or already frozen objects
    if (obj === null || typeof obj !== "object" || Object.isFrozen(obj)) {
      return obj;
    }

    // Freeze the object/array itself first
    Object.freeze(obj);

    // Recursively freeze all own properties
    for (const key of Object.getOwnPropertyNames(obj)) {
      const prop = obj[key];
      if (prop !== null && typeof prop === "object") {
        // use the private static method recursively
        Rule.#deepFreeze(prop);
      }
    }

    return obj;
  }

  finite() {
    this._rules.push({
      id: "isFinite",
      expect: "finite number",
      conditioner: Number.isFinite,
    });
    return this;
  }

  verbose(value, options = {}) {
    const rootName = options.name ?? this.name ?? "Rule";
    const lines = [`Checking Rule \`${rootName}\``];
    const indent = (n) => "  ".repeat(n);
    const displayValue = (v) => {
      if (v === null) return "null";
      if (v === undefined) return "undefined";
      if (Array.isArray(v)) return "array";
      if (typeof v === "object") return "object";
      return typeof v;
    };

    const describeActual = (rule, currentValue) => {
      switch (rule.id) {
        case "typeOf":
        case "typeOfArray":
        case "typeOfNull":
        case "typeOfUndefined":
          return displayValue(currentValue);
        case "length":
        case "minLength":
        case "maxLength":
          return String(currentValue?.length ?? "undefined");
        case "hashlike":
          return String(rule.expect ?? "hash");
        case "equal":
          return String(rule.expect ?? "value");
        case "enum":
          return currentValue === undefined ? "undefined" : String(currentValue);
        case "min":
        case "max":
          return currentValue === undefined ? "undefined" : String(currentValue);
        case "instanceOf":
          return currentValue?.constructor?.name ?? typeof currentValue;
        case "regexp":
          return currentValue === undefined ? "undefined" : String(currentValue);
        default:
          return "ok";
      }
    };

    const summarizeNestedRule = (candidate) => {
      if (!(candidate instanceof Rule)) return "rule";
      if (candidate._rules.length === 0) return candidate.name ?? "rule";
      if (candidate._rules.length === 1) return labelFor(candidate._rules[0]);
      const summary = candidate._rules
        .map((entry) => {
          if (entry.id === "child" || entry.id === "strictChild") {
            const keys = entry.childRules && typeof entry.childRules === "object" ? Object.keys(entry.childRules) : [];
            return keys.length ? `object(${keys.join(", ")})` : "object";
          }
          if (entry.id === "items") return "array items";
          return entry.id ?? "rule";
        })
        .filter(Boolean);
      return summary.length ? summary.join(" + ") : (candidate.name ?? "rule");
    };

    const labelFor = (rule) => {
      switch (rule.id) {
        case "typeOf":
        case "typeOfArray":
        case "typeOfNull":
        case "typeOfUndefined":
          return `[type] expect ${rule.expect ?? "value"}`;
        case "length":
          return `[length] expect === ${rule.expect ?? "?"}`;
        case "minLength":
          return `[length] expect >= ${rule.expect ?? "?"}`;
        case "maxLength":
          return `[length] expect <= ${rule.expect ?? "?"}`;
        case "hashlike":
          return `[hashlike] expect ${rule.expect ?? "md5"}`;
        case "equal":
          return `[equal] expect === ${String(rule.expect ?? "?")}`;
        case "enum":
          return `[enum] expect one of ${Array.isArray(rule.expect) ? rule.expect.join(" | ") : "?"}`;
        case "min":
          return `[min] expect >= ${rule.expect ?? "?"}`;
        case "max":
          return `[max] expect <= ${rule.expect ?? "?"}`;
        case "instanceOf":
          return `[instanceof] ${String(rule.expect ?? "?")}`;
        case "regexp":
          return `[regexp] match ${String(rule.expect ?? "?")}`;
        case "match":
          return "[match custom predicate]";
        case "reverse-rule":
          return rule.expect instanceof Rule ? `[reverse] !${summarizeNestedRule(rule.expect)}` : "[reverse rule]";
        case "items":
          return "[items]";
        case "or":
          return "[or]";
        default:
          return String(rule.id ?? "rule");
      }
    };

    const formatResult = (ok, label, actual) => {
      const status = ok ? "PASS" : "ERROR";
      let detail = ok ? `| actual ${actual}` : `| actual ${actual} not match`;
      if(label === "[or]") {
        detail = "";
      }
      const text = `${status} ${label} ${detail}`;
      return ok ? chalk.green(text) : chalk.red(text);
    };

    const renderLeaf = (path, rule, currentValue, depth) => {
      let ok = false;
      try {
        ok = Boolean(rule.conditioner(currentValue));
      } catch {
        ok = false;
      }

      const text = `${indent(depth)}- ${path}`;
      const summary = formatResult(ok, labelFor(rule), ok ? describeActual(rule, currentValue) : "");
      lines.push(`${text}\n${indent(depth + 1)}- ${summary}`);
    };

    const renderOr = (path, rule, currentValue, depth) => {
      const branchLines = [];
      const branches = Array.isArray(rule.rules) ? rule.rules : [];
      for (const subRule of branches) {
        if (!(subRule instanceof Rule)) continue;
        const branch = [];
        const walkRules = (rules, value) => {
          for (const item of rules) {
            if (item.id === "child" || item.id === "strictChild") {
              const obj = item.childRules;
              if (obj && typeof obj === "object") {
                const entries = Object.entries(obj);
                for (const [k, r] of entries) {
                  if (!(r instanceof Rule)) continue;
                  const nextValue = value && typeof value === "object" ? value[k] : undefined;
                  const isOk = r.test(nextValue);
                  branch.push(`${indent(depth + 2)}- ${path}.${k}\n${indent(depth + 3)}- ${formatResult(isOk, labelFor(r), isOk ? describeActual(r, nextValue) : "")}`);
                }
              }
              continue;
            }
            const isOk = Boolean(item.conditioner(value));
            branch.push(`${indent(depth + 2)}- ${formatResult(isOk, labelFor(item), isOk ? describeActual(item, value) : "")}`);
          }
        };
        walkRules(subRule._rules, currentValue);
        branchLines.push(`${indent(depth + 1)}- or\n${branch.join("\n")}`);
      }
      lines.push(`${indent(depth)}- ${path}`);
      lines.push(...branchLines);
    };

    const renderObject = (path, value, rules, depth) => {
      lines.push(`${indent(depth)}- ${path}`);

      for (const rule of rules) {
        if (rule.id === "or" && Array.isArray(rule.rules)) {
          renderOr(path, rule, value, depth + 1);
          continue;
        }

        if (rule.id === "reverse-rule" && rule.expect instanceof Rule) {
          const ok = Boolean(rule.conditioner(value));
          lines.push(`${indent(depth + 1)}- ${formatResult(ok, labelFor(rule), ok ? "expected not to match" : "still matches")}`);
          if (rule.expect._rules.length > 0) {
            renderObject(`${path} (reverse expect)`, value, rule.expect._rules, depth + 1);
          }
          continue;
        }

        if (rule.id === "child" || rule.id === "strictChild") {
          const entries = rule.childRules && typeof rule.childRules === "object" ? Object.entries(rule.childRules) : [];
          for (const [key, childRule] of entries) {
            if (!(childRule instanceof Rule)) continue;
            const childValue = value && typeof value === "object" ? value[key] : undefined;
            const nextPath = `${path}.${key}`;
            if (childRule._rules.some((entry) => (entry.id === "child" || entry.id === "strictChild" || entry.id === "items") || (entry.id === "typeOf" && (entry.expect === "object" || entry.expect === "array")))) {
              renderObject(nextPath, childValue, childRule._rules, depth + 1);
              continue;
            }
            lines.push(`${indent(depth + 1)}- ${nextPath}`);
            for (const childEntry of childRule._rules) {
              let ok = false;
              try {
                ok = Boolean(childEntry.conditioner(childValue));
              } catch {
                ok = false;
              }
              lines.push(`${indent(depth + 2)}- ${formatResult(ok, labelFor(childEntry), ok ? describeActual(childEntry, childValue) : "")}`);
            }
          }
          continue;
        }

        if (rule.id === "items" && rule.itemRule instanceof Rule) {
          lines.push(`${indent(depth + 1)}- ${path}`);
          if (!Array.isArray(value)) {
            lines.push(`${indent(depth + 2)}- ${formatResult(false, labelFor(rule), "")}`);
            continue;
          }
          for (let idx = 0; idx < value.length; idx += 1) {
            const itemPath = `${path}[${idx}]`;
            const item = value[idx];
            lines.push(`${indent(depth + 1)}- ${itemPath}`);
            for (const itemRule of rule.itemRule._rules) {
              let ok = false;
              try {
                ok = Boolean(itemRule.conditioner(item));
              } catch {
                ok = false;
              }
              lines.push(`${indent(depth + 2)}- ${formatResult(ok, labelFor(itemRule), ok ? describeActual(itemRule, item) : "")}`);
            }
          }
          continue;
        }

        let ok = false;
        try {
          ok = Boolean(rule.conditioner(value));
        } catch {
          ok = false;
        }
        lines.push(`${indent(depth + 1)}- ${formatResult(ok, labelFor(rule), ok ? describeActual(rule, value) : "")}`);
      }
    };

    renderObject("value", value, this._rules, 0);

    const output = lines.join("\n");
    if (!options.silent) {
      console.log(output);
    }

    return {
      name: rootName,
      ok: this.test(value),
      lines,
      output,
    };
  }

  finish() {
    Rule.#deepFreeze(this._rules);
    return this;
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
    if (!Array.isArray(rules) || rules.some((r) => !(r instanceof Rule))) {
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
