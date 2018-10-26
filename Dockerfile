
FROM node:8
WORKDIR /usr/src
COPY ./package.json /usr/src/apigateway/
COPY ./package-lock.json /usr/src/apigateway/
COPY . /usr/src/apigateway/
COPY ./config /usr/src/config/
RUN cd /usr/src/apigateway; npm install
RUN cd /usr/src/apigateway/library; npm install
RUN cd .. && cd ..
CMD ["node", "./apigateway/server.js"]
EXPOSE 8080

