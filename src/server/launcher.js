import express from "express";
import chalk from "chalk";
import nedenv,{ modifyContext } from "./job/neededEnvironment.js";
import jobs from "./job/jobs.js";
import logger from "./utils/logger.js";

const app = express();
modifyContext("app", app);

await logger.init();
const log = logger.newLogger("Launcher");

const shutdown = (signal) => {
  log.info(`${chalk.red(signal)}`);
  const shutdownFunction = async () => {
    await jobs.emitStop();
    process.exit(0);
  };
  if (nedenv.server?.close) {
    nedenv.server.close(shutdownFunction);
  } else {
    shutdownFunction();
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

await jobs.init();
await jobs.emitInit();