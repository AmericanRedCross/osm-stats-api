var Boom = require('boom');
var User = require('../models/User');
var Changeset = require('../models/Changeset');
var bookshelf = require('../db/bookshelf_init')
var Promise = require('bluebird');
var R = require('ramda');

module.exports = [
  {
    method: 'GET',
    path: '/users',
    handler: function (req, res) {
      User.fetchAll({columns: ['id', 'name']})
      .then(res)
    }
  },

  {
    method: 'GET',
    path: '/users/{id}',
    handler: function (req, res) {
      if (!req.params.id) {
        return res(Boom.badRequest('Valid user id required'));
      }
      User.where({id: req.params.id}).fetch({withRelated: 'badges'})
      .then(function (user) {
        return Promise.all([
          user.getHashtags(),
          bookshelf.knex('changesets')
          .select('id')
          .orderBy('created_at', 'desc')
          .where('user_id', req.params.id)
          .limit(1),
          bookshelf.knex('changesets')
          .select('created_at')
          .where('user_id', req.params.id),
          user.getCountries()
        ])
        .then(function (results) {
          var hashtags = results[0]
          var latest = results[1];
          var edit_times = R.map(R.prop('created_at'), results[2]);
          var countryCount = results[3][0];
          var countryList = R.countBy(R.prop('name'), results[3][1]);

          var serialized = user.toJSON();
          serialized.latest = latest[0].id;
          serialized.edit_times = edit_times;
          serialized.country_count = countryCount;
          serialized.country_list = countryList;
          serialized.hashtags = hashtags;
          return serialized;
        })
      })
      .then(function (serialized) {
        return Changeset.where({id: serialized.latest})
        .fetch({withRelated: ['hashtags', 'countries']})
        .then(function (changeset) {
          var changeset = changeset.toJSON();
          changeset.hashtags = R.map(R.pick(['id', 'hashtag', 'created_at']),changeset.hashtags);
          changeset.countries = R.map(R.pick(['id', 'name', 'code', 'created_at']),changeset.countries);
          serialized.latest = changeset;
          return serialized
        })
      })
      .then(res);
    }
  }
]
