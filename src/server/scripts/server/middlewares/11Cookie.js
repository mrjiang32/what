// jobs/02_cookieParser.js
import cookieParser from "cookie-parser";

const settedCookieParser = cookieParser();

export default {
  mwCookieParser: {
    type: "expressMiddleWare",
    job: settedCookieParser,
  },
};