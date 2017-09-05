const bookshelf = require("../db/bookshelf_init");
require("./User");

// Returns Badge model
const Badge = bookshelf.Model.extend({
  tableName: "badges",
  users: function() {
    return this.belongsToMany("User");
  }
});

module.exports = bookshelf.model("Badge", Badge);
