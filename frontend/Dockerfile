FROM node:18-alpine

WORKDIR /app

# Kopíruj package súbory
COPY package*.json ./

# Nainštaluj závislosti
RUN npm install

# Kopíruj zdrojový kód
COPY . .

# Build aplikácie
RUN npm run build

# Expose port
EXPOSE 3000

# Start aplikácie
CMD ["npm", "start"]