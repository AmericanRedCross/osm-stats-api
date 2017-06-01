'use strict';

const Boom = require('boom');
const bookshelf = require('../db/bookshelf_init');


module.exports = [
  // returns stats for all hashtags in a country
  {
    method:'GET',
    path: '/{country}/hashtags',
    handler: function(req, res) {
      const knex = bookshelf.knex;
      // force title case
      const country = req.params.country.split(' ').map(l =>
        l[0].toUpperCase() + l.substr(1).toLowerCase())
      return knex.raw("select * FROM countries WHERE name IN ('" + country +"')")
      .then(function (results) {
        var country_id = results.rows[0].id
        return country_id
      }).then(function (country_id) {
        // for given country_id
        // returns stats for all hashtags and name of hashtag
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
            filtered.hashtag\
          FROM changesets JOIN\
            (SELECT hashtag, id, changeset_id FROM \
              (SELECT hashtags.id, hashtags.hashtag, changesets_hashtags.changeset_id FROM hashtags \
              JOIN changesets_hashtags ON hashtags.id = changesets_hashtags.hashtag_id) AS hashtag_changesets_joined\
              WHERE changeset_id IN \
              (SELECT changeset_id FROM changesets_countries WHERE country_id = " + country_id + ")) \
               AS filtered \
            ON changesets.id=filtered.changeset_id\
            GROUP by filtered.hashtag;"
          )
        return hashtag_ids
      })
      .then(res)
    }
  },
  {
    method: 'GET',
    path: "/{country}/users",
    handler: function(req, res) {
      const knex = bookshelf.knex
      const country = req.params.country.split(' ').map(l =>
        l[0].toUpperCase() + l.substr(1).toLowerCase())
      return knex.raw("select * FROM countries WHERE name IN ('" + country + "')")
      .then(function (results) {
        var country_id = results.rows[0].id
        return country_id
      })
      .then(function (country_id) {
        var user_ids = knex.raw(
          "SELECT \
             SUM(road_count_add) AS road_count_add, \
             SUM(road_count_mod) AS road_count_mod, \
             SUM(building_count_add) AS building_count_add,  \
             SUM(building_count_mod) AS building_count_mod,  \
             SUM(waterway_count_add) AS waterway_count_add, \
             SUM(poi_count_add) AS poi_count_add,  \
             SUM(road_km_add) AS road_km_add,  \
             SUM(road_km_mod) AS road_km_mod, \
             filtered.name \
          FROM changesets JOIN \
            (SELECT name, id FROM \
              (SELECT users.name, changesets.id FROM users \
              JOIN changesets ON users.id = changesets.user_id) AS hashtag_changesets_joined \
            WHERE id IN \
              (SELECT changeset_id FROM changesets_countries WHERE country_id = " + country_id + ")) \
            AS filtered \
          ON changesets.id=filtered.id \
          GROUP by filtered.name \
        ")
        return user_ids
      })
      .then(res)
    }
  },
  {
    method:'GET',
    path: '/{country}/users/{user}',
    handler: function(req, res) {
      const knex = bookshelf.knex
      var users = "'" + req.params.user.split(',').join("','") + "'";
      const country = req.params.country.split(' ').map(l =>
        l[0].toUpperCase() + l.substr(1).toLowerCase())
      return knex.raw("select * FROM countries WHERE name IN ('" + country + "')")
      .then(function (results) {
        var country_id = results.rows[0].id
        return country_id
      })
      .then(function (country_id) {
        var user_ids = knex.raw(
          "SELECT \
	           SUM(road_count_add) AS road_count_add, \
             SUM(road_count_mod) AS road_count_mod, \
             SUM(building_count_add) AS building_count_add,  \
             SUM(building_count_mod) AS building_count_mod,  \
             SUM(waterway_count_add) AS waterway_count_add, \
             SUM(poi_count_add) AS poi_count_add,  \
             SUM(road_km_add) AS road_km_add,  \
             SUM(road_km_mod) AS road_km_mod, \
	           filtered.name \
          FROM changesets JOIN \
            (SELECT name, id FROM \
              (SELECT users.name, changesets.id FROM users \
              JOIN changesets ON users.id = changesets.user_id) AS hashtag_changesets_joined \
            WHERE id IN \
              (SELECT changeset_id FROM changesets_countries WHERE country_id = " + country_id + ") \
            AND name in (" + users + ")) AS filtered \
          ON changesets.id=filtered.id \
          GROUP by filtered.name \
        ")
        return user_ids
      })
      .then(res)
    }
  }
]
