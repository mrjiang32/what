import fsPromises from "fs/promises";
import path from "path";
import global from "../../../global.js";
import config from "../utils/config.js";
import { setAuthSecret } from "../utils/auth.js";

export default async () => {
  let log = global.logger.getByContext("Passwd");
  setAuthSecret(global.config.secret);

  if(!global.users.admin?.defaultPasswd) return;

  console.log();
  log.info("----------------------------------------------");
  log.warn("初始默认账号密码：（请尽快修改）");
  log.warn("用户名: admin");
  log.warn("密码: " + global.users.admin.defaultPasswd);
  log.info("----------------------------------------------");
  console.log();
};