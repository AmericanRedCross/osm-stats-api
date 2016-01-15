var Boom = require('boom');
var User = require('../models/User');
var bookshelf = require('../db/bookshelf_init')
var Promise = require('bluebird');
var R = require('ramda');

module.exports = [
  {
    method: 'GET',
    path: '/users',
    handler: function (req, res) {
      User.fetchAll({columns: ['name']})
      .then(function (hashtags) {
        var serialized = hashtags.toJSON();
        return R.map(R.prop('name'), serialized);
      })
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
      Promise.all([
        User.where({id: req.params.id}).fetch({withRelated: 'badges'}),
        bookshelf.knex('changesets')
        .select('*')
        .orderBy('created_at', 'desc')
        .where('user_id', req.params.id)
        .limit(1),
        bookshelf.knex('changesets')
        .select('created_at')
        .where('user_id', req.params.id)
      ])
      .then(function (results) {
        var user = results[0];
        var latest = results[1];
        var edit_times = R.map(R.prop('created_at'), results[2]);

        var serialized = user.toJSON();
        serialized.latest = latest;
        serialized.edit_times = edit_times;
        return serialized;
      })
      .then(res);
    }
  }
]