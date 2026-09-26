"use strict";

import { Service } from "egg";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const defaultConfig = {
  server: { port: 3000, host: "127.0.0.1" },
  createdDate: Date.now(),
  eula: true,
  logLevel: "info",
  secret: crypto.randomUUID(),
};

class ConfigService extends Service {
  async readJson(filePath, createValue) {
    try {
      return JSON.parse(await fs.readFile(filePath, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      if (createValue === undefined) throw error;
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, `${JSON.stringify(createValue, null, 2)}
`);
      return createValue;
    }
  }

  async load() {
    const configPath = path.join(this.app.baseDir, "config", "config.json");
    const usersPath = path.join(this.app.baseDir, "config", "users.json");
    const storedConfig = await this.readJson(configPath, defaultConfig);
    const runtimeConfig = {
      ...defaultConfig,
      ...storedConfig,
      server: { ...defaultConfig.server, ...(storedConfig?.server || {}) },
    };

    let users;
    let defaultAdmin = null;
    try {
      users = await this.readJson(usersPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      users = {};
    }

    if (!users || Object.keys(users).length === 0) {
      const defaultUsername = "admin";
      const defaultPassword = crypto.randomBytes(12).toString("hex");
      const salt = crypto.randomBytes(16).toString("base64");
      users = {
        [defaultUsername]: {
          role: "admin",
          salt,
          shadow: this.hashPassword(defaultPassword, salt),
          defaultPasswd: defaultPassword,
          createdAt: Date.now(),
        },
      };
      defaultAdmin = { username: defaultUsername, password: defaultPassword };
      await fs.mkdir(path.dirname(usersPath), { recursive: true });
      await fs.writeFile(usersPath, `${JSON.stringify(users, null, 2)}
`);

      const banner = [
        "",
        "========================================================",
        "DEFAULT ADMIN ACCOUNT GENERATED",
        `username: ${defaultUsername}`,
        `password: ${defaultPassword}`,
        "========================================================",
        "",
      ].join("\n");

      process.stderr.write(`${banner}\n`);
    }

    this.app.runtimeConfig = {
      ...runtimeConfig,
      defaultAdmin,
    };
    this.app.users = users;
    this.app.usersPath = usersPath;
  }

  hashPassword(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 9178, 32, "sha256").toString("base64");
  }

  verifyPassword(password, user) {
    if (typeof password !== "string" || !user?.salt || !user?.shadow) return false;
    const expected = Buffer.from(user.shadow);
    const actual = Buffer.from(this.hashPassword(password, user.salt));
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  }

  async saveUsers() {
    await fs.writeFile(this.app.usersPath, `${JSON.stringify(this.app.users, null, 2)}
`);
  }
}

export default ConfigService;
