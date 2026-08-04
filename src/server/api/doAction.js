import logger from "../../../utils/logger.js";

let actionlog;

export default function doAction(module) {
    if(!actionlog) {
        actionlog = logger.newLogger("Actions");
    }
}