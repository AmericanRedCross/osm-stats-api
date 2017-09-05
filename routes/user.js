const Boom = require("boom");
const User = require("../models/User");
const Changeset = require("../models/Changeset");
const bookshelf = require("../db/bookshelf_init");
const Promise = require("bluebird");
const R = require("ramda");

module.exports = [
  {
    method: "GET",
    path: "/users",
    handler: (req, res) =>
      User.fetchAll({ columns: ["id", "name"] })
        .then(res)
        .catch(res)
  },

  {
    method: "GET",
    path: "/users/{id}",
    handler: (req, res) => {
      if (!req.params.id) {
        return res(Boom.badRequest("Valid user id required"));
      }

      return User.where({ id: req.params.id })
        .fetch({
          withRelated: [
            {
              badges: qb =>
                qb.select(
                  "badges_users.created_at",
                  "badges.id",
                  "badges.category",
                  "badges.level",
                  "badges.name"
                )
            }
          ],
          require: true
        })
        .then(user =>
          Promise.all([
            user.getHashtags(),
            bookshelf
              .knex("changesets")
              .select("id")
              .orderBy("created_at", "desc")
              .where("user_id", req.params.id)
              .limit(1),
            bookshelf
              .knex("changesets")
              .select("created_at")
              .where("user_id", req.params.id),
            user.getCountries(),
            bookshelf
              .knex("changesets")
              .count("user_id")
              .where("user_id", req.params.id)
          ]).then(results => {
            const hashtags = results[0];
            const latest = results[1];
            const editTimes = R.map(R.prop("created_at"), results[2]);
            const countryCount = results[3][0];
            const countryList = R.countBy(R.prop("name"), results[3][1]);
            const changesetCount = results[4][0].count;

            const serialized = user.toJSON();
            serialized.changeset_count = changesetCount;
            serialized.latest = latest[0].id;
            serialized.edit_times = editTimes;
            serialized.country_count = countryCount;
            serialized.country_list = countryList;
            serialized.hashtags = hashtags;
            return serialized;
          })
        )
        .then(serialized =>
          Changeset.where({ id: serialized.latest })
            .fetch({ withRelated: ["hashtags", "countries"] })
            .then(changeset => {
              changeset = changeset.toJSON();
              changeset.hashtags = R.map(
                R.pick(["id", "hashtag", "created_at"]),
                changeset.hashtags
              );
              changeset.countries = R.map(
                R.pick(["id", "name", "code", "created_at"]),
                changeset.countries
              );
              serialized.latest = changeset;
              return serialized;
            })
        )
        .then(res)
        .catch(err => {
          if (err.message && err.message === "EmptyResponse") {
            return res(Boom.notFound("user not found"));
          }

          console.warn(err);

          return res(Boom.badImplementation("error retrieving user"));
        });
    }
  }
];
