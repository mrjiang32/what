import chalk from "chalk";
import utils from "../../utils/utils.js";
import { parseArgs } from "node:util";

const grayText = utils.grayText;

export default {
  parseArg: {
    type: "init",
    job: async (ctx) => {
      const { values } = parseArgs({
        options: {
          port: { type: 'string', short: 'p' },
          host: { type: 'string', short: 'h' },
          "config-file": { type: 'string', short: 'c' },
          // env: { type: 'string' },
          debug: { type: 'boolean', short: 'd' },
          // verbose: { type: 'boolean', short: 'v' }
        },
        allowPositionals: true
      });
      ctx.args = values;
      ctx.log.info("ARG 解析命令行参数");
      ctx.log.info(grayText(JSON.stringify(ctx.args)));
    },
    allowContext: true,
    priority: 120,
  },
};
