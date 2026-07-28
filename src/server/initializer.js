import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import multer from "multer";
import chalk from "chalk";
import express from "express";

import logger from "./utils/logger.js";
import utils from "./utils/utils.js";
import api from "./api/api.js";
import dbload from "./db/load.js";
import conf from "./utils/config.js";

const grayText = utils.grayText;
const jsonParser = bodyParser.json({ limit: "10mb" });
const middleWareLog = logger.newLogger("MiddleWare");
const dbLog = logger.newLogger("DataBase");
const apiLog = logger.newLogger("API");
const log = logger.newLogger("Server");

const startTime = Date.now();

let app = express(),
  server,
  config = {};

const saveConfig = async () => {
  await conf.saveConfigAsync(config);
};

const pathCutter = (req, res, next) => {
  const [rawPath, queryStr] = req.url.split("?");

  let fixedPath = rawPath.replace(/\/+/g, "/");
  if (fixedPath.length > 1 && fixedPath.endsWith("/")) {
    fixedPath = fixedPath.slice(0, -1);
  }

  const newUrl = queryStr ? `${fixedPath}?${queryStr}` : fixedPath;
  req.url = newUrl;
  next();
};

const accessReminder = (req, res, next) => {
  middleWareLog.debug(
    grayText(`${chalk.gray(req.ip)} ${chalk.gray(req.method)} ${req.path}`),
  );
  next();
};

const requestParser = (req, res, next) => {
  jsonParser(req, res, (err) => {
    if (err) {
      if (err.type === "entity.parse.failed") {
        middleWareLog.error("Request Parser: 客户端JSON格式错误", err);
        return res.status(400).json({
          code: 400,
          msg: "JSON format error",
          error: err.message,
        });
      }

      middleWareLog.error("Request Parser: 无法提取客户端JSON", err);
      return res.status(400).json({
        code: 400,
        msg: "Request body parsing failed",
        error: err.message,
      });
    }
    next();
  });
};

let middleWares = [
  pathCutter,
  accessReminder,
  cors(),
  jsonParser,
  bodyParser.urlencoded({ extended: true }),
  cookieParser(),
];

const saveConf = async () => {
  log.info("保存配置文件");
  config.runTime += Date.now() - startTime;
  saveConfig();
  log.info(grayText("已保存"));
};

export default {
  beforeInit: {
    readConfig: async () => {
      log.info("读取配置文件");
      // 读取配置文件
      // TODO: 添加命令行支持，从 --config [configPath] 读取（若有）
      log.info(
        grayText(`从"${chalk.blueBright(conf.configFilePath)}"读取配置文件`),
      );
      try {
        config = await conf.readConfigAsync();
        log.info(grayText(`配置文件读取成功`));
      } catch (err) {
        log.error(`读取配置文件出现错误: ${err}`);
        log.error(`请检查目录、文件是否存在/有权限读写`);
        process.exit("FILE_READ_FAILED");
      }
    },
  },
  init: {
    insertMiddleWares: {
      job: async () => {
        log.info("插入中间件");
        middleWares.forEach((eachOne) => {
          app.use(eachOne);
        });
        log.info(grayText("中间件插入完成"));
      },
      allowContext: true,
    },
    insertRoutes: {
      job: async () => {
        log.info("插入路由");
        api.forEach((route) => {
          app[route.method.toLowerCase()](route.path, route.handler);
          apiLog.info(
            chalk.gray(
              ` - ${route.method.toUpperCase()} ${chalk.green(route.path)}`,
            ),
          );
        });
        log.info(grayText("路由插入完成"));
      },
      allowContext: true,
    },
    rootPage: {
      job: async () => {
        log.info("设置根页面");
        app.get("/", (req, res) => {
          res.json({ running: true, uptime: Date.now() - startTime });
        });
        log.info(grayText("已设置根页面"));
      },
      allowContext: true,
    },
    dbInit: {
      job: async () => {
        log.info("连接数据库");
        try {
          await dbload.main(config.db.uri);
        } catch (err) {
          dbLog.error("数据库连接失败", err);
          throw err;
        }
        dbLog.info(
          grayText(
            `成功连接数据库:"${chalk.blueBright(config.db.name)}" URI:"${chalk.blueBright(
              config.db.uri,
            )}"`,
          ),
        );
      },
      allowContext: true,
    },
  },
  stop: {
    dbDown: {
      job: async () => {
        log.info("关闭数据库");
        await dbload.close();
        dbLog.info("已关闭数据库连接");
      },
      allowContext: true,
    },
    saveConf: {
      job: saveConf,
      allowContext: true,
    },
  },
  timerJobs: {
    saveConfig: {
      job: async () => {
        log.debug("保存配置文件");
        config.runTime += Date.now() - startTime;
        saveConfig();
        log.debug(grayText("已保存"));
      },
      interval: 60000,
      allowContext: true,
    },
  },
  get app() {
    return app;
  },
  get server() {
    return server;
  },
  set server(val) {
    server = val;
  },
  get config() {
    return config;
  },
};
