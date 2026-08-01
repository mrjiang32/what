import pickModule from "./pickModule.js";

const startTime = Date.now();
const modules = await pickModule.scanModules()

const rootpage = {
  path: "/api",
  method: "GET",
  handler: (req, res) => {
    res.json({
      running: true,
      uptime: Date.now() - startTime,
      modules
    });
  },
};

const hookapi = [];
const actionapi = [];

export default function generate() {
  return [rootpage].concat(hookapi, actionapi);
}
