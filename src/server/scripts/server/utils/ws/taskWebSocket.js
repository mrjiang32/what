// src/server/ws/TaskWebSocket.js
import { WebSocketServer, WebSocket } from "ws";
import TaskManager from "../runModule/manager/taskManager.js";
import global from "../../../../global.js";

class TaskWebSocket {
  constructor(server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });
    // Map<ws, { taskId: string | null }>
    this.clients = new Map();

    // ✅ 只注册一次回调，避免每次连接都覆盖
    TaskManager.addOnMessage((tId, msg) => {
      for (const [clientWs, info] of this.clients) {
        if (clientWs.readyState === WebSocket.OPEN && info.taskId === tId) {
          clientWs.send(JSON.stringify(msg));

          // 如果是任务结束/停止/出错等终态消息，服务器主动关闭连接
          try {
            const finishTypes = new Set(["finish", "finished", "done", "stopped", "error", "completed"]);
            if (msg && typeof msg.type === "string" && finishTypes.has(msg.type)) {
              // 给发送留点时间再关闭连接，避免消息被截断
              setTimeout(() => {
                if (clientWs.readyState === WebSocket.OPEN) {
                  clientWs.close(1000, "task finished");
                }
              }, 50);
            }
          } catch (e) {
            // ignore
          }
        }
      }
    });

    this.wss.on("connection", (ws, req) => {
      const url = new URL(
        req.url,
        `http://${global.config.server.host}:${global.config.server.port}`,
      );
      const taskId = url.searchParams.get("taskId");

      if (taskId) {
        this.clients.set(ws, { taskId });

        // ✅ 连接建立后，立即补发缓冲日志
        const bufferedLogs = TaskManager.getBufferedLogs(taskId);
        console.log(
          `[WS] taskId=${taskId}, 缓冲日志数=${bufferedLogs.length}`,
        );

        if (bufferedLogs.length > 0) {
          ws.send(
            JSON.stringify({
              type: "history",
              count: bufferedLogs.length,
              logs: bufferedLogs,
            }),
          );
        }

        // 如果任务存在，通知客户端
        const task = TaskManager.get(taskId);
        if (task) {
          ws.send(JSON.stringify({ type: "task_exists", taskId }));
        }
      }

      // 客户端消息处理
      ws.on("message", (raw) => {
        let msg;
        try {
          msg = JSON.parse(raw);
        } catch {
          ws.send(
            JSON.stringify({
              type: "error",
              error: { message: "Invalid JSON" },
            }),
          );
          return;
        }

        if (msg.type === "stop") {
          const targetId = msg.taskId || taskId;
          if (targetId) {
            TaskManager.terminate(targetId, new Error("用户主动终止"));
            ws.send(JSON.stringify({ type: "stopped", taskId: targetId }));
          }
        } else if (msg.type === "subscribe") {
          // 客户端切换订阅某个 taskId
          this.clients.set(ws, { taskId: msg.taskId });

          // ✅ 切换订阅时，补发新任务的缓冲日志
          const logs = TaskManager.getBufferedLogs(msg.taskId);
          if (logs.length > 0) {
            ws.send(
              JSON.stringify({
                type: "history",
                count: logs.length,
                logs,
              }),
            );
          }

          ws.send(JSON.stringify({ type: "subscribed", taskId: msg.taskId }));
        }
      });

      ws.on("close", () => {
        this.clients.delete(ws);
      });
    });
  }

  // 获取所有运行中的任务信息
  getRunningTasks() {
    return TaskManager.list();
  }
}

export default TaskWebSocket;
