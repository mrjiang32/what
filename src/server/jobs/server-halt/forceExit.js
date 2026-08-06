export default {
  forceExit: {
    type: "stopParallel",
    job: async (ctx) => {
      await ctx.abort.emitSafe("close");
      setTimeout(()=>{
        console.warn("超时未关闭，强制退出进程");
        process.exit(0);
      }, 2000);
    },
    allowContext: true,
    priority: 999,
  },
}