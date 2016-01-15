var Hapi = require('hapi');

var server = new Hapi.Server({
  connections: {
    routes: {
      cors: true
    }
  },
});
server.connection({port: 3000});

// Register routes
server.register({
  register: require('hapi-router'),
  options: {
    routes: 'routes/*.js'
  }
}, function (err) {
  if (err) throw err;
});

server.start(() => {
  console.log('Server running at:', server.info.uri);
});

module.exports = server;

