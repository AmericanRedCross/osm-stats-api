'use strict';

const Boom = require('boom');
const bookshelf = require('../db/bookshelf_init');


module.exports = [
  // returns list of available countries
  {
    method:'GET',
    path: '/countries',
    handler: function(req, res) {
      const knex = bookshelf.knex;
      return knex.raw("SELECT name, code FROM countries;")
      .then(function(results) {
        // remove us states from list, then end at 51th element in returned list
        var country_names_codes = results.rows.map((d) => {
          // const index = results.rows.findIndex(d)
          var index = parseInt(results.rows.indexOf(d))
          if(index > 51) {return [d.name, d.code.substr(0,3)]}
        })
        // get rid of nulls and return
        return country_names_codes.filter((d) => {return d != null})
      })
      .then(res)
    }
  },
  // returns stats for all hashtags in a country
  {
    method:'GET',
    path: '/{country}/hashtags',
    handler: function(req, res) {
      const knex = bookshelf.knex;
      // force title case
      const country = req.params.country.split(' ').map(l =>
        l[0].toUpperCase() + l.substr(1).toLowerCase()).join(" ")
      return knex.raw("select * FROM countries WHERE name IN ('" + country +"')")
      .then(function (results) {
        return results.rows[0].id
      }).then(function (country_id) {
        // for given country_id
        // returns stats for all hashtags and name of hashtag
        var hashtag_ids = knex.raw(
          "SELECT \
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
              (SELECT changeset_id FROM changesets_countries WHERE country_id = " + country_id + ")) \
               AS filtered \
            ON changesets.id=filtered.changeset_id\
            GROUP by filtered.hashtag;"
          )
        return hashtag_ids
      }).then(function(hashtag_ids_results) {
        return hashtag_ids_results.rows
      })
      .then(res)
    }
  },
  // return stats for entire country
  {
    method:'GET',
    path: '/{country}',
    handler: function(req, res) {
      const knex = bookshelf.knex;
      // force title case
      const country = req.params.country.split(' ').map(l =>
        l[0].toUpperCase() + l.substr(1).toLowerCase()).join(" ")
      return knex.raw("select * FROM countries WHERE name IN ('" + country +"')")
      .then(function(results) {
        return results.rows[0].id
      }).then(function (country_id) {
        var country_stats = knex.raw(
          "SELECT \
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
              (SELECT changeset_id FROM changesets_countries WHERE country_id = " + country_id + ")) \
            AS filtered \
          ON changesets.id=filtered.id;"
        )
        return country_stats
      }).then(function(country_stats_results) {
        return country_stats_results.rows
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
        l[0].toUpperCase() + l.substr(1).toLowerCase()).join(" ")
      return knex.raw("select * FROM countries WHERE name IN ('" + country + "')")
      .then(function (results) {
        var country_id = results.rows[0].id
        return country_id
      })
      .then(function (country_id) {
        var user_ids = knex.raw(
          "SELECT \
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
              (SELECT changeset_id FROM changesets_countries WHERE country_id = " + country_id + ")) \
            AS filtered \
          ON changesets.id=filtered.id \
          GROUP by filtered.name, filtered.user_id \
        ")
        return user_ids
      }).then(function(user_ids_results) {
        return user_ids_results.rows
      })
      .then(res)
    }
  }
]
