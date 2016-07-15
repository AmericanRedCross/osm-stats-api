var Boom = require('boom');
var bookshelf = require('../db/bookshelf_init');
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
    path: '/stats/{hashtag?}',
    handler: function (req, res) {
      const knex = bookshelf.knex;

      var stats_table = knex
            .select(knex.raw('COUNT(*) as changesets'),
                    knex.raw('COUNT(DISTINCT user_id) as users'),
                    knex.raw('SUM(road_km_mod + road_km_add) as roads'),
                    knex.raw('SUM(building_count_add + building_count_mod) as buildings'),
                    knex.raw('SUM(building_count_add + building_count_mod + road_count_add + road_count_mod + waterway_count_add) as edits'),
                    knex.raw('MAX(changesets.created_at) as latest'))
            .from('changesets');

      if (req.params.hashtag) {
        const filtered_table = knex.select('changeset_id')
                .from('changesets_hashtags')
                .join('hashtags', 'changesets_hashtags.hashtag_id', '=', 'hashtags.id')
                .where('hashtags.hashtag', '=', req.params.hashtag);

        stats_table = stats_table.whereIn('id', filtered_table);
      }

      stats_table
        .then(function (results) {
          var retval = Object.assign({}, results[0]);
          retval.users = Number(retval.users);
          retval.changesets = Number(retval.changesets);
          retval.buildings = Number(retval.buildings);
          retval.roads = Number(retval.roads);
          retval.edits = Number(retval.edits);
          return retval;
        })
        .then(res);
    }
  }
];
