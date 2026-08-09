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

export default {
  mwPathCutter: {
    type: "expressMiddleWare",
    job: pathCutter,
  },
};