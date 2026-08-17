import jwt from "jsonwebtoken";
import global from "../../../global.js";

function authMiddleware(req, res, next) {
  const whiteList = global.whiteList || [];
  if (global.args["no-auth"]) {
    return next();
  }

  // 仅对 /api 下接口生效
  if (!req.url.startsWith("/api")) {
    return next();
  }

  // 白名单内的接口直接放行
  if (whiteList.includes(req.url)) {
    return next();
  }

  const secret = global.auth.secret;
  let token = null;

  // 从 Authorization Header 提取 token
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }

  // 如果 Header 中没有，尝试从 Cookie 中提取
  if (!token && req.cookies?.access_token) {
    token = req.cookies.access_token;
  }

  // 没有 token，拒绝访问
  if (!token) {
    return res.status(401).json({
      ok: false,
      err: "Access denied",
    });
  }

  try {
    // 验证 JWT 签名和有效期
    const payload = jwt.verify(token, secret);

    // 检查 token 是否存在于服务端的 tokenMap 中
    if (!global.auth.tokenMap.has(token)) {
      return res.status(401).json({ ok: false, err: "Token invalid" });
    }

    const username = global.auth.tokenMap.get(token);

    // 安全地解析 user cookie
    let cookieUser;
    try {
      cookieUser = typeof req.cookies?.user === 'string'
        ? JSON.parse(req.cookies.user)
        : req.cookies?.user;
    } catch (parseError) {
      return res.status(401).json({ ok: false, err: "Invalid user cookie format" });
    }

    // 校验 cookie 中的 token 和 userInfo 是否与服务端 tokenMap 一致
    // 防止客户端篡改 cookie 冒充其他用户
    if (
      !cookieUser ||
      cookieUser.token !== token ||
      cookieUser.userInfo !== username
    ) {
      return res.status(401).json({ ok: false, err: "Cookie mismatch" });
    }

    // 校验全部通过，挂载用户信息
    req.user = payload;
    next();

  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ ok: false, err: "Token expired" });
    }
    return res.status(401).json({ ok: false, err: "Token invalid" });
  }
}

export default authMiddleware;