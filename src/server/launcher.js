import express from "express";
import chalk from "chalk";
import nedenv, { modifyContext } from "./global/globalenv.js";
import jobs from "./utils/jobs.js";
import logger from "./utils/logger.js";
import path from "path";
import { fileURLToPath } from "url";

modifyContext("startTime", Date.now());
modifyContext("app", express());
modifyContext(
  "relDirRoot",
  path.resolve(path.dirname(fileURLToPath(import.meta.url))),
);

await logger.init();
const log = logger.newLogger("Launcher");
const accessLog = logger.newLogger("Access");

const shutdown = (signal) => {
  log.info(`Received ${chalk.red(signal)}`);
  jobs.emitStop();
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

modifyContext("shutdown", shutdown);
modifyContext("accesslog", accessLog);

await jobs.init();
await jobs.emitInit();
