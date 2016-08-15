FROM mhart/alpine-node:4.4.5
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package.json /usr/src/app
RUN npm install
COPY . /usr/src/app

# Run tests
CMD npm run test:coverage
