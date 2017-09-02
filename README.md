# osm-stats-api

User facing API for Missing Maps statistics.

## Starting

```bash
docker-compose up
```

### Runtime Dependencies

* Redis
* PostgreSQL (referenced via `DATABASE_URL`)

### API Endpoints and Documentation

  - [/stats/{hashtag?}](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md)
  - [/users](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md#users-endpoint)
  - [/users/{user_id#}](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md#usersuser_id-endpoint)
  - [/hashtags](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md#hashtags-endpoint)
  - [/hashtags/{hashtag-name}](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md#hashtagshashtag-name-endpoint)
  - [/group-summaries/{hashtag-name-1, hashtag-name-2, ...} ](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md#group-summarieshashtag-name-1-hashtag-name-2--endpoint)
  - [/top-users/{hashtag-name}](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md#top-usershashtag-name-endpoint)
  - [/hashtags/{hashtag-name}/map](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md#hashtagshashtag-namemap-endpoint)
  - [/countries](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md#countries)
  - [/countries/{country-code}](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md#countriescountry-code)
  - [/countries/{country-code}/hashtags](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md#countriescountry-codehashtags)
  - [/countries/{country-code}/users](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md#countriescountry-codeusers)

All endpoints and additional documentation can be found in the [osm-stats API documentation](https://github.com/AmericanRedCross/osm-stats/blob/master/documentation/API.md).
