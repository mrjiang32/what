import { Logger } from '../utils/Logger.mjs';

/**
 * 基础数据源抽象类
 * 内存缓存层，可对接文件系统、数据库等外部存储；子类重写受保护IO钩子实现真实IO
 */
class BaseSource {
  /**
   * @constructor
   * @param {*} from - 底层数据源句柄/配置，由子类解析使用
   */
  constructor(from) {
    /**
     * 底层原始数据源配置/句柄
     * @type {*}
     * @protected
     */
    this._source = from;

    /**
     * 日志实例，可选注入
     * @type {Logger | undefined}
     * @protected
     */
    this._logger = undefined;

    /**
     * 内存缓存 Map<id, data>，保存加载过的数据
     * @type {Map<string | number, any>}
     * @protected
     */
    this._dataMap = new Map();

    /**
     * ID集合，记录数据源全部存在的主键ID
     * @type {Set<string | number>}
     * @protected
     */
    this._dataSet = new Set();

    /**
     * 数据源是否完成初始化加载
     * @type {boolean}
     * @protected
     */
    this._ready = false;
  }

  set logger(logger) {
    if (logger instanceof Logger) {
      this._logger = logger;
    }
  }

  get logger() {
    return this._logger;
  }

  /**
   * 断言数据源已就绪，未就绪抛出异常
   * @throws {Error}
   * @protected
   */
  _assertReady() {
    if (!this._ready) {
      throw new Error('BaseSource: 尚未调用 getReady(), 禁止执行数据源操作');
    }
  }

  /**
   * 从底层数据源全量加载ID索引到内存，完成初始化
   * @async
   * @returns {Promise<this>} 自身实例，支持链式调用
   */
  async getReady() {
    const idList = await this._updateFromSource();
    this._dataSet = new Set(idList);
    this._ready = true;
    return this;
  }

  /**
   * 只读：数据源是否初始化完成
   * @returns {boolean}
   */
  get ready() {
    return this._ready;
  }

  /**
   * 清空内存缓存，重新全量拉取底层数据源ID索引
   * @async
   * @returns {Promise<this>}
   */
  async updateAll() {
    this._assertReady();
    this._dataMap.clear();
    this._dataSet.clear();
    await this.getReady();
    return this;
  }

  /**
   * 新增/更新一条记录；先持久化再写入内存，防止数据不一致
   * @async
   * @param {string|number} id - 记录唯一主键
   * @param {any} data - 需要存储的数据实体
   * @returns {Promise<this>}
   */
  async add(id, data) {
    this._assertReady();
    await this._updateToSource(id, data);
    this._dataMap.set(id, data);
    this._dataSet.add(id);
    return this;
  }

  /**
   * 删除单条记录；先删除底层存储，再清理内存状态
   * @async
   * @param {string|number} id
   * @returns {Promise<this>}
   */
  async del(id) {
    this._assertReady();
    if (!this._dataSet.has(id)) return this;
    await this._deleteFromSource(id);
    this._dataMap.delete(id);
    this._dataSet.delete(id);
    return this;
  }

  /**
   * 【子类重写钩子】将单条数据写入底层外部数据源
   * @async
   * @protected
   * @param {string|number} id
   * @param {any} data
   * @returns {Promise<void>}
   */
  async _updateToSource(id, data) {
    await Promise.resolve({ id, data });
  }

  /**
   * 【子类重写钩子】全量读取底层数据源，返回全部id数组
   * 仅返回ID列表，不读取完整实体，实体使用懒加载
   * @async
   * @protected
   * @returns {Promise<Array<string|number>>}
   */
  async _updateFromSource() {
    return await Promise.resolve([]);
  }

  /**
   * 【子类重写钩子】从底层数据源删除单条记录
   * @async
   * @protected
   * @param {string|number} id
   * @returns {Promise<void>}
   */
  async _deleteFromSource(id) {
    throw new Error(`_deleteFromSource 需要子类实现, id:${id}`);
  }

  /**
   * 判断ID在数据源中是否存在（只看ID索引，不校验缓存数据有效性）
   * @param {string|number} id
   * @returns {boolean}
   */
  has(id) {
    this._assertReady();
    return this._dataSet.has(id);
  }

  /**
   * 将内存缓存所有已加载实体转为数组输出
   * @async
   * @returns {Promise<any[]>}
   */
  async toArray() {
    this._assertReady();
    return [...this._dataMap.values()];
  }

  /**
   * 获取单条数据；缓存缺失时从底层数据源拉取并填充缓存
   * @async
   * @param {string|number} id
   * @returns {Promise<any | undefined>} 不存在返回 undefined
   */
  async get(id) {
    this._assertReady();
    if (!this._dataSet.has(id)) return undefined;
    if (!this._dataMap.has(id)) {
      const data = await this._getOneFromSource(id);
      this._dataMap.set(id, data);
      return data;
    }
    return this._dataMap.get(id);
  }

  /**
   * 【子类重写钩子】从底层数据源读取单条记录
   * @async
   * @protected
   * @param {string|number} id
   * @returns {Promise<any>}
   */
  async _getOneFromSource(id) {
    throw new Error(`_getOneFromSource 需要子类实现, id:${id}`);
  }
}

export { BaseSource };