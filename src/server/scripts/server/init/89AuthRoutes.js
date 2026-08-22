import global from "../../../global.js";
import config from "../utils/config.js";
import { signAccessToken, refreshAccessToken } from "./auth/authHelper.js";
import { verifyPassword, hashPassword, generateSalt } from "../utils/passwd.js";
import {
  assertExists,
  assertPasswordMatch,
  clearUserTokens,
  requireUsernameByToken,
  registerToken,
  revokeToken,
  validatePassword,
} from "../utils/auth.js";
import debugLogin from "./debug/debugLogin.js";

export default () => {
  const app = global.server.app;

  app.post("/auth/login", (req, res) => {
    try {
      const username = req.body?.username;
      const password = req.body?.password;

      if (!global.users[username]) {
        throw new Error("User does not exist.");
      }

      clearUserTokens(username);

      const token = signAccessToken({ username, password });
      registerToken(token, username);

      return res.status(200).json({ ok: true, token, username });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.get("/auth/validate", (req, res) => {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ ok: false, error: "Access denied" });
    }

    return res.status(200).json({
      ok: true,
      user: {
        username: user.id,
        role: user.role,
        exp: user.exp,
        iat: user.iat,
      },
    });
  });

  app.post("/auth/logout", (req, res) => {
    try {
      const { token, username } = requireUsernameByToken(req);
      revokeToken(token);
      return res.status(200).json({ ok: true, username });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.post("/auth/refresh", (req, res) => {
    try {
      const { token, username } = requireUsernameByToken(req);
      const newToken = refreshAccessToken(username);
      revokeToken(token);
      registerToken(newToken, username);
      return res.status(200).json({ ok: true, token: newToken });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.post("/auth/change-password", async (req, res) => {
    try {
      const { username } = requireUsernameByToken(req);

      const { password, newPassword, confirmPassword } = req.body ?? {};
      assertExists(password, "Password not found");
      validatePassword(newPassword, "New password");
      assertExists(confirmPassword, "Confirm password not found");
      assertPasswordMatch(
        newPassword,
        confirmPassword,
        "New password and confirm password not match",
      );

      if (newPassword === password) {
        throw new Error("New password cannot be the same as old password");
      }

      const userConfig = global.users[username];
      const isOldValid = verifyPassword(
        password,
        userConfig.salt,
        userConfig.shadow,
      );
      if (!isOldValid) {
        throw new Error("Old password is incorrect");
      }

      const newSalt = generateSalt();
      userConfig.salt = newSalt;
      userConfig.shadow = hashPassword(newPassword, newSalt);
      delete userConfig.defaultPasswd;
      await config.saveUsersAsync(global.users);
      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  });

  app.post("/auth/new-user", async (req, res) => {
    try {
      if (!global.config.allowNewUser) {
        throw new Error("Register is not allowed");
      }
      const { username, password, confirmPassword } = req.body ?? {};
      assertExists(username, "Username not found");
      validatePassword(password);
      assertExists(confirmPassword, "Confirm password not found");
      assertPasswordMatch(
        password,
        confirmPassword,
        "Password and confirm password not match",
      );

      if (global.users[username]) {
        throw new Error("Username already exists");
      }

      const salt = generateSalt();
      const shadow = hashPassword(password, salt);
      global.users[username] = { salt, shadow, role: "user" };
      await config.saveUsersAsync(global.users);
      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(400).json({ ok: false, error: error.message });
    }
  });

  if (global.args.debug) {
    app.get("/debug/login", debugLogin);
    global.logger.warn("开发者登录后门已挂载 (请不要暴露公网)");
    global.logger.warn("若要关闭开发者后门，请关闭debug模式");
  }
};
