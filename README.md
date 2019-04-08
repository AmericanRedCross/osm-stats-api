# osm-stats-api

User facing API for Missing Maps statistics.

## Starting locally

You could run 

```bash
docker-compose up
```

or follow the steps listed here.

1. Clone local copies

    `git clone git@github.com:AmericanRedCross/osm-stats-api.git`
  
    `git clone git@github.com:AmericanRedCross/osm-stats-workers.git`

2. Get the Postgres server running on your machine

    `pg_ctl -D /usr/local/var/postgres start`

3. Add env variables

    `export OVERPASS_URL=<overpass url>:6080`

    `export DATABASE_URL=postgresql:///osm_stats_2`
    
 4. `npm i pgexplode`
 
 5. Run `make db/all`
 
 6. Connect to `psql -d osm_stats_2`
 
 7. Fetch value from http://overpass-api.de/api/augmented_diff_status
 
 8. From psql run `update augmented_diff_status set id = <value from earlier step> - 10 `
 
 9. Fetch value from https://planet.osm.org/replication/changesets/state.yaml
 
 10. From psql run `update changesets_status set id = <value from earlier step> - 10`
 
 11. Switch to [osm-stats-workers](https://github.com/americanredcross/osm-stats-workers) directory and run
 
    `npm run housekeeping`
 
    `npm run update-badges`
    
    `npm install`
    
    `npm start`
    
 12.  Get back to `osm-stats-api` and run `npm start`. This should give you the local api link
 
 
 

### Runtime Dependencies

* Redis
* PostgreSQL (referenced via `DATABASE_URL`)

### API Endpoints and Documentation

  - [/stats/{hashtag?}](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md)
  - [/users](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md#users-endpoint)
  - [/users/{user_id#}](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md#usersuser_id-endpoint)
  - [/hashtags](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md#hashtags-endpoint)
  - [/group-summaries/{hashtag-name-1, hashtag-name-2, ...} ](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md#group-summarieshashtag-name-1-hashtag-name-2--endpoint)
  - [/top-users/{hashtag-name}](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md#top-usershashtag-name-endpoint)
  - [/hashtags/{hashtag-name}/map](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md#hashtagshashtag-namemap-endpoint)
  - [/countries](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md#countries)
  - [/countries/{country-code}](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md#countriescountry-code)
  - [/countries/{country-code}/hashtags](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md#countriescountry-codehashtags)
  - [/countries/{country-code}/users](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md#countriescountry-codeusers)

All endpoints and additional documentation can be found in the [osm-stats API documentation](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md).
