"use strict";

const runtimeConfig = require("./config.json");

module.exports = appInfo => {
  const config = {};
  config.keys = `${appInfo.name}_egg_key`;
  config.cluster = {
    listen: {
      port: Number(process.env.PORT || runtimeConfig.server.port),
      hostname: process.env.HOST || runtimeConfig.server.host,
    },
  };
  config.bodyParser = { enable: true };
  config.middleware = ["auth"];
  config.security = { csrf: { enable: false } };
  return config;
};