import globalenv from "../../global/globalenv.js";
import jwt from "jsonwebtoken";
import {
  verifyPassword,
  hashPassword,
  generateSalt,
} from "../../utils/passwd.js";

// ========== 通用工具函数 ==========
/** 从请求头提取 Bearer Token */
function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Invalid authorization header");
  }
  return authHeader.split(" ")[1];
}

/** 断言值存在，否则抛出错误 */
function assertExists(value, message) {
  if (!value) throw new Error(message);
}

/** 校验密码基础格式 */
function validatePassword(password, label = "Password") {
  assertExists(password, `${label} not found`);
  if (password.length < 8)
    throw new Error(`${label} length must be at least 8`);
  if (password.includes(" ")) throw new Error(`${label} cannot contain space`);
}

/** 断言两次密码一致 */
function assertPasswordMatch(pwd1, pwd2, message = "Passwords do not match") {
  if (pwd1 !== pwd2) throw new Error(message);
}

// ========== Token 签发核心逻辑 ==========
/** 校验用户名密码并签发 Token */
function signAccessToken(user) {
  assertExists(user.username, "User `username` property not found");
  assertExists(user.password, "User `password` property not found");

  const userConfig = globalenv.config.users[user.username];
  if (!userConfig) throw new Error("Password or username not match");

  const isValid = verifyPassword(
    user.password,
    userConfig.salt,
    userConfig.shadow,
  );
  if (!isValid) throw new Error("Password or username not match");

  return jwt.sign({ id: user.username, role: "default" }, globalenv.secret, {
    expiresIn: "2h",
  });
}

/** 刷新 Token（无需密码，仅校验 Token 存在性） */
function refreshAccessToken(username) {
  return jwt.sign({ id: username, role: "default" }, globalenv.secret, {
    expiresIn: "2h",
  });
}

// ========== 路由导出 ==========
export default {
  generate: () => {
    return [
      // 登录
      {
        path: "/api/auth/login",
        method: "POST",
        handler: (req, res) => {
          try {
            const token = signAccessToken(req.body);
            globalenv.tokenMap.set(token, req.body.username);
            globalenv.log.info(`用户 ${req.body.username} 登录成功`);
            res.status(200).json({ ok: true, token, username: req.body.username });
          } catch (error) {
            res.status(400).json({ ok: false, error: error.message });
          }
        },
      },

      // Token 校验
      {
        path: "/api/auth/validate",
        method: "GET",
        handler: (req, res) => {
          try {
            const token = extractToken(req);
            const username = globalenv.tokenMap.get(token);
            if (!username) {
              return res
                .status(401)
                .json({ ok: false, error: "Invalid token" });
            }
            // ✅ 校验通过，返回用户信息
            res.status(200).json({
              ok: true,
              user: { username },
            });
          } catch (error) {
            res.status(401).json({ ok: false, error: "Unauthorized" });
          }
        },
      },

      // 登出
      {
        path: "/api/auth/logout",
        method: "POST",
        handler: (req, res) => {
          try {
            const token = extractToken(req);
            const username = globalenv.tokenMap.get(token);
            if (!username) {
              return res
                .status(400)
                .json({ ok: false, error: "Token not found" });
            }
            globalenv.tokenMap.delete(token);
            globalenv.log.info(`用户 ${username} 登出成功`);
            res.status(200).json({ ok: true });
          } catch (error) {
            res.status(400).json({ ok: false, error: error.message });
          }
        },
      },

      // 刷新 Token
      {
        path: "/api/auth/refresh",
        method: "POST",
        handler: (req, res) => {
          try {
            const token = extractToken(req);
            const username = globalenv.tokenMap.get(token);
            if (!username) {
              return res
                .status(400)
                .json({ ok: false, error: "Token not found" });
            }
            const newToken = refreshAccessToken(username);
            globalenv.tokenMap.delete(token);
            globalenv.tokenMap.set(newToken, username);
            globalenv.log.info(`用户 ${username} 刷新令牌`);
            res.status(200).json({ ok: true, token: newToken });
          } catch (error) {
            res.status(400).json({ ok: false, error: error.message });
          }
        },
      },

      // 修改密码
      {
        path: "/api/auth/change-password",
        method: "POST",
        handler: (req, res) => {
          try {
            const token = extractToken(req);
            const username = globalenv.tokenMap.get(token);
            assertExists(username, "User not found");

            const { password, newPassword, confirmPassword } = req.body;
            assertExists(password, "Password not found");
            validatePassword(newPassword, "New password");
            assertExists(confirmPassword, "Confirm password not found");
            assertPasswordMatch(
              newPassword,
              confirmPassword,
              "New password and confirm password not match",
            );

            if (newPassword === password) {
              throw new Error(
                "New password cannot be the same as old password",
              );
            }

            // 校验原密码
            const userConfig = globalenv.config.users[username];
            const isOldValid = verifyPassword(
              password,
              userConfig.salt,
              userConfig.shadow,
            );
            if (!isOldValid) throw new Error("Old password is incorrect");

            // 更新密码
            const newSalt = generateSalt();
            userConfig.salt = newSalt;
            userConfig.shadow = hashPassword(newPassword, newSalt);
            delete userConfig.defaultPassword;

            globalenv.log.info(`用户 ${username} 修改密码成功`);
            res.status(200).json({ ok: true });
          } catch (err) {
            res.status(400).json({ ok: false, error: err.message });
          }
        },
      },

      // 新建用户
      {
        path: "/api/auth/new-user",
        method: "POST",
        handler: (req, res) => {
          try {
            const { username, password, confirmPassword } = req.body;
            assertExists(username, "Username not found");
            validatePassword(password);
            assertExists(confirmPassword, "Confirm password not found");
            assertPasswordMatch(
              password,
              confirmPassword,
              "Password and confirm password not match",
            );

            if (globalenv.config.users[username]) {
              throw new Error("Username already exists");
            }

            const salt = generateSalt();
            const shadow = hashPassword(password, salt);
            globalenv.config.users[username] = { salt, shadow };

            globalenv.log.info(`创建新用户: ${username}`);
            res.status(200).json({ ok: true });
          } catch (err) {
            res.status(400).json({ ok: false, error: err.message });
          }
        },
      },
    ];
  },
};
