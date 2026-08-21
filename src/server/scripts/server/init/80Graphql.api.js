/* Loader for split GraphQL modules */

export default async (context = {}) => {
  try {
    const { typeDefs } = await import('./graphql/30-typeDefs.js');
    const { resolvers } = await import('./graphql/40-resolvers.js');
    const { initGraphql } = await import('./graphql/50-init-server.js');
    await initGraphql({ typeDefs, resolvers, context });
    return { typeDefs, resolvers };
  } catch (err) {
    console.error('Failed to initialize GraphQL modules:', err);
    throw err;
  }
};
