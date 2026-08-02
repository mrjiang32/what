import pickModule from "./pickModule.js";
import hookAPI from "./hook.api.js";

const startTime = Date.now();

const rootpage = {
  path: "/api",
  method: "GET",
  handler: (req, res) => {
    res.json({
      running: true,
      uptime: Date.now() - startTime,
      modules,
    });
  },
};

const hookapi = hookAPI.generate();
const actionapi = [];

export default {
  generate: async () => {
    await pickModule.updateAll();
    return [rootpage].concat(hookapi, actionapi);
  },
};
