import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// 鉴权中间件
function authMiddleware(req, res, next) {
  if (req.url !== "/api/token") {
    const secret = req.$ctx.secret;
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ msg: "未登录" });
    try {
      const payload = jwt.verify(token, secret);
      req.user = payload;
    } catch (e) {
      return res.status(401).json({ msg: "token无效" });
    }
  }
  next();
}

export default {
  jwt: {
    type: "expressMiddleWare",
    job: authMiddleware,
    priority: 100,
  },
};
