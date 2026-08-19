import fs from "fs/promises";
import path from "path";

/**
 * 核心安全校验：防止目录遍历攻击
 */
function assertSafePath(targetPath, allowedRoot) {
  if (typeof targetPath !== "string" && !Buffer.isBuffer(targetPath)) {
    throw new TypeError("Path must be a string or Buffer");
  }
  const resolved = path.resolve(allowedRoot, targetPath.toString());
  // 确保解析后的路径在 allowedRoot 内部（处理了 /../ 等穿越情况）
  if (
    !resolved.startsWith(allowedRoot + path.sep) &&
    resolved !== allowedRoot
  ) {
    throw new Error(
      `[SecurityError] Access denied: Path traversal detected outside allowed root.`,
    );
  }
  return resolved;
}

/**
 * 创建受控的 fs 门面（Facade）
 * @param {string} allowedRoot - 允许访问的绝对路径根目录
 */
export function createSecureFsFacade(allowedRoot) {
  return {
    "fs.read": {
      fs: {
        async readFile(filePath, options) {
          const safePath = assertSafePath(filePath, allowedRoot);
          return fs.readFile(safePath, options);
        },

        async stat(filePath) {
          const safePath = assertSafePath(filePath, allowedRoot);
          return fs.stat(safePath);
        },

        async lstat(filePath) {
          const safePath = assertSafePath(filePath, allowedRoot);
          return fs.lstat(safePath);
        },

        async access(filePath, mode) {
          const safePath = assertSafePath(filePath, allowedRoot);
          return fs.access(safePath, mode);
        },

        async readdir(dirPath, options) {
          const safePath = assertSafePath(dirPath, allowedRoot);
          return fs.readdir(safePath, options);
        },
      },
    },
    "fs.write": {
      fs: {
        async writeFile(filePath, data, options) {
          const safePath = assertSafePath(filePath, allowedRoot);
          return fs.writeFile(safePath, data, options);
        },

        async appendFile(filePath, data, options) {
          const safePath = assertSafePath(filePath, allowedRoot);
          return fs.appendFile(safePath, data, options);
        },

        async unlink(filePath) {
          const safePath = assertSafePath(filePath, allowedRoot);
          return fs.unlink(safePath);
        },

        async rename(oldPath, newPath) {
          const safeOld = assertSafePath(oldPath, allowedRoot);
          const safeNew = assertSafePath(newPath, allowedRoot);
          return fs.rename(safeOld, safeNew);
        },

        async copyFile(src, dest, mode) {
          const safeSrc = assertSafePath(src, allowedRoot);
          const safeDest = assertSafePath(dest, allowedRoot);
          return fs.copyFile(safeSrc, safeDest, mode);
        },

        async mkdir(dirPath, options) {
          const safePath = assertSafePath(dirPath, allowedRoot);
          return fs.mkdir(safePath, options);
        },

        async rmdir(dirPath, options) {
          const safePath = assertSafePath(dirPath, allowedRoot);
          return fs.rmdir(safePath, options);
        },

        async rm(targetPath, options) {
          const safePath = assertSafePath(targetPath, allowedRoot);
          return fs.rm(safePath, options);
        },
      },
    },
  };
}
