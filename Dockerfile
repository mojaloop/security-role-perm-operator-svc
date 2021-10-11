FROM node:alpine
WORKDIR /opt
USER root
COPY package.json .
RUN npm install
COPY . .
CMD ["npm", "run", "startDev"]