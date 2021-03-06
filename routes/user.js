const Boom = require("boom");

const bookshelf = require("../db/bookshelf_init");
const Changeset = require("../models/Changeset");
const User = require("../models/User");

const RESULTS_PER_PAGE = 100;

// TODO merge w/ version in routes/hashtag.js
const validatePage = page => {
  page = Number(page);
  if (page >= 1) {
    return page;
  }

  return 1;
};

module.exports = [
  {
    method: "GET",
    path: "/users",
    handler: async (req, res) => res(User.fetchAll({ columns: ["id", "name"] }))
  },

  {
    method: "GET",
    path: "/users/search",
    handler: async (req, res) =>
      res(
        User.where("name", "LIKE", `${req.query.q}%`)
          .orderBy("name")
          .query(qb =>
            qb
              .limit(RESULTS_PER_PAGE)
              .offset((validatePage(req.query.page) - 1) * RESULTS_PER_PAGE)
          )
          .fetchAll()
      )
  },

  {
    method: "GET",
    path: "/users/{id}",
    handler: async (req, res) => {
      if (!req.params.id) {
        return res(Boom.badRequest("Valid user id required"));
      }

      const { knex } = bookshelf;
      let query;

      if (req.params.id.match(/^\d+$/)) {
        query = User.where({
          id: req.params.id
        });
      } else {
        query = User.where(
          knex.raw("name = ?", [req.params.id])
        );
      }

      try {
        const userObj = await query.fetch({
          withRelated: [
            {
              badges: qb =>
                qb.select(
                  "badges_users.updated_at",
                  "badges.id",
                  "badges.category",
                  "badges.level",
                  "badges.name"
                )
            }
          ],
          require: true
        });

        const [hashtags, latest, changesetDays, countries] = await Promise.all([
          userObj.getHashtags(),
          knex("changesets")
            .select("id")
            .orderBy("created_at", "desc")
            .where("user_id", userObj.id)
            .limit(1),
          knex("changesets")
            .distinct(knex.raw("date_trunc('day', created_at) AS day"))
            .where("user_id", userObj.id)
            .orderBy("day"),
          userObj.getCountries()
        ]);

        const editTimes = changesetDays.map(x => x.day);
        const user = userObj.toJSON({
          omitPivot: true
        });

        const serialized = {
          ...user,
          total_building_count_add: Number(user.total_building_count_add),
          total_building_count_mod: Number(user.total_building_count_mod),
          total_waterway_count_add: Number(user.total_waterway_count_add),
          total_poi_count_add: Number(user.total_poi_count_add),
          total_road_km_add: Number(user.total_road_km_add),
          total_road_km_mod: Number(user.total_road_km_mod),
          total_waterway_km_add: Number(user.total_waterway_km_add),
          total_josm_edit_count: Number(user.total_josm_edit_count),
          total_gps_trace_count_add: Number(user.total_gps_trace_count_add),
          total_road_count_add: Number(user.total_road_count_add),
          total_road_count_mod: Number(user.total_road_count_mod),
          total_tm_done_count: Number(user.total_tm_done_count),
          total_tm_val_count: Number(user.total_tm_val_count),
          total_tm_inval_count: Number(user.total_tm_inval_count),
          changeset_count: Number(user.changesets),
          latest: latest[0].id,
          edit_times: editTimes,
          country_count: Object.keys(countries).length,
          country_list: countries,
          hashtags
        };

        // TODO this can be done above when fetching the latest changeset id
        const changesetObj = await Changeset.where({
          id: serialized.latest
        }).fetch({ withRelated: ["hashtags", "countries"] });

        const changeset = changesetObj.toJSON({
          omitPivot: true
        });

        serialized.latest = {
          ...changeset,
          road_count_add: Number(changeset.road_count_add),
          road_count_mod: Number(changeset.road_count_mod),
          building_count_add: Number(changeset.building_count_add),
          building_count_mod: Number(changeset.building_count_mod),
          waterway_count_add: Number(changeset.waterway_count_add),
          poi_count_add: Number(changeset.poi_count_add),
          gpstrace_count_add: Number(changeset.gpstrace_count_add),
          road_km_add: Number(changeset.road_km_add),
          road_km_mod: Number(changeset.road_km_mod),
          waterway_km_add: Number(changeset.waterway_km_add),
          gpstrace_km_add: Number(changeset.gpstrace_km_add)
        };

        return res(serialized);
      } catch (err) {
        if (err.message && err.message === "EmptyResponse") {
          return res(Boom.notFound("user not found"));
        }

        console.warn(err);

        return res(Boom.badImplementation("error retrieving user"));
      }
    }
  }
];
