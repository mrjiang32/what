import global from "../../../global.js";
import { bus } from "../../../global/utils/SafeEventEmitter.js";

export default async () => {
  setTimeout(() => {
    global.logger.getByContext("ForceExit").warn("超时未关闭，强制退出进程");
    process.exit(0);
  }, 2000);
};
