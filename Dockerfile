FROM node:6

ENV NPM_CONFIG_LOGLEVEL warn

WORKDIR /opt/app/

COPY package.json /opt/app/

RUN npm install \
  && rm -rf /root/.npm

ADD . /opt/app

EXPOSE 3000

CMD ["npm", "start"]
