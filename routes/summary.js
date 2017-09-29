const bookshelf = require("../db/bookshelf_init");

/*
MissingMaps began tracking OSM edit statistics in January 2016,
and this endpoint provides summary statistics for changesets
submitted after that date. The user count is an exception, as it
represents the entirety of participating users since 2014.

On the MissingMaps.org website, these statistics
are combined with a pre-2016 snapshot of edit statistics to
represent the entirety of edits since 2014.
*/

module.exports = [
  {
    method: "GET",
    path: "/stats/{hashtag?}",
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

      let statsTable = knex
        .select(
          knex.raw("COUNT(*) as changesets"),
          knex.raw("COUNT(DISTINCT user_id) as users"),
          knex.raw("SUM(road_km_mod + road_km_add) as roads"),
          knex.raw("SUM(building_count_add + building_count_mod) as buildings"),
          knex.raw(
            "SUM(building_count_add + building_count_mod + road_count_add + road_count_mod + waterway_count_add) as edits"
          ),
          knex.raw("MAX(changesets.created_at) as latest")
        )
        .from("changesets")
        .whereBetween("created_at", [startDate, endDate]);

      if (req.params.hashtag) {
        const filteredTable = knex
          .select("changeset_id")
          .from("changesets_hashtags")
          .join(
            "hashtags",
            "changesets_hashtags.hashtag_id",
            "=",
            "hashtags.id"
          )
          .where("hashtags.hashtag", "=", req.params.hashtag);

        statsTable = statsTable.whereIn("id", filteredTable);
      }

      try {
        const results = await statsTable;
        const row = results[0];

        return res({
          ...row,
          users: Number(row.users),
          changesets: Number(row.changesets),
          buildings: Number(row.buildings),
          roads: Number(row.buildings),
          edits: Number(row.edits)
        });
      } catch (err) {
        return res(err);
      }
    }
  }
];
