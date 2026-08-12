import chalk from "chalk";
import global from "../../../global.js";
import { parseArgs } from "node:util";

export default async () => {
  const { values } = parseArgs({
    options: {
      port: { type: "string", short: "p" },
      host: { type: "string", short: "h" },
      "config-file": { type: "string", short: "c" },
      // env: { type: 'string' },
      debug: { type: "boolean", short: "d" },
      // verbose: { type: 'boolean', short: 'v' }
    },
    allowPositionals: true,
  });
  const logger = global.logger.getByContext("ParseArg");
  global.args = values;
  logger.info(chalk.gray(` - ${JSON.stringify(global.args)}`));
};
