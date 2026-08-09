import jwt from "jsonwebtoken";
import globalenv from "../../global/globalenv.js";

/**
 * 鉴权中间件
 * 白名单接口不校验token；从Header Authorization读取Bearer token
 * 挂载 req.user = payload，鉴权失败直接返回401
 */
function authMiddleware(req, res, next) {
  let whiteList = globalenv.whiteList || [];

  // 仅对 /api 下接口生效
  if (!req.url.startsWith("/api")) {
    return next();
  }

  if (whiteList.includes(req.url)) {
    return next();
  }

  const secret = globalenv.secret;

  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }

  if (!token && req.cookies?.access_token) {
    token = req.cookies.access_token;
  }

  if (!token) {
    return res
      .status(401)
      .json({
        ok: false,
        err: "未登录，检查Header Authorization是否包含Bearer token或cookie access_token",
      });
  }

  try {
    const payload = jwt.verify(token, secret);
    if(!globalenv.tokenMap.has(token)){
      throw new Error("token无效");
    }
    req.user = payload; // 将用户信息挂载请求对象
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res
        .status(401)
        .json({ ok: false, err: "token已过期，请重新登录获取" });
    }
    return res
      .status(401)
      .json({ ok: false, err: "token无效，请重新登录获取" });
  }
}

export default {
  setAuth: {
    type: "expressMiddleWare",
    job: authMiddleware,
  },
};
