export default {
  abortlogic: {
    type: "expressMiddleWare",
    job: (req, res, next) => {
      res.locals.aborted = false;
      req.on("close", () => {
        res.locals.aborted = true;
      });
      next();
    },
    priority: 89,
  },
};
