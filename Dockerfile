FROM node:18-alpine

WORKDIR /usr/src/app

# Cache and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy backend application source code
COPY . .

# App defaults
ENV PORT=5000
ENV NODE_ENV=production

EXPOSE 5000

CMD ["node", "src/server.js"]
