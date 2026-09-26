"use strict";

module.exports = app => {
  app.startedAt = Date.now();
  app.beforeStart(async () => {
    const startupContext = app.createAnonymousContext();
    app.tokenMap = new Map();
    await startupContext.service.config.load();
    await startupContext.service.functions.load();

    const { ApolloServer } = await import("@apollo/server");
    const { koaMiddleware } = require("./app/lib/apollo-koa");
    const { resolvers, typeDefs } = require("./app/graphql");
    const apollo = new ApolloServer({ typeDefs, resolvers });
    await apollo.start();

    app.apolloServer = apollo;
    app.graphqlMiddleware = koaMiddleware(apollo, {
      context: async ({ ctx }) => ({ ctx }),
    });
  });
};