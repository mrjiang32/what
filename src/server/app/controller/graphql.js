"use strict";

import { Controller } from "egg";

const isDev = app => {
  const env = (app.config.env || process.env.EGG_SERVER_ENV || process.env.NODE_ENV || "local").toLowerCase();
  return env !== "prod" && env !== "production";
};

const SANDBOX_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>What GraphQL Sandbox</title>
    <style>
      html, body {
        margin: 0;
        height: 100%;
        background: #090d18;
        color: #edf2ff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      #app {
        height: 100vh;
        width: 100vw;
      }
      iframe {
        width: 100%;
        height: 100%;
        border: none;
        background: #090d18;
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module">
      import { ApolloSandbox } from "https://esm.sh/@apollo/sandbox@2.7.4";

      const root = document.getElementById("app");
      new ApolloSandbox({
        target: root,
        endpoint: "/graphql",
        embedding: "always",
        handleRequest: (endpoint, options) => {
          const headers = new Headers(options.headers || {});
          const authToken = localStorage.getItem("what-auth-token");
          const csrfToken = document.cookie
            .split("; ")
            .find(row => row.startsWith("csrfToken="));

          if (authToken) {
            headers.set("authorization", "Bearer " + authToken);
          }
          if (csrfToken) {
            headers.set("x-csrf-token", csrfToken.split("=")[1]);
          }

          return fetch(endpoint, {
            ...options,
            headers,
            credentials: "same-origin",
          });
        },
        initialState: {
          workspaceName: "What GraphQL",
          includeCookies: true,
         
          settings: {
            "request.credentials": "same-origin",
            "editor.theme": "dark",
            "schema.polling.enable": true,
            "schema.polling.interval": 3000,
          },
        },
      });
    </script>
  </body>
</html>`;

class GraphqlController extends Controller {
  async index() {
    const { ctx } = this;
    const wantsHtml = ctx.method === "GET" && ctx.accepts("html");
    if (wantsHtml) {
      ctx.status = 200;
      ctx.type = "html";
      ctx.body = isDev(this.app) ? SANDBOX_HTML : "GraphQL Playground is disabled in production.";
      return;
    }

    await this.app.graphqlMiddleware(ctx);
  }

  async playground() {
    this.ctx.status = 200;
    this.ctx.type = "html";
    this.ctx.body = isDev(this.app) ? SANDBOX_HTML : "GraphQL Playground is disabled in production.";
  }
}

export default GraphqlController;
//添加更复杂的组管理机制，使用graphql编辑groups.json
