import { Rule } from "../../../global/source/utilities/Rules/Rule.mjs";

const validPackageName = Rule.string().regexp(/^[a-zA-Z0-9@\/._-]+$/).finish()

export default {
    validSuiteName: Rule.string().regexp(/^[a-zA-Z0-9_-]+$/).finish(),
    // validJsFileName: Rule.string().regexp(/^[a-zA-Z0-9_-]+$/).finish(),
    validPackageName,
    validSuiteInnerName: Rule.equal("main.js").finish(),
    validSettingJSON: Rule.object({
        id: Rule.string().finish(),
        description: Rule.string().optional().nullable().finish(),
        __mainHash: Rule.string().hashlike().finish(),
        __dependencies: Rule.array("string").items(validPackageName).finish(),
        timeout: Rule.number().finite().finish(),
    }).finish(),
    validPOSTSettingsJSON: Rule.object({
        id: Rule.string().finish(),
        description: Rule.string().optional().nullable().finish(),
        timeout: Rule.number().finite().finish(),
    }).finish()
}