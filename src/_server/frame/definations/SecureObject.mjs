export function toPlainObject(input, allowFunction = false, allowSymbol = false) {
  // 基础类型直接返回
  if (input === null || typeof input !== "object") {
    return input;
  }

  // 内置特殊对象处理
  if (input instanceof Date) {
    // 输出时间字符串，符合JSON可序列化
    return input.toISOString();
  }
  if (input instanceof RegExp) {
    // 正则转为字符串
    return input.toString();
  }
  if (input instanceof Map) {
    return Object.fromEntries(input);
  }
  if (input instanceof Set) {
    return [...input];
  }

  // 数组
  if (Array.isArray(input)) {
    const result = [];
    for (const item of input) {
      result.push(toPlainObject(item, allowFunction, allowSymbol));
    }
    return result;
  }

  const plain = {};
  const ownKeys = Reflect.ownKeys(input);

  for (const key of ownKeys) {
    // Symbol key过滤
    if (typeof key === "symbol" && !allowSymbol) {
      continue;
    }

    const desc = Object.getOwnPropertyDescriptor(input, key);
    // 存在 getter / setter，直接丢弃该属性
    if (desc.get !== undefined || desc.set !== undefined) {
      continue;
    }

    // 函数属性过滤
    if (typeof desc.value === "function" && !allowFunction) {
      continue;
    }

    plain[key] = toPlainObject(desc.value, allowFunction, allowSymbol);
  }

  return plain;
}

export class SecureObject {
  /**
   * @param {Boolean} autoParseJSON 是否自动将字符串转换为对象
   * @param {any} payload 原始输入：object / json字符串 / 基础类型
   */
  constructor(payload, autoParseJSON = true) {
    /** @type {any} 原始危险载荷，真正私有 # 外部无法访问 */
    this.#_payload = payload;

    /** @type {"json"|"object"|"plain"} */
    this.from = "plain";

    /** @type {any|null} 缓存清洗后的纯净对象，只计算一次 */
    this.#_cachedPlain = null;

    try {
      if (typeof payload === "string" && autoParseJSON) {
        const parsed = JSON.parse(payload);
        this.#_payload = parsed;
        if (typeof parsed === "object" && parsed !== null) {
          this.from = "json";
        } else {
          this.from = "plain";
        }
      } else if (typeof payload === "object" && payload !== null) {
        this.from = "object";
      } else {
        this.from = "plain";
      }
    } catch (err) {
      if (typeof payload === "string") this.#_payload = payload;
      else this.#_payload = undefined;
      this.from = "plain";
    }
  }

  #_payload;
  #_cachedPlain;

  get value() {
    if (!this.ok) return null;

    // 不是对象不需要清洗，直接返回原始值
    if (this.from === "plain" || this.from === "json") {
      return this.#_payload;
    }

    if (this.#_cachedPlain === null) {
      this.#_cachedPlain = Object.freeze(toPlainObject(this.#_payload));
    }
    return this.#_cachedPlain;
  }
}

export function SecureUse(owner, property) {
  const desc = Object.getOwnPropertyDescriptor(owner, property);
  if (desc) {
    if (typeof desc.get === "function") {
      throw new Error(`typeof desc.get === "function"`);
    }

    const rawVal = desc.value;
    return SecureObject(rawVal, false);
  }
  return new SecureObject(undefined);
}