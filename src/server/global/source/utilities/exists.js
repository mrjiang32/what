import fs from "fs/promises";

export async function exists(path, mode) {
  try {
    await fs.access(path, mode);
    return true;
  } catch {
    return false;
  }
}

export async function makeSureExists(path) {
  let existsdir = await exists(path, fs.constants.R_OK);
  if (!existsdir) {
    await fs.mkdir(path, { recursive: true });
  }
  return existsdir;
}
