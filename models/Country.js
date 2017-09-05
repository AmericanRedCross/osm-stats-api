const bookshelf = require("../db/bookshelf_init");
require("./Changeset");

// Returns Country model
const Country = bookshelf.Model.extend({
  tableName: "countries",
  changesets: function() {
    return this.belongsToMany("Changeset");
  }
});

module.exports = bookshelf.model("Country", Country);
