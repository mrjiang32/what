import pickModule from "../pickModule.js";
import commonApi from "../common.api.js";

export default {
  generate: () => {
    return [
      {
        path: "/api/hook/",
        method: "POST",
        handler: async (req, res) => {
          const { name, bindedActionIds, description, friendlyName } = req.body;
          if (!name) {
            return res.status(400).json({
              ok: false,
              error: "hook name is required",
            });
          }

          await pickModule.writeModule({
            name,
            type: "hooks",
            code: { name, bindedActionIds, description, friendlyName },
          });

          return res.status(200).json({
            ok: true,
            name,
            bindedActionIds,
            description,
            friendlyName,
          });
        },
      },
    ].concat(commonApi.generate("hooks"));
  },
};
