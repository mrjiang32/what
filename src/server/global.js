import path from "path";
import { Logger } from "./global/utils/Logger.mjs";

export default {
  scan: {
    dir: import.meta.dirname,
    workdir: path.join(import.meta.dirname, "scripts"),
    logger: new Logger("scan"),
  },
  logger: new Logger("global"),
};
