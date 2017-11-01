const Boom = require("boom");
const json2csv = require("json2csv");

const bookshelf = require("../db/bookshelf_init");

module.exports = [
  {
    method: "GET",
    path: "/reports/{hashtags}",
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

        const data = results.map(row => ({
          ...row,
          road_count_add: parseInt(row.road_count_add, 10),
          road_count_mod: parseInt(row.road_count_mod, 10),
          building_count_add: parseInt(row.building_count_add, 10),
          building_count_mod: parseInt(row.building_count_mod, 10),
          waterway_count_add: parseInt(row.waterway_count_add, 10),
          poi_count_add: parseInt(row.poi_count_add, 10),
          road_km_add: Number(Number(row.road_km_add).toFixed(2)),
          road_km_mod: Number(Number(row.road_km_mod).toFixed(2)),
          waterway_km_add: Number(Number(row.waterway_km_add).toFixed(2))
        }));

        return res(
          json2csv({
            data,
            fields: [
              {
                label: "Hashtag",
                value: "hashtag"
              },
              {
                label: "Roads Added",
                value: "road_count_add"
              },
              {
                label: "Roads Modified",
                value: "road_count_mod"
              },
              {
                label: "Roads Added (km)",
                value: "road_km_add"
              },
              {
                label: "Roads Modified (km)",
                value: "road_km_mod"
              },
              {
                label: "Buildings Added",
                value: "building_count_add"
              },
              {
                label: "Buildings Modified",
                value: "building_count_mod"
              },
              {
                label: "Waterways Added",
                value: "waterway_count_add"
              },
              {
                label: "Waterways Added (km)",
                value: "waterway_km_add"
              },
              {
                label: "POIs Added",
                value: "poi_count_add"
              }
            ]
          })
        )
          .type("text/csv")
          .header("Content-Disposition", "attachment; filename=hashtags.csv");
      } catch (err) {
        return res(err);
      }
    }
  },
  {
    method: "GET",
    path: "/reports/users/{users}",
    handler: async (req, res) => {
      if (!req.params.users) {
        return res(
          Boom.badRequest("Valid, comma-separated list of usernames required")
        );
      }
      const users = req.params.users.split(",").map(x => x.trim());
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
          .sum("road_count_add AS road_count_add")
          .sum("road_count_mod AS road_count_mod")
          .sum("building_count_add AS building_count_add")
          .sum("building_count_mod AS building_count_mod")
          .sum("waterway_count_add AS waterway_count_add")
          .sum("poi_count_add AS poi_count_add")
          .sum("road_km_add AS road_km_add")
          .sum("road_km_mod AS road_km_mod")
          .sum("waterway_km_add AS waterway_km_add")
          .max("changesets.created_at AS last_updated")
          .select("name")
          .from("changesets")
          .innerJoin("users", "changesets.user_id", "users.id")
          .whereIn("users.name", users)
          .whereBetween("changesets.created_at", [startDate, endDate])
          .groupBy("name");

        const data = results.map(row => ({
          ...row,
          road_count_add: parseInt(row.road_count_add, 10),
          road_count_mod: parseInt(row.road_count_mod, 10),
          building_count_add: parseInt(row.building_count_add, 10),
          building_count_mod: parseInt(row.building_count_mod, 10),
          waterway_count_add: parseInt(row.waterway_count_add, 10),
          poi_count_add: parseInt(row.poi_count_add, 10),
          road_km_add: Number(Number(row.road_km_add).toFixed(2)),
          road_km_mod: Number(Number(row.road_km_mod).toFixed(2)),
          waterway_km_add: Number(Number(row.waterway_km_add).toFixed(2))
        }));

        return res(
          json2csv({
            data,
            fields: [
              {
                label: "Username",
                value: "name"
              },
              {
                label: "Roads Added",
                value: "road_count_add"
              },
              {
                label: "Roads Modified",
                value: "road_count_mod"
              },
              {
                label: "Roads Added (km)",
                value: "road_km_add"
              },
              {
                label: "Roads Modified (km)",
                value: "road_km_mod"
              },
              {
                label: "Buildings Added",
                value: "building_count_add"
              },
              {
                label: "Buildings Modified",
                value: "building_count_mod"
              },
              {
                label: "Waterways Added",
                value: "waterway_count_add"
              },
              {
                label: "Waterways Added (km)",
                value: "waterway_km_add"
              },
              {
                label: "POIs Added",
                value: "poi_count_add"
              }
            ],
            del: "\t"
          })
        )
          .type("text/csv")
          .header("Content-Disposition", "attachment; filename=users.csv");
      } catch (err) {
        return res(err);
      }
    }
  }
];
