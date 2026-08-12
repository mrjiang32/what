import { bus } from "../../../global/utils/SafeEventEmitter.js";
import global from "../../../global.js";

export default async () => {
  const log = global.logger.getByContext("LoadAPI");
  log.info("Loading API Routes:");
  await bus.emitSafe("api");
};
