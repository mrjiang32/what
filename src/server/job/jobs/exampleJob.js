export default {
  exampleJob: {
    type: "init",
    allowContext: false,
    // digitalCredit:
    job: () => {
      console.log("exampleJob is running");
    },
    priority: 0,
  },
};
