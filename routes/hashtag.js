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
      Hashtag.where({hashtag: req.params.id})
      .fetch({withRelated: 'changesets'})
      .then(res)
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
      .then(res)
    }
  }
]