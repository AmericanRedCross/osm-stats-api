'use strict';

const Boom = require('boom');
const bookshelf = require('../db/bookshelf_init');

// figure out how to map the country name to its id?

module.exports = [
  {
    method:'GET',
    path: '/{country}/{hashtags}',
    handler: function(req, res) {
      const knex = bookshelf.knex;
      const hashtags = req.params.hashtags.split(',').join("','") + "'";
      // force title case
      const country = req.params.country.split(' ').map(l =>
        l[0].toUpperCase() + l.substr(1).toLowerCase())
      return knex.raw("select * FROM countries WHERE name IN ('" + country +"')")
      .then(function (results) {
        var country_id = results.rows[0].id
        return country_id
      }).then(function (country_id) {
        // join changesets with changesets_hashtags
        // do that only where changesets_hashtags.id are those in a given country
        // select all the changesets_ids,hashtag_ids for country
        // next I want to join all in the
        var hashtag_ids = knex.raw(
          "SELECT \
            SUM(road_count_add) AS road_count_add, \
            SUM(road_count_mod) AS road_count_mod, \
            SUM(building_count_add) AS building_count_add, \
            SUM(building_count_mod) AS building_count_mod, \
            SUM(waterway_count_add) AS waterway_count_add, \
            SUM(poi_count_add) AS poi_count_add, \
            SUM(road_km_add) AS road_km_add, \
            SUM(road_km_mod) AS road_km_mod, \
            SUM(waterway_km_add) AS waterway_km_add, \
            filtered.hashtag_id\
          FROM changesets JOIN\
            (SELECT hashtag_id, changeset_id FROM changesets_hashtags \
              WHERE changeset_id IN \
              (SELECT changeset_id FROM changesets_countries WHERE country_id = " + country_id + ")) AS filtered \
            ON changesets.id=filtered.changeset_id\
            GROUP by filtered.hashtag_id;"
          )
//         var hashtag_ids = knex.raw("select distinct hashtag_id from changesets_hashtags where changeset_id \
// in (select changeset_id from changesets_countries where country_id=171);")
        return hashtag_ids
      })
      .then(function(hashtag_id_results) {return hashtag_id_results.rows})
      .then(res)
    }
  }
]
