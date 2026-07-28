import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.resolve(__dirname, "config.json");

function readConfigFile() {
    try {
        const raw = fs.readFileSync(CONFIG_PATH, "utf8");
        return raw ? JSON.parse(raw) : {};
    } catch (err) {
        if (err.code === "ENOENT") {
            return {};
        }
        throw err;
    }
}

function writeConfigFile(cfg) {
    const configDir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
}

async function readConfigFileAsync() {
    try {
        const raw = await fs.promises.readFile(CONFIG_PATH, "utf8");
        return raw ? JSON.parse(raw) : {};
    } catch (err) {
        if (err.code === "ENOENT") {
            return {};
        }
        throw err;
    }
}

async function writeConfigFileAsync(cfg) {
    const configDir = path.dirname(CONFIG_PATH);
    await fs.promises.mkdir(configDir, { recursive: true });
    await fs.promises.writeFile(CONFIG_PATH, JSON.stringify(cfg, null, 2), "utf8");
}

// A standard server configuration file for the server. This file is used to configure various settings for the server, such as the port number, database connection details, and other server-specific options.
// Be like:
const configData = Object.freeze({
    server: {
        port: 3000,
        host: "127.0.0.1",
        // Add other server-specific configurations here
    },
    date: Date.now(),
    db: {
        name: "example",
        uri: "mongodb://admin:admin@localhost:27017/?authSource=admin"
    }
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
});