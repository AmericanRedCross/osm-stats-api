var Boom = require('boom');
var bookshelf = require('../db/bookshelf_init')
var Promise = require('bluebird');

/*
MissingMaps began tracking OSM edit statistics in January 2016,
and this endpoint provides summary statistics for changesets
submitted after that date. The user count is an exception, as it
represents the entirety of participating users since 2014.

On the MissingMaps.org website, these statistics
are combined with a pre-2016 snapshot of edit statistics to
represent the entirety of edits since 2014.
*/

module.exports = [
  {
    method: 'GET',
    path: '/',
    handler: function (req, res) {
      const knex = bookshelf.knex;
      return Promise.all([
        knex
        .select(knex.raw('COUNT(*) as changesets'),
          knex.raw('SUM(road_km_mod + road_km_add) as roads'),
          knex.raw('SUM(building_count_add + building_count_mod) as buildings'),
          knex.raw('SUM(building_count_add + building_count_mod + road_count_add + road_count_mod + waterway_count_add) as edits'),
          knex.raw('MAX(changesets.created_at) as latest'))
          .from('changesets'),
        knex
        .select(knex.raw('COUNT(DISTINCT id) as users'))
          .from('users')
      ]).then(function (results) {
        const edits = results[0][0];
        const users = results[1][0].users;
        edits.users = Number(edits.users);
        edits.changesets = Number(edits.changesets);
        edits.buildings = Number(edits.buildings);
        edits.roads = Number(edits.roads);
        edits.edits = Number(edits.edits);
        return edits;
      }).then(res)
    }
  }
]
