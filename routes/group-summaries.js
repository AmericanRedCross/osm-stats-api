'use strict';

const Boom = require('boom');
const bookshelf = require('../db/bookshelf_init');

module.exports = [
  {
    method: 'GET',
    path: '/group-summaries/{hashtags}',
    handler: function (req, res) {
      if (!req.params.hashtags) {
        return res(Boom.badRequest('Hashtags required'));
      };
      const hashtags = "'" + req.params.hashtags.split(',').join("','") + "'";
      const knex = bookshelf.knex;
      knex.raw("SELECT \
                  SUM(road_count_add) AS road_count_add, \
                  SUM(road_count_mod) AS road_count_mod, \
                  SUM(building_count_add) AS building_count_add, \
                  SUM(building_count_mod) AS building_count_mod, \
                  SUM(poi_count_add) AS poi_count_add, \
                  SUM(waterway_count_add) AS waterway_count_add, \
                  hashtag \
                FROM changesets JOIN \
                  (SELECT changeset_id, hashtag FROM changesets_hashtags \
                  JOIN hashtags ON changesets_hashtags.hashtag_id=hashtags.id \
                  WHERE hashtag IN (" + hashtags + ")) AS filtered \
                ON changesets.id=filtered.changeset_id \
                GROUP BY filtered.hashtag;")
      .then(function (results) {
        var object = {};
        const rows = results.rows.forEach(function (row) {
          const hashtag = row.hashtag;
          delete row.hashtag;
          object[hashtag] = row;
        });
        return object;
      }).then(res)
    }
  }
];
