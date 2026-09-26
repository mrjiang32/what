# WebHook Astatine

服务端使用 Egg.js 和 GraphQL，开发环境启动：

```powershell
npm run server:install
npm run server:dev
```

GraphQL endpoint：`http://127.0.0.1:3000/graphql`

## Function 注册

可执行函数必须在 `src/server/config/functions.json` 中登记，服务启动时只读取一次登记表，不会扫描目录。每项指定唯一名称、模块文件、导出名、超时和是否仅管理员可用；模块文件放在 `src/server/app/functions/` 并导出一个接收 JSON 参数的函数。调用 GraphQL mutation `runFunction(name, params)` 执行登记项。

函数在 Worker 线程中运行，具有执行超时和内存限制，但 Worker 不是安全沙箱。只登记并运行你信任的代码；不要把不可信用户代码放进 functions 目录。
