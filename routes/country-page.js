'use strict';

const Boom = require('boom');
const bookshelf = require('../db/bookshelf_init');

module.exports = [
  {
    method:'GET',
    path: '/country/{hashtags}',
    handler: function(req, res) {
      return res("up and running")
    }
  }
]
