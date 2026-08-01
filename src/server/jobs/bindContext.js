import neededEnvironment from "../global/neededEnvironment.js";

export default {
  bindRequestContext: {
    type: "expressMiddleWare",
    priority: 999,
    job: (req, res, next) => {
      req.$ctx = neededEnvironment;
      next();
    },
  },
};