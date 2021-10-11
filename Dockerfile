# STAGE 1
FROM node:alpine as builder
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app
COPY package*.json ./
RUN npm config set unsafe-perm true
RUN npm install -g typescript
RUN npm install -g ts-node
RUN npm install
COPY --chown=node:node . .
RUN npm run build

# STAGE 2
FROM node:alpine
RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app
USER root
COPY package*.json ./
RUN npm install --production
COPY --from=builder /home/node/app/dist ./dist

CMD [ "npm", "start" ]