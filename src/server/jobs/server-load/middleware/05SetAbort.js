export default {
  abortlogic: {
    type: "expressMiddleWare",
    job: (req, res, next) => {
      req.$ctx.abort.on("abort", () => {
        res.locals.aborted = true;
      });
      next();
    },
  },
};
