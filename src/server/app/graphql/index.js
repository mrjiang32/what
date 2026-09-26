"use strict";

import { GraphQLScalarType, Kind } from "graphql";

function parseJsonLiteral(node) {
  if (node.kind === Kind.STRING || node.kind === Kind.BOOLEAN) return node.value;
  if (node.kind === Kind.INT || node.kind === Kind.FLOAT) return Number(node.value);
  if (node.kind === Kind.LIST) return node.values.map(parseJsonLiteral);
  if (node.kind === Kind.OBJECT) {
    return Object.fromEntries(node.fields.map(field => [field.name.value, parseJsonLiteral(field.value)]));
  }
  return null;
}

const JSONScalar = new GraphQLScalarType({
  name: "JSON",
  serialize: value => value,
  parseValue: value => value,
  parseLiteral: parseJsonLiteral,
});

export const typeDefs = `
  scalar JSON

  type Health { running: Boolean!, uptime: Float! }
  type FunctionInfo { name: String!, description: String! }
  type AuthPayload { token: String!, username: String! }
  type UserInfo { username: String!, role: String!, exp: Int, iat: Int }

  type Query {
    health: Health!
    functions: [FunctionInfo!]!
    validate: UserInfo
  }

  type Mutation {
    login(username: String!, password: String!): AuthPayload!
    logout: Boolean!
    runFunction(name: String!, params: JSON): JSON
  }
`;

export const resolvers = {
  JSON: JSONScalar,
  Query: {
    health: (_parent, _args, { ctx }) => ({
      running: true,
      uptime: Date.now() - ctx.app.startedAt,
    }),
    functions: (_parent, _args, { ctx }) => ctx.service.functions.list(),
    validate: (_parent, _args, { ctx }) => {
      const user = ctx.state.user;
      return user
        ? { username: user.id, role: user.role, exp: user.exp, iat: user.iat }
        : null;
    },
  },
  Mutation: {
    login: (_parent, { username, password }, { ctx }) =>
      ctx.service.auth.login(username, password),
    logout: (_parent, _args, { ctx }) => ctx.service.auth.logout(),
    runFunction: (_parent, { name, params }, { ctx }) => {
      if (!ctx.state.user) throw new Error("Access denied");
      return ctx.service.functions.run(name, params);
    },
  },
};

export default { resolvers, typeDefs };
