import global from "../../../global.js";

export default () => {
  return [
    {
      path: "/api",
      method: "GET",
      handler: (req, res) => {
        res.json({
          running: true,
          uptime: Date.now() - global.startTime,
          ok: true,
        });
      },
    },
  ];
};
