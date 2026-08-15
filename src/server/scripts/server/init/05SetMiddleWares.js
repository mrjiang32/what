import { bus } from "../../../global/utils/SafeEventEmitter.js"

export default async () => {
    await bus.emitSafe("sys:middlewares");
}