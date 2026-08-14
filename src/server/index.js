import main from "./global/main.js";
import global from "./global.js";
import logger, { Logger } from "./global/utils/Logger.mjs";

global.startTime = Date.now();

await logger.init();
await main.getReady();
await main.bus.emitSafe("sys:init");