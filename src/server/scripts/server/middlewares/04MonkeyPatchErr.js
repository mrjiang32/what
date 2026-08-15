import global from "../../../global.js";

export default (err, req, res, next) => {
  // 1. Log the error explicitly using your global logger
  global.logger.debug('Caught Error Response:\n', JSON.stringify({
    url: req.originalUrl,
    method: req.method,
    status: err.status || err.statusCode || 500,
    message: err.message,
    stack: err.stack,
  }, null, 2));

  // 2. Pass the error to the next middleware (or Express's default error handler)
  next(err);
};