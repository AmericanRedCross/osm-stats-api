# osm-stats-api
User facing API for Missing Maps statistics.

Dependency:
- Docker redis
- .env file containing:
  - DATABASE_URL: a postgres string

```
docker build -t osm-stats-api
docker run -d -p 3000:3000 --link some-redis-container:redis --env-file .env osm-stats-api
```
