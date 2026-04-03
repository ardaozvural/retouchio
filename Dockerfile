FROM node:20-slim

WORKDIR /work

COPY package*.json ./
RUN npm ci

CMD ["node", "edit.js"]
