'use strict';

const Boom = require('boom');
const bookshelf = require('../db/bookshelf_init');

module.exports = [
  {
    method: 'GET',
    path: '/group-summaries/{hashtags}',
    handler: function (req, res) {
      console.log(req.info.remoteAddress + ': ' + req.method.toUpperCase() + ' ' + req.url.path);
      if (!req.params.hashtags) {
        return res(Boom.badRequest('Valid, comma-separated hashtags required'));
      };
      const hashtags = "'" + req.params.hashtags.split(',').join("','") + "'";
      const knex = bookshelf.knex;
      return knex.raw("SELECT \
                        SUM(road_count_add) AS road_count_add, \
                        SUM(road_count_mod) AS road_count_mod, \
                        SUM(building_count_add) AS building_count_add, \
                        SUM(building_count_mod) AS building_count_mod, \
                        SUM(waterway_count_add) AS waterway_count_add, \
                        SUM(poi_count_add) AS poi_count_add, \
                        SUM(road_km_add) AS road_km_add, \
                        SUM(road_km_mod) AS road_km_mod, \
                        SUM(waterway_km_add) AS waterway_km_add, \
                        hashtag \
                      FROM changesets JOIN \
                        (SELECT DISTINCT changeset_id, hashtag FROM changesets_hashtags \
                        JOIN hashtags ON changesets_hashtags.hashtag_id=hashtags.id \
                        WHERE hashtag IN (" + hashtags + ")) AS filtered \
                      ON changesets.id=filtered.changeset_id \
                      GROUP BY filtered.hashtag;"
      )
      .then(function (results) {
        var object = {};
        const rows = results.rows.forEach((row) => {
          const hashtag = row.hashtag;
          delete row.hashtag;
          object[hashtag] = row;
        });
        return object;
      }).then(res)
    }
  },
  {
    method: 'GET',
    path: '/top-users/{hashtag}',
    handler: function (req, res) {
      console.log(req.info.remoteAddress + ': ' + req.method.toUpperCase() + ' ' + req.url.path);
      if (!req.params.hashtag) {
        return res(Boom.badRequest('Valid hashtag required'));
      };
      const hashtag = req.params.hashtag;
      const knex = bookshelf.knex;
      return knex.raw("SELECT \
                        SUM(building_count_add + building_count_mod + \
                            road_count_add + road_count_mod + \
                            waterway_count_add + poi_count_add) AS all_edits, \
                        SUM(building_count_add + building_count_mod) AS buildings, \
                        SUM(road_count_add + road_count_mod) AS roads, \
                        SUM(road_km_add + road_km_mod) AS road_kms, \
                        users.name AS user_id, \
                        users.id AS user_number \
                      FROM changesets \
                      JOIN (SELECT DISTINCT(changeset_id) FROM changesets_hashtags \
                        JOIN hashtags ON changesets_hashtags.hashtag_id=hashtags.id \
                        WHERE hashtag='" + hashtag + "') AS filtered \
                      ON changesets.id=filtered.changeset_id \
                      LEFT JOIN users on users.id = changesets.user_id \
                      GROUP BY users.name, users.id \
                      ORDER BY all_edits DESC \
                      LIMIT 5"
      )
      .then(function (results) {
        var object = {};
        results.rows.forEach(row => {
          const userId = row.user_id;
          delete row.user_id;
          object[userId] = row;
        });
        return object;
      }).then(res)
    }
  }
];
