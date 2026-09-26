"use strict";

import { Readable } from "node:stream";
import { HeaderMap } from "@apollo/server";

export function koaMiddleware(server, options = {}) {
  server.assertStarted("koaMiddleware()");
  const createContext = options.context || (async () => ({}));
  return async ctx => {
    const origin = ctx.get("origin");
    if (origin) {
      ctx.set("Access-Control-Allow-Origin", origin);
      ctx.set("Vary", "Origin");
    } else {
      ctx.set("Access-Control-Allow-Origin", "*");
    }
    ctx.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    ctx.set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-CSRF-Token, X-Requested-With");
    ctx.set("Access-Control-Allow-Credentials", "true");

    if (ctx.method === "OPTIONS") {
      ctx.status = 204;
      return;
    }

    const headers = new HeaderMap();
    for (const [name, value] of Object.entries(ctx.headers)) {
      if (value !== undefined) {
        headers.set(name, Array.isArray(value) ? value.join(", ") : value);
      }
    }

    const result = await server.executeHTTPGraphQLRequest({
      httpGraphQLRequest: {
        method: ctx.method.toUpperCase(),
        headers,
        search: new URL(ctx.url, "http://localhost").search,
        body: ctx.request.body,
      },
      context: () => createContext({ ctx }),
    });

    if (result.body.kind === "complete") {
      ctx.body = result.body.string;
    } else {
      ctx.body = Readable.from(result.body.asyncIterator);
    }
    if (result.status !== undefined) ctx.status = result.status;
    for (const [name, value] of result.headers) ctx.set(name, value);
  };
}

export default { koaMiddleware };
