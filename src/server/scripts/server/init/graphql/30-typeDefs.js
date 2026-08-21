export const typeDefs = `
  scalar JSON

  type Health {
    running: Boolean!
    uptime: Float!
    ok: Boolean!
  }

  type Suite {
    suiteName: String!
    hasMainJs: Boolean!
    settings: JSON
  }

  type AuthPayload {
    token: String!
    username: String!
  }

  type ExecResult { result: JSON }

  type Query {
    health: Health!
    listSuites: [String!]!
    getSuite(suiteName: String!): Suite
    npmList(suiteName: String!): JSON
    validate: JSON
  }

  type Mutation {
    login(username: String!, password: String!): AuthPayload
    logout: Boolean
    refresh: String
    changePassword(password: String!, newPassword: String!, confirmPassword: String!): Boolean
    newUser(username: String!, password: String!, confirmPassword: String!): Boolean

    createSuite(suiteName: String!, settingsRaw: String, mainJsRaw: String): Boolean
    updateSuiteFile(suiteName: String!, fileName: String!, raw: String!): Boolean
    execSuite(suiteName: String!, params: JSON): ExecResult
    deleteSuite(suiteName: String!): Boolean

    npmInstall(suiteName: String!, pkgs: [String!]!): Boolean
    npmUninstall(suiteName: String!, pkgs: [String!]!): Boolean

    requestSudo: Boolean
    validateSudo(token: String!): Boolean
  }
`;
