import sources from "./source.category.js";
import logger, { Logger } from "../utils/Logger.mjs";
import { bus } from "../utils/SafeEventEmitter.js";

export async function getReady() {
  await logger.init();
  for (const key of Object.keys(sources)) {
    const entry = sources[key];
    await entry.source.getReady();
    if (entry.additional) {
      await entry.additional(entry.source); // 务必加await
    }
  }
}