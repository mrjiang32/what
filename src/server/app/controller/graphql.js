"use strict";

import { Controller } from "egg";

class GraphqlController extends Controller {
  async index() {
    await this.app.graphqlMiddleware(this.ctx);
  }
}

export default GraphqlController;
