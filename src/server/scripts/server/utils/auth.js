import jwt from "jsonwebtoken";
import global from "../../../global.js";
import fs from "fs/promises";
import moment from "moment";

export function getAuthSecret() {
  return global.auth.secret;
}

export function setAuthSecret(secret) {
  global.auth.secret = secret;
  return global.auth.secret;
}

export function clearUserTokens(username) {
  if (!username) return 0;

  let removed = 0;
  for (const [token, user] of global.auth.tokenMap.entries()) {
    if (user === username) {
      global.auth.tokenMap.delete(token);
      removed += 1;
    }
  }
  return removed;
}

export function registerToken(token, username) {
  if (!token || !username) return false;
  global.auth.tokenMap.set(token, username);
  return true;
}

export function revokeToken(token) {
  if (!token) return false;
  return global.auth.tokenMap.delete(token);
}

export function getUsernameByToken(token) {
  if (!token) return undefined;
  return global.auth.tokenMap.get(token);
}

export function hasToken(token) {
  if (!token) return false;
  return global.auth.tokenMap.has(token);
}

export function extractToken(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }
  if (req.cookies?.access_token) {
    return req.cookies.access_token;
  }
  return null;
}

export function requireToken(req) {
  const token = extractToken(req);
  if (!token) {
    throw new Error("Invalid authorization header");
  }
  return token;
}

export function requireUsernameByToken(req) {
  const token = requireToken(req);
  const username = getUsernameByToken(token);
  if (!username) {
    throw new Error("Token not found");
  }
  return { token, username };
}

export function assertExists(value, message) {
  if (!value) throw new Error(message);
}

export function validatePassword(password, label = "Password") {
  assertExists(password, `${label} not found`);
  if (password.length < 8)
    throw new Error(`${label} length must be at least 8`);
  if (password.includes(" ")) throw new Error(`${label} cannot contain space`);
}

export function assertPasswordMatch(
  password,
  confirmPassword,
  message = "Passwords do not match",
) {
  if (password !== confirmPassword) throw new Error(message);
}

export function issueJwtToken({ id, role, expiresIn = "2h" }) {
  if (!id || !role) {
    throw new Error("Token payload requires id and role");
  }

  const token = jwt.sign({ id, role }, getAuthSecret(), { expiresIn });
  registerToken(token, id);
  return token;
}

export function issueDeveloperToken({
  username = "developer",
  role = "admin",
  expiresIn = "1d",
} = {}) {
  clearUserTokens(username);
  const token = issueJwtToken({ id: username, role, expiresIn });
  return {
    ok: true,
    token,
    username,
    role,
    expiresIn,
    note: "Debug developer token",
  };
}

export function verifyToken(token) {
  if (!token) return null;
  const secret = getAuthSecret();
  if (!secret) return null;

  try {
    const payload = jwt.verify(token, secret);
    if (!hasToken(token)) return null;
    return payload;
  } catch {
    return null;
  }
}

// 定义一个统一的文件名生成函数，避免重复代码和拼写错误
const getTokenMapFilename = () =>
  `./.tokenMap.${moment().format("YYYYMMDD")}.tmp.json`;

export async function save() {
  if (global.auth.tokenMap) {
    const tokenObject = {};
    global.auth.tokenMap.forEach((value, key) => {
      tokenObject[key] = value;
    });

    const currentFileName = getTokenMapFilename();

    try {
      const files = await fs.readdir(".");
      const deletePromises = files
        .filter(
          (file) =>
            file.startsWith(".tokenMap.") &&
            file.endsWith(".tmp.json") &&
            file !== currentFileName, // 排除刚刚保存的新文件
        )
        .map((file) =>
          fs.unlink(file).catch((err) => {
            // 防止单个文件删除失败导致整个流程报错
            console.warn(
              `Failed to delete old token map file: ${file}`,
              err.message,
            );
          }),
        );
      await fs.writeFile(currentFileName, JSON.stringify(tokenObject), "utf-8");
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Error saving token map:", error);
    }
  }
}

export async function restore() {
  const currentFileName = getTokenMapFilename();
  try {
    const data = await fs.readFile(currentFileName, "utf-8");
    global.auth.tokenMap = new Map(Object.entries(JSON.parse(data)));
  } catch (error) {
    // 如果文件不存在或解析失败，初始化为空 Map，防止后续代码报错
    // console.log(error);
    global.auth.tokenMap = new Map();
  }
}
