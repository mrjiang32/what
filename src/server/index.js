import global from "./global.js";

global.startTime = Date.now();

await global.main.getReady();
await global.bus.emitSafe("sys:init");