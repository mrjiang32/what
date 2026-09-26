"use strict";

import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginLandingPageLocalDefault } from "@apollo/server/plugin/landingPage/default";
import { koaMiddleware } from "./app/lib/apollo-koa.js";
import { resolvers, typeDefs } from "./app/graphql/index.js";

const isDev = () => {
  const env = (process.env.EGG_SERVER_ENV || process.env.NODE_ENV || "local").toLowerCase();
  return !["production", "prod"].includes(env);
};

export default app => {
  app.startedAt = Date.now();
  app.beforeStart(async () => {
    const startupContext = app.createAnonymousContext();
    app.tokenMap = new Map();
    await startupContext.service.config.load();
    await startupContext.service.functions.load();

    const apollo = new ApolloServer({
      typeDefs,
      resolvers,
      plugins: [
        ApolloServerPluginLandingPageLocalDefault({
          embed: true,
          includeCookies: true,
          faviconUrl: "https://graphql.org/favicon.ico",
          footer: "What GraphQL",
        }),
      ],
      introspection: isDev(),
    });

    await apollo.start();

    app.apolloServer = apollo;
    app.graphqlMiddleware = koaMiddleware(apollo, {
      context: async ({ ctx }) => ({ ctx }),
    });
  });
};
