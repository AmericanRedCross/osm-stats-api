const bookshelf = require("../db/bookshelf_init");
require("./User");
require("./Hashtag");
require("./Country");

// Returns Changeset model
const Changeset = bookshelf.Model.extend({
  tableName: "changesets",
  users: function() {
    return this.belongsTo("User");
  },
  hashtags: function() {
    return this.belongsToMany("Hashtag");
  },
  countries: function() {
    return this.belongsToMany("Country");
  }
});

module.exports = bookshelf.model("Changeset", Changeset);
