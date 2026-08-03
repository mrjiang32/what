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
            name: name + ".json",
            type: "hooks",
            code: { name, bindedActionIds, description, friendlyName },
          });

          await pickModule.updateIndex({ name: type + "\\" + name + ".json" });

          return res.status(200).json({
            ok: true,
            name,
            bindedActionIds,
            description,
            friendlyName,
          });
        },
      },
    ].concat(commonApi.generate({type: "hooks", ext: "json", execfunc: ({req, res, module, param}) => {
      
    }}));
  },
};
