import { pathToFileURL } from "url";

process.on("message", async (msg) => {
  try {
    const { absPath, params } = msg;
    const url = pathToFileURL(absPath);
    // 子进程导入目标脚本
    const mod = await import(url.href);
    const fn = mod.default;
    if(typeof fn !== "function") throw new Error("信任脚本必须 export default async function(params){...}");
    const result = await fn(params);
    process.send({ type: "result", payload: result });
  } catch(err){
    process.send({
      type: "error",
      payload: { message: err.message, stack: err.stack }
    });
  }
});