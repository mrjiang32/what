"use strict";

const { Service } = require("egg");
const jwt = require("jsonwebtoken");

class AuthService extends Service {
  login(username, password) {
    const user = this.app.users[username];
    if (!user || !this.ctx.service.config.verifyPassword(password, user)) {
      throw new Error("用户名或密码错误");
    }

    for (const [token, tokenUser] of this.app.tokenMap) {
      if (tokenUser === username) this.app.tokenMap.delete(token);
    }

    const token = jwt.sign(
      { id: username, role: user.role || "default" },
      this.app.runtimeConfig.secret,
      { expiresIn: "2h" },
    );
    this.app.tokenMap.set(token, username);
    return { token, username };
  }

  logout() {
    const token = this.ctx.state.token;
    if (!token || !this.app.tokenMap.has(token)) throw new Error("未登录");
    this.app.tokenMap.delete(token);
    return true;
  }
}

module.exports = AuthService;