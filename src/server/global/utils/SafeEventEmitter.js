import { EventEmitter } from "events";
import { Logger } from "./Logger.mjs";

const busLog = new Logger("SEventEmitter");

export class SafeEventEmitter extends EventEmitter {
  /**
   * 安全串行触发事件
   * 等待全部异步监听执行完成；单个报错不阻断其他任务
   * @param {string} eventName
   * @param  {...any} args 传给监听函数的参数
   * @returns {Promise<void>}
   */
  async emitSafe(eventName, ...args) {
    busLog.debug(`[串行] 触发事件：${eventName}`);
    const listeners = this.listeners(eventName);

    for (const fn of listeners) {
      try {
        await fn(...args);
      } catch (err) {
        busLog.error(
          `事件[${eventName}] 执行异常：`,
          err instanceof Error ? err.stack : err,
        );
      }
    }
  }

  /**
   * 安全并行触发事件
   * 所有监听同时执行，统一等待全部结束
   * @param {string} eventName
   * @param  {...any} args
   * @returns {Promise<void>}
   */
  async emitSafeParallel(eventName, ...args) {
    busLog.debug(`[并行] 触发事件：${eventName}`);
    const listeners = this.listeners(eventName);

    await Promise.all(
      listeners.map(async (fn) => {
        try {
          await fn(...args);
        } catch (err) {
          busLog.error(`并行事件[${eventName}] 执行异常：`, err);
        }
      }),
    );
  }
}

// 全局单例导出
export const bus = new SafeEventEmitter();
bus.setMaxListeners(100);
export default SafeEventEmitter;
