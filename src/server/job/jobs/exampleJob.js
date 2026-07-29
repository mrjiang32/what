export default {
  exampleJob: {
    type: "init",
    allowContext: false,
    // digitalCredit:
    job: () => {
      console.log("exampleJob is running");
    },
    priority: 100,
  },
  exampleJob2: {
    type: "init",
    allowContext: false,
    // digitalCredit:
    job: () => {
      console.log("exampleJob2 is running");
    },
    priority: 1,
  },
};
