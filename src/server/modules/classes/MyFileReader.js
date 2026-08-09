// MyFileReader.js
import fs from "fs/promises";
import path from "path";

export class MyFileReader {
  /**
   * 两种构造方式二选一：
   * 1. new MyFileReader(absolutePath) 直接传入绝对路径
   * 2. new MyFileReader(baseDir, relPath) 根目录 + 相对路径（会自动拼接+防越界）
   * @param {string} arg1 absolutePath 或者 baseDir
   * @param {string} [arg2] relPath
   */
  constructor(arg1, arg2) {
    if (arg2 === undefined) {
      // 模式1：直接传入完整绝对路径
      this.filePath = arg1;
    } else {
      // 模式2：baseDir + relPath
      const base = path.resolve(arg1);
      const resolved = path.resolve(base, arg2);
      // 【唯一一处路径逃逸断言，底层做一次，上层全部不用写】
      if (!resolved.startsWith(base)) {
        throw new Error(`[MyFileReader]路径越界: relPath=${arg2}, base=${base}`);
      }
      this.filePath = resolved;
    }
  }

  /** 读取原始文本 */
  async read() {
    return await fs.readFile(this.filePath, "utf-8");
  }

  /** 读并且parse json */
  async readJson() {
    const text = await this.read();
    return JSON.parse(text);
  }

  /** 写入原始文本 */
  async write(content) {
    await fs.writeFile(this.filePath, content, "utf-8");
  }

  /** 序列化并写入json */
  async writeJson(object) {
    await this.write(JSON.stringify(object, null, 2));
  }
}