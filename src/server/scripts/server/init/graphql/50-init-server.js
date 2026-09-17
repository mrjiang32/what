import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express5";
import global from "../../../../global.js";

function parseGraphqlVariables(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return undefined;
    }
  }

  return value;
}

export async function initGraphql({ typeDefs, resolvers }) {
  try {
    const server = new ApolloServer({ typeDefs, resolvers });
    await server.start();

    if (global.args?.debug) {
      try {
        const { renderPlaygroundPage } = await import("graphql-playground-html");
        global.server.app.get("/debug/graphql", (req, res) => {
          res.set("Content-Type", "text/html");
          res.send(renderPlaygroundPage({ endpoint: "/graphql" }));
        });
      } catch (e) {
        global.logger.getByContext("GraphQL").warn("无法渲染GraphQL Playground, ", e.message, e.stack);
      }
    }

    global.server.app.get("/graphql", async (req, res) => {
      const query = typeof req.query?.query === "string" ? req.query.query : null;
      if (!query) {
        return res.status(400).json({ errors: [{ message: "Missing GraphQL query" }] });
      }

      const result = await server.executeOperation({
        query,
        variables: parseGraphqlVariables(req.query?.variables),
        operationName: typeof req.query?.operationName === "string" ? req.query.operationName : undefined,
        contextValue: { req, user: req.user },
      });

      const payload = Array.isArray(result) ? result : [result];
      const body = payload[0]?.body ?? payload;
      return res.status(200).json(body);
    });

    global.server.app.use(
      "/graphql",
      expressMiddleware(server, {
        context: async ({ req }) => ({ req, user: req.user }),
      }),
    );

    global.logger
      .getByContext("GraphQL")
      .info("GraphQL已挂载");
  } catch (err) {
    console.error("Failed to start GraphQL server:", err);
    throw err;
  }
}
