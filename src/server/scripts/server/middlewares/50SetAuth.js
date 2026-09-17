import jwt from "jsonwebtoken";
import global from "../../../global.js";
import { getAuthSecret, getUsernameByToken, hasToken } from "../utils/auth.js";

function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  if (req.cookies?.access_token) {
    return req.cookies.access_token;
  }
  return null;
}

function getGraphqlQuery(req) {
  const body = req.body;
  if (typeof body === "string") {
    return body;
  }
  if (body && typeof body === "object") {
    return typeof body.query === "string" ? body.query : "";
  }
  return typeof req.query?.query === "string" ? req.query.query : "";
}

function requireGraphqlAdmin(req) {
  if (!req.originalUrl?.startsWith("/graphql") && !req.url?.startsWith("/graphql")) {
    return false;
  }

  const query = getGraphqlQuery(req);
  if (!query) {
    return false;
  }

  return /(?:\brequestSudo\b|\bvalidateSudo\b)/.test(query);
}

function authMiddleware(req, res, next) {
  const whiteList = Array.isArray(global.whiteList) ? global.whiteList : [];
  const requestPath = (req.originalUrl || req.url || "").split("?")[0];

  if (global.args?.["no-auth"]) {
    req.user = { ...(req.user || {}), id: "admin", role: "admin" };
    return next();
  }

  if (whiteList.includes(requestPath)) {
    return next();
  }

  const secret = getAuthSecret();
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ ok: false, err: "Access denied" });
  }

  try {
    const payload = jwt.verify(token, secret);

    if (!hasToken(token)) {
      return res.status(401).json({ ok: false, err: "Token invalid" });
    }

    const username = getUsernameByToken(token);

    let cookieUser;
    try {
      cookieUser = typeof req.cookies?.user === "string"
        ? JSON.parse(req.cookies.user)
        : req.cookies?.user;
    } catch {
      return res.status(401).json({ ok: false, err: "Invalid user cookie format" });
    }

    if (req.cookies && Object.prototype.hasOwnProperty.call(req.cookies, "user")) {
      if (!cookieUser || cookieUser.token !== token || cookieUser.userInfo !== username) {
        return res.status(401).json({ ok: false, err: "Cookie mismatch" });
      }
    }

    if (requireGraphqlAdmin(req) && payload.role !== "admin") {
      return res.status(403).json({ ok: false, err: "Forbidden" });
    }

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