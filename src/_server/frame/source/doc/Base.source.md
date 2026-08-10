# BaseSource 开发文档
> 版本：mjs 抽象基类，内存缓存 + 外部存储适配器模板；基类处理缓存、状态、链式调用；子类实现底层IO。

## 概述
`BaseSource` 是抽象数据源模板类，不可直接实例化。
- 职责：内存缓存管理、就绪状态校验、懒加载、内存与存储一致性保障、链式调用API
- 扩展方式：子类重写3个受保护IO钩子对接文件/数据库等存储
- 实例必须先执行 `await .getReady()` 才可进行读写操作

## 类成员公开API
| 方法 | 说明 | 返回 |
|---|---|---|
| `constructor(from)` | 构造函数，传入数据源配置/句柄 | instance |
| `async getReady()` | 初始化：从存储加载ID索引，完成就绪 | `Promise<this>` |
| `get ready` | 只读属性，是否初始化完成 | `boolean` |
| `async updateAll()` | 清空全部内存缓存，重新拉取ID索引 | `Promise<this>` |
| `async add(id, data)` | 新增/更新单条记录，先持久化再落内存 | `Promise<this>` |
| `has(id)` | 判断ID是否存在数据源（仅校验ID索引） | `boolean` |
| `async get(id)` | 获取单条，缓存缺失自动懒加载底层存储 | `Promise<any\|undefined>` |
| `async del(id)` | 删除单条，先删除底层存储再清理内存 | `Promise<this>` |
| `async toArray()` | 获取全部已加载缓存实体数组 | `Promise<any[]>` |

## 子类必须重写接口（protected）
> ⚠️ 禁止在钩子内部修改 `_dataMap` / `_dataSet` / `_ready`，状态全权交给基类。IO错误直接抛出异常，不要捕获吞错。

### `async _updateFromSource()`
- **作用**：全量读取存储，返回全部主键ID列表；仅构建ID索引，**不要读取完整实体**
- **调用时机**：`getReady()`、`updateAll()`
- **返回**：`Promise<Array<string|number>>`

### `async _getOneFromSource(id)`
- **作用**：单条懒加载，根据ID读取完整业务实体
- **调用时机**：`get(id)` 缓存未命中时
- **参数**：`id: string|number`
- **返回**：`Promise<any>`

### `async _updateToSource(id, data)`
- **作用**：写入/更新单条数据到底层存储
- **调用时机**：`add(id, data)`
- **参数**：`id: string|number`，`data: any`
- **返回**：`Promise<void>`

### `async _deleteFromSource(id)`
- **作用**：从底层存储删除指定ID记录
- **调用时机**：`del(id)`
- **参数**：`id: string|number`
- **返回**：`Promise<void>`

## 子类最小实现示例
```javascript
import { BaseSource } from './BaseSource.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * 文件系统数据源示例
 */
export class FsSource extends BaseSource {
  /**
   * @param {{dir:string}} cfg 存储目录配置
   */
  constructor(cfg) {
    super(cfg);
  }

  /** @override */
  async _updateFromSource() {
    const files = await fs.readdir(this._source.dir);
    return files.map(f => path.basename(f, '.json'));
  }

  /** @override */
  async _getOneFromSource(id) {
    const fp = path.join(this._source.dir, `${id}.json`);
    const raw = await fs.readFile(fp, 'utf8');
    return JSON.parse(raw);
  }

  /** @override */
  async _updateToSource(id, data) {
    const fp = path.join(this._source.dir, `${id}.json`);
    await fs.writeFile(fp, JSON.stringify(data, null, 2), 'utf8');
  }

  /** @override */
  async _deleteFromSource(id) {
    const fp = path.join(this._source.dir, `${id}.json`);
    await fs.unlink(fp);
  }
}
```

## 使用示例
```javascript
const repo = new FsSource({ dir: './data' });
await repo.getReady();

await repo.add('demo001', { title: 'demo' });
console.log(repo.has('demo001'));
const item = await repo.get('demo001');
await repo.del('demo001');
const list = await repo.toArray();
```