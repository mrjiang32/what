// src/server/ws/TaskWebSocket.js
import { WebSocketServer, WebSocket } from "ws";
import TaskManager from "../runModule/manager/taskManager.js";
import global from "../../../../global.js";
import { v4 as uuidv4 } from "uuid";

class TaskWebSocket {
  constructor(server) {
    this.wss = new WebSocketServer({ server, path: "/ws" });
    // Map<ws, { taskId: string | null }>
    this.clients = new Map();

    this.wss.on("connection", (ws, req) => {
      const url = new URL(req.url,`${global.config.server.host}:${global.config.server.port}`);
      const taskId = url.searchParams.get("taskId");

      this.clients.set(ws, { taskId });

      // 注册 TaskManager 的消息回调
      TaskManager.setOnMessage((tId, msg) => {
        // 找到对应 taskId 的 WebSocket 连接并推送
        for (const [clientWs, info] of this.clients) {
          if (clientWs.readyState === WebSocket.OPEN && info.taskId === tId) {
            clientWs.send(JSON.stringify(msg));
          }
        }
      });

      // 客户端消息处理
      ws.on("message", (raw) => {
        let msg;
        try {
          msg = JSON.parse(raw);
        } catch {
          ws.send(JSON.stringify({ type: "error", error: { message: "Invalid JSON" } }));
          return;
        }

        if (msg.type === "stop") {
          const targetId = msg.taskId || taskId;
          if (targetId) {
            TaskManager.terminate(targetId, new Error("用户主动终止"));
            ws.send(JSON.stringify({ type: "stopped", taskId: targetId }));
          }
        } else if (msg.type === "subscribe") {
          // 客户端订阅某个 taskId
          this.clients.set(ws, { taskId: msg.taskId });
          ws.send(JSON.stringify({ type: "subscribed", taskId: msg.taskId }));
        }
      });

      ws.on("close", () => {
        this.clients.delete(ws);
      });

      // 如果连接时带了 taskId，立即推送当前状态
      if (taskId) {
        const task = TaskManager.get(taskId);
        if (task) {
          ws.send(JSON.stringify({ type: "task_exists", taskId }));
        }
      }
    });
  }

  // 获取所有运行中的任务信息
  getRunningTasks() {
    return TaskManager.list();
  }
}

export default TaskWebSocket;