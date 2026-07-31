import cors from "cors";
import cookieParser from "cookie-parser";
import multer from "multer";

const settedMulter = multer({
  dest: "./.uploads/", //临时文件目录
  limits: { fileSize: 10 * 1024 * 1024 }
});

const pathCutter = (req, res, next) => {
  const [rawPath, queryStr] = req.url.split("?");

  let fixedPath = rawPath.replace(/\/+/g, "/");
  if (fixedPath.length > 1 && fixedPath.endsWith("/")) {
    fixedPath = fixedPath.slice(0, -1);
  }

  const newUrl = queryStr ? `${fixedPath}?${queryStr}` : fixedPath;
  req.url = newUrl;
  next();
};

const settedCors = cors();

const settedCookieParser = cookieParser();

export default {
  mwPathCutter: {
    type: "expressMiddleWare",
    priority: 100,
    job: pathCutter,
  },
  mwCors: {
    type: "expressMiddleWare",
    priority: 90,
    job: settedCors,
  },
  // mwMulter: {
  //   type: "expressMiddleWare",
  //   priority: 75,
  //   job: settedMulter.any(),
  // },
  mwCookieParser: {
    type: "expressMiddleWare",
    priority: 70,
    job: settedCookieParser,
  },
};