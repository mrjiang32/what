import BaseModuleLoader from "./BaseModuleLoader.js";
import utils from "../../utils/utils.js";
import vm from "vm";

export default class VmScriptLoader extends BaseModuleLoader {
  async _loadFileImpl(spath) {
    const source = await utils.jsSimpleR(spath);
    const sandbox = {
      $ACTION: null,
      $DISPOSE: null,
      console,
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      ...this.injectTools,
    };
    const ctx = vm.createContext(sandbox);
    vm.runInContext(source, ctx, {
      filename: spath,
      displayErrors: true,
    });
    if (typeof sandbox.$ACTION !== "function") {
      throw new Error("Action脚本未定义 $ACTION");
    }
    return sandbox;
  }
}
