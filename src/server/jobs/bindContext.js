import globalenv from "../global/globalenv.js";

export default {
  bindRequestContext: {
    type: "expressMiddleWare",
    priority: 999,
    job: (req, res, next) => {
      req.$ctx = globalenv;
      next();
    },
  },
};