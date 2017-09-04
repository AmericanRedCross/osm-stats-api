var Badge = require('../models/Badge');

module.exports = [
  {
    method: 'GET',
    path: '/badges',
    handler: function (req, res) {
      console.log(req.info.remoteAddress + ': ' + req.method.toUpperCase() + ' ' + req.url.path);
      Badge.fetchAll().then(res);
    }
  }
];
