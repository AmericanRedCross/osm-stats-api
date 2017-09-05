const Badge = require("../models/Badge");

module.exports = [
  {
    method: "GET",
    path: "/badges",
    handler: (req, res) =>
      Badge.fetchAll()
        .then(res)
        .catch(res)
  }
];
