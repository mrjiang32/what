import global from "../../../global.js";
import config from "../../utils/config.js";

export default async () => {
  if (global.rewrite) {
    global.logger.getByContext("Rewrite").info(`Config File rewrite.`);
    await config.saveConfigAsync(global.config);
  }
};
