import bodyParser from "body-parser";
import global from "../../../global.js"

const jsonParser = bodyParser.json({ limit: "10mb" });

export default (req, res, next) => {
      const logger = global.logger.getByContext("JSON")
      jsonParser(req, res, (err) => {
        if (err) {
          if (err.type === "entity.parse.failed") {
            logger.error("Request Parser: 客户端JSON格式错误", err);
            return res.status(400).json({
              code: 400,
              msg: "JSON format error",
              error: err.message,
            });
          }

          logger.error("Request Parser: 无法提取客户端JSON", err);
          return res.status(400).json({
            code: 400,
            msg: "Request body parsing failed",
            error: err.message,
          });
        }
        next();
      });
    }