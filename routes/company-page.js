const util = require("util");

const Boom = require("boom");
const bookshelf = require("../db/bookshelf_init");
const lockingCache = require("locking-cache");

const lockedFetch = lockingCache({
  maxAge: 1000 * 20,
  stale: true
});

async function getHashtagSummary(hashtags, wildcards) {
  const { knex } = bookshelf;

  const results = await knex
    .select(
      "hashtag",
      knex.raw("roads_added AS road_count_add"),
      knex.raw("roads_modified AS road_count_mod"),
      knex.raw("buildings_added AS building_count_add"),
      knex.raw("buildings_modified AS building_count_mod"),
      knex.raw("waterways_added AS waterway_count_add"),
      knex.raw("pois_added AS poi_count_add"),
      knex.raw("pois_modified AS poi_count_mod"),
      knex.raw("road_km_added AS road_km_add"),
      knex.raw("road_km_modified AS road_km_mod"),
      knex.raw("waterway_km_added AS waterway_km_add"),
      knex.raw("waterway_km_modified AS waterway_km_mod"),
      knex.raw(
        "(roads_added + roads_modified + waterways_added + waterways_modified + buildings_added + buildings_modified + pois_added + pois_modified) AS edits"
      ),
      "users",
      knex.raw("updated_at AS last_updated")
    )
    .from("hashtag_stats")
    .whereIn("hashtag", hashtags)
    .orWhere(function where() {
      return wildcards.map(x => this.orWhere("hashtag", "like", x));
    });

  return results
    .map(row => ({
      ...row,
      road_count_add: Number(row.road_count_add),
      road_count_mod: Number(row.road_count_mod),
      building_count_add: Number(row.building_count_add),
      building_count_mod: Number(row.building_count_mod),
      waterway_count_add: Number(row.waterway_count_add),
      poi_count_add: Number(row.poi_count_add),
      poi_count_mod: Number(row.poi_count_mod),
      road_km_add: Number(Number(row.road_km_add).toFixed(2)),
      road_km_mod: Number(Number(row.road_km_mod).toFixed(2)),
      waterway_km_add: Number(Number(row.waterway_km_add).toFixed(2)),
      waterway_km_mod: Number(Number(row.waterway_km_mod).toFixed(2)),
      edits: Number(row.edits),
      users: Number(row.users)
    }))
    .reduce((obj, v) => {
      obj[v.hashtag] = v;
      delete v.hashtag;

      return obj;
    }, {});
}

const getCachedHashtagSummary = util.promisify(
  lockedFetch((hashtags, wildcards, lock) =>
    lock(
      `hashtag-summary:${JSON.stringify(hashtags)}:${JSON.stringify(
        wildcards
      )}`,
      async unlock => {
        try {
          return unlock(null, await getHashtagSummary(hashtags, wildcards));
        } catch (err) {
          return unlock(err);
        }
      }
    )
  )
);

module.exports = [
  {
    method: "GET",
    path: "/group-summaries/{hashtags}",
    handler: async (req, res) => {
      if (!req.params.hashtags) {
        return res(Boom.badRequest("Valid, comma-separated hashtags required"));
      }

      let hashtags = req.params.hashtags.split(",").map(x => x.trim());

      const wildcards = hashtags
        .filter(x => x.match(/\*$/))
        .map(x => x.replace(/\*/, "%"));
      hashtags = hashtags.filter(x => !x.match(/\*$/));

      try {
        return res(await getCachedHashtagSummary(hashtags, wildcards));
      } catch (err) {
        return res(err);
      }
    }
  },
  {
    method: "GET",
    path: "/top-users/{hashtag}",
    handler: async (req, res) => {
      if (!req.params.hashtag) {
        return res(Boom.badRequest("Valid hashtag required"));
      }
      const { hashtag } = req.params;
      const { knex } = bookshelf;

      try {
        const results = await knex
          .select(
            knex.raw("edits all_edits"),
            "buildings",
            "roads",
            knex.raw("road_km road_kms"),
            knex.raw("raw_users.name user_id"),
            knex.raw("user_id user_number")
          )
          .from("raw_hashtags_users")
          .join("raw_users", "raw_hashtags_users.user_id", "raw_users.id")
          .join(
            "raw_hashtags",
            "raw_hashtags.id",
            "raw_hashtags_users.hashtag_id"
          )
          .where("raw_hashtags.hashtag", hashtag)
          .orderBy("edits_rank", "ASC")
          .limit(100);

        const data = results
          .map(x => ({
            ...x,
            all_edits: Number(x.all_edits),
            buildings: Number(x.buildings),
            roads: Number(x.roads),
            road_kms: Number(x.road_kms)
          }))
          .reduce((obj, v) => {
            obj[v.user_id] = v;
            delete obj[v.user_id].user_id;

            return obj;
          }, {});

        return res(data);
      } catch (err) {
        return res(err);
      }
    }
  }
];
