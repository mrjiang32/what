import { ServerDescription } from "mongodb";
import { Rule } from "../../global/source/utilities/Rules/Rule.mjs";

const validPackageName = Rule.string().regexp(/^[a-zA-Z0-9@\/._-]+$/).finish()

export default {
    validSuiteName: Rule.string().regexp(/^[a-zA-Z0-9_-]+$/).finish(),
    validPackageName,
    validSuiteInnerName: Rule.equal("main.js").finish(),
    validSettingJSON: Rule.object({
        id: Rule.string().finish(),
        description: Rule.string().optional().nullable().finish(),
        environment: Rule.object().finish(),
        mainHash: Rule.string().hashlike().finish(),
        dependencies: Rule.array("string").items(validPackageName).finish(),
        timeout: Rule.number().finite().finish(),
        perms: Rule.or([Rule.equal("Trusted").finish(), Rule.object({
            "fs.read": Rule.boolean().optional().nullable().finish(),
            "fs.write": Rule.boolean().optional().nullable().finish(),
            "fetch": Rule.boolean().optional().nullable().finish(),
            "connect": Rule.boolean().optional().nullable().finish(),
        }).finish()]).finish()
    }).finish(),
}

/**
 * @typedef SuiteSettings
 * @property {string[]} [imports]
 * @property {"allSettled"|"race"|"all"} [mode]
 * @property {number} [timeout]
 * @property {boolean} [trusted] - 标记是否为可信脚本
 * @property {Record<string, boolean>} [perms] - 隔离环境的权限配置
 */