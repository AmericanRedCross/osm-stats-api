FROM golang

RUN go get github.com/bitly/forgettable/goforget/ \
  && go install github.com/bitly/forgettable/goforget/

ENV REDIS_URL redis://redis/1
EXPOSE 8080

# sleep to give Redis a chance to start
CMD ["sh", "-c", "sleep 1 && goforget --redis-uri ${REDIS_URL} --default-rate 0.2"]
