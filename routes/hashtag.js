const util = require("util");

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

async function getUserStats(hashtag, startDate, endDate) {
  let start = new Date(0);
  let end = new Date();

  if (startDate != null) {
    start = new Date(startDate);
  }

  if (endDate != null) {
    end = new Date(endDate);
  }

  const { knex } = bookshelf;

  try {
    const rows = await knex
      .select(
        "user_id",
        "name",
        knex.raw("COUNT(*) AS changesets"),
        knex.raw("SUM(road_km_mod + road_km_add) AS roads"),
        knex.raw("SUM(building_count_add + building_count_mod) AS buildings"),
        knex.raw(
          `SUM(building_count_add + building_count_mod +
                            road_count_add + road_count_mod +
                            waterway_count_add + poi_count_add) AS edits` // waterway mods, poi mods
        ),
        knex.raw("MAX(changesets.created_at) AS created_at")
      )
      .from("changesets")
      .join("users", "changesets.user_id", "users.id")
      .join(
        "changesets_hashtags",
        "changesets_hashtags.changeset_id",
        "changesets.id"
      )
      .join("hashtags", "hashtags.id", "changesets_hashtags.hashtag_id")
      .where("hashtags.hashtag", hashtag)
      .whereBetween("changesets.created_at", [start, end])
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
  } catch (err) {
    console.warn(err);
    throw err;
  }
}

const getCachedUserStats = util.promisify(
  lockedFetch((hashtag, startDate, endDate, lock) =>
    lock(`user-stats:${hashtag}:${startDate}:${endDate}`, async unlock => {
      try {
        return unlock(null, await getUserStats(hashtag, startDate, endDate));
      } catch (err) {
        return unlock(err);
      }
    })
  )
);

const getCachedHashtagMap = util.promisify(
  lockedFetch((hashtag, lock) =>
    lock(`hashtag-map:${hashtag}`, async unlock => {
      try {
        const elements = await redis.lrange(
          `osmstats::map::#${R.toLower(hashtag)}`,
          0,
          -1
        );

        return unlock(null, elements.map(JSON.parse));
      } catch (err) {
        return unlock(err);
      }
    })
  )
);

module.exports = [
  {
    method: "GET",
    path: "/hashtags/{id}/users",
    handler: async (req, res) => {
      try {
        return res(
          await getCachedUserStats(
            req.params.id,
            req.query.startdate,
            req.query.enddate
          )
        );
      } catch (err) {
        return res(err);
      }
    }
  },
  {
    method: "GET",
    path: "/hashtags/{id}/map",
    handler: async (req, res) => {
      if (req.params.id == null) {
        return res(Boom.notFound("No such hashtag"));
      }

      try {
        return res(await getCachedHashtagMap(req.params.id));
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
