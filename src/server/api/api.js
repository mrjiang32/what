import load from "../db/load.js";
import crypto from "crypto";

function hashFunctionString(functionString) {
  return crypto
    .createHash("sha256")
    .update(functionString)
    .digest("hex")
    .toString();
}

export default [
  {
    path: /^\/api\/hook\/[a-zA-Z0-9_]+$/,
    method: "GET",
    handler: async (req, res) => {
      const hookName = req.path.split("/").pop();
      const hook = await load.hookdb.findOne({ name: hookName });
      if (!hook) {
        return res.status(404).json({ error: "Hook not found" });
      }
      return res.json(hook);
    },
  },
  {
    path: /^\/api\/hook\/[a-zA-Z0-9_]+\/trigger$/,
    method: "POST",
    handler: async (req, res) => {
      const hookName = req.path.split("/")[3];
      const hook = await load.hookdb.findOne({ name: hookName });
      if (!hook) {
        console.log(`Hook with name ${hookName} not found`);
        return;
      }
      const actionPromises =
        hook.hookActions?.map((actionName) =>
          load.actiondb.findOne({ name: actionName }),
        ) || [];
      const actions = await Promise.all(actionPromises);
      const validActions = actions.filter(Boolean);
      if (validActions.length === 0) {
        console.log(`No valid actions found for hook ${hookName}`);
        return;
      }
      validActions.forEach(async (action) => {
        // console.log(`Executing action: ${action.name} ${action.functionString}`);
        if (!action.functionString) {
          return;
        }
        let func;
        try {
          func = new Function(`return (${action.functionString})`)();
          if (
            action.functionHash !== hashFunctionString(action.functionString)
          ) {
            console.error(
              `Function hash mismatch for action ${action.name}. Possible tampering detected.`,
            );
            return;
          }
        } catch (error) {
          console.error(
            `Failed to build function for action ${action.name}:`,
            error,
          );
          return;
        }
        if (typeof func !== "function") {
          console.error(
            `Action ${action.name} did not produce a callable function`,
          );
          return;
        }
        await func();
      });
      await load.hookdb.updateOne(
        { name: hookName },
        { $inc: { triggerTimes: 1 } },
      );
      res.json({ message: `Hook ${hookName} triggered successfully` });
    },
  },
  {
    path: "/api/hook",
    method: "GET",
    handler: async (req, res) => {
      const hooks = await load.hookdb.find({}).toArray();
      return res.json(hooks);
    },
  },
  {
    path: "/api/hook/",
    method: "POST",
    handler: async (req, res) => {
      const { name, hookActions } = req.body;
      if (!name || !hookActions) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const existingHook = await load.hookdb.findOne({ name });
      if (existingHook) {
        return res
          .status(409)
          .json({ error: "Hook with this name already exists" });
      }
      const newHook = {
        name,
        hookActions,
        triggerTimes: 0,
        createdAt: new Date(),
      };
      await load.hookdb.insertOne(newHook);
      return res.status(201).json(newHook);
    },
  },
];
