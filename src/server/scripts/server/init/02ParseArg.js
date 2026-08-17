import chalk from "chalk";
import global from "../../../global.js";
import { parseArgs } from "node:util";

const options = {
  port: { type: "string", short: "p" },
  host: { type: "string", short: "h" },
  "config-file": { type: "string", short: "c" },
  // env: { type: 'string' },
  debug: { type: "boolean", short: "d" },
  "no-auth": { type: "boolean" },
  // verbose: { type: 'boolean', short: 'v' }
};

export default async () => {
  let parsedArgs = parseArgs({
    options,
    allowPositionals: true,
  });
  /** @type {Array<String>}*/
  const positionals = parsedArgs.positionals;
  let values = parsedArgs.values;

  values.positionals = positionals;
  const logger = global.logger.getByContext("ParseArg");

  global.args = values;
  logger.info("读取命令行参数");
  logger.info(chalk.gray(` - ${JSON.stringify(global.args)}`));
};
