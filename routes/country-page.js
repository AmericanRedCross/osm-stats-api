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
        var hashtag_ids = knex.raw("SELECT distinct hashtag_id FROM changesets_hashtags WHERE changeset_id IN \
          (SELECT changeset_id FROM changesets_countries WHERE country_id = " + country_id + ");")
        return hashtag_ids
      }).then(
        function (country_results) {
          const country_hashtag_ids = country_results.rows.map(function(d) {return d.hashtag_id})
          return country_hashtag_ids.map(function(d) {
            return knex.raw("SELECT * from hashtags where id in (" + parseInt(d) + ");")
            // knex.raw(

            // "\
            // SELECT \
            //   SUM(road_count_add) AS road_count_add \
            //   SUM(building_count_add) AS building_count_add \
            //   SUM(building_count_mod) AS building_count_mod \
            //   SUM(waterway_count_add) AS waterway_count_add \
            //   SUM(poi_count_add) AS poi_count_add \
            //   SUM(road_km_add) AS road_km_add \
            //   SUM(road_km_mod) AS road_km_mod\
            //   SUM(waterway_km_add) AS waterway_km_add \
            // FROM changesets WHERE id IN \
            //   (SELECT changeset_id FROM changesets_hashtags WHERE changeset_id IN \
            //     (SELECT changeset_id FROM changeset_countries WHERE country_id=" + parseInt(171) + ")\
            //     AND hashtag_id=" + parseInt(d) + ")"
            // )
          })
      })
      .then(res)
    }
  }
]
