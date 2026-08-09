import path from "path";
import { fileURLToPath } from "url";

export default {
  dir: {
    url: import.meta.url,
    path: fileURLToPath(import.meta.url),
    subdirs: [], // will be added after scan
  },
};
