import pickModule from "./pickModule.js";
import { parse } from "acorn";

export default {
  generate: ({ apiType, ext, execfunc }) => {
    return [
      {
        path: new RegExp(`^/api/${apiType}/([a-zA-Z0-9_]+)$`),
        method: "GET",
        handler: (req, res) => {
          const actionName = req.path.split("/").pop();
          if (!pickModule.moduleSet.has(`${apiType}\\${actionName}.${ext}`)) {
            return res.status(404).json({
              error: `${apiType}API模块不存在`,
              ok: false,
            });
          }
          return res
            .status(200)
            .json(
              pickModule.loadAModule({
                type: apiType,
                name: `${actionName}.${ext}`,
              }),
            );
        },
      },
      {
        path: new RegExp(`^/api/${apiType}$`),
        method: "POST",
        handler: (req, res) => {
          const actionName = req.path.split("/").pop();
          if (!pickModule.moduleSet.has(`${apiType}\\${actionName}.${ext}`)) {
            return res.status(404).json({
              error: `${apiType}API模块不存在`,
              ok: false,
            });
          }
          const params = req.body;
          const module = pickModule.loadAModule({
            type: apiType,
            name: `${actionName}.${ext}`,
          });
          return res.json(execfunc({ req, res, module, params }));
        },
      },
      {
        path: `/api/${apiType}`,
        method: "GET",
        handler: (req, res) => {
          return res.status(200).json({
            ok: true,
            modules: Array.from(pickModule.moduleSet).filter((module) => module.startsWith(`${apiType}\\`)),
          });
        },
      },
    ];
  },
};
