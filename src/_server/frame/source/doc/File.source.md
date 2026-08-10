# FileSource 开发文档
## 概述
`FileSource` 继承自 `BaseSource`，实现基于本地文件系统的数据源适配器。
依赖内部组件 `Scanner` 做目录扫描；**只负责读写原始文本，不做 JSON/YAML 等内容解析，解析逻辑交给上层业务**。

> ID 约定：**文件相对扫描根目录的相对路径字符串作为主键ID**
> 数据实体契约：`{ text: string }`

## 依赖
- `BaseSource`：抽象基类，提供缓存、就绪、CRUD模板能力
- `Scanner`：目录扫描器，输出文件相对路径列表
- `ScanFileRule`：扫描规则配置对象

## 构造参数
```typescript
/**
 * @typedef {Object} FileSourceConfig
 * @property {ScanFileRule} rule - 文件扫描规则实例
 */
```

## 公开API
> 全部继承自 BaseSource，**不要重写以下方法**

| API | 说明 |
|---|---|
| `new FileSource({rule: ScanFileRule})` | 实例化 |
| `async getReady()` | 执行目录扫描，加载文件ID索引，**必须先调用** |
| `get ready: boolean` | 是否初始化完成 |
| `async updateAll()` | 清空内存缓存，重新扫描目录刷新ID索引 |
| `has(id: string): boolean` | 判断相对路径文件是否存在（仅ID索引） |
| `async get(id: string): Promise<{text:string} \| undefined>` | 读取文件，缓存缺失自动读磁盘；返回原始文本对象 |
| `async add(id: string, {text:string}): Promise<this>` | 写入/覆盖文件；自动创建父目录 |
| `async del(id: string): Promise<this>` | 删除磁盘文件，清理内存缓存 |
| `async toArray(): Promise<Array<{text:string}>>` | 返回内存中已经加载过的全部文件实体数组 |

## 子类需要重写接口
> FileSource 为完整实现，业务层**不需要再重写**；仅内部继承 BaseSource 的4个protected钩子：

| 钩子方法 | 职责 |
|---|---|
| `async _updateFromSource()` | 调用 Scanner.scan()，返回全部文件相对路径ID数组 |
| `async _getOneFromSource(id)` | 根据相对路径读取磁盘文件，返回 `{text:string}` |
| `async _updateToSource(id, data)` | 将 `data.text` 写入磁盘文件，自动创建父目录 |
| `async _deleteFromSource(id)` | 删除磁盘对应文件 |

## 关键契约
1. **ID = 文件相对扫描根目录的相对路径**，例：`config/app.json`
2. 读取返回固定结构 `{ text: string }`，**底层绝不做内容解析**，上层自行 `JSON.parse` / yaml解析。
3. 写入必须传入 `{ text: "文件原始字符串" }`。
4. add 写入时自动递归创建不存在的父文件夹。
5. Scanner 内置黑名单：`node_modules` / `.git` / `dist` / `build`；最大递归深度 `MAX_DEPTH=10`。
6. 实例必须执行 `await source.getReady()` 之后，才可调用 `get / add / del / has`。

## 代码示例
```javascript
import { FileSource } from "./sources/File.source.mjs";
import { ScanFileRule } from "./definations/ScanRules/ScanFileRule.mjs";

// 构建扫描规则：根目录 + 需要识别的后缀
const rule = new ScanFileRule({
  dirPath: "./data",
  exts: [".json", ".txt", ".md"]
});

// 创建数据源实例
const fsSource = new FileSource({ rule });

// 初始化扫描目录，加载ID索引
await fsSource.getReady();

// 判断文件是否存在
const exist = fsSource.has("setting/app.json");

// 读取文件，上层业务自行解析文本
const entity = await fsSource.get("setting/app.json");
if(entity){
  const rawText = entity.text;
  const jsonObj = JSON.parse(rawText);
}

// 写入文件
await fsSource.add("demo/hello.txt", { text: "demo content\nline2" });

// 删除文件
await fsSource.del("demo/hello.txt");

// 获取全部已经加载的文件
const loadedList = await fsSource.toArray();
```

## Scanner 简要说明（FileSource内部依赖）
文件：`sources/File.source.d/scanner.mjs`
- 职责：目录递归遍历，输出符合后缀的文件**相对路径列表**
- 不读取文件内容、不维护缓存，仅输出ID列表给上层 FileSource 使用
- 入参只能接收 `ScanFileRule` 实例

## 异常说明
1. 未调用 `getReady()` 直接操作，抛出：`BaseSource: 尚未调用 getReady(), 禁止执行数据源操作`
2. 目录无权限、文件不存在IO错误，直接抛出原始异常，携带 `cause` 保留原始错误对象。
3. `add/del` 遵循IO优先：磁盘操作成功才更新内存缓存；磁盘异常不会污染内存状态。

## 扩展提示
如需支持二进制文件：
- 修改 `_getOneFromSource` 返回 `{buffer:Uint8Array}`
- 修改 `_updateToSource` 接收buffer写入；当前版本固定为utf‑8文本模式。