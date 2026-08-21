import global from './global.js';
import init from './scripts/server/init/80Graphql.api.js';
(async()=>{
  await init();
  const stack = global.server.app._router?.stack || [];
  console.log('ROUTES:');
  for (const layer of stack) {
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(',');
      console.log(layer.route.path, methods);
    } else if (layer.name === 'router') {
      console.log('router', layer.regexp);
    } else {
      console.log('middleware', layer.name || '<anonymous>');
    }
  }
})();
