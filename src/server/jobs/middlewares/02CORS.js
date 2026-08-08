// jobs/01_cors.js
import cors from "cors";

const settedCors = cors();

export default {
  mwCors: {
    type: "expressMiddleWare",
    job: settedCors,
  },
};