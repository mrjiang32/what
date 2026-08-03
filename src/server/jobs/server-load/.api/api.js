import pickModule from "./pickModule.js";
import path from "path";

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

export default {
  generate: async () => {
    let subapis = [];
    await pickModule.scanModules(path.join(pickModule.apiDir, "subapi"), async (name) => {
      subapis.push(await pickModule.loadAModuleGeneric(path.join(pickModule.apiDir, "subapi", name)));
    });
    const generatedRoutes = await Promise.all(subapis.map((subapi) => subapi.default.generate()));

    await pickModule.updateAll({})
    return [rootpage, ...generatedRoutes.flat()];
  },
};
