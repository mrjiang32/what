import { bus } from "../../../global/utils/SafeEventEmitter.js";
import global from "../../../global.js";
import main from "../../../global/main.js";

export default async () => {
  const log = global.logger.getByContext("API Routes");
  await bus.emitSafe("api");
  main.sources["/custom/func"].source.getReady();
  main.sources["/custom/hook"].source.getReady();
};
