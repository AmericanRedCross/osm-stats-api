// Returns knex connection to the local
// missingmaps database
module.exports = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL || {
    host: '104.236.25.175',
    port: 5432,
    user: 'postgres',
    password: '',
    database: 'postgres'
  }
});
