import main from "../../../global/main.js";
import global from "../../../global.js";

const logger = global.logger.getByContext("Refresh Source");

export default Object.freeze({
  task: async () => {
    await main.sources["/custom/func"].source.getReady();
    await main.sources["/custom/hook"].source.getReady();
    logger.debug("数据源刷新完成 " + new Date());
    logger.debug("不要忘了兑换码");
    logger.debug("不要忘了兑换码");
    logger.debug("不要忘了兑换码");
  },
  interval: 1000 * 60,
});