import express from "express";
import chalk from "chalk";
import nedenv, { modifyContext } from "./global/globalenv.js";
import jobs from "./utils/jobs.js";
import logger from "./utils/logger.js";
import path from "path";
import { fileURLToPath } from "url";

await logger.init();
const log = logger.newLogger("Launcher");

const shutdown = (signal) => {
  log.info(`Received ${chalk.red(signal)}`);
  jobs.emitStop();
};

modifyContext("shutdown", shutdown);
modifyContext("accesslog", logger.newLogger("Access"));
modifyContext("actionlog", logger.newLogger("Action"));
modifyContext("startTime", Date.now());
modifyContext("app", express());
modifyContext(
  "relDirRoot",
  path.resolve(path.dirname(fileURLToPath(import.meta.url))),
);

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

await jobs.init();
await jobs.emitInit();
