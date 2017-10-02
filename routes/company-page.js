const Boom = require("boom");
const bookshelf = require("../db/bookshelf_init");

module.exports = [
  {
    method: "GET",
    path: "/group-summaries/{hashtags}",
    handler: async (req, res) => {
      if (!req.params.hashtags) {
        return res(Boom.badRequest("Valid, comma-separated hashtags required"));
      }
      let hashtags = req.params.hashtags.split(",").map(x => x.trim());
      const { knex } = bookshelf;

      let startDate = new Date(0);
      let endDate = new Date();

      if (req.query.startdate != null) {
        startDate = new Date(req.query.startdate);
      }

      if (req.query.enddate != null) {
        endDate = new Date(req.query.enddate);
      }

      const wildcards = hashtags
        .filter(x => x.match(/\*$/))
        .map(x => x.replace(/\*/, "%"));
      hashtags = hashtags.filter(x => !x.match(/\*$/));

      try {
        const results = await knex
          .sum("road_count_add AS road_count_add")
          .sum("road_count_mod AS road_count_mod")
          .sum("building_count_add AS building_count_add")
          .sum("building_count_mod AS building_count_mod")
          .sum("waterway_count_add AS waterway_count_add")
          .sum("poi_count_add AS poi_count_add")
          .sum("road_km_add AS road_km_add")
          .sum("road_km_mod AS road_km_mod")
          .sum("waterway_km_add AS waterway_km_add")
          .max("created_at AS last_updated")
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
          .whereBetween("created_at", [startDate, endDate])
          .groupBy("filtered.hashtag");

        return res(
          results
            .map(row => ({
              ...row,
              road_count_add: Number(row.road_count_add),
              road_count_mod: Number(row.road_count_mod),
              building_count_add: Number(row.building_count_add),
              building_count_mod: Number(row.building_count_mod),
              waterway_count_add: Number(row.waterway_count_add),
              poi_count_add: Number(row.poi_count_add),
              road_km_add: Number(Number(row.road_km_add).toFixed(2)),
              road_km_mod: Number(Number(row.road_km_mod).toFixed(2)),
              waterway_km_add: Number(Number(row.waterway_km_add).toFixed(2))
            }))
            .reduce((obj, v) => {
              obj[v.hashtag] = v;
              delete v.hashtag;

              return obj;
            }, {})
        );
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

      let startDate = new Date(0);
      let endDate = new Date();

      if (req.query.startdate != null) {
        startDate = new Date(req.query.startdate);
      }

      if (req.query.enddate != null) {
        endDate = new Date(req.query.enddate);
      }

      try {
        const results = await knex
          .select(
            knex.raw(
              "SUM(building_count_add + building_count_mod + road_count_add + road_count_mod + waterway_count_add + poi_count_add) AS all_edits"
            ),
            knex.raw(
              "SUM(building_count_add + building_count_mod) AS buildings"
            ),
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
          .whereBetween("changesets.created_at", [startDate, endDate])
          .groupBy("users.name", "users.id")
          .orderBy("all_edits", "desc")
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
