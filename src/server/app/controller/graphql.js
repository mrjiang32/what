"use strict";

const { Controller } = require("egg");

class GraphqlController extends Controller {
  async index() {
    await this.app.graphqlMiddleware(this.ctx);
  }
}

module.exports = GraphqlController;