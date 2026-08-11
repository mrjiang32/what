import { FileSource } from "../source/File.source.mjs";
import { JSONSource } from "../source/JSON.source.mjs";
import { CodeSource } from "../source/Code.source.mjs";
import { global } from "../../global.js";

export default [
  {
    dir: "./server/init",
    source: CodeSource,
    exts: [".mjs", ".js"],
  },
  {
    dir: "./server/stop",
    source: CodeSource,
    exts: [".mjs", ".js"],
  }
];
