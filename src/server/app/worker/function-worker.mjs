import { parentPort, workerData } from "node:worker_threads";
import { pathToFileURL } from "node:url";

try {
  const module = await import(pathToFileURL(workerData.modulePath));
  const handler = module[workerData.exportName];
  if (typeof handler !== "function") {
    throw new Error(`登记的导出不是函数：${workerData.exportName}`);
  }
  const value = await handler(workerData.params);
  parentPort.postMessage({ type: "result", value });
} catch (error) {
  parentPort.postMessage({ type: "error", error: error.message });
}