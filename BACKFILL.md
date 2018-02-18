# Backfilling Data

## Athena queries

### `changesets_countries_20180212`

```sql
CREATE EXTERNAL TABLE changeset_countries_20180212 (
  changeset bigint,
  countries array<string>
)
STORED AS ORCFILE
LOCATION 's3://osm-pds-tmp/changeset-countries-20180212/'
```

### `changesets.csv`

```sql
SELECT
  changeset id,
  road_km_added,
  road_km_modified,
  waterway_km_added,
  waterway_km_modified,
  roads_added,
  roads_modified,
  waterways_added,
  waterways_modified,
  buildings_added,
  buildings_modified,
  pois_added,
  pois_modified,
  user_id,
  editor,
  created_at,
  closed_at
FROM changeset_stats_20180212
```

### `hashtags.csv`

```sql
WITH raw_hashtags AS (
  SELECT
    array_distinct(regexp_extract_all(lower(changesets.tags['comment']), '#([\p{L}\p{N}+_\-&]+)', 1)) hashtags
  FROM changesets
  WHERE regexp_like(changesets.tags['comment'], '#[\p{L}\p{N}+_\-&]+')
),
hashtags AS (
  select distinct hashtag
  from raw_hashtags
  cross join unnest(hashtags) as t (hashtag)
)
select row_number() over (ORDER BY hashtag) as id, hashtag
from hashtags
```

### `changesets_hashtags.csv`

```sql
WITH raw_hashtags AS (
  SELECT id AS changeset_id,
    array_distinct(regexp_extract_all(lower(changesets.tags['comment']), '#([\p{L}\p{N}+_\-&]+)', 1)) hashtags
  FROM changesets
  WHERE regexp_like(changesets.tags['comment'], '#[\p{L}\p{N}+_\-&]+')
),
hashtag_values AS (
  select distinct hashtag
  from raw_hashtags
  cross join unnest(hashtags) as t (hashtag)
),
changesets_hashtags AS (
  select changeset_id, hashtag
  from raw_hashtags
  cross join unnest(hashtags) as t (hashtag)
),
hashtags AS (
  select row_number() over (ORDER BY hashtag) as hashtag_id, hashtag
  from hashtag_values
)
select changeset_id, hashtag_id
from changesets_hashtags
join hashtags on hashtags.hashtag=changesets_hashtags.hashtag
```

### `users.csv`

```sql
select distinct uid id, user name from planet_history
```

### `countries.csv`

```sql
with changesets_countries as (
select changeset, country
from changeset_countries_20180212
cross join unnest(countries) as t (country)
),
countries as (
select distinct country
from changesets_countries
)
select country, row_number() over (ORDER BY country) as id
from countries
```

### `changesets_countries.csv`

```sql
with changesets_countries as (
  select changeset as changeset_id, country
  from changeset_countries_20180212
  cross join unnest(countries) as t (country)
),
country_names as (
  select distinct country
  from changesets_countries
),
countries as (
  select row_number() over (ORDER BY country) as country_id, country
  from country_names
)
select changeset_id, country_id
from changesets_countries
join countries on changesets_countries.country=countries.country
```

## PostgreSQL

### Load Upstream Data

Create tables and `\copy` into PostgreSQL.

```sql
CREATE TABLE upstream_changesets (
    id bigint NOT NULL,
    road_km_added double precision,
    road_km_modified double precision,
    waterway_km_added double precision,
    waterway_km_modified double precision,
    roads_added integer,
    roads_modified integer,
    waterways_added integer,
    waterways_modified integer,
    buildings_added integer,
    buildings_modified integer,
    pois_added integer,
    pois_modified integer,
    user_id integer,
    editor text,
    created_at timestamp with time zone,
    closed_at timestamp with time zone,
    PRIMARY KEY(id)
);
\copy upstream_changesets (id, road_km_added, road_km_modified, waterway_km_added, waterway_km_modified, roads_added, roads_modified, waterways_added, waterways_modified, buildings_added, buildings_modified, pois_added, pois_modified, user_id, editor, created_at, closed_at) FROM 'changesets.csv' CSV HEADER
```

```sql
CREATE TABLE upstream_hashtags (
  id serial,
  hashtag text unique,
  primary key (id)
);
\copy upstream_hashtags (id, hashtag) FROM 'hashtags.csv' CSV HEADER
```

```sql
CREATE TABLE upstream_changesets_hashtags (
  changeset_id integer,
  hashtag_id integer,
  primary key(changeset_id, hashtag_id)
);
\copy upstream_changesets_hashtags (changeset_id, hashtag_id) FROM 'changesets_hashtags.csv' CSV HEADER
```

```sql
CREATE TABLE upstream_users (
  id integer NOT NULL,
  name text,
  PRIMARY KEY(id)
);
\copy upstream_users (id, name) FROM 'users.csv' CSV HEADER
```

```sql
CREATE TABLE upstream_changesets_countries (
  changeset_id integer,
  country_id integer,
  primary key(changeset_id, country_id)
);
\copy upstream_changesets_countries (changeset_id, country_id) FROM 'changesets_countries.csv' CSV HEADER
```

```sql
CREATE TABLE upstream_countries (
  id integer,
  code text unique,
  PRIMARY KEY(id)
);
\copy upstream_countries (code, id) FROM 'countries.csv' CSV HEADER
```

### Merge Data

Join upstream sources to create a coherent view of changesets in the backfill.

Add upstream changesets to `raw_changesets`:

```sql
INSERT INTO raw_changesets AS c (
  id,
  road_km_added,
  road_km_modified,
  waterway_km_added,
  waterway_km_modified,
  roads_added,
  roads_modified,
  waterways_added,
  waterways_modified,
  buildings_added,
  buildings_modified,
  pois_added,
  pois_modified,
  user_id,
  editor,
  created_at,
  closed_at,
  verified,
  updated_at
)
SELECT
  id,
  road_km_added,
  road_km_modified,
  waterway_km_added,
  waterway_km_modified,
  roads_added,
  roads_modified,
  waterways_added,
  waterways_modified,
  buildings_added,
  buildings_modified,
  pois_added,
  pois_modified,
  user_id,
  editor,
  created_at,
  closed_at,
  true verified,
  '2018-02-12T02:00:00Z'::timestamp with time zone updated_at
FROM upstream_changesets
ON CONFLICT (id) DO
UPDATE
SET
  road_km_added = c.road_km_added + excluded.road_km_added,
  road_km_modified = c.road_km_modified + excluded.road_km_modified,
  waterway_km_added = c.waterway_km_added + excluded.waterway_km_added,
  waterway_km_modified = c.waterway_km_modified + excluded.waterway_km_modified,
  roads_added = c.roads_added + excluded.roads_added,
  roads_modified = c.roads_modified + excluded.roads_modified,
  waterways_added = c.waterways_added + excluded.waterways_added,
  waterways_modified = c.waterways_modified + excluded.waterways_modified,
  buildings_added = c.buildings_added + excluded.buildings_added,
  buildings_modified = c.buildings_modified + excluded.buildings_modified,
  pois_added = c.pois_added + excluded.pois_added,
  pois_modified = c.pois_modified + excluded.pois_modified,
  editor = excluded.editor,
  created_at = coalesce(c.created_at, excluded.created_at),
  closed_at = coalesce(c.closed_at, excluded.closed_at),
  verified = true
WHERE c.id = excluded.id;
```

Add upstream users to `raw_users`:

```sql
INSERT INTO raw_users AS u (
  id,
  name
)
SELECT
  id,
  name
FROM upstream_users
ON CONFLICT DO NOTHING;
```

Add upstream hashtags to `raw_hashtags`:

```sql
INSERT INTO raw_hashtags AS h (
  hashtag
)
SELECT hashtag
FROM upstream_hashtags
ON CONFLICT DO NOTHING;
```

Add pairings for upstream hashtags:

```sql
INSERT INTO raw_changesets_hashtags (changeset_id, hashtag_id)
  SELECT
    ch.changeset_id,
    a.id
  FROM upstream_changesets_hashtags ch
  JOIN upstream_hashtags h ON h.id=ch.hashtag_id
  JOIN raw_hashtags a USING (hashtag)
  ON CONFLICT DO NOTHING;
```

Add pairings for upstream countries:

```sql
INSERT INTO raw_changesets_countries (changeset_id, country_id)
  SELECT
    cc.changeset_id,
    a.id
  FROM upstream_changesets_countries cc
  JOIN upstream_countries c ON c.id=cc.country_id
  JOIN raw_countries a USING (code)
  ON CONFLICT DO NOTHING;
```
