**后端 API 调用规范（简要）**

- **通用**
  - 名称校验：允许的模块名为 /^[a-zA-Z0-9_-]+$/（用于路径参数）
  - 错误码：400 参数/名称非法，404 模块不存在，500 服务器/执行异常
  - 调用返回：一般为 `{ ok: true, ... }` 或 `{ ok: false, error: ... }`

- **根路由**
  - GET `/api`  
    - 描述：运行状态与 uptime
    - 返回：`{ running: true, uptime, ok: true }`

- **Action（JS 模块） — 前缀 `/api/action`**
  - GET `/api/action`  
    - 描述：列出所有 action 模块，返回 `modules` 列表
  - GET `/api/action-update`  
    - 描述：触发更新并返回模块列表
  - GET `/api/action/:name`  
    - 路径模式：`^/api/action/([a-zA-Z0-9_-]+)$`  
    - 描述：获取模块内容/导出，返回 `{ ok: true, code: <module> }`
  - POST `/api/action/:name`  
    - 路径模式同上  
    - 描述：执行指定模块；请求体任意 JSON（传给模块）；返回 `{ ok: true, value }`
  - POST `/api/action`  
    - 描述：新建模块  
    - 请求体：`{ name: string, code: string }`（`code` 为 JS 源码）  
    - 语法校验：对 `.js` 文件启用 acorn 语法校验（validateSyntax: true）
  - PUT `/api/action/:name`  
    - 描述：覆盖更新模块  
    - 请求体：`{ code }` 或 直接为 code，`.js` 同样做语法校验
  - DELETE `/api/action/:name`  
    - 描述：删除模块

- **Hook（JSON 配置） — 前缀 `/api/hook`**
  - GET `/api/hook` / GET `/api/hook-update`  
    - 描述：列出/更新并返回 hook 列表
  - GET `/api/hook/:name`  
    - 路径模式：`^/api/hook/([a-zA-Z0-9_-]+)$`  
    - 描述：读取 hook JSON（结构化内容）
  - POST `/api/hook/:name`  
    - 路径模式同上  
    - 描述：触发 hook；请求体结构：
      - 可含 `params`（对象）与 `selParams`（按模块覆盖的对象）
      - 执行流程：读取 hook JSON 中的 `actions` 列表 -> 为每个 action 合并参数（JSON param < body.params < selParams）-> 调用 action 模块
    - 返回：数组，元素为 `{ ok: true, value }` 或 `{ ok: false, reason: { message, stack } }`
  - POST `/api/hook`（创建）  
    - 描述：创建 hook；接口在保存时会将请求体结构化为 `req.body.code = { name, bindedActionIds, description, friendlyName }`
    - 建议请求体包含：`{ name, bindedActionIds, description?, friendlyName? }`
  - PUT `/api/hook/:name` / DELETE `/api/hook/:name`  
    - 描述：覆盖更新 / 删除 hook（`.json` 文件，validateSyntax: false）

- **其它实现细节**
  - Loader 行为：各子 API 使用不同 Loader（Actions 用 VM loader，Hooks 用 Native loader），并通过 `loader.updateAll()`, `loader.hasModule()`, `loader.loadAModule()`, `loader.writeModule()`, `loader.removeModule()` 等方法管理文件
  - 调试模式：若 `globalenv.debug` 为真，POST 执行会直接返回 exec 的结果（异常仍需关注）
  - 执行错误处理：执行时捕获异常并返回 500 或以 hook 的结果格式返回错误信息
