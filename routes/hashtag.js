var Boom = require('boom');
var Hashtag = require('../models/Hashtag');
var bookshelf = require('../db/bookshelf_init')
var Promise = require('bluebird');
var R = require('ramda');

module.exports = [
  {
    method: 'GET',
    path: '/hashtags/{id}',
    handler: function (req, res) {
      if (!req.params.id) {
        res(Boom.badRequest('Not a valid hashtag.'));
      }
      var subquery = bookshelf.knex('changesets_hashtags')
      .join('hashtags', 'hashtags.id', 'changesets_hashtags.hashtag_id')
      .select('changeset_id')
      .where('hashtags.hashtag', req.params.id);

      bookshelf.knex('users')
      .join('changesets', 'users.id', 'changesets.user_id')
      .where('changesets.id', 'in', subquery)
      .then(function (changesets) {

        var times = {};
        var users = {};
        var roads = 0;
        var buildings = 0;
        var waterways = 0;
        var pois = 0;
        var currentRoads = 0;
        var currentBuildings = 0;
        var currentWaterways = 0;
        var currentPois = 0;
        var currentTotal = 0;

        changesets.forEach(function (changeset) {
          currentRoads = Number(changeset.road_count_add) + Number(changeset.road_count_mod);
          currentBuildings = Number(changeset.building_count_add) + Number(changeset.building_count_mod);
          currentWaterways = Number(changeset.waterway_count_add);
          currentPois = Number(changeset.poi_count_add);
          times[changeset.created_at] = {
            roads: currentRoads,
            buildings: currentBuildings,
            waterways: currentWaterways,
            pois: currentPois
          };

          roads += currentRoads;
          buildings += currentBuildings;
          waterways += currentWaterways;
          pois += currentPois;

          userId = changeset.user_id;
          currentTotal = currentRoads + currentBuildings + currentWaterways + currentPois;
          if (!users[userId]) {
            users[userId] = {name: changeset.name, total: currentTotal};
          }
          else {
            users[userId]['total'] += currentTotal;
          };

        });

        return {
          total: {
            roads: roads,
            buildings: buildings,
            waterways: waterways,
            pois: pois
          },
          users: users,
          times: times
        };
      })
      .then(res);
    }
  },
  {
    method: 'GET',
    path: '/hashtags/{id}/users',
    handler: function (req, res) {
      var subquery = bookshelf.knex('changesets_hashtags')
      .join('hashtags', 'hashtags.id', 'changesets_hashtags.hashtag_id')
      .select('changeset_id')
      .where('hashtags.hashtag', req.params.id);

      var knex = bookshelf.knex;
      knex.select('user_id', 'name', knex.raw('COUNT(*) as edits'),
                  knex.raw('SUM(road_km_mod + road_km_add) as roads'),
                  knex.raw('SUM(building_count_add + building_count_mod) as buildings'),
                  knex.raw('MAX(changesets.created_at) as created_at'))
          .from('changesets')
          .join('users', 'changesets.user_id', 'users.id')
          .where('changesets.id', 'in', subquery)
          .groupBy('name', 'user_id')
          .then(function (rows) {
            return res(R.map(function (row) {
              return {
                "name": row.name,
                "user_id": row.user_id,
                "edits": Number(row.edits),
                "roads": Number(Number(row.roads).toFixed(3)),
                "buildings": parseInt(row.buildings),
                "created_at": row.created_at
              }
            }, rows));
          });
    }
  },
  {
    method: 'GET',
    path: '/hashtags',
    handler: function (req, res) {
      Hashtag.fetchAll({columns: ['hashtag']})
      .then(function (hashtags) {
        var serialized = hashtags.toJSON();
        return R.map(R.prop('hashtag'), serialized);
      })
      .then(res);
    }
  }
];
