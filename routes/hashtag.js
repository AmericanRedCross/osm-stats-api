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

async function getUserStats(
  hashtag,
  orderBy = "edits",
  orderDirection = "ASC"
) {
  const { knex } = bookshelf;

  try {
    const rows = await knex
      .select(
        "user_id",
        "name",
        "changesets",
        "edits",
        "buildings",
        knex.raw("road_km AS roads"),
        knex.raw("updated_at AS created_at")
      )
      .from("raw_hashtags_users")
      .join("users", "raw_hashtags_users.user_id", "users.id")
      .join("raw_hashtags", "raw_hashtags.id", "raw_hashtags_users.hashtag_id")
      .where("raw_hashtags.hashtag", hashtag)
      .orderBy(`${orderBy}_rank`, orderDirection)
      .limit(100);

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
  lockedFetch((hashtag, orderBy, orderDirection, lock) =>
    lock(`user-stats:${hashtag}:${orderBy}:${orderDirection}`, async unlock => {
      try {
        return unlock(
          null,
          await getUserStats(hashtag, orderBy, orderDirection)
        );
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

const validateOrderBy = orderBy =>
  ["buildings", "edits", "road_km", "updated_at"].includes(orderBy)
    ? orderBy
    : undefined;

const validateOrderDirection = orderDirection =>
  ["asc", "desc"].includes((orderDirection || "").toLowerCase())
    ? orderDirection
    : undefined;

module.exports = [
  {
    method: "GET",
    path: "/hashtags/{id}/users",
    handler: async (req, res) => {
      try {
        return res(
          await getCachedUserStats(
            req.params.id,
            validateOrderBy(req.query.order_by),
            validateOrderDirection(req.query.order_direction)
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
