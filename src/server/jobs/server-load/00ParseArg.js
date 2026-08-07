import chalk from "chalk";
import utils from "../../utils/utils.js";
import { parseArgs } from "node:util";
import globalenv from "../../global/globalenv.js";

const grayText = utils.grayText;

export default {
  parseArg: {
    type: "init",
    job: async () => {
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
      globalenv.args = values;
      globalenv.log.info("ARG 解析命令行参数");
      globalenv.log.info(grayText(JSON.stringify(globalenv.args)));
    },
  },
};
