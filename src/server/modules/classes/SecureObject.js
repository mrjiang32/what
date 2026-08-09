/**
 * 清洗对象：递归生成纯净普通对象
 * 剔除：getter、setter；可配置是否剔除函数、Symbol属性；只保留 JSON‑兼容基础数据
 * 注意：
 * 1. 只复制对象【自有属性】，不复制原型链
 * 2. Date/RegExp/Map/Set 会做特殊处理；其他内置实例转为 null
 * 3. 若保留 Symbol key：Symbol属性可以存在JS对象，但 JSON.stringify 会直接丢失它们
 * @param {any} input 来自js模块导出的原始对象（可能含getter/setter/function）
 * @param {boolean} [allowFunction=false] 是否保留函数属性
 * @param {boolean} [allowSymbol=false] 是否保留Symbol类型的key
 * @returns {any} 纯净plain object / array / 基础值
 */
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
   * @param {string|number} id 唯一标识，如relPath
   * @param {any} payload 原始输入：object / json字符串 / 基础类型
   */
  constructor(id, payload) {
    this.id = id;
    /** @type {any} 原始危险载荷，真正私有 # 外部无法访问 */
    this.#_payload = payload;

    this.ok = true;
    this.error = null;
    /** @type {"json"|"object"|"plain"} */
    this.from = "plain";

    /** @type {any|null} 缓存清洗后的纯净对象，只计算一次 */
    this.#_cachedPlain = null;

    try {
      if (typeof payload === "string") {
        const parsed = JSON.parse(payload);
        this.#_payload = parsed;
        // json字符串解析完成后再判断实际类型
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
      this.ok = false;
      this.error = err;
    }
  }

  // JS真正私有字段，外部无法读取 scanned.#_payload
  #_payload;
  #_cachedPlain;

  /**
   * 获取清洗后的纯净数据，剔除getter/setter/function/symbol
   * 只会执行一次toPlainObject，后续直接返回缓存引用
   */
  get value() {
    if (!this.ok) return null;

    // 不是对象不需要清洗，直接返回原始值
    if (this.from === "plain") {
      return this.#_payload;
    }

    if (this.#_cachedPlain === null) {
      this.#_cachedPlain = toPlainObject(this.#_payload);
    }
    return this.#_cachedPlain;
  }
}