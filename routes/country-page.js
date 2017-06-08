'use strict';
const bookshelf = require('../db/bookshelf_init');
const RecordNotFound = require('../db/errors').RecordNotFound;
const Boom = require('boom');

module.exports = [
  // returns list of available countries
  {
    method: 'GET',
    path: '/countries',
    handler: function (req, res) {
      const knex = bookshelf.knex;
      return knex.raw("SELECT name, code FROM countries WHERE code !~'USA-' ;")
      .then(function (results) {
        var countryNamesCodes = results.rows.map((d) => {
          var index = parseInt(results.rows.indexOf(d));
          if (index > 51) { return [d.name, d.code.substr(0, 3)]; }
        });
        // get rid of nulls and return
        return countryNamesCodes.filter((d) => { return d != null; });
      })
      .then(res);
    }
  },
  // returns stats for all hashtags in a country
  {
    method: 'GET',
    path: '/countries/{country}/hashtags',
    handler: function (req, res) {
      const knex = bookshelf.knex;
      // force title case
      const country = req.params.country.toUpperCase();
      return knex('countries').where('code', country)
      .then(function (results) {
        if (results.length === 0) {
          throw new RecordNotFound();
        }
        return results[0].id;
      }).then(function (countryId) {
        // for given country_id
        // returns stats for all hashtags and name of hashtag
        var hashtagIds = knex.raw(
          'SELECT \
            SUM(building_count_add + building_count_mod + \
                road_count_add + road_count_mod + \
                waterway_count_add + poi_count_add) AS all_edits, \
              SUM(road_count_add) AS road_count_add, \
            SUM(road_count_mod) AS road_count_mod, \
            SUM(building_count_add) AS building_count_add, \
            SUM(building_count_mod) AS building_count_mod, \
            SUM(waterway_count_add) AS waterway_count_add, \
            SUM(poi_count_add) AS poi_count_add, \
            SUM(road_km_add) AS road_km_add, \
            SUM(road_km_mod) AS road_km_mod, \
            SUM(waterway_km_add) AS waterway_km_add, \
            filtered.hashtag\
          FROM changesets JOIN\
            (SELECT hashtag, id, changeset_id FROM \
              (SELECT hashtags.id, hashtags.hashtag, changesets_hashtags.changeset_id FROM hashtags \
              JOIN changesets_hashtags ON hashtags.id = changesets_hashtags.hashtag_id) AS hashtag_changesets_joined\
              WHERE changeset_id IN \
              (SELECT changeset_id FROM changesets_countries WHERE country_id = ' + countryId + ')) \
               AS filtered \
            ON changesets.id=filtered.changeset_id\
            GROUP by filtered.hashtag;'
        );
        return hashtagIds;
      }).then(function (hashtagIdsResults) {
        return hashtagIdsResults.rows;
      })
        .then(res)
        .catch(function (error) {
          if (error instanceof RecordNotFound) {
            return res(Boom.notFound('Could not find country with that id'));
          } else {
            return res(Boom.badImplementation('An unexpected error occured'));
          }
        });
    }
  },
  // return stats for entire country
  {
    method: 'GET',
    path: '/countries/{country}',
    handler: function (req, res) {
      const knex = bookshelf.knex;
      // force title case
      const country = req.params.country.toUpperCase();
      return knex('countries').where('code', country)
        .then(function (results) {
          if (results.length === 0) {
            throw new RecordNotFound();
          }
          return results[0].id;
        })
        .then(function (countryId) {
          var countryStats = knex.raw(
            'SELECT \
            SUM(building_count_add + building_count_mod + \
                road_count_add + road_count_mod + \
                waterway_count_add + poi_count_add) AS all_edits, \
             SUM(road_count_add) AS road_count_add, \
             SUM(road_count_mod) AS road_count_mod, \
             SUM(building_count_add) AS building_count_add,  \
             SUM(building_count_mod) AS building_count_mod,  \
             SUM(waterway_count_add) AS waterway_count_add, \
             SUM(poi_count_add) AS poi_count_add,  \
             SUM(road_km_add) AS road_km_add,  \
             SUM(road_km_mod) AS road_km_mod, \
             COUNT(DISTINCT filtered.name) AS contributors\
          FROM changesets JOIN \
            (SELECT name, id FROM \
              (SELECT users.name, changesets.id FROM users \
              JOIN changesets ON users.id = changesets.user_id) AS filtered \
            WHERE id IN \
              (SELECT changeset_id FROM changesets_countries WHERE country_id = ' + countryId + ')) \
            AS filtered \
          ON changesets.id=filtered.id;'
          );
          return countryStats;
        }).then(function (countryStatsResults) {
          return countryStatsResults.rows;
        })
        .then(res)
        .catch(function (error) {
          if (error instanceof RecordNotFound) {
            return res(Boom.notFound('Could not find country with that id'));
          } else {
            return res(Boom.badImplementation('An unexpected error occured'));
          }
        });
    }
  },
  {
    method: 'GET',
    path: '/countries/{country}/users',
    handler: function (req, res) {
      const knex = bookshelf.knex;
      const country = req.params.country.toUpperCase();
      return knex('countries').where('code', country)
        .then(function (results) {
          if (results.length === 0) {
            throw new RecordNotFound();
          }
          return results[0].id;
        })
        .then(function (countryId) {
          var userIds = knex.raw(
            'SELECT \
            SUM(building_count_add + building_count_mod + \
                road_count_add + road_count_mod + \
                waterway_count_add + poi_count_add) AS all_edits, \
             SUM(road_count_add) AS road_count_add, \
             SUM(road_count_mod) AS road_count_mod, \
             SUM(building_count_add) AS building_count_add,  \
             SUM(building_count_mod) AS building_count_mod,  \
             SUM(waterway_count_add) AS waterway_count_add, \
             SUM(poi_count_add) AS poi_count_add,  \
             SUM(road_km_add) AS road_km_add,  \
             SUM(road_km_mod) AS road_km_mod, \
             filtered.name, \
             filtered.user_id \
          FROM changesets JOIN \
            (SELECT name, id, user_id FROM \
              (SELECT users.name, users.id as user_id, changesets.id FROM users \
              JOIN changesets ON users.id = changesets.user_id) AS hashtag_changesets_joined \
            WHERE id IN \
              (SELECT changeset_id FROM changesets_countries WHERE country_id = ' + countryId + ')) \
            AS filtered \
          ON changesets.id=filtered.id \
          GROUP by filtered.name, filtered.user_id \
        ');
          return userIds;
        }).then(function (userIdsResults) {
          return userIdsResults.rows;
        })
        .then(res)
        .catch(function (error) {
          if (error instanceof RecordNotFound) {
            return res(Boom.notFound('Could not find country with that id'));
          } else {
            return res(Boom.badImplementation('An unexpected error occured'));
          }
        });
    }
  }
];
