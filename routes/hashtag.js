const Boom = require("boom");
const Redis = require("ioredis");
const lockingCache = require("locking-cache");
const R = require("ramda");
const request = require("request-promise");

const Hashtag = require("../models/Hashtag");
const bookshelf = require("../db/bookshelf_init");

const FORGETTABLE_URL =
  process.env.FORGETTABLE_URL || "http://forgettable:8080";
const REDIS_URL = process.env.REDIS_URL || "redis://redis/";

const redis = new Redis(REDIS_URL);

const lockedFetch = lockingCache({
  maxAge: 1000 * 20,
  stale: true
});

async function getUserStats(hashtag) {
  const { knex } = bookshelf;

  const subquery = knex("changesets_hashtags")
    .join("hashtags", "hashtags.id", "changesets_hashtags.hashtag_id")
    .select("changeset_id")
    .where("hashtags.hashtag", hashtag);

  const rows = await knex
    .select(
      "user_id",
      "name",
      knex.raw("COUNT(*) as changesets"),
      knex.raw("SUM(road_km_mod + road_km_add) as roads"),
      knex.raw("SUM(building_count_add + building_count_mod) as buildings"),
      knex.raw(
        `SUM(building_count_add + building_count_mod +
                          road_count_add + road_count_mod +
                          waterway_count_add + poi_count_add) as edits`
      ),
      knex.raw("MAX(changesets.created_at) as created_at")
    )
    .from("changesets")
    .join("users", "changesets.user_id", "users.id")
    .where("changesets.id", "in", subquery)
    .groupBy("name", "user_id")
    .orderBy("edits", "DESC")
    .limit(10000);

  return rows.map(row => ({
    ...row,
    edits: Number(row.edits),
    changesets: Number(row.changesets),
    roads: Number(row.roads),
    buildings: Number(row.buildings)
  }));
}

const getCachedUserStats = lockedFetch((hashtag, lock) =>
  lock(`user-stats:${hashtag}`, async unlock => {
    try {
      return unlock(null, await getUserStats(hashtag));
    } catch (err) {
      return unlock(err);
    }
  })
);

module.exports = [
  {
    method: "GET",
    path: "/hashtags/{id}/users",
    handler: (req, res) => getCachedUserStats(req.params.id, res)
  },
  {
    method: "GET",
    path: "/hashtags/{id}/map",
    handler: async (req, res) => {
      if (req.params.id == null) {
        return res(Boom.notFound("No such hashtag"));
      }

      try {
        const elements = await redis.lrange(
          `osmstats::map::#${R.toLower(req.params.id)}`,
          0,
          -1
        );

        return res(elements.map(JSON.parse));
      } catch (err) {
        return res(err);
      }
    }
  },
  {
    method: "GET",
    path: "/hashtags",
    handler: async (req, res) => {
      try {
        const [hashtags, distributionStr] = await Promise.all([
          Hashtag.fetchAll({ columns: ["hashtag"] }),
          request(`${FORGETTABLE_URL}/nmostprobable?distribution=hashtags&N=5`)
        ]);

        const distribution = JSON.parse(distributionStr);

        return res({
          hashtags: hashtags.toJSON().map(x => x.hashtag),
          trending: R.map(R.prop("bin"), distribution.data.data)
        });
      } catch (err) {
        return res(err);
      }
    }
  }
];
