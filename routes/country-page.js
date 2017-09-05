const bookshelf = require("../db/bookshelf_init");
const { RecordNotFound } = require("../db/errors");
const Boom = require("boom");

module.exports = [
  // returns list of available countries
  {
    method: "GET",
    path: "/countries",
    handler: (req, res) => {
      const { knex } = bookshelf;

      return knex("countries")
        .select("name", "code")
        .where(knex.raw("code !~'USA-'"))
        .then(res);
    }
  },
  // returns stats for all hashtags in a country
  {
    method: "GET",
    path: "/countries/{country}/hashtags",
    handler: (req, res) => {
      const { knex } = bookshelf;
      // force title case
      const country = req.params.country.toUpperCase();
      return knex("countries")
        .where("code", country)
        .then(results => {
          if (results.length === 0) {
            throw new RecordNotFound();
          }
          return results[0].id;
        })
        .then(countryId =>
          // for given country_id
          // returns stats for all hashtags and name of hashtag
          knex
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
            .groupBy("filtered.hashtag")
        )
        .then(res)
        .catch(error => {
          if (error instanceof RecordNotFound) {
            return res(Boom.notFound("Could not find country with that id"));
          }

          console.warn(error);

          return res(Boom.badImplementation("An unexpected error occurred"));
        });
    }
  },
  // return stats for entire country
  {
    method: "GET",
    path: "/countries/{country}",
    handler: (req, res) => {
      const { knex } = bookshelf;
      // force title case
      const country = req.params.country.toUpperCase();
      return knex("countries")
        .where("code", country)
        .then(results => {
          if (results.length === 0) {
            throw new RecordNotFound();
          }
          return results[0].id;
        })
        .then(countryId =>
          knex.raw(
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
                  -- TODO SQL injection
                  (SELECT changeset_id FROM changesets_countries WHERE country_id = ?))
                AS filtered
              ON changesets.id=filtered.id
          `,
            [countryId]
          )
        )
        .then(countryStatsResults => countryStatsResults.rows[0])
        .then(res)
        .catch(error => {
          if (error instanceof RecordNotFound) {
            return res(Boom.notFound("Could not find country with that id"));
          }

          console.warn(error);

          return res(Boom.badImplementation("An unexpected error occurred"));
        });
    }
  },
  {
    method: "GET",
    path: "/countries/{country}/users",
    handler: (req, res) => {
      const { knex } = bookshelf;
      const country = req.params.country.toUpperCase();
      return knex("countries")
        .where("code", country)
        .then(results => {
          if (results.length === 0) {
            throw new RecordNotFound();
          }
          return results[0].id;
        })
        .then(countryId =>
          knex.raw(
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
          GROUP by filtered.name, filtered.user_id
        `,
            [countryId]
          )
        )
        .then(userIdsResults => userIdsResults.rows)
        .then(res)
        .catch(error => {
          if (error instanceof RecordNotFound) {
            return res(Boom.notFound("Could not find country with that id"));
          }

          console.warn(error);

          return res(Boom.badImplementation("An unexpected error occurred"));
        });
    }
  }
];
