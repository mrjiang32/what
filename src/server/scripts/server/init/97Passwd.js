import global from "../../../global.js";

export default async () => {
  if (!global.config.users["admin"].defaultPasswd) {
    return;
  }
  let log = global.logger.getByContext("Passwd");
  console.log();
  log.info("----------------------------------------------");
  log.info("Default User: admin");
  log.info("Default Passwd: " + global.config.users["admin"].defaultPasswd);
  log.info("----------------------------------------------");
  console.log();
};
