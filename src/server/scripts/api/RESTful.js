// RESTful.js
import { parse } from "acorn";
import { FileSource } from "../../global/source/File.source.mjs";

/**
 * @param {Object} options
 * @param {string} options.apiPrefix - API 路由前缀
 * @param {FileSource} options.source - 文件数据源实例
 * @param {Function} [options.exec] - 执行模块的回调 (id, body) => result
 */
export async function createModuleRoutes({ apiPrefix, source, exec }) {
  const isValidName = (name) => /^[a-zA-Z0-9_-]+$/.test(name);
  const toRelPath = (name) => `${name}.js`;

  /**
   * 内部方法：校验语法并写入底层数据源
   */
  const updateSource = async ({ raw, relPath, res }) => {
    // 如果是 .js 文件，进行 AST 语法校验
    if (relPath.endsWith(".js")) {
      try {
        parse(raw, { ecmaVersion: "latest", sourceType: "script" });
      } catch (err) {
        return res.status(400).json({
          ok: false,
          error: "代码语法错误: " + err.message,
        });
      }
    }

    try {
      // FileSource 的 add 契约是 { text: string }
      await source.add(relPath, { text: raw });
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  };

  return [
    // GET 列表：列出所有模块
    {
      path: apiPrefix,
      method: "GET",
      handler: async (req, res) => {
        res.status(200).json({
          ok: true,
          modules: await source.toIdArray(),
        });
      },
    },

    // GET 列表(强制重载)：轻量级刷新底层索引后列出
    {
      path: `${apiPrefix}/.reload`,
      method: "GET",
      handler: async (req, res) => {
        try {
          await source.reload();
          res.status(200).json({
            ok: true,
            modules: await source.toIdArray(),
          });
        } catch (err) {
          res.status(500).json({ ok: false, error: err.message });
        }
      },
    },

    // GET 单个：获取模块源码内容
    {
      path: new RegExp(`^${apiPrefix}/([a-zA-Z0-9_-]+)$`),
      method: "GET",
      handler: async (req, res) => {
        const baseName = req.params[0];
        if (!isValidName(baseName)) {
          return res.status(400).json({ ok: false, error: "名称非法" });
        }

        const relPath = toRelPath(baseName);
        if (!source.has(relPath)) {
          return res.status(404).json({ ok: false, error: "模块不存在" });
        }

        try {
          const entity = await source.get(relPath);
          res.status(200).json({ ok: true, source: entity.text });
        } catch (err) {
          res.status(500).json({ ok: false, error: err.message });
        }
      },
    },

    // POST 单个：执行模块
    {
      path: new RegExp(`^${apiPrefix}/([a-zA-Z0-9_-]+)/exec$`),
      method: "POST",
      handler: async (req, res) => {
        const baseName = req.params[0];
        if (!isValidName(baseName)) {
          return res.status(400).json({ ok: false, error: "名称非法" });
        }

        const relPath = toRelPath(baseName);
        if (!source.has(relPath)) {
          return res.status(404).json({ ok: false, error: "模块不存在" });
        }

        if (!exec) {
          return res.status(400).json({ ok: false, error: "该数据源不支持执行操作" });
        }

        try {
          const value = await exec(relPath, req.body);
          res.status(200).json({ ok: true, value: value ?? null });
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
        const { id, raw } = req.body;
        if (!id || !isValidName(id)) {
          return res.status(400).json({ ok: false, error: "名称非法或缺失" });
        }

        const relPath = toRelPath(id);
        if (source.has(relPath)) {
          return res.status(400).json({
            ok: false,
            error: "模块已存在，如需修改请使用 PUT",
          });
        }

        return await updateSource({ raw, relPath, res });
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
        if (!source.has(relPath)) {
          return res.status(404).json({ ok: false, error: "模块不存在" });
        }

        return await updateSource({ raw: req.body.raw, relPath, res });
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
          await source.del(relPath);
          res.status(200).json({ ok: true });
        } catch (err) {
          res.status(500).json({ ok: false, error: err.message });
        }
      },
    },
  ];
}