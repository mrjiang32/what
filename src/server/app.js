"use strict";

import { ApolloServer } from "@apollo/server";
import { koaMiddleware } from "./app/lib/apollo-koa.js";
import { resolvers, typeDefs } from "./app/graphql/index.js";

export default app => {
  app.startedAt = Date.now();
  app.beforeStart(async () => {
    const startupContext = app.createAnonymousContext();
    app.tokenMap = new Map();
    await startupContext.service.config.load();
    await startupContext.service.functions.load();

    const apollo = new ApolloServer({ typeDefs, resolvers });
    await apollo.start();

    app.apolloServer = apollo;
    app.graphqlMiddleware = koaMiddleware(apollo, {
      context: async ({ ctx }) => ({ ctx }),
    });
  });
};
