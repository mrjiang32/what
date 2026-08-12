import { bus } from "../../../global/utils/SafeEventEmitter.js";

export default (req, res, next) => {
  // 每个请求单独定义回调
  const onGlobalAbort = () => {
    res.locals.aborted = true;
  };

  // 注册全局事件
  bus.on("abort", onGlobalAbort);

  // 请求关闭（无论成功、断开、报错），移除监听，防止内存泄漏
  const cleanUp = () => {
    bus.removeListener("abort", onGlobalAbort);
  };

  // http 请求生命周期结束触发清理
  req.on("close", cleanUp);

  next();
};
