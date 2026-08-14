import sources from "./source.category.js";
import { bus } from "../utils/SafeEventEmitter.js";

export async function getReady() {
  for (const key of Object.keys(sources)) {
    const entry = sources[key];
    await entry.source.getReady();
    if (entry.additional) {
      await entry.additional(entry.source); // 务必加await
    }
  }
}