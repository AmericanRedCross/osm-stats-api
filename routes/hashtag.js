var Boom = require('boom');
var Hashtag = require('../models/Hashtag');
var bookshelf = require('../db/bookshelf_init');
var Promise = require('bluebird');
var Redis = require('ioredis');
var request = require('request-promise');

var redis_host = process.env.REDIS_PORT_6379_TCP_ADDR || process.env.REDIS_HOST || '127.0.0.1';
var redis_port = process.env.REDIS_PORT_6379_TCP_PORT || process.env.REDIS_PORT || 6379;

var forgettable_host = process.env.FORGETTABLE_PORT_8080_TCP_ADDR || '127.0.0.1';
var forgettable_port = process.env.FORGETTABLE_PORT_8080_TCP_PORT || 8080;

var redis = new Redis({host: redis_host, port: redis_port});

var R = require('ramda');

function allHashtagData (req, res) {
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
module.exports = [
{
  method: 'GET',
  path: '/hashtags/{id}/users',
  handler: function (req, res) {
    console.log(req.info.remoteAddress + ': ' + req.method.toUpperCase() + ' ' + req.url.path);
    var subquery = bookshelf.knex('changesets_hashtags')
          .join('hashtags', 'hashtags.id', 'changesets_hashtags.hashtag_id')
          .select('changeset_id')
          .where('hashtags.hashtag', req.params.id);

    var knex = bookshelf.knex;
    knex.select('user_id', 'name', knex.raw('COUNT(*) as changesets'),
                knex.raw('SUM(road_km_mod + road_km_add) as roads'),
                knex.raw('SUM(building_count_add + building_count_mod) as buildings'),
                knex.raw('SUM(building_count_add + building_count_mod + \
                            road_count_add + road_count_mod + \
                            waterway_count_add + poi_count_add) as edits'),
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
            "changesets": Number(row.changesets),
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
  path: '/hashtags/{id}',
  handler: allHashtagData
},
{
  method: 'GET',
  path: '/hashtags/{id}/map',
  handler: function (req, res) {
    console.log(req.info.remoteAddress + ': ' + req.method.toUpperCase() + ' ' + req.url.path);
    redis.lrange('osmstats::map::#' + R.toLower(req.params.id), 0, -1)
      .then(function (elements) {
        return elements.map(JSON.parse);
      }).then(res)
  }
},
{
  method: 'GET',
  path: '/hashtags',
  handler: function (req, res) {
    console.log(req.info.remoteAddress + ': ' + req.method.toUpperCase() + ' ' + req.url.path);
    Promise.all([
      Hashtag.fetchAll({columns: ['hashtag']}),
      request('http://' + forgettable_host + ':' + forgettable_port + '/nmostprobable?distribution=hashtags&N=5')
    ])
      .then(function (results) {
        hashtags = results[0];
        distribution = JSON.parse(results[1]);
        var serialized = hashtags.toJSON();
        var hashtaglist = R.map(R.prop('hashtag'), serialized);
        return {
          hashtags: hashtaglist,
          trending: R.map(R.prop('bin'), distribution.data.data)
        }
      })
      .then(res);
  }
}
];
