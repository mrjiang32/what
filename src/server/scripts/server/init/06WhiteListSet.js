import global from "../../../global.js";

const systemWhiteList = ["/auth/login", "/"];

export default () => {
  const whitelist = Array.isArray(global.whiteList) ? [...global.whiteList] : [];

  for (const path of systemWhiteList) {
    if (!whitelist.includes(path)) {
      whitelist.push(path);
    }
  }

  if (global.args?.debug && !whitelist.includes("/debug/login")) {
    whitelist.push("/debug/login");
  }

  if (global.args?.debug && !whitelist.includes("/debug/graphql")) {
    whitelist.push("/debug/graphql");
  }

  global.whiteList = whitelist;
};
