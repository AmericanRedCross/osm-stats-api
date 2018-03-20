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

      let statsTable = knex
        .select(
          knex.raw("SUM(changesets) changesets"),
          knex.raw("SUM(users) users"),
          knex.raw("SUM(road_km_added + road_km_modified) as roads"),
          knex.raw("SUM(buildings_added + buildings_modified) as buildings"),
          knex.raw(
            "SUM(buildings_added + buildings_modified + roads_added + roads_modified + waterways_added + waterways_modified + pois_added + pois_modified) as edits"
          ),
          knex.raw("MAX(updated_at) as latest")
        )
        .from("hashtag_stats");

      if (req.params.hashtag) {
        statsTable = statsTable.where("hashtag", "=", req.params.hashtag);
      }

      try {
        const results = await statsTable;
        const row = results[0];

        return res({
          ...row,
          hashtag: req.params.hashtag || "*",
          users: Number(row.users),
          changesets: Number(row.changesets),
          buildings: Number(row.buildings),
          roads: Number(row.roads),
          edits: Number(row.edits)
        });
      } catch (err) {
        return res(err);
      }
    }
  }
];
