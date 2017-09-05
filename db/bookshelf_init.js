const knex = require("./db_connection_knex.js");
const bookshelf = require("bookshelf")(knex);

bookshelf.plugin("registry");

module.exports = bookshelf;
