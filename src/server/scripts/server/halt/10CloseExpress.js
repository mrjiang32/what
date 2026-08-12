import { bus } from "../../../global/utils/SafeEventEmitter.js";
import global from "../../../global.js";

export default async () => {
  await bus.emitSafeParallel("close");
  await bus.emitSafeParallel("abort");
  await new Promise((res) => {
    if (!global.server.httpServer?.close) {
      return res();
    }
    global.server.httpServer?.close(res);
  });
  global.logger.getByContext("CloseExpress").info("已关闭Express服务");
};
