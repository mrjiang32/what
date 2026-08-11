import globalenv from "../../global/globalenv.js";

export default {
  whiteList: {
    type: "init",
    job: () => {
      if (Array.isArray(globalenv.whiteList)) {
        globalenv.whiteList = [
          ...globalenv.whiteList,
          "/api/auth/login", // 获取token登录接口
        ];
      } else {
        globalenv.whiteList = ["/api/auth/login"];
      } // 获取token登录接口
    },
  },
};
