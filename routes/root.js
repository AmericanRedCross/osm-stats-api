var Boom = require('boom');
var bookshelf = require('../db/bookshelf_init')
var Promise = require('bluebird');

module.exports = [
  {
    method: 'GET',
    path: '/',
    handler: function (req, res) {
      var knex = bookshelf.knex;
      knex
      .select(knex.raw('COUNT(*) as changesets'),
              knex.raw('SUM(road_km_mod + road_km_add) as roads'),
              knex.raw('COUNT(DISTINCT user_id) as users'),
              knex.raw('SUM(building_count_add + building_count_mod) as buildings'),
              knex.raw('SUM(building_count_add + building_count_mod + road_count_add + road_count_mod + waterway_count_add) as edits'),
              knex.raw('MAX(changesets.created_at) as latest'))
              .from('changesets')
              .then(res)
    }
  }
]
