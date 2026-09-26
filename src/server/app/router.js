"use strict";

module.exports = app => {
  app.router.get("/", ctx => ctx.redirect("/graphql"));
  app.router.all("/graphql", "graphql.index");
};