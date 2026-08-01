import bodyParser from "body-parser";
const jsonParser = bodyParser.json({ limit: "10mb" });

export default {
  jsonParser: {
    type: "expressMiddleWare",
    job: (req, res, next) => {
      const middleWareLog = req.$ctx.log;
      middleWareLog.debug(
        grayText(`${chalk.gray(req.ip)} ${chalk.gray(req.method)} ${req.path}`),
      );
      next();
    },
    priority: 95,
  },
};
