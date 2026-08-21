import global from "../../../global.js";

// Early middleware: intercept GET requests to /graphql and return a static GraphiQL UI
export default (req, res, next) => {
  try {
    if (req.method === 'GET') {
      // Normalize path portion (req.path may be set by express)
      const urlPath = req.path || req.url || req.originalUrl || '';
      if ((urlPath || '').includes('graphql')) {
        try { global.logger.getByContext('Playground').debug('Playground middleware saw request', urlPath, req.headers.accept); } catch(e) { console.log('Playground saw', urlPath); }
      }
      if (urlPath === '/graphql' && (req.headers.accept || '').includes('text/html')) {
        const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>GraphiQL</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="https://unpkg.com/graphiql/graphiql.min.css" />
    <style>html,body,#root{height:100%;margin:0;}</style>
  </head>
  <body>
    <div id="root">Loading...</div>
    <script crossorigin src="https://unpkg.com/react/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom/umd/react-dom.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/graphiql/graphiql.min.js"></script>
    <script>
      const fetcher = GraphiQL.createFetcher({ url: '/graphql' });
      ReactDOM.createRoot(document.getElementById('root')).render(
        React.createElement(GraphiQL, { fetcher })
      );
    </script>
  </body>
</html>`;
        res.set('Content-Type', 'text/html');
        return res.status(200).send(html);
      }
    }
  } catch (err) {
    try { global.logger.getByContext('GraphQL').error('Playground middleware error', err); } catch(e){}
  }
  next();
};
