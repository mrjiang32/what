import globalenv from "../../../global/globalenv.js";

export default {
  bindRequestContext: {
    type: "expressMiddleWare",
    job: (req, res, next) => {
      req.$ctx = globalenv;
      next();
    },
  },
};