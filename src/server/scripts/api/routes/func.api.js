// func.api.js
import { createModuleRoutes } from "../RESTful.js";
import { FileSource } from "../../../global/source/File.source.mjs";
import global from "../../../global.js";
import path from "path";
import { fileURLToPath } from "url";

const source = global.main.sources["/custom/func"].source;

export default async () => {
  return createModuleRoutes({
    apiPrefix: "/api/func",
    source,
    exec: async (relPath, body) => {
      source.runModule(relPath, body.params);
      return await fn(global, body);
    },
  });
};