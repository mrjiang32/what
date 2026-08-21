import global from "../../../global.js";
import chalk from "chalk";

const colorStatusCode = (code) => {
  if (code >= 200 && code < 300) {
    return chalk.green(code);
  } else if (code >= 400 && code < 500) {
    return chalk.red(code);
  } else if (code >= 400 && code < 500) {
    return chalk.yellowBright(code);
  } else {
    return code;
  }
};

export default function responseLogger(req, res, next) {
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

  if (global.args.debug) {
    // 响应结束后打印日志
    res.on("finish", () => {
      const duration = Date.now() - start;
      global.logger.debug(
        "Response:\n",
        JSON.stringify(
          {
            url: req.originalUrl,
            method: req.method,
            status: res.statusCode,
            duration: `${duration}ms`,
            request: req.body,
            headers: req.headers,
            response:
              (responseBody?.length ?? 0) > 100
                ? responseBody.slice(0, 99) + "..."
                : responseBody,
            err: res.$error ?? req?.body?.error ?? req?.body?.err ?? null,
          },
          null,
          2,
        ),
      );
    });
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    global.logger.info(
      ` ${req.ip} ${req.method} ${req.originalUrl} ${colorStatusCode(res.statusCode)} ${duration}ms `,
    );
  });

  next();
}
