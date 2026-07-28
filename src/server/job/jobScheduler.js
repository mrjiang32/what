import logger from "../utils/logger.js";

const schedulerLog = logger.newLogger("Timer Job");

export class JobScheduler {
  constructor() {
    // 存储所有定时任务：key=jobKey, value={timerId, config}
    this.timerMap = new Map();
    // 全局上下文，传给所有任务
    this.globalCtx = {
      log: schedulerLog,
    };
  }

  // 启动全部定时任务
  startAllTimerJobs(jobList) {
    // 过滤出type=timer的任务
    const timerJobs = Object.entries(jobList).filter(
      ([_, item]) => item.type === "timer"
    );

    for (const [jobKey, config] of timerJobs) {
      this.startSingleTimer(jobKey, config);
    }
    schedulerLog.info(`已加载并启动 ${timerJobs.length} 个定时任务`);
  }

  // 启动单个定时任务
  startSingleTimer(jobKey, config) {
    const { interval, job, allowContext } = config;

    // 基础拦截：禁止间隔<=0
    if (interval <= 0) {
      schedulerLog.error(`定时任务[${jobKey}]间隔配置非法：${interval}ms，跳过启动`);
      return;
    }

    // 避免重复启动
    if (this.timerMap.has(jobKey)) {
      schedulerLog.warn(`定时任务[${jobKey}]已存在，重启定时器`);
      clearInterval(this.timerMap.get(jobKey).timerId);
    }

    // 构建执行包装函数
    const runTask = async () => {
      try {
        // 传入上下文
        const ctx = allowContext ? this.globalCtx : null;
        await job(ctx);
      } catch (err) {
        schedulerLog.error(`定时任务[${jobKey}]执行异常：`, err.message);
      }
    };

    // 立即执行一次（可选，不需要则删除此行）
    runTask();

    // 创建定时器
    const timerId = setInterval(runTask, interval);
    this.timerMap.set(jobKey, { timerId, config });
    schedulerLog.debug(`定时任务[${jobKey}]启动成功，执行间隔：${interval}ms`);
  }

  // 停止单个定时任务
  stopSingleTimer(jobKey) {
    if (!this.timerMap.has(jobKey)) return false;
    const { timerId } = this.timerMap.get(jobKey);
    clearInterval(timerId);
    this.timerMap.delete(jobKey);
    schedulerLog.info(`定时任务[${jobKey}]已停止`);
    return true;
  }

  // 全局停止所有定时任务（程序退出/停机时调用）
  stopAllTimers() {
    let stopCount = 0;
    for (const [key] of this.timerMap) {
      this.stopSingleTimer(key);
      stopCount++;
    }
    schedulerLog.info(`全局停止全部定时任务，共${stopCount}个`);
  }
}