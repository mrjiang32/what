import globalenv from "../../global/globalenv.js";

export default {
  abortlogic: {
    type: "expressMiddleWare",
    job: (req, res, next) => {
      globalenv.abort.on("abort", () => {
        res.locals.aborted = true;
      });
      next();
    },
  },
};
