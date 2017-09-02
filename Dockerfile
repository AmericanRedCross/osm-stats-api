FROM node:6

WORKDIR /opt/app/

COPY package.json /opt/app/

RUN npm install \
  && rm -rf /root/.npm

ADD . /opt/app

EXPOSE 3000

CMD ["npm", "start"]
