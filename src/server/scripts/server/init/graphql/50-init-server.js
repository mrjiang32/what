import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@as-integrations/express5';
import global from '../../../../global.js';

export async function initGraphql({ typeDefs, resolvers }) {
  try {
    const server = new ApolloServer({ typeDefs, resolvers });
    await server.start();

    // Provide Playground on GET
    try {
      const { renderPlaygroundPage } = await import('graphql-playground-html');
      global.server.app.get('/graphql', (req, res) => {
        res.set('Content-Type', 'text/html');
        res.send(renderPlaygroundPage({ endpoint: '/graphql' }));
      });
    } catch (e) {
      global.logger.getByContext('GraphQL').warn('graphql-playground-html not available, skipping Playground endpoint');
    }

    global.server.app.use('/graphql', expressMiddleware(server, {
      context: async ({ req }) => ({ req, user: req.user })
    }));
    global.logger.getByContext('GraphQL').info('GraphQL endpoint mounted at /graphql');
  } catch (err) {
    console.error('Failed to start GraphQL server:', err);
    throw err;
  }
}
