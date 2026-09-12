FROM node:18-alpine

WORKDIR /usr/src/app

# Cache and install dependencies
COPY package*.json ./
RUN npm install --production

# Copy backend application source code
COPY . .

# Default environment variables for Docker bridge network
ENV PORT=5000
ENV DB_HOST=ortho_db
ENV DB_USER=root
ENV DB_PASSWORD=RootPassword123!
ENV DB_NAME=ortho_clinic_db

EXPOSE 5000

CMD ["node", "src/server.js"]
