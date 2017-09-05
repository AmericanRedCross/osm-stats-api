var Badge = require('../models/Badge');

module.exports = [
  {
    method: 'GET',
    path: '/badges',
    handler: function (req, res) {
      Badge.fetchAll().then(res);
    }
  }
];
