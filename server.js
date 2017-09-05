require('dotenv').config();

var Hapi = require('hapi');

var server = new Hapi.Server({
  connections: {
    routes: {
      cors: true
    }
  }
});
server.connection({port: process.env.API_PORT || process.env.PORT || 3000});

// Register routes
server.register({
  register: require('hapi-router'),
  options: {
    routes: 'routes/*.js'
  }
}, function (err) {
  if (err) throw err;
});

server.ext('onRequest', function (req, res) {
  console.log(req.info.remoteAddress + ': ' + req.method.toUpperCase() + ' ' + req.url.path);

  return res.continue();
});

server.on('request-error', function (req, err) {
  console.warn(req.method.toUpperCase() + ' ' + req.url.path);
  console.warn(err.stack);
});

server.start(() => {
  console.log('Server running at:', server.info.uri);
});

module.exports = server;
