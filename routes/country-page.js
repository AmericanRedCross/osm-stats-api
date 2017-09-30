const bookshelf = require("../db/bookshelf_init");
const { RecordNotFound } = require("../db/errors");
const Boom = require("boom");

module.exports = [
  // returns list of available countries
  {
    method: "GET",
    path: "/countries",
    handler: async (req, res) => {
      const { knex } = bookshelf;

      try {
        return res(
          await knex("countries")
            .select("name", "code")
            .where(knex.raw("code !~'USA-'"))
        );
      } catch (err) {
        return res(err);
      }
    }
  },
  // returns stats for all hashtags in a country
  {
    method: "GET",
    path: "/countries/{country}/hashtags",
    handler: async (req, res) => {
      const { knex } = bookshelf;
      // force title case
      const country = req.params.country.toUpperCase();

      let startDate = new Date(0);
      let endDate = new Date();

      if (req.query.startdate != null) {
        startDate = new Date(req.query.startdate);
      }

      if (req.query.enddate != null) {
        endDate = new Date(req.query.enddate);
      }

      try {
        const results = await knex("countries").where("code", country);

        if (results.length === 0) {
          throw new RecordNotFound();
        }

        const countryId = results[0].id;

        // for given country_id
        // returns stats for all hashtags and name of hashtag
        const rows = await knex
          .select(
            knex.raw(
              "SUM(building_count_add + building_count_mod + road_count_add + road_count_mod + waterway_count_add + poi_count_add) AS all_edits"
            )
          )
          .sum("road_count_add AS road_count_add")
          .sum("road_count_mod AS road_count_mod")
          .sum("building_count_add AS building_count_add")
          .sum("building_count_mod AS building_count_mod")
          .sum("waterway_count_add AS waterway_count_add")
          .sum("poi_count_add AS poi_count_add")
          .sum("road_km_add AS road_km_add")
          .sum("road_km_mod AS road_km_mod")
          .sum("waterway_km_add AS waterway_km_add")
          .select("filtered.hashtag")
          .from("changesets")
          .innerJoin(
            knex
              .select("hashtag", "id", "changeset_id")
              .from(
                knex
                  .select(
                    "hashtags.id",
                    "hashtags.hashtag",
                    "changesets_hashtags.changeset_id"
                  )
                  .from("hashtags")
                  .innerJoin(
                    "changesets_hashtags",
                    "hashtags.id",
                    "changesets_hashtags.hashtag_id"
                  )
                  .as("hashtag_changesets_joined")
              )
              .whereIn(
                "changeset_id",
                knex
                  .select("changeset_id")
                  .from("changesets_countries")
                  .where({
                    country_id: countryId
                  })
              )
              .as("filtered"),
            "changesets.id",
            "filtered.changeset_id"
          )
          .whereBetween("created_at", [startDate, endDate])
          .groupBy("filtered.hashtag");

        return res(
          rows.map(x => ({
            ...x,
            all_edits: Number(x.all_edits),
            road_count_add: Number(x.road_count_add),
            road_count_mod: Number(x.road_count_mod),
            building_count_add: Number(x.building_count_add),
            building_count_mod: Number(x.building_count_mod),
            waterway_count_add: Number(x.waterway_count_add),
            poi_count_add: Number(x.poi_count_add),
            road_km_add: Number(x.road_km_add),
            road_km_mod: Number(x.road_km_mod),
            waterway_km_add: Number(x.waterway_km_add)
          }))
        );
      } catch (err) {
        if (err instanceof RecordNotFound) {
          return res(Boom.notFound("Could not find country with that id"));
        }

        console.warn(err);

        return res(Boom.badImplementation("An unexpected error occurred"));
      }
    }
  },
  // return stats for entire country
  {
    method: "GET",
    path: "/countries/{country}",
    handler: async (req, res) => {
      const { knex } = bookshelf;

      let startDate = new Date(0);
      let endDate = new Date();

      if (req.query.startdate != null) {
        startDate = new Date(req.query.startdate);
      }

      if (req.query.enddate != null) {
        endDate = new Date(req.query.enddate);
      }

      // force title case
      const country = req.params.country.toUpperCase();

      try {
        let results = await knex("countries").where("code", country);

        if (results.length === 0) {
          throw new RecordNotFound();
        }

        const countryId = results[0].id;

        results = await knex.raw(
          `
              SELECT
                SUM(building_count_add + building_count_mod +
                    road_count_add + road_count_mod +
                    waterway_count_add + poi_count_add) AS all_edits,
                 SUM(road_count_add) AS road_count_add,
                 SUM(road_count_mod) AS road_count_mod,
                 SUM(building_count_add) AS building_count_add,
                 SUM(building_count_mod) AS building_count_mod,
                 SUM(waterway_count_add) AS waterway_count_add,
                 SUM(poi_count_add) AS poi_count_add,
                 SUM(road_km_add) AS road_km_add,
                 SUM(road_km_mod) AS road_km_mod,
                 COUNT(DISTINCT filtered.name) AS contributors
              FROM changesets JOIN
                (SELECT name, id FROM
                  (SELECT users.name, changesets.id FROM users
                  JOIN changesets ON users.id = changesets.user_id) AS filtered
                WHERE id IN
                  (SELECT changeset_id FROM changesets_countries WHERE country_id = ?))
                AS filtered
              ON changesets.id=filtered.id
              WHERE changesets.created_AT BETWEEN ? AND ?
          `,
          [countryId, startDate, endDate]
        );

        const stats = results.rows[0];

        return res({
          ...stats,
          all_edits: Number(stats.all_edits),
          road_count_add: Number(stats.road_count_add),
          road_count_mod: Number(stats.road_count_mod),
          building_count_add: Number(stats.building_count_add),
          building_count_mod: Number(stats.building_count_mod),
          waterway_count_add: Number(stats.waterway_count_add),
          poi_count_add: Number(stats.poi_count_add),
          road_km_add: Number(stats.road_km_add),
          road_km_mod: Number(stats.road_km_mod),
          contributors: Number(stats.contributors)
        });
      } catch (err) {
        if (err instanceof RecordNotFound) {
          return res(Boom.notFound("Could not find country with that id"));
        }

        console.warn(err);

        return res(Boom.badImplementation("An unexpected error occurred"));
      }
    }
  },
  {
    method: "GET",
    path: "/countries/{country}/users",
    handler: async (req, res) => {
      const { knex } = bookshelf;

      let startDate = new Date(0);
      let endDate = new Date();

      if (req.query.startdate != null) {
        startDate = new Date(req.query.startdate);
      }

      if (req.query.enddate != null) {
        endDate = new Date(req.query.enddate);
      }

      const country = req.params.country.toUpperCase();

      try {
        let results = await knex("countries").where("code", country);

        if (results.length === 0) {
          throw new RecordNotFound();
        }

        const countryId = results[0].id;

        results = await knex.raw(
          `SELECT
            SUM(building_count_add + building_count_mod +
                road_count_add + road_count_mod +
                waterway_count_add + poi_count_add) AS all_edits,
             SUM(road_count_add) AS road_count_add,
             SUM(road_count_mod) AS road_count_mod,
             SUM(building_count_add) AS building_count_add,
             SUM(building_count_mod) AS building_count_mod,
             SUM(waterway_count_add) AS waterway_count_add,
             SUM(poi_count_add) AS poi_count_add,
             SUM(road_km_add) AS road_km_add,
             SUM(road_km_mod) AS road_km_mod,
             filtered.name,
             filtered.user_id
          FROM changesets JOIN
            (SELECT name, id, user_id FROM
              (SELECT users.name, users.id as user_id, changesets.id FROM users
              JOIN changesets ON users.id = changesets.user_id) AS hashtag_changesets_joined
            WHERE id IN
              (SELECT changeset_id FROM changesets_countries WHERE country_id = ?))
            AS filtered
          ON changesets.id=filtered.id
          WHERE changesets.created_at BETWEEN ? AND ?
          GROUP by filtered.name, filtered.user_id
        `,
          [countryId, startDate, endDate]
        );

        return res(
          results.rows.map(x => ({
            ...x,
            all_edits: Number(x.all_edits),
            road_count_add: Number(x.road_count_add),
            road_count_mod: Number(x.road_count_mod),
            building_count_add: Number(x.building_count_add),
            building_count_mod: Number(x.building_count_mod),
            waterway_count_add: Number(x.waterway_count_add),
            poi_count_add: Number(x.poi_count_add),
            road_km_add: Number(x.road_km_add),
            road_km_mod: Number(x.road_km_mod)
          }))
        );
      } catch (err) {
        if (err instanceof RecordNotFound) {
          return res(Boom.notFound("Could not find country with that id"));
        }

        console.warn(err);

        return res(Boom.badImplementation("An unexpected error occurred"));
      }
    }
  }
];
