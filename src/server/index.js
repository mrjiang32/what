import main from "./global/main.js";
import global from "./global.js";

global.startTime = Date.now();

await main.getReady();
await main.bus.emitSafe("sys:init");