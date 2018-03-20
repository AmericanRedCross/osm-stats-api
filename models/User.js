const bookshelf = require("../db/bookshelf_init");

require("./Changeset");
require("./Badge");
require("./Hashtag");

// Returns User model
const User = bookshelf.Model.extend({
  tableName: "users",
  changesets: function() {
    return this.hasMany("Changeset");
  },
  badges: function() {
    return this.belongsToMany("Badge", "badges_users");
  },
  getCountries: function(trx) {
    // Check if we're in a transaction
    const qb = trx || bookshelf.knex;

    return qb
      .select("name", "changesets")
      .from("raw_countries")
      .join(
        "raw_countries_users",
        "raw_countries_users.country_id",
        "raw_countries.id"
      )
      .where("user_id", this.attributes.id)
      .orderBy("changesets", "DESC")
      .then(results =>
        results.reduce(
          (acc, obj) => ({
            ...acc,
            [obj.name]: Number(obj.changesets)
          }),
          {}
        )
      );
  },
  getHashtags: function(trx) {
    // Check if we're in a transaction
    const qb = trx || bookshelf.knex;

    return qb
      .select("hashtag", "changesets")
      .from("raw_hashtags_users")
      .join("raw_hashtags", "raw_hashtags_users.hashtag_id", "raw_hashtags.id")
      .where("user_id", this.attributes.id)
      .orderBy("changesets", "DESC")
      .then(results =>
        results.reduce(
          (acc, obj) => ({
            ...acc,
            [obj.hashtag]: Number(obj.changesets)
          }),
          {}
        )
      );
  }
});

module.exports = bookshelf.model("User", User);
