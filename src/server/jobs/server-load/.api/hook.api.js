import pickModule from "./pickModule.js";

export default {
  generate: () => {
    return [
      {
        path: /^\/api\/hook\/[a-zA-Z0-9_]+$/,
        method: "GET",
        handler: (req, res) => {
          const hookName = req.path.split("/").pop();
          if (!pickModule.moduleSet.has("hooks\\" + hookName + ".js")) {
            return res.status(404).json({
              error: "API模块不存在",
              ok: false,
            });
          }
          return res
            .status(200)
            .json(
              pickModule.loadAModule({ type: "hooks", name: hookName + ".js" }),
            );
        },
      },
      {
        path: /^\/api\/hook\/[a-zA-Z0-9_]+$/,
        method: "POST",
        handler: (req, res) => {
          const hookName = req.path.split("/").pop();
          if (!pickModule.moduleSet.has("hooks\\" + hookName + ".js")) {
            return res.status(404).json({
              error: "API模块不存在",
              ok: false,
            });
          }
          const params = req.body;
          const module = pickModule.loadAModule({ type: "hooks", name: hookName + ".js" });
          return res.json(module.exec(params));
        },
      },
      {
        path: "/api/hook",
        method: "GET",
        handler: (req, res) => {
          return res.status(200).json({
            ok: true,
            modules: Array.from(pickModule.moduleSet),
          });
        },
      },
    ];
  },
};
