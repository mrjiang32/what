import main from "../../../global/main.js";
import global from "../../../global.js";

const logger = global.logger.getByContext("Refresh Source");

export default Object.freeze({
  task: async () => {
    await main.sources["/custom/func"].source.getReady();
  },
  interval: 1000 * 60,
});