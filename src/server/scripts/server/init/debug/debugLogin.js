import global from "../../../../global.js";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import { issueDeveloperToken } from "../../utils/auth.js";

export default async (req, res) => {
  const payload = issueDeveloperToken();
  const html = (
    await fs.readFile(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "./login.html"),
      "utf-8",
    )
  ).replaceAll("${payload.token}", payload.token);

  res.status(200).type("html");
  return res.send(html);
};
