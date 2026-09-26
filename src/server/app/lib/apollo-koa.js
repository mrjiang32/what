"use strict";

const { Readable } = require("node:stream");
const { HeaderMap } = require("@apollo/server");

function koaMiddleware(server, options = {}) {
  server.assertStarted("koaMiddleware()");
  const createContext = options.context || (async () => ({}));
  return async ctx => {
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

module.exports = { koaMiddleware };