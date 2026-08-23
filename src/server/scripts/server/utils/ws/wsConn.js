// ✅ 正确写法
import { WebSocket } from "ws";

let taskId = "010f436d-36e1-4d28-89de-0902281a4fff";
const ws = new WebSocket(`ws://localhost:3000/ws?taskId=${taskId}`);

// ✅ 加上 error 事件，错误就不会被吞掉
ws.on("error", (err) => {
  console.error("❌ 连接错误:", err.message);
});

ws.on("open", () => {
  console.log("✅ WebSocket 连接已建立");
});

ws.on("message", (raw) => {
  const msg = JSON.parse(raw.toString());
  console.log("📨 收到:", msg.type, msg);
});

ws.on("close", (code, reason) => {
  console.log(`🔌 连接已关闭 (code=${code}, reason=${reason})`);
});