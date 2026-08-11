import path from "path";
import { fileURLToPath } from "url";
import { assertScanFileConfig } from "../Configs/ScanFileConfig.mjs";
import { FileSource } from "../../File.source.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distdir = path.join(__dirname, "../../../../../server/modules/init");

async function runTest() {
  console.log("=== Scanner 测试开始 ===");

  // 1. 构造原始配置（plain object）
  const rawConfig = {
    dirPath: distdir,
    exts: [".mjs", ".js"],
    dirBlackList: ["node_modules", ".git", "dist", "build"],
    maxDepth: 8,
  };

  try {
    console.log(distdir);
    const source = new FileSource(rawConfig);
    await source.getReady();
    console.log(await source.toIdArray());

    console.log(`\n总共找到 ${(await source.toIdArray()).length} 个文件`);
  } catch (err) {
    console.error("测试异常：", err.message);
    console.error("stack:", err.stack);
    if (err.cause) console.error("cause:", err.cause);
  }
}

// 测试非法配置分支（校验失败场景）
async function runBadConfigTest() {
  console.log("\n===== 非法配置测试 =====");
  const badConfig = {
    dirPath: "", // 非法：空字符串
    exts: "not‑array",
    dirBlackList: ["node_modules"],
    maxDepth: -5,
  };
  try {
    assertScanFileConfig(badConfig);
    console.error("本应该校验失败，但是通过了！");
  } catch (e) {
    console.log("非法配置正确抛出：", e.message);
  }
}

await runTest();
await runBadConfigTest();
