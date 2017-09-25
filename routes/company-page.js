const Boom = require("boom");
const bookshelf = require("../db/bookshelf_init");

module.exports = [
  {
    method: "GET",
    path: "/group-summaries/{hashtags}",
    handler: (req, res) => {
      if (!req.params.hashtags) {
        return res(Boom.badRequest("Valid, comma-separated hashtags required"));
      }
      let hashtags = req.params.hashtags.split(",").map(x => x.trim());
      const { knex } = bookshelf;

      const wildcards = hashtags
        .filter(x => x.match(/\*$/))
        .map(x => x.replace(/\*/, "%"));
      hashtags = hashtags.filter(x => !x.match(/\*$/));

      return knex
        .sum("road_count_add AS road_count_add")
        .sum("road_count_mod AS road_count_mod")
        .sum("building_count_add AS building_count_add")
        .sum("building_count_mod AS building_count_mod")
        .sum("waterway_count_add AS waterway_count_add")
        .sum("poi_count_add AS poi_count_add")
        .sum("road_km_add AS road_km_add")
        .sum("road_km_mod AS road_km_mod")
        .sum("waterway_km_add AS waterway_km_add")
        .select("hashtag")
        .from("changesets")
        .innerJoin(
          knex
            .distinct("changeset_id", "hashtag")
            .select()
            .from("changesets_hashtags")
            .innerJoin(
              "hashtags",
              "changesets_hashtags.hashtag_id",
              "hashtags.id"
            )
            .whereIn("hashtag", hashtags)
            .orWhere(function where() {
              return wildcards.map(x => this.orWhere("hashtag", "like", x));
            })
            .as("filtered"),
          "changesets.id",
          "filtered.changeset_id"
        )
        .groupBy("filtered.hashtag")
        .then(results => {
          const object = {};
          results.forEach(row => {
            const { hashtag } = row;
            delete row.hashtag;
            object[hashtag] = row;
          });
          return object;
        })
        .then(res)
        .catch(res);
    }
  },
  {
    method: "GET",
    path: "/top-users/{hashtag}",
    handler: (req, res) => {
      if (!req.params.hashtag) {
        return res(Boom.badRequest("Valid hashtag required"));
      }
      const { hashtag } = req.params;
      const { knex } = bookshelf;

      return knex
        .select(
          knex.raw(
            "SUM(building_count_add + building_count_mod + road_count_add + road_count_mod + waterway_count_add + poi_count_add) AS all_edits"
          ),
          knex.raw("SUM(building_count_add + building_count_mod) AS buildings"),
          knex.raw("SUM(road_count_add + road_count_mod) AS roads"),
          knex.raw("SUM(road_km_add + road_km_mod) AS road_kms"),
          "users.name AS user_id",
          "users.id AS user_number"
        )
        .from("changesets")
        .innerJoin(
          knex
            .distinct("changeset_id")
            .select()
            .from("changesets_hashtags")
            .innerJoin(
              "hashtags",
              "changesets_hashtags.hashtag_id",
              "hashtags.id"
            )
            .where({
              hashtag
            })
            .as("filtered"),
          "changesets.id",
          "filtered.changeset_id"
        )
        .leftJoin("users", "users.id", "changesets.user_id")
        .groupBy("users.name", "users.id")
        .orderBy("all_edits", "desc")
        .limit(5)
        .then(results => {
          const object = {};
          results.forEach(row => {
            const userId = row.user_id;
            delete row.user_id;
            object[userId] = row;
          });
          return object;
        })
        .then(res)
        .catch(res);
    }
  }
];
