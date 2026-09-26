"use strict";

const jwt = require("jsonwebtoken");

module.exports = () => async (ctx, next) => {
  const authorization = ctx.get("authorization");
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : ctx.cookies.get("access_token");

  if (token && ctx.app.runtimeConfig?.secret) {
    try {
      const user = jwt.verify(token, ctx.app.runtimeConfig.secret);
      if (ctx.app.tokenMap.has(token)) {
        ctx.state.user = user;
        ctx.state.token = token;
      }
    } catch {
      ctx.state.user = null;
    }
  }

  await next();
};