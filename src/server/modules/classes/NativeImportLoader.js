import BaseModuleLoader from "./BaseModuleLoader.js";
import { pathToFileURL } from "url";

export default class NativeImportLoader extends BaseModuleLoader {
  async _loadFileImpl(spath) {
    const url = pathToFileURL(spath);
    return await import(url.href);
  }
}