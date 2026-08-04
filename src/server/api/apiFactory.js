import { parse } from "acorn";
import path from "path";

/**
 * 为指定 Loader 生成一套标准 CRUD 路由
 * @param {object} options
 * @param {string} options.apiPrefix    接口前缀，如 /api/action
 * @param {string} options.dirPrefix    目录前缀，如 actions/
 * @param {string} options.fileExt      文件后缀，如 .action.js / .json
 * @param {BaseModuleLoader} options.loader  加载器实例
 * @param {boolean} options.validateSyntax 是否校验JS语法（仅js文件生效）
 * @returns {Array<object>} 路由数组
 */
export function createModuleRoutes({
  apiPrefix,
  dirPrefix,
  fileExt,
  loader,
  validateSyntax = false,
}) {
  // 工具：从URL参数名 → 完整 relPath
  const toRelPath = (baseName) => path.join(dirPrefix, baseName + fileExt);

  // 工具：名称合法性校验（防路径穿越）
  const isValidName = (name) => /^[a-zA-Z0-9_-]+$/.test(name);

  return [
    // GET 列表：列出所有模块
    {
      path: apiPrefix,
      method: "GET",
      handler: (req, res) => {
        res.status(200).json({
          ok: true,
          modules: loader.getModuleList(),
        });
      },
    },

    // GET 单个：获取模块内容/导出
    {
      path: new RegExp(`^${apiPrefix}/([a-zA-Z0-9_-]+)$`),
      method: "GET",
      handler: async (req, res) => {
        const baseName = req.params[0];
        if (!isValidName(baseName)) {
          return res.status(400).json({ ok: false, error: "名称非法" });
        }

        const relPath = toRelPath(baseName);
        if (!loader.hasModule(relPath)) {
          return res.status(404).json({ ok: false, error: "模块不存在" });
        }

        try {
          const mod = await loader.loadAModule(relPath);
          res.status(200).json({ ok: true, data: mod });
        } catch (err) {
          res.status(500).json({ ok: false, error: err.message });
        }
      },
    },

    // POST 新建：创建模块
    {
      path: apiPrefix,
      method: "POST",
      handler: async (req, res) => {
        const { name, code } = req.body;
        if (!name || !isValidName(name)) {
          return res.status(400).json({ ok: false, error: "名称非法或缺失" });
        }

        const relPath = toRelPath(name);
        if (loader.hasModule(relPath)) {
          return res.status(400).json({
            ok: false,
            error: `模块已存在，如需修改请使用 PUT`,
          });
        }

        // JS 文件可选语法校验
        if (validateSyntax && fileExt.endsWith(".js")) {
          try {
            parse(code, { ecmaVersion: "latest", sourceType: "script" });
          } catch (err) {
            return res.status(400).json({
              ok: false,
              error: "代码语法错误: " + err.message,
            });
          }
        }

        try {
          await loader.writeModule(relPath, code);
          loader.updateIndex(relPath);
          res.status(200).json({ ok: true, path: relPath });
        } catch (err) {
          res.status(500).json({ ok: false, error: err.message });
        }
      },
    },

    // PUT 更新：覆盖模块内容
    {
      path: new RegExp(`^${apiPrefix}/([a-zA-Z0-9_-]+)$`),
      method: "PUT",
      handler: async (req, res) => {
        const baseName = req.params[0];
        if (!isValidName(baseName)) {
          return res.status(400).json({ ok: false, error: "名称非法" });
        }

        const relPath = toRelPath(baseName);
        if (!loader.hasModule(relPath)) {
          return res.status(404).json({ ok: false, error: "模块不存在" });
        }

        const code = req.body.code ?? req.body;
        if (validateSyntax && fileExt.endsWith(".js")) {
          try {
            parse(code, { ecmaVersion: "latest", sourceType: "script" });
          } catch (err) {
            return res.status(400).json({
              ok: false,
              error: "代码语法错误: " + err.message,
            });
          }
        }

        try {
          await loader.writeModule(relPath, code);
          res.status(200).json({ ok: true, path: relPath });
        } catch (err) {
          res.status(500).json({ ok: false, error: err.message });
        }
      },
    },

    // DELETE 删除模块
    {
      path: new RegExp(`^${apiPrefix}/([a-zA-Z0-9_-]+)$`),
      method: "DELETE",
      handler: async (req, res) => {
        const baseName = req.params[0];
        if (!isValidName(baseName)) {
          return res.status(400).json({ ok: false, error: "名称非法" });
        }

        const relPath = toRelPath(baseName);
        try {
          await loader.removeModule(relPath);
          res.status(200).json({ ok: true });
        } catch (err) {
          res.status(500).json({ ok: false, error: err.message });
        }
      },
    },
  ];
}