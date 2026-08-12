import global from "../../../global.js";
import chalk from "chalk";
import { bus } from "../../../global/utils/SafeEventEmitter.js";

let shutdownLock = false;
const shutdown = (signal) => {
  if (shutdownLock) return;
  shutdownLock = true;
  console.log("");
  global.logger.getByContext("Halt").info(`Received ${chalk.red(signal)}`);
  bus.emitSafe("sys:halt");
};

export default () => {
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  global.server.shutdown = shutdown;
};
