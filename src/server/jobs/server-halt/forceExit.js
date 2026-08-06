import globalenv from "../../global/globalenv.js";

export default {
  forceExit: {
    type: "stopParallel",
    job: async () => {
      await globalenv.abort.emitSafe("close");
      setTimeout(()=>{
        globalenv.log.warn("超时未关闭，强制退出进程");
        process.exit(0);
      }, 2000);
    },
    priority: 999,
  },
}