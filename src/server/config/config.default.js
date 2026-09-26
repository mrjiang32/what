"use strict";

import fs from "node:fs";

let runtimeConfig = { server: { port: 3000, host: "127.0.0.1" } };
try {
  runtimeConfig = JSON.parse(fs.readFileSync(new URL("./config.json", import.meta.url), "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

export default appInfo => {
  const config = {};
  config.keys = `${appInfo.name}_egg_key`;
  config.cluster = {
    listen: {
      port: Number(process.env.PORT || runtimeConfig.server?.port || 3000),
      hostname: process.env.HOST || runtimeConfig.server?.host || "127.0.0.1",
    },
  };
  config.bodyParser = { enable: true };
  config.middleware = ["auth"];
  config.security = { csrf: { enable: false } };
  return config;
};
