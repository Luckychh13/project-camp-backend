FROM node:24-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

EXPOSE 8000

CMD ["npm", "start"]