import path from "path";
import logger, { Logger } from "./global/utils/Logger.mjs";
import express from "express";
import { bus } from "./global/utils/SafeEventEmitter.js";

export default {
  scan: {
    dir: import.meta.dirname,
    workdir: path.join(import.meta.dirname, "scripts"),
  },
  logger: new Logger(":"),
  loggerMgr: logger,
  server: {
    app: express(),
  },
  startTime: 0,
  bus,
  args: null,
  auth: {
    secret: null,
    tokenMap: new Map(),
  },
  config: null,
};
