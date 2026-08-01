import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.resolve(__dirname, "config.json");

function readConfigFile({ configpath } = { configpath: CONFIG_PATH }) {
  try {
    const raw = fs.readFileSync(configpath, "utf8");
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    if (err.code === "ENOENT") {
      return {};
    }
    throw err;
  }
}

function writeConfigFile(cfg, { configpath } = { configpath: CONFIG_PATH }) {
  const configDir = path.dirname(configpath);
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  fs.writeFileSync(configpath, JSON.stringify(cfg, null, 2), "utf8");
}

async function readConfigFileAsync(
  { configpath } = { configpath: CONFIG_PATH },
) {
  try {
    const raw = await fs.promises.readFile(configpath, "utf8");
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    if (err.code === "ENOENT") {
      return {};
    }
    throw err;
  }
}

async function writeConfigFileAsync(
  cfg,
  { configpath } = { configpath: CONFIG_PATH },
) {
  const configDir = path.dirname(configpath);
  await fs.promises.mkdir(configDir, { recursive: true });
  await fs.promises.writeFile(configpath, JSON.stringify(cfg, null, 2), "utf8");
}

// The DEFAULT config of it
const configData = Object.freeze({
  server: {
    port: 3000,
    host: "0.0.0.0",
  },
  createdDate: Date.now(),
  eula: false,
  logLevel: "info",
});

// Read config.
function readConfig() {
  const cfg = readConfigFile();

  // merge with default config
  const mergedcfg = { ...configData, ...cfg };
  // then write back to config file
  writeConfigFile(mergedcfg);
  return mergedcfg;
}

function saveConfig(cfg) {
  // merge with default config
  const mergedcfg = { ...configData, ...cfg };
  // then write back to config file
  writeConfigFile(mergedcfg);
  return mergedcfg;
}

async function readConfigAsync() {
  const cfg = await readConfigFileAsync();
  const mergedcfg = { ...configData, ...cfg };
  await writeConfigFileAsync(mergedcfg);
  return mergedcfg;
}

async function saveConfigAsync(cfg) {
  const mergedcfg = { ...configData, ...cfg };
  await writeConfigFileAsync(mergedcfg);
  return mergedcfg;
}

export default Object.freeze({
  readConfig,
  saveConfig,
  readConfigAsync,
  saveConfigAsync,
  configFilePath: CONFIG_PATH,
  defaultConfig: configData,
});
