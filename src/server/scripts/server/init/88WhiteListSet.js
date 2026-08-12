import global from "../../../global.js";

export default () => {
  if (Array.isArray(global.whiteList)) {
    global.whiteList = [...global.whiteList, "/api/auth/login"];
  } else {
    global.whiteList = ["/api/auth/login"];
  }
};
