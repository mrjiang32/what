import bodyParser from "body-parser";
const jsonParser = bodyParser.json({ limit: "10mb" });

export default {
  jsonParser: {
    type: "expressMiddleWare",
    job: (req, res, next) => {
      // console.log(req.$ctx);
      const middleWareLog = req.$ctx.log;
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
    },
  },
  bodyUrlDecode: {
    type: "expressMiddleWare",
    job: bodyParser.urlencoded({ extended: true }),
  },
};
