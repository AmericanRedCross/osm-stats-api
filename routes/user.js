const Boom = require("boom");
const User = require("../models/User");
const Changeset = require("../models/Changeset");
const bookshelf = require("../db/bookshelf_init");
const Promise = require("bluebird");
const R = require("ramda");

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

      const where = {};

      if (req.params.id.match(/^\d+$/)) {
        where.id = req.params.id;
      } else {
        where.name = req.params.id;
      }

      try {
        const userObj = await User.where(where).fetch({
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

        const [
          hashtags,
          latest,
          changesetDates,
          countries,
          changesets
        ] = await Promise.all([
          userObj.getHashtags(),
          bookshelf
            .knex("changesets")
            .select("id")
            .orderBy("created_at", "desc")
            .where("user_id", userObj.id)
            .limit(1),
          bookshelf
            .knex("changesets")
            .select("created_at")
            .where("user_id", userObj.id),
          userObj.getCountries(),
          bookshelf
            .knex("changesets")
            .count("user_id")
            .where("user_id", userObj.id)
        ]);

        const editTimes = R.map(R.prop("created_at"), changesetDates);
        const countryCount = countries[0];
        const countryList = R.countBy(R.prop("name"), countries[1]);
        const changesetCount = changesets[0].count;
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
          changeset_count: changesetCount,
          latest: latest[0].id,
          edit_times: editTimes,
          country_count: countryCount,
          country_list: countryList,
          hashtags
        };

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
