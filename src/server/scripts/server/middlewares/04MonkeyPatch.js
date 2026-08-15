import global from "../../../global.js";

export default function responseLogger(req, res, next) {
  if (!global.args.debug) {
    return next();
  }

  const start = Date.now();
  let responseBody;

  // 拦截 res.json
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    responseBody = body;
    return originalJson(body);
  };

  // 拦截 res.send
  const originalSend = res.send.bind(res);
  res.send = function (body) {
    responseBody = body;
    return originalSend(body);
  };

  // 响应结束后打印日志
  res.on('finish', () => {
    const duration = Date.now() - start;
    global.logger.debug('Response:\n', JSON.stringify({
      url: req.originalUrl,
      method: req.method,
      status: res.statusCode,
      duration: `${duration}ms`,
      request: req.body,
      headers: req.headers,
      response: responseBody,
    }, null, 2));
  });

  next();
}