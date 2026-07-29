import jobLoader from "./jobLoader.js";
import SafeEventEmitter, { bus } from "../class/SafeEventEmitter.js";

export default {
  init: async function init() {
    await jobLoader.getJobs();
  },
  emitInit: async function init() {
    await bus.emitSafeParallel("system:init");
  },
  emitStop: async function stop() {
    await bus.emitSafeParallel("system:stop");
  },
};
