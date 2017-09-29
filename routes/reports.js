const Boom = require("boom");
const json2csv = require("json2csv");

const bookshelf = require("../db/bookshelf_init");

module.exports = [
  {
    method: "GET",
    path: "/reports/{hashtags}",
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
        .groupBy("filtered.hashtag")
        .then(results =>
          results.map(row => ({
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
          }))
        )
        .then(data =>
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
            ],
            del: "\t"
          })
        )
        .then(data => res(data).type("text/tab-separated-values"))
        .catch(res);
    }
  }
];
