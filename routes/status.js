const Boom = require("boom");
const json2csv = require("json2csv");

const bookshelf = require("../db/bookshelf_init");

module.exports = [
  {
    method: "GET",
    path: "/status",
    handler: async (req, res) => {
      const { knex } = bookshelf;

      try {
        return await res(
          knex
            .select(knex.raw("'augmented diffs' component"), "id", "updated_at")
            .from("augmented_diff_status")
            .union(
              knex
                .select(knex.raw("'changesets' component"), "id", "updated_at")
                .from("changesets_status")
            )
            .union(
              knex
                .select(
                  knex.raw("'badges' component"),
                  knex.raw("null id"),
                  knex.raw("last_run updated_at")
                )
                .from("badge_updater_status")
            )
        );
      } catch (err) {
        return res(err);
      }
    }
  }
];
