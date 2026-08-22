FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 4000

CMD ["sh", "-c", "node scripts/set-demo-passwords.js && node src/server.js"]
