const Hapi = require("hapi");
const HapiRouter = require("hapi-router");

const VERSION = require("./package.json").version;

const server = new Hapi.Server({
  connections: {
    routes: {
      cors: true
    }
  }
});
server.connection({ port: process.env.API_PORT || process.env.PORT || 3000 });

// Register routes
server.register(
  {
    register: HapiRouter,
    options: {
      routes: "routes/*.js"
    }
  },
  err => {
    if (err) throw err;
  }
);

server.ext("onRequest", (req, res) => {
  console.log(
    `${req.info.remoteAddress}: ${req.method.toUpperCase()} ${req.url.path}`
  );

  return res.continue();
});

server.ext("onPreResponse", (req, reply) => {
  const { response } = req;

  if (response.isBoom) {
    response.output.headers["X-API-Version"] = VERSION;
  } else {
    response.header("X-API-Version", VERSION);
  }

  return reply.continue();
});

server.on("request-error", (req, err) => {
  console.warn(`${req.method.toUpperCase()} ${req.url.path}`);
  console.warn(err.stack);
});

server.start(() => console.log("Server running at:", server.info.uri));

process.on("unhandledRejection", err => console.warn(err.stack));

module.exports = server;
