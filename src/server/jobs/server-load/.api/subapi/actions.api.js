import pickModule from "../pickModule.js";
import commonApi from "../common.api.js";
import { parse } from "acorn";

export default {
  generate: () => {
    return [
      {
        path: "/api/action/",
        method: "POST",
        handler: (req, res) => {
          const { name, code } = req.body;

          if (typeof code !== "string") {
            return res.status(400).json({
              ok: false,
              err: "code must be a string",
            });
          }

          // 名称合法性校验，防止路径穿越
          if (!/^[a-zA-Z0-9_]+$/.test(name)) {
            return res.status(400).json({
              ok: false,
              err: "名称仅允许字母、数字、下划线",
            });
          }

          try {
            parse(code, {
              ecmaVersion: "latest",
              sourceType: "module",
            });
          } catch (err) {
            return res.status(400).json({
              ok: false,
              err: "代码语法错误: " + err.message,
            });
          }

          try {
            pickModule.writeModule({
              name: name + ".js",
              code,
              type: "actions",
            });
            return res.status(200).json({
              ok: true,
            });
          } catch (err) {
            return res.status(500).json({
              ok: false,
              err: err.message,
            });
          }
        },
      },
    ].concat(commonApi.generate("actions"));
  },
};
