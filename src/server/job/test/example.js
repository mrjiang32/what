import jobExecutor from "../jobExecutor.js";
import logger from "../../utils/logger.js";

await logger.init();
await jobExecutor.init();
await jobExecutor.emitInit();